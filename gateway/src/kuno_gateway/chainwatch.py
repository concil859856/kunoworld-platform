"""TAO and alpha top-ups, read from finalized Bittensor blocks.

Customers link a coldkey (wallets.py) and send TAO, or transfer alpha stake, to one treasury
coldkey. This watcher reads each finalized block once, in order, and credits a deposit only when:

- the event is in an extrinsic that emitted System.ExtrinsicSuccess, not a failed call, and not
  block-initialization bookkeeping;
- the recipient is the treasury and the sender is a coldkey linked to exactly one account;
- a TAO/USD rate is available from agreeing sources. If it isn't, the block is left for the next
  pass instead of being credited at a guess.

A deposit's key is block_hash:extrinsic:position-in-block. The event's own "event_index" is its type,
not its place, so two deposits in one block would collide on it. The cursor moves in the same
transaction as the block's credits, so a crash reprocesses the block without crediting it twice.

Alpha is valued at the lowest of: the TAO the chain says moved, what selling that alpha into the
subnet pool would return, and the subnet's moving price; then a haircut, with a per-deposit cap.
A thin pool pumped for one block can't inflate a payment. Public nodes keep state for about 256
blocks, so alpha that can't be valued at its own block is held for review rather than priced now.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Protocol

from sqlalchemy import select

from . import ledger, payments
from .db import ChainCursor, WalletLink
from .prices import PriceUnavailable

if TYPE_CHECKING:
    from .state import GatewayState

log = logging.getLogger("kuno.chainwatch")

CHAIN = "bittensor"
RAO = Decimal(10**9)
STATE_HORIZON_BLOCKS = 200
UNATTRIBUTED = "unattributed"


@dataclass(frozen=True)
class ChainEvent:
    position: int
    extrinsic_idx: int | None
    phase: str
    module: str
    name: str
    attributes: Any


@dataclass(frozen=True)
class Pool:
    tao_rao: int
    alpha_rao: int
    moving_price_tao: Decimal


class Chain(Protocol):
    def finalized_head(self) -> tuple[int, str]: ...
    def block_hash(self, number: int) -> str: ...
    def events(self, block_hash: str) -> list[ChainEvent]: ...
    def pool(self, netuid: int, block_hash: str) -> Pool: ...
    def extrinsic_hash(self, block_hash: str, extrinsic_idx: int) -> str | None: ...


class SubstrateChain:
    """Chain access through substrate-interface (the gateway's "chain" extra)."""

    def __init__(self, url: str):
        from substrateinterface import SubstrateInterface

        self._substrate = SubstrateInterface(url=url, ss58_format=42)

    def finalized_head(self) -> tuple[int, str]:
        head = self._substrate.get_chain_finalised_head()
        return self._substrate.get_block_number(head), head

    def block_hash(self, number: int) -> str:
        return self._substrate.get_block_hash(number)

    def events(self, block_hash: str) -> list[ChainEvent]:
        out = []
        for position, record in enumerate(self._substrate.get_events(block_hash)):
            v = record.value
            out.append(ChainEvent(position, v.get("extrinsic_idx"), str(v.get("phase")), v["module_id"], v["event_id"], v["attributes"]))
        return out

    def pool(self, netuid: int, block_hash: str) -> Pool:
        q = self._substrate.query
        tao = q("SubtensorModule", "SubnetTAO", [netuid], block_hash=block_hash).value
        alpha = q("SubtensorModule", "SubnetAlphaIn", [netuid], block_hash=block_hash).value
        moving = q("SubtensorModule", "SubnetMovingPrice", [netuid], block_hash=block_hash).value
        # A fixed-point number with 32 fractional bits.
        return Pool(int(tao), int(alpha), Decimal(int(moving["bits"])) / Decimal(2**32))

    def extrinsic_hash(self, block_hash: str, extrinsic_idx: int) -> str | None:
        try:
            return self._substrate.get_block(block_hash=block_hash)["extrinsics"][extrinsic_idx].value.get("extrinsic_hash")
        except Exception:
            return None


def alpha_value_tao_rao(tao_moved_rao: int, pool: Pool, haircut: float) -> int:
    """The conservative TAO value of alpha transferred at a pool state, in rao."""
    if tao_moved_rao <= 0 or pool.tao_rao <= 0 or pool.alpha_rao <= 0:
        return 0
    tao_moved = Decimal(tao_moved_rao)
    spot = Decimal(pool.tao_rao) / Decimal(pool.alpha_rao)
    alpha_units = tao_moved / spot
    # What selling that much alpha into a constant-product pool would actually return.
    sold = Decimal(pool.tao_rao) * alpha_units / (Decimal(pool.alpha_rao) + alpha_units)
    at_moving_price = alpha_units * pool.moving_price_tao
    lowest = min(tao_moved, sold, at_moving_price)
    return int(lowest * (Decimal(1) - Decimal(str(haircut))))


class ChainWatcher:
    def __init__(self, state: GatewayState, chain: Chain, oracle, max_blocks_per_pass: int = 50):
        self.state = state
        self.chain = chain
        self.oracle = oracle
        self.max_blocks_per_pass = max_blocks_per_pass

    @property
    def treasury(self) -> str | None:
        return self.state.settings.tao_treasury_address

    def run_once(self) -> int:
        """Processes the next finalized blocks. Returns how many were completed."""
        if not self.treasury:
            return 0
        head_number, head_hash = self.chain.finalized_head()
        with self.state.session() as s, s.begin():
            cursor = s.get(ChainCursor, CHAIN)
            if cursor is None:
                # Start at the present; there is nothing to credit from before payments existed.
                s.add(ChainCursor(chain=CHAIN, block_number=head_number, block_hash=head_hash, updated_at=time.time()))
                return 0
            start = cursor.block_number + 1
        done = 0
        for number in range(start, min(head_number, start + self.max_blocks_per_pass - 1) + 1):
            try:
                self.process_block(number, self.chain.block_hash(number), behind=head_number - number)
            except PriceUnavailable as exc:
                log.warning("pausing TAO crediting at block %d: %s", number, exc)
                break
            done += 1
        return done

    def process_block(self, number: int, block_hash: str, behind: int = 0) -> None:
        events = self.chain.events(block_hash)
        succeeded = {e.extrinsic_idx for e in events if (e.module, e.name) == ("System", "ExtrinsicSuccess")}
        with self.state.session() as s, s.begin():
            for event in events:
                if event.phase != "ApplyExtrinsic" or event.extrinsic_idx not in succeeded:
                    continue
                if (event.module, event.name) == ("Balances", "Transfer"):
                    self._tao(s, number, block_hash, event)
                elif (event.module, event.name) == ("SubtensorModule", "StakeTransferred"):
                    self._alpha(s, number, block_hash, event, behind)
            cursor = s.get(ChainCursor, CHAIN, with_for_update=True)
            cursor.block_number, cursor.block_hash, cursor.updated_at = number, block_hash, time.time()

    # ------------------------------------------------------------------ deposits

    def _account_for(self, s, address: str) -> str | None:
        link = s.scalars(select(WalletLink).where(WalletLink.address == address)).first()
        return link.account_id if link else None

    def _ref(self, block_hash: str, event: ChainEvent) -> str:
        return f"{block_hash}:{event.extrinsic_idx}:{event.position}"

    def _tao(self, s, number: int, block_hash: str, event: ChainEvent) -> None:
        attrs = event.attributes
        if attrs.get("to") != self.treasury:
            return
        sender, amount_rao = attrs["from"], int(attrs["amount"])
        ref = self._ref(block_hash, event)
        if payments.find(s, "tao", ref) is not None and payments.find(s, "tao", ref).status == "credited":
            return
        tao = Decimal(amount_rao) / RAO
        common = dict(
            provider="tao", provider_ref=ref, asset="tao", asset_amount=str(tao), chain=CHAIN, from_address=sender,
            block_number=number, tx_hash=self.chain.extrinsic_hash(block_hash, event.extrinsic_idx),
        )
        account_id = self._account_for(s, sender)
        if account_id is None:
            payments.record(s, account_id=UNATTRIBUTED, status="needs_review", detail={"reason": "sender coldkey isn't linked"}, **common)
            return
        if tao < Decimal(str(self.state.settings.tao_min_deposit)):
            payments.record(s, account_id=account_id, status="below_minimum", **common)
            return
        rate, source = self.oracle.usd_per_tao()
        micros = ledger.to_micros(tao * rate)
        payment = payments.record(s, account_id=account_id, status="pending", rate_usd=str(rate), rate_source=source, **common)
        if payments.credit(s, payment, micros, f"{tao.normalize()} TAO top-up"):
            self._bonus(s, payment, micros)

    def _alpha(self, s, number: int, block_hash: str, event: ChainEvent, behind: int) -> None:
        origin, destination, _hotkey, origin_netuid, destination_netuid, tao_moved = event.attributes
        if destination != self.treasury:
            return
        ref = self._ref(block_hash, event)
        existing = payments.find(s, "alpha", ref)
        if existing is not None and existing.status == "credited":
            return
        netuid = int(origin_netuid)
        common = dict(
            provider="alpha", provider_ref=ref, asset=f"alpha:{netuid}", chain=CHAIN, from_address=origin, block_number=number,
            tx_hash=self.chain.extrinsic_hash(block_hash, event.extrinsic_idx),
        )
        account_id = self._account_for(s, origin) or UNATTRIBUTED
        reason = None
        if account_id == UNATTRIBUTED:
            reason = "sender coldkey isn't linked"
        elif int(origin_netuid) != int(destination_netuid) or netuid not in self.state.settings.alpha_netuids:
            reason = f"alpha from subnet {origin_netuid}->{destination_netuid} isn't accepted"
        elif behind > STATE_HORIZON_BLOCKS:
            reason = "too far behind to value alpha at its own block"
        if reason:
            payments.record(s, account_id=account_id, status="needs_review", detail={"reason": reason, "tao_moved_rao": int(tao_moved)}, **common)
            return

        pool = self.chain.pool(netuid, block_hash)
        value_rao = alpha_value_tao_rao(int(tao_moved), pool, self.state.settings.alpha_haircut)
        rate, source = self.oracle.usd_per_tao()
        tao_value = Decimal(value_rao) / RAO
        micros = ledger.to_micros(tao_value * rate)
        detail = {
            "tao_moved_rao": int(tao_moved), "pool_tao_rao": pool.tao_rao, "pool_alpha_rao": pool.alpha_rao,
            "moving_price_tao": str(pool.moving_price_tao), "haircut": self.state.settings.alpha_haircut, "valued_tao": str(tao_value),
        }
        if micros > ledger.to_micros(self.state.settings.alpha_max_usd_per_deposit):
            payments.record(s, account_id=account_id, status="needs_review", rate_usd=str(rate), rate_source=source,
                            asset_amount=str(tao_value), detail={**detail, "reason": "above the per-deposit cap"}, **common)
            return
        payment = payments.record(s, account_id=account_id, status="pending", rate_usd=str(rate), rate_source=source,
                                  asset_amount=str(tao_value), detail=detail, **common)
        if payments.credit(s, payment, micros, f"Subnet {netuid} alpha top-up"):
            self._bonus(s, payment, micros)

    def _bonus(self, s, payment, credited_micros: int) -> None:
        """KUNO_CHAIN_CREDIT_BONUS on what the deposit credited (after any alpha haircut), in the same transaction."""
        share = self.state.settings.chain_credit_bonus
        if share > 0:
            payments.credit_bonus(s, payment, credited_micros, share, f"{share:.0%} bonus on a {payment.provider.upper()} top-up")
