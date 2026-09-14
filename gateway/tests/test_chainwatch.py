"""TAO and alpha top-ups: credited once, only from real, successful, attributable transfers."""

from __future__ import annotations

import time
from decimal import Decimal

import pytest
import sr25519
from kuno_protocol import devkit
from scalecodec.utils.ss58 import ss58_encode
from sqlalchemy import select

from kuno_gateway import chainwatch, ledger, payments
from kuno_gateway.chainwatch import ChainEvent, ChainWatcher, Pool
from kuno_gateway.db import Account, ChainCursor, LedgerEntry, Payment, WalletLink
from kuno_gateway.prices import PriceUnavailable
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState

RAO = 10**9


def address(seed: int) -> str:
    return ss58_encode(sr25519.pair_from_seed(bytes([seed]) * 32)[0], ss58_format=42)


TREASURY, CUSTOMER, STRANGER, HOTKEY = address(1), address(2), address(3), address(4)


class FakeChain:
    def __init__(self):
        self.head = 100
        self.blocks: dict[int, list[ChainEvent]] = {}
        self.pools: dict[tuple[int, str], Pool] = {}

    def finalized_head(self):
        return self.head, self.block_hash(self.head)

    def block_hash(self, number):
        return f"0x{number:064x}"

    def events(self, block_hash):
        return self.blocks.get(int(block_hash, 16), [])

    def pool(self, netuid, block_hash):
        return self.pools[(netuid, block_hash)]

    def extrinsic_hash(self, block_hash, extrinsic_idx):
        return f"0xext{int(block_hash, 16)}_{extrinsic_idx}"


class FakeOracle:
    def __init__(self, rate="250"):
        self.rate = Decimal(rate)
        self.down = False

    def usd_per_tao(self):
        if self.down:
            raise PriceUnavailable("sources disagree")
        return self.rate, "test oracle"


def transfer(position, idx, sender, to, tao, phase="ApplyExtrinsic"):
    return ChainEvent(position, idx, phase, "Balances", "Transfer", {"from": sender, "to": to, "amount": int(Decimal(str(tao)) * RAO)})


def stake_transferred(position, idx, origin, destination, netuid, tao_moved_rao, destination_netuid=None):
    return ChainEvent(position, idx, "ApplyExtrinsic", "SubtensorModule", "StakeTransferred",
                      [origin, destination, HOTKEY, netuid, netuid if destination_netuid is None else destination_netuid, tao_moved_rao])


def success(position, idx):
    return ChainEvent(position, idx, "ApplyExtrinsic", "System", "ExtrinsicSuccess", {})


def failure(position, idx):
    return ChainEvent(position, idx, "ApplyExtrinsic", "System", "ExtrinsicFailed", {"dispatch_error": {}})


@pytest.fixture
def world(tmp_path):
    devkit.init(tmp_path / "data")
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})
    settings.tao_treasury_address = TREASURY
    settings.alpha_netuids = [51]
    # Crediting is checked on its own; the bonus on top of it has its own tests below.
    settings.chain_credit_bonus = 0.0
    state = GatewayState(settings)
    with state.session() as s, s.begin():
        s.add(WalletLink(id="w1", account_id="dev", address=CUSTOMER, created_at=time.time()))
    chain, oracle = FakeChain(), FakeOracle()
    watcher = ChainWatcher(state, chain, oracle)
    watcher.run_once()  # the first pass only places the cursor at the head
    return state, chain, oracle, watcher


def balance(state) -> int:
    with state.session() as s:
        return s.get(Account, "dev").balance_micros


def topups(state, provider=None) -> list[Payment]:
    with state.session() as s:
        query = select(Payment).order_by(Payment.created_at)
        return list(s.scalars(query.where(Payment.provider == provider) if provider else query).all())


def test_the_first_pass_starts_at_the_present_without_backfilling(world):
    state, chain, _, watcher = world
    with state.session() as s:
        assert s.get(ChainCursor, "bittensor").block_number == 100
    assert watcher.run_once() == 0


def test_tao_from_a_linked_coldkey_is_credited_once(world):
    state, chain, _, watcher = world
    before = balance(state)
    chain.blocks[101] = [transfer(40, 3, CUSTOMER, TREASURY, 2), success(41, 3)]
    chain.head = 101
    assert watcher.run_once() == 1
    assert balance(state) == before + 500_000_000  # 2 TAO at $250
    [payment] = topups(state, "tao")
    assert (payment.status, payment.asset_amount, payment.rate_usd, payment.from_address) == ("credited", "2", "250", CUSTOMER)
    assert payment.provider_ref == f"{chain.block_hash(101)}:3:40"

    # Reprocessing the same block (a crash before the cursor moved, say) credits nothing more.
    watcher.process_block(101, chain.block_hash(101))
    assert balance(state) == before + 500_000_000


def test_two_deposits_in_one_block_are_both_credited(world):
    state, chain, _, watcher = world
    before = balance(state)
    chain.blocks[101] = [transfer(5, 2, CUSTOMER, TREASURY, 1), success(6, 2), transfer(9, 4, CUSTOMER, TREASURY, 1), success(10, 4)]
    chain.head = 101
    watcher.run_once()
    assert balance(state) == before + 500_000_000
    assert len(topups(state, "tao")) == 2


def test_failed_calls_bookkeeping_and_other_recipients_credit_nothing(world):
    state, chain, _, watcher = world
    before = balance(state)
    chain.blocks[101] = [
        transfer(1, 2, CUSTOMER, TREASURY, 5), failure(2, 2),
        transfer(3, None, CUSTOMER, TREASURY, 5, phase="Initialization"),
        transfer(4, 6, CUSTOMER, STRANGER, 5), success(5, 6),
    ]
    chain.head = 101
    watcher.run_once()
    assert balance(state) == before and topups(state) == []


def test_tao_from_an_unlinked_coldkey_is_held_for_review(world):
    state, chain, _, watcher = world
    before = balance(state)
    chain.blocks[101] = [transfer(1, 2, STRANGER, TREASURY, 3), success(2, 2)]
    chain.head = 101
    watcher.run_once()
    [payment] = topups(state, "tao")
    assert (payment.status, payment.account_id) == ("needs_review", chainwatch.UNATTRIBUTED)
    assert balance(state) == before


def test_dust_below_the_minimum_is_recorded_but_not_credited(world):
    state, chain, _, watcher = world
    before = balance(state)
    chain.blocks[101] = [transfer(1, 2, CUSTOMER, TREASURY, "0.001"), success(2, 2)]
    chain.head = 101
    watcher.run_once()
    assert topups(state, "tao")[0].status == "below_minimum" and balance(state) == before


def test_no_price_means_the_block_waits_instead_of_being_credited_at_a_guess(world):
    state, chain, oracle, watcher = world
    before = balance(state)
    chain.blocks[101] = [transfer(1, 2, CUSTOMER, TREASURY, 1), success(2, 2)]
    chain.head = 101
    oracle.down = True
    assert watcher.run_once() == 0
    with state.session() as s:
        assert s.get(ChainCursor, "bittensor").block_number == 100
    assert balance(state) == before and topups(state) == []

    oracle.down = False
    assert watcher.run_once() == 1
    assert balance(state) == before + 250_000_000


def test_alpha_is_valued_at_the_lowest_honest_price_less_the_haircut(world):
    state, chain, _, watcher = world
    before = balance(state)
    # Spot 0.01 TAO/alpha, moving price 0.008: the moving price is the binding one.
    pool = Pool(tao_rao=1_000 * RAO, alpha_rao=100_000 * RAO, moving_price_tao=Decimal("0.008"))
    chain.pools[(51, chain.block_hash(101))] = pool
    chain.blocks[101] = [stake_transferred(7, 3, CUSTOMER, TREASURY, 51, 1 * RAO), success(8, 3)]
    chain.head = 101
    watcher.run_once()

    expected_rao = chainwatch.alpha_value_tao_rao(1 * RAO, pool, 0.10)
    assert expected_rao == 720_000_000  # 100 alpha x 0.008 TAO x 0.9
    assert balance(state) == before + 180_000_000  # 0.72 TAO at $250
    [payment] = topups(state, "alpha")
    assert (payment.status, payment.asset) == ("credited", "alpha:51")


def test_a_pumped_pool_cannot_inflate_an_alpha_payment():
    thin = Pool(tao_rao=10 * RAO, alpha_rao=1_000 * RAO, moving_price_tao=Decimal("0.001"))
    # The chain reports 5 TAO moved at a pumped spot price of 0.01, but the subnet has traded near
    # 0.001 and the pool couldn't absorb the sale: both cap the value far below 5 TAO.
    value = chainwatch.alpha_value_tao_rao(5 * RAO, thin, 0.10)
    assert value < 1 * RAO


def test_alpha_that_is_not_accepted_or_not_valuable_safely_is_held_for_review(world):
    state, chain, _, watcher = world
    before = balance(state)
    chain.pools[(51, chain.block_hash(101))] = Pool(1_000 * RAO, 100_000 * RAO, Decimal("0.01"))
    chain.blocks[101] = [
        stake_transferred(1, 2, CUSTOMER, TREASURY, 7, RAO), success(2, 2),                        # subnet not accepted
        stake_transferred(3, 4, CUSTOMER, TREASURY, 51, RAO, destination_netuid=52), success(4, 4),  # moved across subnets
        stake_transferred(5, 6, STRANGER, TREASURY, 51, RAO), success(6, 6),                        # unlinked sender
        stake_transferred(7, 8, CUSTOMER, TREASURY, 51, 10_000 * RAO), success(8, 8),               # above the cap
    ]
    chain.head = 101
    watcher.run_once()
    assert [p.status for p in topups(state, "alpha")] == ["needs_review"] * 4
    assert balance(state) == before


def test_alpha_too_old_to_value_at_its_own_block_is_held_for_review(world):
    state, chain, _, watcher = world
    before = balance(state)
    chain.blocks[101] = [stake_transferred(1, 2, CUSTOMER, TREASURY, 51, RAO), success(2, 2)]
    watcher.process_block(101, chain.block_hash(101), behind=chainwatch.STATE_HORIZON_BLOCKS + 1)
    [payment] = topups(state, "alpha")
    assert payment.status == "needs_review" and "too far behind" in payment.detail
    assert balance(state) == before


def test_a_credited_tao_deposit_earns_the_bonus_as_its_own_entry_exactly_once(world):
    state, chain, _, watcher = world
    state.settings.chain_credit_bonus = Settings.from_env({"KUNO_DATA_DIR": str(state.settings.data_dir)}).chain_credit_bonus
    assert state.settings.chain_credit_bonus == 0.05
    before = balance(state)
    chain.blocks[101] = [transfer(40, 3, CUSTOMER, TREASURY, 2), success(41, 3)]
    chain.head = 101
    watcher.run_once()
    assert balance(state) == before + 525_000_000  # 2 TAO at $250, plus 5%
    [payment] = topups(state, "tao")
    ref = payment.provider_ref
    with state.session() as s:
        entries = s.scalars(select(LedgerEntry).where(LedgerEntry.kind.in_((ledger.TOPUP, ledger.BONUS)))).all()
    assert {(e.kind, e.source, e.amount_micros, e.idempotency_key, e.account_id) for e in entries} == {
        (ledger.TOPUP, "tao", 500_000_000, f"topup:tao:{ref}", "dev"),
        (ledger.BONUS, "tao", 25_000_000, f"bonus:tao:{ref}", "dev"),
    }

    # Reprocessing the block, or posting the bonus again under its key, adds nothing.
    watcher.process_block(101, chain.block_hash(101))
    with state.session() as s, s.begin():
        assert payments.credit_bonus(s, s.get(Payment, payment.id), 500_000_000, 0.05, "again") is False
    assert balance(state) == before + 525_000_000


def test_alpha_earns_the_bonus_on_its_value_after_the_haircut_and_a_held_deposit_earns_none(world):
    state, chain, _, watcher = world
    state.settings.chain_credit_bonus = 0.05
    before = balance(state)
    chain.pools[(51, chain.block_hash(101))] = Pool(tao_rao=1_000 * RAO, alpha_rao=100_000 * RAO, moving_price_tao=Decimal("0.008"))
    chain.blocks[101] = [
        stake_transferred(7, 3, CUSTOMER, TREASURY, 51, 1 * RAO), success(8, 3),
        stake_transferred(9, 5, CUSTOMER, TREASURY, 51, 10_000 * RAO), success(10, 5),  # above the cap: held for review
    ]
    chain.head = 101
    watcher.run_once()
    assert balance(state) == before + 189_000_000  # $180 after the haircut, plus 5%
    assert sorted(p.status for p in topups(state, "alpha")) == ["credited", "needs_review"]
    with state.session() as s:
        bonuses = s.scalars(select(LedgerEntry).where(LedgerEntry.kind == ledger.BONUS)).all()
    assert [(b.source, b.amount_micros) for b in bonuses] == [("alpha", 9_000_000)]


def test_no_treasury_means_no_watching(world):
    state, chain, _, watcher = world
    state.settings.tao_treasury_address = None
    chain.blocks[101] = [transfer(1, 2, CUSTOMER, TREASURY, 1), success(2, 2)]
    chain.head = 101
    assert watcher.run_once() == 0
