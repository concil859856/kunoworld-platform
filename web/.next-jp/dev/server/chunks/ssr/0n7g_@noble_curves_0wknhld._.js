module.exports = [
"[project]/sdk/js/node_modules/@noble/curves/abstract/curve.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ScalarMultiplier",
    ()=>ScalarMultiplier,
    "createCurveFields",
    ()=>createCurveFields,
    "createKeygen",
    ()=>createKeygen,
    "interleavedMSMUnsafe",
    ()=>interleavedMSMUnsafe,
    "mulAddUnsafe",
    ()=>mulAddUnsafe,
    "normalizeZ",
    ()=>normalizeZ,
    "pippenger",
    ()=>pippenger,
    "probeRandomBytes",
    ()=>probeRandomBytes,
    "validatePointCons",
    ()=>validatePointCons
]);
/**
 * Methods for elliptic curve multiplication by scalars.
 * Contains wNAF-based ScalarMultiplier, pippenger.
 * @module
 */ /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/modular.js [app-ssr] (ecmascript)");
;
;
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
const _4n = /* @__PURE__ */ BigInt(4);
const BLIND_BYTES = 16;
const BLIND_BITS = 128;
// Fixed-window width for the constant-time multiply of un-precomputed points (W===1).
// A flat 2^FW_WINDOW table has a small, scalar-independent build cost that amortizes over a single
// multiply, unlike the larger per-point wNAF tables that only pay off when cached.
const FW_WINDOW = 5;
// Precompute tables are capped at ~2 GiB of estimated heap. Rejecting larger windows up front
// turns a typo'd window size into an immediate error instead of a multi-GB allocation (or an
// effective hang) when the lazy table is built on first multiply.
const TABLE_BYTES_MAX = /* @__PURE__ */ (()=>2 ** 31)();
function validatePointCons(Point) {
    const pc = Point;
    if (typeof pc !== 'function') throw new TypeError('"Point" expected constructor, got type=' + typeof Point);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["afunction"])(pc.fromAffine, 'Point.fromAffine');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["afunction"])(pc.fromBytes, 'Point.fromBytes');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["afunction"])(pc.fromHex, 'Point.fromHex');
    // Generic helpers (ScalarMultiplier, normalizeZ, MSM) dereference BASE / ZERO:
    // fail here with a typed error instead of an `undefined` access later.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aobject"])(pc.BASE, 'Point.BASE');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aobject"])(pc.ZERO, 'Point.ZERO');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateField"])(pc.Fp);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateField"])(pc.Fn);
}
function normalizeZ(c, points) {
    // Match MSM helpers: reject malformed public inputs before reading projective internals.
    validatePointCons(c);
    validateMSMPoints(points, c);
    // Identity points (Z=0) rely on an implicit contract: FpInvertBatch without `passZero`
    // yields `undefined` for zero inputs, and `toAffine(undefined)` falls back to its internal
    // is0 handling instead of using the batch inverse.
    const invertedZs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FpInvertBatch"])(c.Fp, points.map((p)=>p.Z));
    return points.map((p, i)=>c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW(W, bits, min = 1) {
    if (!Number.isSafeInteger(W) || W < min || W > bits) throw new Error('invalid window size, expected [' + min + '..' + bits + '], got W=' + W);
}
// Rough per-point heap estimate for the {@link TABLE_BYTES_MAX} cap: up to 4 projective/extended
// coordinates of Fp.BYTES each, plus bigint/object overhead. Callers pass the point count of the
// largest table the checked parameters can produce.
function validateTableBytes(numPoints, fpBytes) {
    const bytes = numPoints * (4 * fpBytes + 128);
    if (bytes > TABLE_BYTES_MAX) throw new Error('invalid window size: table would need ~' + Math.ceil(bytes / 2 ** 20) + ' MiB, max ' + TABLE_BYTES_MAX / 2 ** 20 + ' MiB');
}
function probeRandomBytes(randomBytes, length) {
    if (randomBytes === undefined) return undefined;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["afunction"])(randomBytes, 'randomBytes');
    try {
        const probe = randomBytes(length);
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isBytes"])(probe) || probe.length !== length) return undefined;
    } catch  {
        return undefined;
    }
    return randomBytes;
}
function validateMSMPoints(points, c) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(points, 'points');
    points.forEach((p, i)=>{
        if (!(p instanceof c)) throw new Error('invalid point at index ' + i);
    });
}
// Default bound is field membership (0 <= s < field.ORDER); a `maxScalar` override widens it
// to 0 <= s < maxScalar for callers that accept oversized scalars.
function validateMSMScalars(scalars, field, maxScalar) {
    if (!Array.isArray(scalars)) throw new Error('array of scalars expected');
    scalars.forEach((s, i)=>{
        const ok = maxScalar === undefined ? field.isValid(s) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isPosBig"])(s) && s < maxScalar;
        if (!ok) throw new Error('invalid scalar at index ' + i);
    });
}
const pointWindowSizes = new WeakMap();
function getWindowSize(P) {
    // `1` is the uncached sentinel: use the non-precomputed (wNAF / fixed-window) path.
    return pointWindowSizes.get(P) || 1;
}
/** Table of odd multiples [1P, 3P, ..., (2⋅size−1)P]; width-W wNAF uses size = 2^(W−2). */ function oddMultiples(p, size) {
    const dbl = p.double();
    const t = [
        p
    ];
    for(let j = 1; j < size; j++)t.push(t[j - 1].add(dbl));
    return t;
}
/**
 * Width-W wNAF signed-digit recoding (W >= 2), LSB-first: digits are 0 or odd with
 * |digit| < 2^(W−1); nonzero density ~1/(W+1) (a nonzero digit is followed by W−1 zeros).
 */ function wnafDigits(n, W) {
    const size = 2 ** W;
    const half = size / 2;
    const mask = BigInt(size - 1);
    const d = [];
    while(n > _0n){
        let w = 0;
        if (n & _1n) {
            w = Number(n & mask); // n mod 2^W, odd
            if (w >= half) w -= size; // signed residue
            n -= BigInt(w); // n - w ≡ 0 mod 2^W: next W−1 digits are zero
        }
        d.push(w);
        n >>= _1n;
    }
    return d;
}
/**
 * Fixed-position signed-window recoding for precomputed wNAF: `n = Σ digits[w]⋅2^(w⋅W)` with
 * digits in `[−2^(W−1)+1, 2^(W−1)]`. Digit count is fixed by `windows` (callers reserve one
 * extra window for the final carry), so recoding length does not depend on the scalar.
 */ function signedWindowDigits(n, W, windows) {
    const size = 2 ** W;
    const half = size / 2;
    const mask = BigInt(size - 1);
    const shiftBy = BigInt(W);
    const d = [];
    for(let w = 0; w < windows; w++){
        let v = Number(n & mask);
        n >>= shiftBy;
        if (v > half) {
            v -= size; // negative digit, carry into the next window
            n += _1n;
        }
        d.push(v);
    }
    // Internal invariant: leftover bits mean the window count did not cover the scalar.
    if (n !== _0n) throw new Error('invalid wnaf');
    return d;
}
/**
 * Shared vartime walk over per-scalar wNAF digit streams: one doubling of a single shared
 * accumulator per bit position of the longest recoding, one signed table addition per
 * nonzero digit. `tables[i]` must hold the odd multiples of the i-th point.
 */ function wnafWalk(zero, tables, digits) {
    let max = 0;
    for (const d of digits)max = Math.max(max, d.length);
    let acc = zero;
    for(let bit = max - 1; bit >= 0; bit--){
        if (bit !== max - 1) acc = acc.double();
        for(let i = 0; i < digits.length; i++){
            const w = digits[i][bit]; // reads past shorter recodings yield undefined, skipped below
            if (w) {
                const item = tables[i][Math.abs(w) - 1 >> 1];
                acc = acc.add(w < 0 ? item.negate() : item);
            }
        }
    }
    return acc;
}
class ScalarMultiplier {
    Point;
    BASE;
    ZERO;
    randomBytes;
    wnafPrecomputes = new WeakMap();
    baseCanBeBlinded;
    bits;
    // Parametrized with a given Point class (not individual point)
    constructor(Point, randomBytes){
        validatePointCons(Point);
        // Probe the RNG once (see {@link probeRandomBytes}): in environments without working
        // randomness (e.g. no WebCrypto), shouldBlind() then routes secret multiplication to the
        // unblinded constant-time path instead of throwing on every multiply(). The shape of
        // returned bytes is still validated on every blinded call, where breakage fails closed.
        this.randomBytes = probeRandomBytes(randomBytes, BLIND_BYTES);
        this.Point = Point;
        this.BASE = Point.BASE;
        this.ZERO = Point.ZERO;
        this.bits = Point.Fn.BITS;
    }
    /**
     * Creates a signed fixed-window wNAF precomputation table: for every window w, the
     * multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
     * so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
     * window absorbs the final carry of signed-digit recoding.
     * For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
     * @param point - Point instance
     * @param W - window size
     * @param bits - scalar bitlength the table must cover
     */ buildWnafTable(point, W, bits) {
        // W needs no re-validation: its only source is setWindowSize(), which enforces
        // 1 <= W <= Fn.BITS <= bits (the blinded path only ever widens bits) and caps the
        // resulting table at ~2 GiB (sized against the wider blinded layout).
        const windows = Math.ceil(bits / W) + 1;
        const half = 2 ** (W - 1);
        const comp = [];
        let base = point;
        for(let w = 0; w < windows; w++){
            let acc = base;
            for(let i = 0; i < half; i++){
                comp.push(acc);
                acc = acc.add(base);
            }
            base = comp[comp.length - 1].double(); // 2⋅(2^(W−1)⋅base) = next window's base
        }
        return {
            W,
            bits,
            windows,
            comp
        };
    }
    /**
     * Implements ec multiplication using precomputed signed fixed-window wNAF tables.
     * Constant-time: fixed window count with one table addition per window — zero digits feed
     * the fake accumulator — and no doublings; the lookup scans the whole window slice.
     * Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
     * {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
     * signedWindowDigits throws if `n` exceeds the table.
     * @returns real and fake (for const-time) points
     */ wnafCachedCT(precomputes, n) {
        const { W, windows, comp } = precomputes;
        const half = 2 ** (W - 1);
        const digits = signedWindowDigits(n, W, windows);
        let p = this.ZERO;
        let f = this.BASE;
        for(let w = 0; w < windows; w++){
            const digit = digits[w];
            const start = w * half;
            // Data-oblivious select: touch every entry of the window before the digit branch.
            const idx = Math.abs(digit) - 1; // -1 for zero digits: matches nothing, `sel` unused
            let sel = comp[start];
            for(let i = 1; i < half; i++)sel = i === idx ? comp[start + i] : sel;
            const neg = sel.negate(); // compute both signs; the digit only picks one
            if (digit === 0) f = f.add(comp[start]);
            else p = p.add(digit < 0 ? neg : sel);
        }
        return {
            p,
            f
        };
    }
    // Cache key is point identity plus (W, bits); at most two entries exist per point (public-width
    // `Fn.BITS` and blinded `Fn.BITS + BLIND_BITS`). Callers must not reuse the same point with
    // incompatible `transform(...)` layouts and expect a separate cache entry.
    getWnafPrecomputes(W, point, bits, transform) {
        let entries = this.wnafPrecomputes.get(point);
        let comp = entries?.find((entry)=>entry.W === W && entry.bits === bits);
        if (!comp) {
            comp = this.buildWnafTable(point, W, bits);
            if (typeof transform === 'function') comp = {
                ...comp,
                comp: transform(comp.comp)
            };
            if (!entries) {
                entries = [];
                this.wnafPrecomputes.set(point, entries);
            }
            entries.push(comp);
        }
        return comp;
    }
    assertPoint(point) {
        if (!(point instanceof this.Point)) throw new TypeError('"point" expected Point instance, got type=' + typeof point);
    }
    // Shared prologue of the constant-time entry points. Rejects scalar 0: in key/signature-style
    // callers a zero scalar means broken upstream plumbing, and concrete Points already reject it.
    // Uses inRange instead of Fn.isValidNot0: validateField() only certifies the arithmetic subset.
    validateMulInput(point, scalar) {
        this.assertPoint(point);
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["inRange"])(scalar, _1n, this.Point.Fn.ORDER)) throw new Error('invalid scalar');
    }
    // Constant-time dispatch shared by mulCT / mulCTBlinded. Un-precomputed points (W===1, e.g.
    // ECDH peer keys) skip building a throwaway cached table in favor of a small fixed-window
    // multiply. `n` must be < 2^bits.
    runCT(point, n, bits, transform) {
        const W = getWindowSize(point);
        if (W === 1) return this.fixedWindowCT(point, n, bits);
        return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform), n);
    }
    mulCT(point, scalar, transform) {
        this.validateMulInput(point, scalar);
        return this.runCT(point, scalar, this.bits, transform);
    }
    mulCTBlinded(point, scalar, transform) {
        this.validateMulInput(point, scalar);
        // Blinding computes n = scalar + blind*Fn.ORDER, then n*P via a constant-time multiply. This
        // equals scalar*P only when Fn.ORDER*P == O; callers guarantee that via shouldBlind() (always
        // for cofactor-1 curves; for cofactored curves only BASE, and only after checking BASE*n == O).
        // Fail before building the (large) precompute table if randomness is unavailable.
        if (this.randomBytes === undefined) throw new Error('randomBytes is required for scalar blinding');
        const bits = this.Point.Fn.BITS + BLIND_BITS;
        const blind = this.randomBytes(BLIND_BYTES);
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isBytes"])(blind) || blind.length !== BLIND_BYTES) throw new Error('randomBytes returned invalid byte array');
        // Force the top two bits of the 128-bit blind to 10xxxxxx, so blind is in [2^127, 1.5*2^127):
        // * `| 0x80` (bit 127 = 1) is the load-bearing part: it guarantees blind >= 2^127, so the blind
        //   is always a full-width, nonzero factor and the scalar is masked even with a degenerate RNG.
        // * `& 0x3f` (bit 126 = 0) is a safety margin: it caps blind < 1.5*2^127, keeping
        //   blind*Fn.ORDER + scalar < 0.75*2^(nBits+128), i.e. ~half a window below the 2^(nBits+128)
        //   ceiling. Not strictly required for the bound (see below), but it reserves headroom so the
        //   guarantee does not rest on the tight `Fn.ORDER < 2^Fn.BITS` fact and the final carry window
        //   only ever holds a small carry, never a full digit.
        blind[0] = blind[0] & 0x3f | 0x80;
        // Even at the extreme (blind < 2^128, scalar < Fn.ORDER < 2^nBits): n <= 2^128*Fn.ORDER - 1 <
        // 2^(nBits+128), so n stays below 2^bits and within the blinded table's
        // window count. Both cached CT kernels run a fixed number of windows/rows with one point-add
        // each, so the add count is independent of scalar (constant-time).
        const n = scalar + (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberBE"])(blind) * this.Point.Fn.ORDER;
        return this.runCT(point, n, bits, transform);
    }
    /**
     * Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
     * A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
     * far cheaper to build for a single use. The point-operation sequence is independent of `n`:
     * build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
     * every table entry, and one addition (adds the identity when the window digit is 0 — never
     * skipped).
     *
     * `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
     * add), which holds for the Weierstrass/Edwards point types used here. The table is left in
     * projective form (no normalizeZ): normalizing this small a table costs more than the
     * mixed-add savings it would buy for a single multiply.
     * @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
     * (this path needs no fake accumulator — its op-count is already scalar-independent).
     */ fixedWindowCT(point, n, bits) {
        const W = FW_WINDOW;
        const size = 1 << W;
        const mask = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bitMask"])(W);
        // Flat table [O, point, 2*point, ..., (size-1)*point].
        const table = new Array(size);
        table[0] = this.ZERO;
        for(let i = 1; i < size; i++)table[i] = table[i - 1].add(point);
        // Horner MSB->LSB. windows*W >= bits and n < 2^bits, so every bit of n is consumed.
        const windows = Math.ceil(bits / W);
        let acc = this.ZERO;
        for(let window = windows - 1; window >= 0; window--){
            // W doublings per window; skipped for the first (topmost) window, where acc is still the
            // identity. The skip is scalar-independent: it depends only on the loop index.
            if (window !== windows - 1) for(let d = 0; d < W; d++)acc = acc.double();
            const digit = Number(n >> BigInt(window * W) & mask);
            // Data-oblivious select: touch every entry, same as wnafCachedCT.
            let sel = table[0];
            for(let i = 1; i < size; i++)sel = i === digit ? table[i] : sel;
            acc = acc.add(sel); // one add per window, even for digit 0
        }
        return {
            p: acc,
            f: acc
        };
    }
    shouldBlind(point, cofactor) {
        // No usable RNG (probed in the constructor): blinding is impossible, use the plain CT path.
        if (this.randomBytes === undefined) return false;
        if (cofactor === _1n) return true;
        if (point !== this.BASE) return false;
        if (this.baseCanBeBlinded === undefined) this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
        return this.baseCanBeBlinded;
    }
    mulSecret(point, scalar, cofactor, transform) {
        return this.shouldBlind(point, cofactor) ? this.mulCTBlinded(point, scalar, transform) : this.mulCT(point, scalar, transform);
    }
    mulUnsafe(point, scalar, transform) {
        this.assertPoint(point);
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isPosBig"])(scalar)) throw new Error('invalid scalar');
        const W = getWindowSize(point);
        // W === 1 (un-precomputed): one-shot width-4 wNAF via {@link mulAddUnsafe} with L=1 —
        // a cached table would be thrown away after one use. `allowOversized` swaps the
        // `s < Fn.ORDER` check for mulAddUnsafe's `Fn.ORDER^4` DoS cap.
        //
        // Oversized scalar could happen when:
        // a) user passes large scalar on their own (rare)
        // b) `assertValidity()` calls `isTorsionFree()`, which multiplies point by `Fn.ORDER`
        if (W === 1 || scalar >= this.Point.Fn.ORDER) return mulAddUnsafe(this.Point, [
            point
        ], [
            scalar
        ], true);
        // Precomputed points reuse the CT kernel (fake accumulator discarded): with W=6 only
        // ~1/64 of window-adds are skippable, so a dedicated vartime kernel saved just ~6% on
        // this path while doubling the cached-table code surface.
        const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform);
        return this.wnafCachedCT(precomputes, scalar).p;
    }
    // Remembers the window size used for precomputed wNAF multiplication of the given point
    // and drops any previously built tables. Usually only the base point is precomputed.
    // W=1 resets the point to the un-precomputed (table-less) paths.
    // W is additionally capped so tables stay under ~2 GiB ({@link TABLE_BYTES_MAX}).
    setWindowSize(point, W) {
        this.assertPoint(point);
        validateW(W, this.bits);
        // Size against the widest table this W can produce: the blinded path adds BLIND_BITS.
        const windows = Math.ceil((this.bits + BLIND_BITS) / W) + 1;
        validateTableBytes(windows * 2 ** (W - 1), this.Point.Fp.BYTES);
        pointWindowSizes.set(point, W);
        this.wnafPrecomputes.delete(point);
    }
    // True when a window size is set: tables themselves are built lazily on first multiply.
    hasWindowSize(point) {
        return getWindowSize(point) !== 1;
    }
}
function mulAddUnsafe(c, points, scalars, allowOversized = false) {
    validatePointCons(c);
    validateMSMPoints(points, c);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abool"])(allowOversized, 'allowOversized');
    // Oversized cap is ORDER^4: hard bound to mitigate DoS, walk length grows with bitLen(s).
    validateMSMScalars(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n : undefined);
    if (points.length !== scalars.length) throw new Error('arrays of points and scalars must have equal length');
    const tables = points.map((p)=>oddMultiples(p, 4));
    const digits = scalars.map((n)=>wnafDigits(n, 4));
    return wnafWalk(c.ZERO, tables, digits);
}
function pippenger(c, points, scalars) {
    // 0 is accepted in scalars
    validatePointCons(c);
    const fieldN = c.Fn;
    validateMSMPoints(points, c);
    validateMSMScalars(scalars, fieldN);
    const plength = points.length;
    const slength = scalars.length;
    if (plength !== slength) throw new Error('arrays of points and scalars must have equal length');
    const zero = c.ZERO;
    // Without this, the window loop below would still run ~Fn.BITS doublings of ZERO.
    if (plength === 0) return zero;
    const wbits = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bitLen"])(BigInt(plength));
    let windowSize = 1; // bits
    if (wbits > 12) windowSize = wbits - 3;
    else if (wbits > 4) windowSize = wbits - 2;
    else if (wbits > 0) windowSize = 2;
    const MASK = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bitMask"])(windowSize);
    const buckets = new Array(Number(MASK) + 1).fill(zero); // +1 for zero array
    const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
    let sum = zero;
    for(let i = lastBits; i >= 0; i -= windowSize){
        buckets.fill(zero);
        for(let j = 0; j < slength; j++){
            const scalar = scalars[j];
            const wbits = Number(scalar >> BigInt(i) & MASK);
            buckets[wbits] = buckets[wbits].add(points[j]);
        }
        let resI = zero; // not using this will do small speed-up, but will lose ct
        // Skip first bucket, because it is zero
        for(let j = buckets.length - 1, sumI = zero; j > 0; j--){
            sumI = sumI.add(buckets[j]);
            resI = resI.add(sumI);
        }
        sum = sum.add(resI);
        if (i !== 0) for(let j = 0; j < windowSize; j++)sum = sum.double();
    }
    return sum;
}
function interleavedMSMUnsafe(c, points, windowSize) {
    validatePointCons(c);
    const fieldN = c.Fn;
    // Signed odd digits need at least width 2 (W=2 is plain NAF with a single-entry table).
    validateW(windowSize, fieldN.BITS, 2);
    validateMSMPoints(points, c);
    validateTableBytes(points.length * 2 ** (windowSize - 2), c.Fp.BYTES);
    const tables = points.map((p)=>oddMultiples(p, 2 ** (windowSize - 2)));
    return (scalars)=>{
        validateMSMScalars(scalars, fieldN);
        if (scalars.length > points.length) throw new Error('array of scalars must not be larger than array of points');
        return wnafWalk(c.ZERO, tables, scalars.map((n)=>wnafDigits(n, windowSize)));
    };
}
function createField(order, field, isLE) {
    if (field) {
        // Reuse supplied field overrides as-is; `isLE` only affects freshly constructed fallback
        // fields, and validateField() below only checks the arithmetic subset, not full byte/cmov
        // behavior.
        if (field.ORDER !== order) throw new Error('Field.ORDER must match order: Fp == p, Fn == n');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateField"])(field);
        return field;
    } else {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Field"])(order, {
            isLE
        });
    }
}
function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
    if (type !== 'weierstrass' && type !== 'edwards') throw new Error('expected curve type "weierstrass" or "edwards"');
    if (FpFnLE === undefined) FpFnLE = type === 'edwards';
    if (!CURVE || typeof CURVE !== 'object') throw new Error(`expected valid ${type} CURVE object`);
    // Validate before reading Fp/Fn so explicit null fails with an options-object error.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(curveOpts);
    for (const p of [
        'p',
        'n',
        'h'
    ]){
        const val = CURVE[p];
        if (!((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isPosBig"])(val) && val !== _0n)) throw new Error(`CURVE.${p} must be positive bigint`);
    }
    const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
    const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
    const _b = type === 'weierstrass' ? 'b' : 'd';
    const params = [
        'Gx',
        'Gy',
        'a',
        _b
    ];
    for (const p of params){
        // @ts-ignore
        if (!Fp.isValid(CURVE[p])) throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
    }
    CURVE = Object.freeze(Object.assign({}, CURVE));
    return {
        CURVE,
        Fp,
        Fn
    };
}
function createKeygen(randomSecretKey, getPublicKey) {
    return function keygen(seed) {
        const secretKey = randomSecretKey(seed);
        return {
            secretKey,
            publicKey: getPublicKey(secretKey)
        };
    };
}
}),
"[project]/sdk/js/node_modules/@noble/curves/abstract/edwards.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PrimeEdwardsPoint",
    ()=>PrimeEdwardsPoint,
    "eddsa",
    ()=>eddsa,
    "edwards",
    ()=>edwards
]);
/**
 * Twisted Edwards curve. The formula is: ax² + y² = 1 + dx²y².
 * For design rationale of types / exports, see weierstrass module documentation.
 * Untwisted Edwards curves exist, but they aren't used in real-world protocols.
 * @module
 */ /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/curve.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/modular.js [app-ssr] (ecmascript)");
;
;
;
// Be friendly to bad ECMAScript parsers by not using bigint literals
// prettier-ignore
const _0n = /* @__PURE__ */ BigInt(0), _1n = /* @__PURE__ */ BigInt(1), _2n = /* @__PURE__ */ BigInt(2), _4n = /* @__PURE__ */ BigInt(4), _8n = /* @__PURE__ */ BigInt(8);
// Affine Edwards-equation check only; this does not prove subgroup membership, canonical
// encoding, prime-order base-point requirements, or identity exclusion.
function isEdValidXY(Fp, CURVE, x, y) {
    const x2 = Fp.sqr(x);
    const y2 = Fp.sqr(y);
    const left = Fp.add(Fp.mul(CURVE.a, x2), y2);
    const right = Fp.add(Fp.ONE, Fp.mul(CURVE.d, Fp.mul(x2, y2)));
    return Fp.eql(left, right);
}
function edwards(params, extraOpts = {}) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(extraOpts, {}, {}, 'extraOpts');
    const opts = extraOpts;
    const validated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createCurveFields"])('edwards', params, opts, opts.FpFnLE);
    const { Fp, Fn } = validated;
    let CURVE = validated.CURVE;
    const { h: cofactor } = CURVE;
    // The unified add-2008-hwcd formulas (see EdwardsPoint.add/double) are complete —
    // exception-free for every input pair — only when a is a square and d a non-square in Fp
    // (Bernstein–Birkner–Joye–Lange–Peters, "Twisted Edwards curves", thm 3.3). The constant-time
    // kernels in curve.ts assume completeness, so an incomplete curve could silently produce
    // wrong results on exceptional inputs. Fail construction instead.
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FpLegendre"])(Fp, CURVE.a) !== 1) throw new Error('edwards: CURVE.a must be a square in Fp for complete addition formulas');
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FpLegendre"])(Fp, CURVE.d) !== -1) throw new Error('edwards: CURVE.d must be a non-square in Fp for complete addition formulas');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(opts, {}, {
        uvRatio: 'function',
        randomBytes: 'function'
    });
    const randomBytes = opts.randomBytes === undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"] : opts.randomBytes;
    // Coordinate and ZIP-215 bounds follow the base-field byte container, not scalar bytes.
    const MASK = _2n << BigInt(Fp.BYTES * 8) - _1n;
    function isOdd(n) {
        if (!Fp.isOdd) throw new Error('Field does not have .isOdd()');
        return Fp.isOdd(n);
    }
    // sqrt(u/v)
    const uvRatio = opts.uvRatio === undefined ? (u, v)=>{
        try {
            return {
                isValid: true,
                value: Fp.sqrt(Fp.div(u, v))
            };
        } catch (e) {
            return {
                isValid: false,
                value: _0n
            };
        }
    } : opts.uvRatio;
    // Validate whether the passed curve params are valid.
    // equation ax² + y² = 1 + dx²y² should work for generator point.
    if (!isEdValidXY(Fp, CURVE, CURVE.Gx, CURVE.Gy)) throw new Error('bad curve params: generator point');
    // Multiplication by param `a` sits on the double() / add() hot paths. For the common twists
    // a=-1 (ed25519, jubjub) and a=1 (ed448) the full field multiplication is replaced with
    // negation / identity. Selection depends only on public curve constants.
    const mulA = Fp.eql(CURVE.a, Fp.neg(Fp.ONE)) ? (x)=>Fp.neg(x) : Fp.eql(CURVE.a, Fp.ONE) ? (x)=>x : (x)=>Fp.mul(CURVE.a, x); // prettier-ignore
    /**
     * Asserts coordinate is valid: 0 <= n < MASK.
     * Coordinates >= Fp.ORDER are allowed for zip215.
     */ function acoord(title, n, banZero = false) {
        const min = banZero ? _1n : _0n;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aInRange"])('coordinate ' + title, n, min, MASK);
        return n;
    }
    function aedpoint(other) {
        if (!(other instanceof Point)) throw new Error('EdwardsPoint expected');
    }
    // Extended Point works in extended coordinates: (X, Y, Z, T) ∋ (x=X/Z, y=Y/Z, T=xy).
    // https://en.wikipedia.org/wiki/Twisted_Edwards_curve#Extended_coordinates
    class Point {
        static BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE, Fp.mul(CURVE.Gx, CURVE.Gy));
        static ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ONE, Fp.ZERO);
        static Fp = Fp;
        static Fn = Fn;
        X;
        Y;
        Z;
        T;
        constructor(X, Y, Z, T){
            this.X = acoord('x', X);
            this.Y = acoord('y', Y);
            this.Z = acoord('z', Z, true);
            this.T = acoord('t', T);
            Object.freeze(this);
        }
        static CURVE() {
            return CURVE;
        }
        /**
         * Create one extended Edwards point from affine coordinates.
         * Does NOT validate that the point is on-curve or torsion-free.
         * Use `.assertValidity()` on adversarial inputs.
         */ static fromAffine(p) {
            if (p instanceof Point) throw new Error('extended point not allowed');
            const { x, y } = p || {};
            acoord('x', x);
            acoord('y', y);
            return new Point(x, y, Fp.ONE, Fp.mul(x, y));
        }
        // Uses algo from RFC8032 5.1.3.
        static fromBytes(bytes, zip215 = false) {
            const len = Fp.BYTES;
            const { a, d } = CURVE;
            bytes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(bytes, len, 'point'));
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abool"])(zip215, 'zip215');
            const normed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(bytes); // copy again, we'll manipulate it
            const lastByte = bytes[len - 1]; // select last byte
            normed[len - 1] = lastByte & ~0x80; // clear last bit
            const y = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(normed);
            // zip215=true is good for consensus-critical apps. =false follows RFC8032 / NIST186-5.
            // RFC8032 prohibits >= p, but ZIP215 doesn't
            // zip215=true:  0 <= y < MASK (2^256 for ed25519)
            // zip215=false: 0 <= y < P (2^255-19 for ed25519)
            const max = zip215 ? MASK : Fp.ORDER;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aInRange"])('point.y', y, _0n, max);
            // Ed25519: x² = (y²-1)/(dy²+1) mod p. Ed448: x² = (y²-1)/(dy²-1) mod p. Generic case:
            // ax²+y²=1+dx²y² => y²-1=dx²y²-ax² => y²-1=x²(dy²-a) => x²=(y²-1)/(dy²-a)
            const y2 = Fp.sqr(y); // denominator is always non-0 mod p.
            const u = Fp.sub(y2, Fp.ONE); // u = y² - 1
            const v = Fp.sub(Fp.mulN(d, y2), a); // v = d y² - a.
            let { isValid, value: x } = uvRatio(u, v); // √(u/v)
            if (!isValid) throw new Error('bad point: invalid y coordinate');
            const isXOdd = isOdd(x); // There are 2 square roots. Use x_0 bit to select proper
            const isLastByteOdd = (lastByte & 0x80) !== 0; // x_0, last bit
            if (!zip215 && Fp.is0(x) && isLastByteOdd) // if x=0 and x_0 = 1, fail
            throw new Error('bad point: x=0 and x_0=1');
            if (isLastByteOdd !== isXOdd) x = Fp.neg(x); // if x_0 != x mod 2, set x = p-x
            return Point.fromAffine({
                x,
                y
            });
        }
        static fromHex(hex, zip215 = false) {
            return Point.fromBytes((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexToBytes"])(hex), zip215);
        }
        get x() {
            return this.toAffine().x;
        }
        get y() {
            return this.toAffine().y;
        }
        precompute(windowSize = 6, isLazy = true) {
            wnaf.setWindowSize(this, windowSize);
            if (!isLazy) this.multiply(_2n); // random number
            return this;
        }
        // Useful in fromAffine() - not for fromBytes(), which always created valid points.
        assertValidity() {
            const p = this;
            const { a, d } = CURVE;
            // Keep generic Edwards validation fail-closed on the neutral point.
            // Even though ZERO is algebraically valid and can roundtrip through encodings, higher-level
            // callers often reach it only through broken hash/scalar plumbing; rejecting it here avoids
            // silently treating that degenerate state as an ordinary public point.
            if (p.is0()) throw new Error('bad point: ZERO'); // TODO: optimize, with vars below?
            // Equation in affine coordinates: ax² + y² = 1 + dx²y²
            // Equation in projective coordinates (X/Z, Y/Z, Z):  (aX² + Y²)Z² = Z⁴ + dX²Y²
            const { X, Y, Z, T } = p;
            const X2 = Fp.sqr(X); // X²
            const Y2 = Fp.sqr(Y); // Y²
            const Z2 = Fp.sqr(Z); // Z²
            const Z4 = Fp.sqr(Z2); // Z⁴
            const aX2 = Fp.mul(X2, a); // aX²
            const left = Fp.mul(Fp.add(aX2, Y2), Z2); // (aX² + Y²)Z²
            const right = Fp.add(Z4, Fp.mul(d, Fp.mul(X2, Y2))); // Z⁴ + dX²Y²
            if (!Fp.eql(left, right)) throw new Error('bad point: equation left != right (1)');
            // In Extended coordinates we also have T, which is x*y=T/Z: check X*Y == Z*T
            const XY = Fp.mul(X, Y);
            const ZT = Fp.mul(Z, T);
            if (!Fp.eql(XY, ZT)) throw new Error('bad point: equation left != right (2)');
        }
        // Compare one point to another.
        equals(other) {
            aedpoint(other);
            const { X: X1, Y: Y1, Z: Z1 } = this;
            const { X: X2, Y: Y2, Z: Z2 } = other;
            const X1Z2 = Fp.mul(X1, Z2);
            const X2Z1 = Fp.mul(X2, Z1);
            const Y1Z2 = Fp.mul(Y1, Z2);
            const Y2Z1 = Fp.mul(Y2, Z1);
            return Fp.eql(X1Z2, X2Z1) && Fp.eql(Y1Z2, Y2Z1);
        }
        is0() {
            return this.equals(Point.ZERO);
        }
        negate() {
            // Flips point sign to a negative one (-x, y in affine coords)
            return new Point(Fp.neg(this.X), this.Y, this.Z, Fp.neg(this.T));
        }
        // Fast algo for doubling Extended Point.
        // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
        // Cost: 4M + 4S + 1*a + 6add + 1*2.
        double() {
            const { X: X1, Y: Y1, Z: Z1 } = this;
            const A = Fp.sqr(X1); // A = X12
            const B = Fp.sqr(Y1); // B = Y12
            const C = Fp.mul(Fp.sqr(Z1), _2n); // C = 2*Z12
            const D = mulA(A); // D = a*A
            const x1y1 = Fp.addN(X1, Y1);
            const E = Fp.sub(Fp.subN(Fp.sqr(x1y1), A), B); // E = (X1+Y1)2-A-B
            const G = Fp.addN(D, B); // G = D+B
            const F = Fp.subN(G, C); // F = G-C
            const H = Fp.subN(D, B); // H = D-B
            const X3 = Fp.mul(E, F); // X3 = E*F
            const Y3 = Fp.mul(G, H); // Y3 = G*H
            const T3 = Fp.mul(E, H); // T3 = E*H
            const Z3 = Fp.mul(F, G); // Z3 = F*G
            return new Point(X3, Y3, Z3, T3);
        }
        // Fast algo for adding 2 Extended Points.
        // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
        // Cost: 9M + 1*a + 1*d + 7add.
        add(other) {
            aedpoint(other);
            const { d } = CURVE;
            const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
            const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
            const A = Fp.mul(X1, X2); // A = X1*X2
            const B = Fp.mul(Y1, Y2); // B = Y1*Y2
            const C = Fp.mul(Fp.mulN(T1, d), T2); // C = T1*d*T2
            const D = Fp.mul(Z1, Z2); // D = Z1*Z2
            // E = (X1+Y1)*(X2+Y2)-A-B
            const E = Fp.sub(Fp.subN(Fp.mulN(Fp.addN(X1, Y1), Fp.addN(X2, Y2)), A), B);
            const F = Fp.subN(D, C); // F = D-C
            const G = Fp.addN(D, C); // G = D+C
            const H = Fp.sub(B, mulA(A)); // H = B-a*A
            const X3 = Fp.mul(E, F); // X3 = E*F
            const Y3 = Fp.mul(G, H); // Y3 = G*H
            const T3 = Fp.mul(E, H); // T3 = E*H
            const Z3 = Fp.mul(F, G); // Z3 = F*G
            return new Point(X3, Y3, Z3, T3);
        }
        subtract(other) {
            // Validate before calling `negate()` so wrong inputs fail with the point guard
            // instead of leaking a foreign `negate()` error.
            aedpoint(other);
            return this.add(other.negate());
        }
        // Constant-time multiplication.
        multiply(scalar) {
            // 1 <= scalar < L
            // Keep the subgroup-scalar contract strict instead of reducing 0 / n to ZERO.
            // In keygen/signing-style callers, those values usually mean broken hash/scalar plumbing,
            // and failing closed is safer than silently producing the identity point.
            if (!Fn.isValidNot0(scalar)) throw new RangeError('invalid scalar: expected 1 <= sc < curve.n');
            const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
            return normalize([
                p,
                f
            ])[0];
        }
        // Non-constant-time multiplication. Uses double-and-add algorithm.
        // It's faster, but should only be used when you don't care about
        // an exposed private key e.g. sig verification.
        // Keeps the same subgroup-scalar contract: 0 is allowed for public-scalar callers, but
        // n and larger values are rejected instead of being reduced mod n to the identity point.
        multiplyUnsafe(scalar) {
            // 0 <= scalar < L
            if (!Fn.isValid(scalar)) throw new RangeError('invalid scalar: expected 0 <= sc < curve.n');
            if (scalar === _0n) return Point.ZERO;
            if (this.is0() || scalar === _1n) return this;
            return wnaf.mulUnsafe(this, scalar, normalize);
        }
        // Checks if point is of small order.
        // If you add something to small order point, you will have "dirty"
        // point with torsion component.
        // Clears cofactor and checks if the result is 0.
        isSmallOrder() {
            return this.clearCofactor().is0();
        }
        // Multiplies point by curve order and checks if the result is 0.
        // Returns `false` is the point is dirty.
        isTorsionFree() {
            return wnaf.mulUnsafe(this, CURVE.n).is0();
        }
        // Converts Extended point to default (x, y) coordinates.
        // Can accept precomputed Z^-1 - for example, from invertBatch.
        toAffine(invertedZ) {
            const p = this;
            let iz = invertedZ;
            if (iz != null && typeof iz !== 'bigint') throw new TypeError('"invertedZ" expected bigint, got type=' + typeof iz);
            const { X, Y, Z } = p;
            const is0 = p.is0();
            if (iz == null) iz = is0 ? Fp.create(_8n) : Fp.inv(Z);
            const x = Fp.mul(X, iz);
            const y = Fp.mul(Y, iz);
            const zz = Fp.mul(Z, iz);
            if (is0) return {
                x: Fp.ZERO,
                y: Fp.ONE
            };
            if (!Fp.eql(zz, Fp.ONE)) throw new Error('invZ was invalid');
            return {
                x,
                y
            };
        }
        clearCofactor() {
            if (cofactor === _1n) return this;
            // 2.8-3.8x speed-up vs naive
            if (cofactor === _2n) return this.double();
            if (cofactor === _4n) return this.double().double();
            if (cofactor === _8n) return this.double().double().double();
            return this.multiplyUnsafe(cofactor);
        }
        toBytes() {
            const { x, y } = this.toAffine();
            // Fp.toBytes() allows non-canonical encoding of y (>= p).
            const bytes = Fp.toBytes(y);
            // Each y has 2 valid points: (x, y), (x,-y).
            // When compressing, it's enough to store y and use the last byte to encode sign of x
            bytes[bytes.length - 1] |= isOdd(x) ? 0x80 : 0;
            return bytes;
        }
        toHex() {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToHex"])(this.toBytes());
        }
        toString() {
            return `<Point ${this.is0() ? 'ZERO' : this.toHex()}>`;
        }
    }
    // Keep constructor work cheap: subgroup/generator validation belongs to the caller's curve
    // parameters, and doing the extra checks here adds about 10-15ms to heavy module imports.
    // Callers that construct custom curves are responsible for supplying the correct base point.
    // try {
    //   Point.BASE.assertValidity();
    //   if (!Point.BASE.isTorsionFree()) throw new Error('bad point: not in prime-order subgroup');
    // } catch {
    //   throw new Error('bad curve params: generator point');
    // }
    const normalize = (points)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeZ"])(Point, points);
    const wnaf = new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScalarMultiplier"](Point, randomBytes);
    // Enable W=6 wNAF precomputes. Slows down first publicKey computation.
    // Disable for tiny toy curves, with scalar fields < 6 bits.
    if (wnaf.bits >= 6) Point.BASE.precompute(6);
    Object.freeze(Point.prototype);
    Object.freeze(Point);
    return Point;
}
class PrimeEdwardsPoint {
    static BASE;
    static ZERO;
    static Fp;
    static Fn;
    ep;
    /**
     * Wrap one internal Edwards representative directly.
     * This is not a canonical encoding boundary: alternate Edwards
     * representatives may still describe the same abstract wrapper element.
     */ constructor(ep){
        this.ep = ep;
    }
    // Static methods that must be implemented by subclasses
    static fromBytes(_bytes) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["notImplemented"])();
    }
    static fromHex(_hex) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["notImplemented"])();
    }
    get x() {
        return this.toAffine().x;
    }
    get y() {
        return this.toAffine().y;
    }
    // Common implementations
    clearCofactor() {
        // no-op for the abstract prime-order wrapper group; this is about the
        // wrapper element, not the hidden Edwards representative.
        return this;
    }
    assertValidity() {
        // Keep wrapper validity at the abstract-group boundary. Canonical decode
        // may choose Edwards representatives that differ by small torsion, so
        // checking `this.ep.isTorsionFree()` here would reject valid wrapper points.
        this.ep.assertValidity();
    }
    /**
     * Return affine coordinates of the current internal Edwards representative.
     * This is a convenience helper, not a canonical Ristretto/Decaf encoding.
     * Equal abstract elements may expose different `x` / `y`; use
     * `toBytes()` / `fromBytes()` for canonical roundtrips.
     */ toAffine(invertedZ) {
        return this.ep.toAffine(invertedZ);
    }
    toHex() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToHex"])(this.toBytes());
    }
    toString() {
        return this.toHex();
    }
    isTorsionFree() {
        // Abstract Ristretto/Decaf elements are already prime-order even when the
        // hidden Edwards representative is not torsion-free.
        return true;
    }
    isSmallOrder() {
        return false;
    }
    add(other) {
        this.assertSame(other);
        return this.init(this.ep.add(other.ep));
    }
    subtract(other) {
        this.assertSame(other);
        return this.init(this.ep.subtract(other.ep));
    }
    multiply(scalar) {
        return this.init(this.ep.multiply(scalar));
    }
    multiplyUnsafe(scalar) {
        return this.init(this.ep.multiplyUnsafe(scalar));
    }
    double() {
        return this.init(this.ep.double());
    }
    negate() {
        return this.init(this.ep.negate());
    }
    precompute(windowSize, isLazy) {
        this.ep.precompute(windowSize, isLazy);
        // Keep the wrapper identity stable like the backing Edwards API instead of
        // allocating a fresh wrapper around the same cached point.
        return this;
    }
}
function eddsa(Point, cHash, eddsaOpts = {}) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validatePointCons"])(Point);
    if (typeof cHash !== 'function') throw new Error('"hash" function param is required');
    const hash = cHash;
    const opts = eddsaOpts;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(opts, {}, {
        adjustScalarBytes: 'function',
        randomBytes: 'function',
        domain: 'function',
        prehash: 'function',
        zip215: 'boolean',
        mapToCurve: 'function',
        toMontgomery: 'function',
        toMontgomerySecret: 'function'
    });
    const { prehash } = opts;
    const { BASE, Fp, Fn } = Point;
    const outputLen = hash.outputLen;
    const expectedLen = 2 * Fp.BYTES;
    // When hash metadata is available, reject incompatible EdDSA wrappers at construction time
    // instead of deferring the mismatch until the first keygen/sign call.
    if (outputLen !== undefined) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(outputLen, 'hash.outputLen');
        if (outputLen !== expectedLen) throw new Error(`hash.outputLen must be ${expectedLen}, got ${outputLen}`);
    }
    const randomBytes = opts.randomBytes === undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"] : opts.randomBytes;
    const toMontgomery = opts.toMontgomery;
    const toMontgomerySecret = opts.toMontgomerySecret;
    const adjustScalarBytes = opts.adjustScalarBytes === undefined ? (bytes)=>bytes : opts.adjustScalarBytes;
    const domain = opts.domain === undefined ? (data, ctx, phflag)=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abool"])(phflag, 'phflag');
        if (ctx.length || phflag) throw new Error('Contexts/pre-hash are not supported');
        return data;
    } : opts.domain; // NOOP
    // Parse an EdDSA digest as a little-endian integer and reduce it modulo the scalar field order.
    function modN_LE(hash) {
        return Fn.create((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(hash)); // Not Fn.fromBytes: it has length limit
    }
    // Get the hashed private scalar per RFC8032 5.1.5
    function getPrivateScalar(key) {
        const len = lengths.secretKey;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(key, lengths.secretKey, 'secretKey');
        // Hash private key with curve's hash function to produce uniformingly random input
        // Check byte lengths: ensure(64, h(ensure(32, key)))
        const hashed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(hash(key), 2 * len, 'hashedSecretKey');
        // Slice before clamping so in-place adjustors don't corrupt the prefix half.
        const head = adjustScalarBytes(hashed.slice(0, len)); // clear first half bits, produce FE
        const prefix = hashed.slice(len, 2 * len); // second half is called key prefix (5.1.6)
        const scalar = modN_LE(head); // The actual private scalar
        return {
            head,
            prefix,
            scalar
        };
    }
    /** Convenience method that creates public key from scalar. RFC8032 5.1.5
     * Also exposes the derived scalar/prefix tuple and point form reused by sign().
     */ function getExtendedPublicKey(secretKey) {
        const { head, prefix, scalar } = getPrivateScalar(secretKey);
        const point = BASE.multiply(scalar); // Point on Edwards curve aka public key
        const pointBytes = point.toBytes();
        return {
            head,
            prefix,
            scalar,
            point,
            pointBytes
        };
    }
    /** Calculates EdDSA pub key. RFC8032 5.1.5. */ function getPublicKey(secretKey) {
        return getExtendedPublicKey(secretKey).pointBytes;
    }
    // Hash domain-separated chunks into a little-endian scalar modulo the group order.
    function hashDomainToScalar(context = Uint8Array.of(), ...msgs) {
        const msg = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(...msgs);
        return modN_LE(hash(domain(msg, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(context, undefined, 'context'), !!prehash)));
    }
    /** Signs message with secret key. RFC8032 5.1.6 */ function sign(msg, secretKey, options = {}) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(options, {}, {}, 'options');
        // Snapshot once: nonce and challenge must use the same invocation-time message bytes.
        msg = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(msg, undefined, 'message'));
        if (prehash) msg = prehash(msg); // for ed25519ph etc.
        const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
        const r = hashDomainToScalar(options.context, prefix, msg); // r = dom2(F, C) || prefix || PH(M)
        // RFC 8032 5.1.6 allows r mod L = 0, and SUPERCOP ref10 accepts the resulting identity-point
        // signature.
        // We intentionally keep the safe multiply() rejection here so a miswired all-zero hash provider
        // fails loudly instead of silently producing a degenerate signature.
        const R = BASE.multiply(r).toBytes(); // R = rG
        const k = hashDomainToScalar(options.context, R, pointBytes, msg); // R || A || PH(M)
        const s = Fn.create(r + k * scalar); // S = (r + k * s) mod L
        if (!Fn.isValid(s)) throw new Error('sign failed: invalid s'); // 0 <= s < L
        const rs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(R, Fn.toBytes(s));
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(rs, lengths.signature, 'result');
    }
    // Keep the shared helper strict by default: RFC 8032 / NIST-style wrappers should reject
    // non-canonical encodings unless they explicitly opt into ZIP-215's more permissive decode rules.
    const verifyOpts = {
        zip215: opts.zip215
    };
    /**
     * Verifies EdDSA signature against message and public key. RFC 8032 §§5.1.7 and 5.2.7.
     * A cofactored verification equation is checked.
     */ function verify(sig, msg, publicKey, options = verifyOpts) {
        // Validate before destructuring so explicit null follows the standard options error.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(options);
        // Preserve the wrapper-selected default for `{}` / `{ zip215: undefined }`, not just omitted opts.
        const { context } = options;
        const zip215 = options.zip215 === undefined ? !!verifyOpts.zip215 : options.zip215;
        const len = lengths.signature;
        sig = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(sig, len, 'signature');
        msg = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(msg, undefined, 'message');
        publicKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(publicKey, lengths.publicKey, 'publicKey');
        if (zip215 !== undefined) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abool"])(zip215, 'zip215');
        if (prehash) msg = prehash(msg); // for ed25519ph, etc
        const mid = len / 2;
        const r = sig.subarray(0, mid);
        const s = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(sig.subarray(mid, len));
        let A, R, SB;
        try {
            // ZIP-215 is more permissive than RFC 8032 / NIST186-5. Use it only for wrappers that
            // explicitly want consensus-style unreduced encoding acceptance.
            // zip215=true:  0 <= y < MASK (2^256 for ed25519)
            // zip215=false: 0 <= y < P (2^255-19 for ed25519)
            A = Point.fromBytes(publicKey, zip215);
            R = Point.fromBytes(r, zip215);
            SB = BASE.multiplyUnsafe(s); // 0 <= s < l is done inside
        } catch (error) {
            return false;
        }
        // RFC 8032 §§5.1.7/5.2.7 and FIPS 186-5 §§7.7.2/7.8.2 only decode A' and check the cofactored
        // verification equation; they do not add a separate low-order-public-key rejection here.
        // Strict mode still rejects small-order A' intentionally for SBS-style non-repudiation and to
        // avoid ambiguous verification outcomes where unusual low-order keys can make distinct
        // key/signature/message combinations verify.
        if (!zip215 && A.isSmallOrder()) return false;
        // ZIP-215 accepts noncanonical / unreduced point encodings, so the challenge hash must use the
        // exact signature/public-key bytes rather than canonicalized re-encodings of the decoded points.
        const k = hashDomainToScalar(context, r, publicKey, msg);
        const RkA = R.add(A.multiplyUnsafe(k));
        // Check the cofactored verification equation via the curve cofactor h.
        // [h][S]B = [h]R + [h][k]A'
        return RkA.subtract(SB).clearCofactor().is0();
    }
    const _size = Fp.BYTES; // 32 for ed25519, 57 for ed448
    const lengths = {
        secretKey: _size,
        publicKey: _size,
        signature: 2 * _size,
        seed: _size
    };
    function randomSecretKey(seed) {
        seed = seed === undefined ? randomBytes(lengths.seed) : seed;
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(seed, lengths.seed, 'seed');
    }
    function isValidSecretKey(key) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isBytes"])(key) && key.length === lengths.secretKey;
    }
    function isValidPublicKey(key, zip215) {
        try {
            // Preserve the wrapper-selected default for omitted / `undefined` ZIP-215 flags here too.
            return !!Point.fromBytes(key, zip215 === undefined ? verifyOpts.zip215 : zip215);
        } catch (error) {
            return false;
        }
    }
    const utils = {
        getExtendedPublicKey,
        randomSecretKey,
        isValidSecretKey,
        isValidPublicKey,
        /** Converts an Edwards public key to a companion Montgomery public key. */ toMontgomery (publicKey) {
            if (toMontgomery === undefined) throw new Error('Montgomery conversion is not supported for this curve');
            return toMontgomery(Point.fromBytes(publicKey));
        },
        toMontgomerySecret (secretKey) {
            if (toMontgomerySecret === undefined) throw new Error('Montgomery conversion is not supported for this curve');
            return toMontgomerySecret(secretKey);
        }
    };
    Object.freeze(lengths);
    Object.freeze(utils);
    return Object.freeze({
        keygen: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createKeygen"])(randomSecretKey, getPublicKey),
        getPublicKey,
        sign,
        verify,
        utils,
        Point,
        lengths
    });
}
}),
"[project]/sdk/js/node_modules/@noble/curves/abstract/fft.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FFT",
    ()=>FFT,
    "FFTCore",
    ()=>FFTCore,
    "bitReversalInplace",
    ()=>bitReversalInplace,
    "bitReversalPermutation",
    ()=>bitReversalPermutation,
    "isPowerOfTwo",
    ()=>isPowerOfTwo,
    "log2",
    ()=>log2,
    "nextPowerOfTwo",
    ()=>nextPowerOfTwo,
    "poly",
    ()=>poly,
    "reverseBits",
    ()=>reverseBits,
    "rootsOfUnity",
    ()=>rootsOfUnity
]);
/**
 * Experimental implementation of NTT / FFT (Fast Fourier Transform) over finite fields.
 * API may change at any time. The code has not been audited. Feature requests are welcome.
 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/modular.js [app-ssr] (ecmascript)");
;
;
function checkU32(n, title = 'n') {
    // 0xff_ff_ff_ff
    if (typeof n !== 'number') throw new TypeError(`wrong u32 integer "${title}": expected number, got type=${typeof n}`);
    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) throw new RangeError(`wrong u32 integer "${title}": expected 0..4294967295, got ${n}`);
    return n;
}
function isPowerOfTwo(x) {
    checkU32(x, 'x');
    return (x & x - 1) === 0 && x !== 0;
}
function nextPowerOfTwo(n) {
    checkU32(n);
    if (n <= 1) return 1;
    // FFT sizes here are used as JS array lengths, so `2^32` is not a meaningful result:
    // keep the fast u32 bit-twiddling path and fail explicitly instead of wrapping to 1.
    if (n > 0x8000_0000) throw new Error('nextPowerOfTwo overflow: result does not fit u32');
    return 1 << log2(n - 1) + 1 >>> 0;
}
function reverseBits(n, bits) {
    checkU32(n);
    if (typeof bits !== 'number') throw new TypeError('"bits" expected number, got type=' + typeof bits);
    if (!Number.isSafeInteger(bits) || bits < 0 || bits > 32) throw new Error(`expected integer 0 <= bits <= 32, got ${bits}`);
    let reversed = 0;
    for(let i = 0; i < bits; i++, n >>>= 1)reversed = reversed << 1 | n & 1;
    // JS bitwise ops are signed i32; cast back so 32-bit reversals stay in the unsigned u32 domain.
    return reversed >>> 0;
}
function log2(n) {
    checkU32(n);
    return 31 - Math.clz32(n);
}
function bitReversalInplace(values) {
    if (!values || typeof values !== 'object' || typeof values.length !== 'number') throw new TypeError('"values" expected array-like, got type=' + typeof values);
    const n = values.length;
    // Size-1 FFT is the identity, so bit-reversal must stay a no-op there instead of rejecting it.
    if (!isPowerOfTwo(n)) throw new Error('expected positive power-of-two length, got ' + n);
    const bits = log2(n);
    for(let i = 0; i < n; i++){
        const j = reverseBits(i, bits);
        if (i < j) {
            const tmp = values[i];
            values[i] = values[j];
            values[j] = tmp;
        }
    }
    return values;
}
function bitReversalPermutation(values) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(values, 'values');
    return bitReversalInplace(values.slice());
}
const _1n = /** @__PURE__ */ BigInt(1);
function findGenerator(field) {
    let G = BigInt(2);
    for(; field.eql(field.pow(G, field.ORDER >> _1n), field.ONE); G++);
    return G;
}
function rootsOfUnity(field, generator) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateField"])(field);
    if (generator !== undefined && typeof generator !== 'bigint') throw new TypeError('"generator" expected bigint, got type=' + typeof generator);
    // Factor field.ORDER-1 as oddFactor * 2^powerOfTwo
    let oddFactor = field.ORDER - _1n;
    let powerOfTwo = 0;
    for(; (oddFactor & _1n) !== _1n; powerOfTwo++, oddFactor >>= _1n);
    // Find non quadratic residue
    let G = generator !== undefined ? BigInt(generator) : findGenerator(field);
    // Powers of generator
    const omegas = new Array(powerOfTwo + 1);
    omegas[powerOfTwo] = field.pow(G, oddFactor);
    for(let i = powerOfTwo; i > 0; i--)omegas[i - 1] = field.sqr(omegas[i]);
    // Compute all roots of unity for powers up to maxPower
    const rootsCache = [];
    const checkBits = (bits)=>{
        checkU32(bits, 'bits');
        if (bits > 31 || bits > powerOfTwo) throw new Error('rootsOfUnity: wrong bits ' + bits + ' powerOfTwo=' + powerOfTwo);
        return bits;
    };
    const precomputeRoots = (maxPower)=>{
        checkBits(maxPower);
        for(let power = maxPower; power >= 0; power--){
            if (rootsCache[power]) continue; // Skip if we've already computed roots for this power
            const above = rootsCache[power + 1];
            const rootsAtPower = [];
            if (above) {
                // ω_{2^p} = ω_{2^{p+1}}², so the smaller table is the even-index stride of the bigger
                // one: only the largest requested power pays for the multiplication chain.
                for(let j = 0; j < 2 ** power; j++)rootsAtPower.push(above[2 * j]);
            } else {
                for(let j = 0, cur = field.ONE; j < 2 ** power; j++, cur = field.mul(cur, omegas[power]))rootsAtPower.push(cur);
            }
            rootsCache[power] = rootsAtPower;
        }
        return rootsCache[maxPower];
    };
    const brpCache = new Map();
    const inverseCache = new Map();
    // roots()/brp()/inverse() expose shared cached arrays by reference for speed; callers must treat them as read-only.
    // NOTE: we use bits instead of power, because power = 2**bits,
    // but power is not necessarily isPowerOfTwo(power)!
    return {
        info: {
            G,
            powerOfTwo,
            oddFactor
        },
        roots: (bits)=>{
            const b = checkBits(bits);
            return precomputeRoots(b);
        },
        brp (bits) {
            const b = checkBits(bits);
            if (brpCache.has(b)) return brpCache.get(b);
            else {
                const res = bitReversalPermutation(this.roots(b));
                brpCache.set(b, res);
                return res;
            }
        },
        inverse (bits) {
            const b = checkBits(bits);
            if (inverseCache.has(b)) return inverseCache.get(b);
            else {
                // ωᴺ = 1, so inv(ωᵏ) = ωᴺ⁻ᵏ: the inverse table is the reversed roots table.
                // Value-identical to field.invertBatch(roots), but skips its 3N muls + inversion.
                const r = this.roots(b);
                const res = [
                    r[0]
                ].concat(r.slice(1).reverse());
                inverseCache.set(b, res);
                return res;
            }
        },
        omega: (bits)=>omegas[checkBits(bits)],
        clear: ()=>{
            rootsCache.splice(0, rootsCache.length);
            brpCache.clear();
            inverseCache.clear();
        }
    };
}
const FFTCore = (F, coreOpts)=>{
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(coreOpts, {
        N: 'number',
        roots: 'object',
        dit: 'boolean'
    }, {
        invertButterflies: 'boolean',
        skipStages: 'number',
        brp: 'boolean'
    }, 'coreOpts');
    const { N, roots, dit, invertButterflies = false, skipStages = 0, brp = true } = coreOpts;
    checkU32(N, 'coreOpts.N');
    const bits = log2(N);
    if (!isPowerOfTwo(N)) throw new Error('FFT: Polynomial size should be power of two');
    checkU32(skipStages, 'coreOpts.skipStages');
    const maxSkipStages = bits === 0 ? 0 : bits - 1;
    // Skipping every stage leaves only boundary layout changes, not a valid FFT loop shape.
    if (skipStages > maxSkipStages) throw new Error(`FFT: wrong skipStages: expected 0 <= skipStages <= ${maxSkipStages}`);
    // Wrong-sized root tables can stay in-bounds for some loop shapes and silently compute nonsense.
    if (roots.length !== N) throw new Error(`FFT: wrong roots length: expected ${N}, got ${roots.length}`);
    const isDit = dit !== invertButterflies;
    return (values)=>{
        if (values.length !== N) throw new Error('FFT: wrong Polynomial length');
        if (dit && brp) bitReversalInplace(values);
        for(let i = 0, g = 1; i < bits - skipStages; i++){
            // For each stage s (sub-FFT length m = 2^s)
            const s = dit ? i + 1 + skipStages : bits - i;
            const m = 1 << s;
            const m2 = m >> 1;
            const stride = N >> s;
            // Loop over each subarray of length m
            for(let k = 0; k < N; k += m){
                // Loop over each butterfly within the subarray
                for(let j = 0, grp = g++; j < m2; j++){
                    const rootPos = invertButterflies ? dit ? N - grp : grp : j * stride;
                    const i0 = k + j;
                    const i1 = k + j + m2;
                    const omega = roots[rootPos];
                    const b = values[i1];
                    const a = values[i0];
                    // Inlining gives us 10% perf in kyber vs functions
                    if (isDit) {
                        const t = F.mul(b, omega); // Standard DIT butterfly
                        values[i0] = F.add(a, t);
                        values[i1] = F.sub(a, t);
                    } else if (invertButterflies) {
                        values[i0] = F.add(b, a); // DIT loop + inverted butterflies (Kyber decode)
                        values[i1] = F.mul(F.sub(b, a), omega);
                    } else {
                        values[i0] = F.add(a, b); // Standard DIF butterfly
                        values[i1] = F.mul(F.sub(a, b), omega);
                    }
                }
            }
        }
        if (!dit && brp) bitReversalInplace(values);
        return values;
    };
};
function FFT(roots, opts) {
    // Loops are cached per (size, direction, brp flags): FFTCore construction validates options
    // and allocates closures, which costs more than a small transform itself. The cached loop
    // closes over the root table active at first use; `roots.clear()` rebuilds value-identical
    // tables, so a stale reference stays correct.
    const loops = new Map();
    const getLoop = (N, rootsTable, key)=>{
        const cached = loops.get(key);
        if (cached) return cached;
        const brpInput = !!(key & 2);
        const brpOutput = !!(key & 1);
        let loop;
        if (brpInput && brpOutput) {
            // we cannot optimize this case, but lets support it anyway
            const core = FFTCore(opts, {
                N,
                roots: rootsTable,
                dit: false,
                brp: false
            });
            loop = (values)=>core(bitReversalInplace(values));
        } else if (brpInput) loop = FFTCore(opts, {
            N,
            roots: rootsTable,
            dit: true,
            brp: false
        });
        else if (brpOutput) loop = FFTCore(opts, {
            N,
            roots: rootsTable,
            dit: false,
            brp: false
        });
        else loop = FFTCore(opts, {
            N,
            roots: rootsTable,
            dit: true,
            brp: true
        }); // all natural
        loops.set(key, loop);
        return loop;
    };
    const loopKey = (bits, isInverse, brpInput, brpOutput)=>bits << 3 | (isInverse ? 4 : 0) | (brpInput ? 2 : 0) | (brpOutput ? 1 : 0);
    return {
        direct (values, brpInput = false, brpOutput = false) {
            const N = values.length;
            if (!isPowerOfTwo(N)) throw new Error('FFT: Polynomial size should be power of two');
            const bits = log2(N);
            const key = loopKey(bits, false, brpInput, brpOutput);
            return getLoop(N, roots.roots(bits), key)(values.slice());
        },
        inverse (values, brpInput = false, brpOutput = false) {
            const N = values.length;
            if (!isPowerOfTwo(N)) throw new Error('FFT: Polynomial size should be power of two');
            const bits = log2(N);
            const key = loopKey(bits, true, brpInput, brpOutput);
            const res = getLoop(N, roots.inverse(bits), key)(values.slice());
            const ivm = opts.inv(BigInt(values.length)); // scale
            // we can get brp output if we use dif instead of dit!
            for(let i = 0; i < res.length; i++)res[i] = opts.mul(res[i], ivm);
            // Allows to re-use non-inverted roots, but is VERY fragile
            // return [res[0]].concat(res.slice(1).reverse());
            // inverse calculated as pow(-1), which transforms into ω^{-kn} (-> reverses indices)
            return res;
        }
    };
}
function poly(field, roots, create, fft, length) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateField"])(field);
    const F = field;
    const _create = create || ((len, elm)=>new Array(len).fill(elm ?? F.ZERO));
    // `poly.mul(a, b)` distinguishes polynomial-vs-scalar at runtime, so keep accepted
    // polynomial containers concrete instead of trying to support arbitrary wrappers.
    const isPoly = (x)=>{
        if (Array.isArray(x)) return true;
        if (!ArrayBuffer.isView(x)) return false;
        const v = x;
        return typeof v.length === 'number' && typeof v.slice === 'function' && typeof v[Symbol.iterator] === 'function';
    };
    const checkPoly = (title, value)=>{
        if (!isPoly(value)) throw new TypeError(`"${title}" expected polynomial, got type=${typeof value}`);
    };
    const checkLength = (a, b)=>{
        checkPoly('a', a);
        const L = a.length;
        if (b !== undefined) {
            checkPoly('b', b);
            if (b.length !== L) throw new Error(`poly: mismatched lengths ${L} vs ${b.length}`);
        }
        if (length !== undefined && L !== length) throw new Error(`poly: expected fixed length ${length}, got ${L}`);
        return L;
    };
    function findOmegaIndex(x, n, brp = false, weights) {
        if (!isPowerOfTwo(n)) throw new Error('poly.lagrange: expected power of two length, got ' + n);
        // Explicit weights define the interpolation domain, including the Kronecker-δ shortcut.
        const omega = weights || (brp ? roots.brp(log2(n)) : roots.roots(log2(n)));
        for(let i = 0; i < n; i++)if (F.eql(x, omega[i])) return i;
        return -1;
    }
    // TODO: mutating versions for mlkem/mldsa
    return {
        roots,
        create: _create,
        length,
        extend: (a, len)=>{
            checkLength(a);
            const out = _create(len, F.ZERO);
            // Plain arrays grow when writing past `out.length`, so cap the copy explicitly to keep
            // `extend()` consistent with typed arrays and with its documented truncate behavior.
            for(let i = 0; i < Math.min(a.length, len); i++)out[i] = a[i];
            return out;
        },
        degree: (a)=>{
            checkLength(a);
            for(let i = a.length - 1; i >= 0; i--)if (!F.is0(a[i])) return i;
            return -1;
        },
        add: (a, b)=>{
            const len = checkLength(a, b);
            const out = _create(len);
            for(let i = 0; i < len; i++)out[i] = F.add(a[i], b[i]);
            return out;
        },
        sub: (a, b)=>{
            const len = checkLength(a, b);
            const out = _create(len);
            for(let i = 0; i < len; i++)out[i] = F.sub(a[i], b[i]);
            return out;
        },
        dot: (a, b)=>{
            const len = checkLength(a, b);
            const out = _create(len);
            for(let i = 0; i < len; i++)out[i] = F.mul(a[i], b[i]);
            return out;
        },
        mul: (a, b)=>{
            if (isPoly(b)) {
                const len = checkLength(a, b);
                if (fft) {
                    const A = fft.direct(a, false, true);
                    const B = fft.direct(b, false, true);
                    for(let i = 0; i < A.length; i++)A[i] = F.mul(A[i], B[i]);
                    return fft.inverse(A, true, false);
                } else {
                    // NOTE: this is quadratic and mostly for compat tests with FFT
                    const res = _create(len);
                    for(let i = 0; i < len; i++){
                        for(let j = 0; j < len; j++){
                            const k = (i + j) % len; // wrap mod length
                            res[k] = F.add(res[k], F.mul(a[i], b[j]));
                        }
                    }
                    return res;
                }
            } else {
                const out = _create(checkLength(a));
                for(let i = 0; i < out.length; i++)out[i] = F.mul(a[i], b);
                return out;
            }
        },
        convolve (a, b) {
            checkPoly('a', a);
            checkPoly('b', b);
            const len = nextPowerOfTwo(a.length + b.length - 1);
            return this.mul(this.extend(a, len), this.extend(b, len));
        },
        shift (p, factor) {
            checkPoly('p', p);
            const out = _create(p.length);
            if (length !== undefined && p.length !== length) throw new Error(`poly: expected fixed length ${length}, got ${p.length}`);
            if (!p.length) return out;
            out[0] = p[0];
            for(let i = 1, power = F.ONE; i < p.length; i++){
                power = F.mul(power, factor);
                out[i] = F.mul(p[i], power);
            }
            return out;
        },
        clone: (a)=>{
            checkLength(a);
            const out = _create(a.length);
            for(let i = 0; i < a.length; i++)out[i] = a[i];
            return out;
        },
        eval: (a, basis)=>{
            checkLength(a, basis);
            let acc = F.ZERO;
            for(let i = 0; i < a.length; i++)acc = F.add(acc, F.mul(a[i], basis[i]));
            return acc;
        },
        monomial: {
            basis: (x, n)=>{
                const out = _create(n);
                let pow = F.ONE;
                for(let i = 0; i < n; i++){
                    out[i] = pow;
                    pow = F.mul(pow, x);
                }
                return out;
            },
            eval: (a, x)=>{
                checkLength(a);
                // Same as eval(a, monomialBasis(x, a.length)), but it is faster this way
                let acc = F.ZERO;
                for(let i = a.length - 1; i >= 0; i--)acc = F.add(F.mul(acc, x), a[i]);
                return acc;
            }
        },
        lagrange: {
            basis: (x, n, brp = false, weights)=>{
                if (!isPowerOfTwo(n)) throw new Error('poly.lagrange: expected power of two length, got ' + n);
                const bits = log2(n);
                const cache = weights || (brp ? roots.brp(bits) : roots.roots(bits)); // [ω⁰, ω¹, ..., ωⁿ⁻¹]
                const out = _create(n);
                // Fast Kronecker-δ shortcut
                const idx = findOmegaIndex(x, n, brp, weights);
                if (idx !== -1) {
                    out[idx] = F.ONE;
                    return out;
                }
                const tm = F.pow(x, BigInt(n));
                const c = F.mul(F.sub(tm, F.ONE), F.inv(BigInt(n))); // c = (xⁿ - 1)/n
                const denom = _create(n);
                for(let i = 0; i < n; i++)denom[i] = F.sub(x, cache[i]);
                const inv = F.invertBatch(denom);
                for(let i = 0; i < n; i++)out[i] = F.mul(c, F.mul(cache[i], inv[i]));
                return out;
            },
            eval (a, x, brp = false) {
                checkLength(a);
                const idx = findOmegaIndex(x, a.length, brp);
                if (idx !== -1) return a[idx]; // fast path
                const L = this.basis(x, a.length, brp); // Lᵢ(x)
                let acc = F.ZERO;
                for(let i = 0; i < a.length; i++)if (!F.is0(a[i])) acc = F.add(acc, F.mul(a[i], L[i]));
                return acc;
            }
        },
        vanishing (roots) {
            checkPoly('roots', roots);
            if (length !== undefined && roots.length !== length) throw new Error(`poly: expected fixed length ${length}, got ${roots.length}`);
            const out = _create(roots.length + 1, F.ZERO);
            out[0] = F.ONE;
            for (const r of roots){
                const neg = F.neg(r);
                for(let j = out.length - 1; j > 0; j--)out[j] = F.add(F.mul(out[j], neg), out[j - 1]);
                out[0] = F.mul(out[0], neg);
            }
            return out;
        }
    };
}
}),
"[project]/sdk/js/node_modules/@noble/curves/abstract/frost.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createFROST",
    ()=>createFROST
]);
/**
 * FROST: Flexible Round-Optimized Schnorr Threshold Protocol for Two-Round Schnorr Signatures.
 *
 * See {@link https://datatracker.ietf.org/doc/rfc9591/ | RFC 9591} and
 * {@link https://frost.zfnd.org | frost.zfnd.org}.
 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/curve.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$fft$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/fft.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/modular.js [app-ssr] (ecmascript)");
;
;
;
;
;
;
// PubKey = commitments, verifyingShares
// PrivKey = id, signingShare, commitment
const validateSigners = (signers, title = 'signers')=>{
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(signers, {
        min: 'number',
        max: 'number'
    }, {}, title);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(signers.min, title + '.min');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(signers.max, title + '.max');
    // Compatibility with frost-rs intentionally narrows RFC 9591's positive-nonzero threshold rule
    // to `min >= 2`, even though the RFC text itself allows `MIN_PARTICIPANTS = 1`.
    // This API is for actual threshold signing across participants; 1-of-n degenerates to ordinary
    // single-signer mode, which does not need FROST's network/coordination machinery at all.
    if (signers.min < 2 || signers.max < 2 || signers.min > signers.max) throw new Error('Wrong signers info: min=' + signers.min + ' max=' + signers.max);
};
const validateCommitmentsNum = (signers, len)=>{
    // RFC 9591 Sections 5.2/5.3 require MIN_PARTICIPANTS <= NUM_PARTICIPANTS <= MAX_PARTICIPANTS.
    if (len < signers.min || len > signers.max) throw new Error('Wrong number of commitments=' + len);
};
class AggErr extends Error {
    // Empty means aggregation failed before per-share verification could attribute a signer.
    cheaters;
    constructor(msg, cheaters){
        super(msg);
        this.cheaters = cheaters;
    }
}
function createFROST(opts) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(opts, {
        name: 'string',
        hash: 'function'
    }, {
        hashToScalar: 'function',
        validatePoint: 'function',
        parsePublicKey: 'function',
        adjustScalar: 'function',
        adjustPoint: 'function',
        challenge: 'function',
        adjustNonces: 'function',
        adjustSecret: 'function',
        adjustPublic: 'function',
        adjustGroupCommitmentShare: 'function',
        adjustTx: 'object',
        adjustDKG: 'function'
    });
    // Cheap constructor-surface sanity check only: this verifies the generic static hooks/fields that
    // FROST consumes, but it does not certify point semantics like BASE/ZERO correctness.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validatePointCons"])(opts.Point);
    const { Point, validatePoint, parsePublicKey, adjustScalar, adjustPoint: adjustPointHook, challenge, adjustNonces, adjustSecret, adjustPublic, adjustGroupCommitmentShare, adjustDKG } = opts;
    const Fn = opts.Fn === undefined ? Point.Fn : opts.Fn;
    const adjustTx = opts.adjustTx === undefined ? undefined : {
        encode: opts.adjustTx.encode,
        decode: opts.adjustTx.decode
    };
    if (adjustTx) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(adjustTx, {
        encode: 'function',
        decode: 'function'
    });
    // Hashes
    const hashBytes = opts.hash;
    const hashToScalar = opts.hashToScalar === undefined ? (msg, opts = {
        DST: new Uint8Array()
    })=>{
        const t = hashBytes((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(opts.DST, msg));
        return Fn.create(Fn.isLE ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(t) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberBE"])(t));
    } : opts.hashToScalar;
    const H1Prefix = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utf8ToBytes"])(opts.H1 !== undefined ? opts.H1 : opts.name + 'rho');
    const H2Prefix = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utf8ToBytes"])(opts.H2 !== undefined ? opts.H2 : opts.name + 'chal');
    const H3Prefix = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utf8ToBytes"])(opts.H3 !== undefined ? opts.H3 : opts.name + 'nonce');
    const H4Prefix = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utf8ToBytes"])(opts.H4 !== undefined ? opts.H4 : opts.name + 'msg');
    const H5Prefix = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utf8ToBytes"])(opts.H5 !== undefined ? opts.H5 : opts.name + 'com');
    const HDKGPrefix = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utf8ToBytes"])(opts.HDKG !== undefined ? opts.HDKG : opts.name + 'dkg');
    const HIDPrefix = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utf8ToBytes"])(opts.HID !== undefined ? opts.HID : opts.name + 'id');
    const H1 = (msg)=>hashToScalar(msg, {
            DST: H1Prefix
        });
    // Empty H2 still passes `{ DST: new Uint8Array() }` into custom hashToScalar hooks.
    // The built-in fallback hashes that identically to omitted DST, which is how
    // the Ed25519 suite models RFC 9591's undecorated H2 challenge hash.
    const H2 = (msg)=>hashToScalar(msg, {
            DST: H2Prefix
        });
    const H3 = (msg)=>hashToScalar(msg, {
            DST: H3Prefix
        });
    const H4 = (msg)=>hashBytes((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(H4Prefix, msg));
    const H5 = (msg)=>hashBytes((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(H5Prefix, msg));
    const HDKG = (msg)=>hashToScalar(msg, {
            DST: HDKGPrefix
        });
    const HID = (msg)=>hashToScalar(msg, {
            DST: HIDPrefix
        });
    // /Hashes
    const randomScalar = (rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])=>{
        if (typeof rng !== 'function') throw new TypeError('"rng" expected function, got type=' + typeof rng);
        // Intentional divergence from RFC 9591 §4.1 / §5.1: the RFC nonce_generate helper outputs a
        // Scalar in [0, p-1], but round-one commit publishes ScalarBaseMult(nonce) values and §3.1
        // requires SerializeElement / DeserializeElement to reject the identity element. Keep noble's
        // mapHashToField generation here so round-one public nonce commitments stay in 1..n-1.
        const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapHashToField"])(rng((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMinHashLength"])(Fn.ORDER)), Fn.ORDER, Fn.isLE);
        // We cannot use Fn.fromBytes here because the field can have a different
        // byte width, like ed448.
        return Fn.isLE ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(t) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberBE"])(t);
    };
    const serializePoint = (p)=>p.toBytes();
    const validatePublicPoint = (p)=>{
        // RFC 9591 Section 3.1 DeserializeElement rejects off-curve, identity, and non-prime-order
        // elements. This remains mandatory when parsePublicKey replaces the normal byte decoder.
        p.assertValidity();
        if (p.is0()) throw new Error('invalid point: identity');
        if (!p.isTorsionFree()) throw new Error('bad point: not in prime-order subgroup');
        if (validatePoint) validatePoint(p);
        return p;
    };
    const parsePoint = (bytes)=>validatePublicPoint(Point.fromBytes(bytes));
    // RFC 9591 Sections 4.1/5.1 model each participant's round-one output as two public commitments.
    const nonceCommitments = (identifier, nonces)=>({
            identifier,
            hiding: serializePoint(Point.BASE.multiply(Fn.fromBytes(nonces.hiding))),
            binding: serializePoint(Point.BASE.multiply(Fn.fromBytes(nonces.binding)))
        });
    const adjustPoint = adjustPointHook === undefined ? (n)=>n : adjustPointHook;
    // We use hex to make it easier to use inside objects
    const validateIdentifier = (n)=>{
        // Identifiers are canonical non-zero scalars. Custom / derived identifiers are allowed, so this
        // is intentionally not bounded by the current signers.max slot count.
        if (!Fn.isValid(n) || Fn.is0(n)) throw new Error('Invalid identifier ' + n);
        return n;
    };
    const serializeIdentifier = (id)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToHex"])(Fn.toBytes(validateIdentifier(id)));
    const parseIdentifier = (id, title = 'identifier')=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["astring"])(id, title);
        const n = validateIdentifier(Fn.fromBytes((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexToBytes"])(id)));
        // Keep string-keyed maps stable by accepting only the canonical serialized form.
        if (serializeIdentifier(n) !== id) throw new Error('expected canonical identifier hex');
        return n;
    };
    const copyRound1Package = (p)=>({
            identifier: serializeIdentifier(parseIdentifier(p.identifier)),
            commitment: p.commitment.map((c)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(c)),
            proofOfKnowledge: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(p.proofOfKnowledge)
        });
    const canonicalRound1Packages = (packages)=>{
        const snapshot = packages.map(copyRound1Package);
        snapshot.sort((a, b)=>{
            const ai = parseIdentifier(a.identifier);
            const bi = parseIdentifier(b.identifier);
            return ai < bi ? -1 : ai > bi ? 1 : 0;
        });
        return snapshot;
    };
    const equalRound1Transcripts = (a, b)=>{
        if (a.length !== b.length) return false;
        for(let i = 0; i < a.length; i++){
            const p = a[i];
            const q = b[i];
            if (p.identifier !== q.identifier || p.commitment.length !== q.commitment.length) return false;
            for(let j = 0; j < p.commitment.length; j++){
                if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["equalBytes"])(p.commitment[j], q.commitment[j])) return false;
            }
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["equalBytes"])(p.proofOfKnowledge, q.proofOfKnowledge)) return false;
        }
        return true;
    };
    const Signature = {
        // RFC 9591 Appendix A encodes signatures canonically as
        // SerializeElement(R) || SerializeScalar(z).
        encode: (R, z)=>{
            let res = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(serializePoint(R), Fn.toBytes(z));
            if (adjustTx) res = adjustTx.encode(res);
            return res;
        },
        decode: (sig)=>{
            if (adjustTx) sig = adjustTx.decode(sig);
            // We don't know size of point, but we know size of scalar
            const Rbytes = sig.subarray(0, -Fn.BYTES);
            const R = parsePoint(Rbytes);
            // RFC 9591 Section 3.1 SerializeElement is canonical: a signature must not verify under an
            // alternative point encoding (e.g. re-encoding a weierstrass R uncompressed as 65 bytes).
            if (serializePoint(R).length !== Rbytes.length) throw new Error('invalid signature encoding');
            const z = Fn.fromBytes(sig.subarray(-Fn.BYTES));
            return {
                R,
                z
            };
        }
    };
    // Generates pair of (scalar, point)
    const genPointScalarPair = (rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])=>{
        let n = randomScalar(rng);
        if (adjustScalar) n = adjustScalar(n);
        let p = Point.BASE.multiply(n);
        return {
            scalar: n,
            point: p
        };
    };
    // No roots here: root-based methods will throw.
    // `poly` expects a structured roots-of-unity domain, but FROST uses an
    // arbitrary domain and only needs the non-root operations below.
    const nrErr = 'roots are unavailable in FROST polynomial mode';
    const noRoots = {
        info: {
            G: Fn.ZERO,
            oddFactor: Fn.ZERO,
            powerOfTwo: 0
        },
        roots () {
            throw new Error(nrErr);
        },
        brp () {
            throw new Error(nrErr);
        },
        inverse () {
            throw new Error(nrErr);
        },
        omega () {
            throw new Error(nrErr);
        },
        clear () {}
    };
    const Poly = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$fft$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["poly"])(Fn, noRoots);
    // Variable-time MSM over public inputs only (VSS / nonce commitments, binding factors).
    // Interleaved wNAF beats pippenger ~3x at FROST-sized inputs (n <= dozens of signers).
    const msm = (points, scalars)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mulAddUnsafe"])(Point, points, scalars);
    // Internal stuff uses bigints & Points, external Uint8Arrays
    const polynomialEvaluate = (x, coeffs)=>{
        if (!coeffs.length) throw new Error('empty coefficients');
        return Poly.monomial.eval(coeffs, x);
    };
    const deriveInterpolatingValue = (L, xi)=>{
        const err = 'invalid parameters';
        // Generates lagrange coefficient
        if (!L.some((x)=>Fn.eql(x, xi))) throw new Error(err);
        // Throws error if any x-coordinate is represented more than once in L.
        const Lset = new Set(L);
        if (Lset.size !== L.length) throw new Error(err);
        // Or if xi is missing
        if (!Lset.has(xi)) throw new Error(err);
        let num = Fn.ONE;
        let den = Fn.ONE;
        for (const x of L){
            if (Fn.eql(x, xi)) continue;
            num = Fn.mul(num, x); // num *= x
            den = Fn.mul(den, Fn.sub(x, xi)); // RFC 9591 §4.2: denominator *= x_j - x_i
        }
        return Fn.div(num, den);
    };
    const evalutateVSS = (identifier, commitment)=>{
        // RFC 9591 Appendix C.2: S_i' = Σ_j ScalarMult(vss_commitment[j], i^j).
        const monomial = Poly.monomial.basis(identifier, commitment.length);
        return msm(commitment, monomial);
    };
    // High-level internal stuff
    const generateSecretPolynomial = (signers, secret, coeffs, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])=>{
        validateSigners(signers);
        if (secret !== undefined) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(secret, Fn.BYTES, 'secret');
        if (coeffs !== undefined) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(coeffs, 'coeffs');
        if (typeof rng !== 'function') throw new TypeError('"rng" expected function, got type=' + typeof rng);
        // Dealer/DKG polynomial sampling reuses the same hardened scalar derivation as round-one
        // nonces: overriding `rng` only swaps the entropy source, not the non-zero `1..n-1` policy.
        const secretScalar = secret === undefined ? randomScalar(rng) : Fn.fromBytes(secret);
        if (!coeffs) {
            coeffs = [];
            for(let i = 0; i < signers.min - 1; i++)coeffs.push(randomScalar(rng));
        }
        if (coeffs.length !== signers.min - 1) throw new Error('wrong coefficients length');
        const coefficients = [
            secretScalar,
            ...coeffs
        ];
        // RFC 9591 Appendix C.2 commits to every polynomial coefficient with ScalarBaseMult.
        const commitment = coefficients.map((i)=>Point.BASE.multiply(i));
        return {
            coefficients,
            commitment,
            secret: secretScalar
        };
    };
    // Pretty much sign+verify, same as basic
    const ProofOfKnowledge = {
        challenge: (id, verKey, R)=>HDKG((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(Fn.toBytes(id), serializePoint(verKey), serializePoint(R))),
        compute (id, coefficents, commitments, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"]) {
            if (coefficents.length < 1) throw new Error('coefficients should have at least one element');
            const { point: R, scalar: k } = genPointScalarPair(rng);
            const verKey = commitments[0]; // verify key is first one
            const c = this.challenge(id, verKey, R);
            const mu = Fn.add(k, Fn.mul(coefficents[0], c)); // mu = k + coeff[0] * c
            return Signature.encode(R, mu);
        },
        validate (id, commitment, proof) {
            if (commitment.length < 1) throw new Error('commitment should have at least one element');
            const { R, z } = Signature.decode(proof);
            const phi = parsePoint(commitment[0]);
            const c = this.challenge(id, phi, R);
            // R === z*G - phi*c. All inputs are public: variable-time multiplication is safe here.
            if (!R.equals(Point.BASE.multiplyUnsafe(z).subtract(phi.multiplyUnsafe(c)))) throw new Error('invalid proof of knowledge');
        }
    };
    const Basic = {
        challenge: (R, PK, msg)=>{
            if (challenge) return challenge(R, PK, msg);
            return H2((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(serializePoint(R), serializePoint(PK), msg));
        },
        sign (msg, sk, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"]) {
            const { point: R, scalar: r } = genPointScalarPair(rng);
            const PK = Point.BASE.multiply(sk); // sk*G
            const c = this.challenge(R, PK, msg);
            const z = Fn.add(r, Fn.mul(c, sk)); // r + c * sk
            return [
                R,
                z
            ];
        },
        verify (msg, R, z, PK) {
            if (adjustPointHook) PK = adjustPointHook(PK);
            if (adjustPointHook) R = adjustPointHook(R);
            // Signature, message and public key are all public: variable-time is safe on this path.
            const c = this.challenge(R, PK, msg);
            const zB = Point.BASE.multiplyUnsafe(z); // z*G
            const cA = PK.multiplyUnsafe(c); // c*PK
            let check = zB.subtract(cA).subtract(R); // zB - cA - R
            // No clearCoffactor on ristretto
            if (check.clearCofactor) check = check.clearCofactor();
            return Point.ZERO.equals(check);
        }
    };
    // === vssVerify
    const validateSecretShare = (identifier, commitment, signingShare)=>{
        // RFC 9591 Appendix C.2 `vss_verify(share_i, vss_commitment)` is purely algebraic.
        // Public FROST packages still go through Section 3.1 element encoding,
        // which rejects identity points, so a zero share or commitment does not
        // become valid wire data just because VSS matches.
        if (!Point.BASE.multiply(signingShare).equals(evalutateVSS(identifier, commitment))) throw new Error('invalid secret share');
    };
    const Identifier = {
        fromNumber (n) {
            if (!Number.isSafeInteger(n)) throw new Error('expected safe interger');
            return serializeIdentifier(BigInt(n));
        },
        // Not in spec, but in FROST implementation,
        // seems useful and nice, no need to sync identifiers (would require more interactions)
        derive (s) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["astring"])(s, 's');
            // Derived identifiers may land anywhere in the scalar field; they are not restricted to
            // sequential `1..max_signers` values.
            return serializeIdentifier(HID((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["utf8ToBytes"])(s)));
        }
    };
    // RFC 9591 §4.1: nonce_generate() hashes 32 fresh RNG bytes with SerializeScalar(secret).
    const generateNonce = (secret, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])=>H3((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(rng(32), Fn.toBytes(secret)));
    const getGroupCommitment = (GPK, commitmentList, msg)=>{
        const CL = commitmentList.map((i)=>[
                i.identifier,
                parseIdentifier(i.identifier),
                parsePoint(i.hiding),
                parsePoint(i.binding)
            ]);
        // RFC 9591 Sections 4.3/4.4/4.5 and 5.2/5.3 treat commitment_list as sorted by identifier.
        CL.sort((a, b)=>a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
        // Encode commitment list
        const Cbytes = [];
        for (const [_, id, hC, bC] of CL)Cbytes.push(Fn.toBytes(id), serializePoint(hC), serializePoint(bC));
        const encodedCommitmentHash = H5((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(...Cbytes));
        const rhoPrefix = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(serializePoint(GPK), H4(msg), encodedCommitmentHash);
        // Compute binding factors
        const bindingFactors = {};
        for (const [i, id] of CL){
            bindingFactors[i] = H1((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(rhoPrefix, Fn.toBytes(id)));
        }
        // Hiding commitments all carry scalar 1, so add them directly and keep only the
        // binding commitments in the MSM: same result, half the MSM size.
        let hidingSum = Point.ZERO;
        const points = [];
        const scalars = [];
        for (const [i, _, hC, bC] of CL){
            if (Point.ZERO.equals(hC) || Point.ZERO.equals(bC)) throw new Error('infinity commitment');
            hidingSum = hidingSum.add(hC);
            points.push(bC);
            scalars.push(bindingFactors[i]);
        }
        const groupCommitment = hidingSum.add(msm(points, scalars)); //  GC += hC + bC*bindingFactor
        const identifiers = CL.map((i)=>i[1]);
        return {
            identifiers,
            groupCommitment,
            bindingFactors
        };
    };
    const prepareShare = (PK, commitmentList, msg, identifier)=>{
        // RFC 9591 Sections 4.4/4.5/4.6 feed directly into the Section 5.2 signer computation.
        const GPK = adjustPoint(parsePoint(PK));
        const id = parseIdentifier(identifier);
        const { identifiers, groupCommitment, bindingFactors } = getGroupCommitment(GPK, commitmentList, msg);
        const bindingFactor = bindingFactors[identifier];
        const lambda = deriveInterpolatingValue(identifiers, id);
        const challenge = Basic.challenge(groupCommitment, GPK, msg);
        return {
            lambda,
            challenge,
            bindingFactor,
            groupCommitment
        };
    };
    Object.freeze(Identifier);
    const frost = {
        Identifier,
        // DKG is Distributed Key Generation, not Trusted Dealer Key Generation.
        DKG: Object.freeze({
            // NOTE: we allow to pass secret scalar from user side,
            // this way it can be derived, instead of random generation
            round1: (id, signers, secret, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])=>{
                const idNum = parseIdentifier(id, 'id');
                validateSigners(signers);
                const { coefficients, commitment } = generateSecretPolynomial(signers, secret, undefined, rng);
                const proofOfKnowledge = ProofOfKnowledge.compute(idNum, coefficients, commitment, rng);
                const commitmentBytes = commitment.map(serializePoint);
                const round1Public = {
                    identifier: serializeIdentifier(idNum),
                    commitment: commitmentBytes,
                    proofOfKnowledge
                };
                // store secret information for signing
                const round1Secret = {
                    identifier: idNum,
                    coefficients,
                    commitment: commitment.map(serializePoint),
                    // Copy threshold metadata instead of retaining the caller-owned object by reference.
                    signers: {
                        min: signers.min,
                        max: signers.max
                    },
                    step: 1
                };
                return {
                    public: round1Public,
                    secret: round1Secret
                };
            },
            round2: (secret, others)=>{
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(secret, {
                    identifier: 'bigint',
                    commitment: 'object',
                    signers: 'object'
                }, {
                    coefficients: 'object',
                    round1Cache: 'object',
                    round2Cache: 'object',
                    step: 'number'
                }, 'secret');
                validateSigners(secret.signers, 'secret.signers');
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(others, 'others');
                if (others.length !== secret.signers.max - 1) throw new Error('wrong number of round1 packages');
                if (!secret.coefficients || secret.step === 3) throw new Error('round3 package used in round2');
                // Snapshot before validation, then authenticate and cache this exact owned transcript.
                const authenticatedRound1 = canonicalRound1Packages(others);
                if (secret.round2Cache !== undefined) {
                    if (secret.round1Cache === undefined || !equalRound1Transcripts(secret.round1Cache, authenticatedRound1)) throw new Error('round1 packages do not match authenticated transcript');
                    return secret.round2Cache;
                }
                const res = {};
                for (const p of authenticatedRound1){
                    if (p.commitment.length !== secret.signers.min) throw new Error('wrong number of commitments');
                    const id = parseIdentifier(p.identifier);
                    if (id === secret.identifier) throw new Error('duplicate id=' + serializeIdentifier(id));
                    ProofOfKnowledge.validate(id, p.commitment, p.proofOfKnowledge);
                    for (const c of p.commitment)parsePoint(c);
                    if (res[p.identifier]) throw new Error('Duplicate id=' + id);
                    const signingShare = Fn.toBytes(polynomialEvaluate(id, secret.coefficients));
                    res[p.identifier] = {
                        identifier: serializeIdentifier(secret.identifier),
                        signingShare: signingShare
                    };
                }
                secret.round1Cache = authenticatedRound1;
                secret.round2Cache = res;
                secret.step = 2;
                return res;
            },
            round3: (secret, round1, round2)=>{
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(secret, {
                    identifier: 'bigint',
                    commitment: 'object',
                    signers: 'object'
                }, {
                    coefficients: 'object',
                    round1Cache: 'object',
                    round2Cache: 'object',
                    step: 'number'
                }, 'secret');
                validateSigners(secret.signers, 'secret.signers');
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(round1, 'round1');
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(round2, 'round2');
                if (round1.length !== secret.signers.max - 1) throw new Error('wrong length of round1 packages');
                if (!secret.coefficients || secret.step !== 2 || !secret.round1Cache) throw new Error('round2 package used in round3');
                const suppliedRound1 = canonicalRound1Packages(round1);
                const authenticatedRound1 = secret.round1Cache;
                if (!equalRound1Transcripts(authenticatedRound1, suppliedRound1)) throw new Error('round1 packages do not match authenticated transcript');
                if (round2.length !== authenticatedRound1.length) throw new Error('wrong length of round2 packages');
                const merged = {};
                // Use the authenticated owned transcript after comparison; never re-read caller input.
                for (const r1 of authenticatedRound1){
                    if (!r1.identifier || !r1.commitment) throw new Error('wrong round1 share');
                    merged[r1.identifier] = {
                        ...r1
                    };
                }
                for (const r2 of round2){
                    if (!r2.identifier || !r2.signingShare) throw new Error('wrong round2 share');
                    if (!merged[r2.identifier]) throw new Error('round1 share for ' + r2.identifier + ' is missing');
                    merged[r2.identifier].signingShare = r2.signingShare;
                }
                if (Object.keys(merged).length !== authenticatedRound1.length) throw new Error('mismatch identifiers between rounds');
                let signingShare = Fn.ZERO;
                if (secret.commitment.length !== secret.signers.min) throw new Error('wrong commitments length');
                const localCommitment = secret.commitment.map(parsePoint);
                const localShare = polynomialEvaluate(secret.identifier, secret.coefficients);
                validateSecretShare(secret.identifier, localCommitment, localShare);
                const localCommitmentBytes = localCommitment.map(serializePoint);
                const commitments = {
                    [serializeIdentifier(secret.identifier)]: localCommitmentBytes
                };
                for(const k in merged){
                    const v = merged[k];
                    if (!v.signingShare || !v.commitment) throw new Error('mismatch identifiers');
                    const id = parseIdentifier(k); // from
                    const signingSharePart = Fn.fromBytes(v.signingShare);
                    const commitment = v.commitment.map(parsePoint);
                    validateSecretShare(secret.identifier, commitment, signingSharePart);
                    signingShare = Fn.add(signingShare, signingSharePart);
                    const idSer = serializeIdentifier(id);
                    if (commitments[idSer]) throw new Error('duplicated id=' + idSer);
                    commitments[idSer] = v.commitment;
                }
                signingShare = Fn.add(signingShare, localShare);
                const mergedCommitment = new Array(secret.signers.min).fill(Point.ZERO);
                for(const k in commitments){
                    const v = commitments[k];
                    if (v.length !== secret.signers.min) throw new Error('wrong commitments length');
                    for(let i = 0; i < v.length; i++)mergedCommitment[i] = mergedCommitment[i].add(parsePoint(v[i]));
                }
                const mergedCommitmentBytes = mergedCommitment.map(serializePoint);
                const verifyingShares = {};
                for(const k in commitments)verifyingShares[k] = serializePoint(evalutateVSS(parseIdentifier(k), mergedCommitment));
                // This is enough to sign stuff
                let res = {
                    public: {
                        signers: {
                            min: secret.signers.min,
                            max: secret.signers.max
                        },
                        commitments: mergedCommitmentBytes,
                        verifyingShares: Object.fromEntries(Object.entries(verifyingShares).map(([k, v])=>[
                                k,
                                v.slice()
                            ]))
                    },
                    secret: {
                        identifier: serializeIdentifier(secret.identifier),
                        signingShare: Fn.toBytes(signingShare)
                    }
                };
                if (adjustDKG) res = adjustDKG(res);
                for(let i = 0; i < secret.coefficients.length; i++)secret.coefficients[i] -= secret.coefficients[i];
                delete secret.coefficients;
                delete secret.round1Cache;
                delete secret.round2Cache;
                secret.step = 3;
                return res;
            },
            clean (secret) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(secret, {
                    identifier: 'bigint',
                    commitment: 'object',
                    signers: 'object'
                }, {
                    coefficients: 'object',
                    round1Cache: 'object',
                    round2Cache: 'object',
                    step: 'number'
                }, 'secret');
                // Instead of replacing secret bigint with another (zero?), we subtract it from itself
                // in the hope that JIT will modify it inplace, instead of creating new value.
                // This is unverified and may not work, but it is best we can do in regard of bigints.
                secret.identifier -= secret.identifier;
                if (secret.coefficients) {
                    for(let i = 0; i < secret.coefficients.length; i++)secret.coefficients[i] -= secret.coefficients[i];
                }
                // for (const c of secret.commitment) c.fill(0);
                delete secret.round1Cache;
                delete secret.round2Cache;
                secret.step = 3;
            }
        }),
        // Trusted dealer setup
        // Generates keys for all participants
        trustedDealer (signers, identifiers, secret, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"]) {
            // if no identifiers provided, we generated default identifiers
            validateSigners(signers);
            if (identifiers === undefined) {
                identifiers = [];
                for(let i = 1; i <= signers.max; i++)identifiers.push(Identifier.fromNumber(i));
            } else {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(identifiers, 'identifiers');
                if (identifiers.length !== signers.max) throw new Error('identifiers should be array of ' + signers.max);
            }
            const identifierNums = {};
            for (const id of identifiers){
                const idNum = parseIdentifier(id);
                if (id in identifierNums) throw new Error('duplicated id=' + id);
                identifierNums[id] = idNum;
            }
            const sp = generateSecretPolynomial(signers, secret, undefined, rng);
            const commitmentBytes = sp.commitment.map(serializePoint);
            const secretShares = {};
            const verifyingShares = {};
            for (const id of identifiers){
                const signingShare = polynomialEvaluate(identifierNums[id], sp.coefficients);
                verifyingShares[id] = serializePoint(Point.BASE.multiply(signingShare));
                secretShares[id] = {
                    identifier: id,
                    signingShare: Fn.toBytes(signingShare)
                };
            }
            return {
                public: {
                    signers: {
                        min: signers.min,
                        max: signers.max
                    },
                    commitments: commitmentBytes,
                    verifyingShares
                },
                secretShares
            };
        },
        // Validate secret (from trusted dealer or DKG)
        validateSecret (secret, pub) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(secret, {
                identifier: 'string',
                signingShare: 'object'
            }, {}, 'secret');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(secret.signingShare, Fn.BYTES, 'secret.signingShare');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(pub, {
                signers: 'object',
                commitments: 'object',
                verifyingShares: 'object'
            }, {}, 'pub');
            validateSigners(pub.signers, 'pub.signers');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(pub.commitments, 'pub.commitments');
            const id = parseIdentifier(secret.identifier);
            const commitment = pub.commitments.map(parsePoint);
            const signingShare = Fn.fromBytes(secret.signingShare);
            validateSecretShare(id, commitment, signingShare);
        },
        // Actual signing
        // Round 1: each participant commit to nonces
        // Nonces kept private, commitments sent to coordinator (or every other participant)
        // NOTE: we don't need the message at this point, which lets a coordinator
        // keep multiple nonce commitments per participant in advance and skip
        // round1 for signing.
        // But then each participant needs to remember generated shares
        commit (secret, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"]) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(secret, {
                identifier: 'string',
                signingShare: 'object'
            }, {}, 'secret');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(secret.signingShare, Fn.BYTES, 'secret.signingShare');
            if (typeof rng !== 'function') throw new TypeError('"rng" expected function, got type=' + typeof rng);
            const secretScalar = Fn.fromBytes(secret.signingShare);
            const hiding = generateNonce(secretScalar, rng);
            const binding = generateNonce(secretScalar, rng);
            const nonces = {
                hiding: Fn.toBytes(hiding),
                binding: Fn.toBytes(binding)
            };
            return {
                nonces,
                commitments: nonceCommitments(secret.identifier, nonces)
            };
        },
        // Round2: sign. Each participant creates a signature share from the secret
        // and the selected nonce commitments.
        signShare (secret, pub, nonces, commitmentList, msg) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(secret, {
                identifier: 'string',
                signingShare: 'object'
            }, {}, 'secret');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(secret.signingShare, Fn.BYTES, 'secret.signingShare');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(pub, {
                signers: 'object',
                commitments: 'object',
                verifyingShares: 'object'
            }, {}, 'pub');
            validateSigners(pub.signers, 'pub.signers');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(pub.commitments, 'pub.commitments');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(nonces, {
                hiding: 'object',
                binding: 'object'
            }, {}, 'nonces');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(nonces.hiding, Fn.BYTES, 'nonces.hiding');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(nonces.binding, Fn.BYTES, 'nonces.binding');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(commitmentList, 'commitmentList');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(msg, undefined, 'msg');
            validateCommitmentsNum(pub.signers, commitmentList.length);
            const hidingNonce0 = Fn.fromBytes(nonces.hiding);
            const bindingNonce0 = Fn.fromBytes(nonces.binding);
            if (Fn.is0(hidingNonce0) || Fn.is0(bindingNonce0)) throw new Error('signing nonces already used');
            // Reject a coordinator-assigned commitment pair that does not match the signer's own nonce
            // pair. This must happen before suite-specific nonce adjustment; secp256k1-tr may negate the
            // actual signing nonces later, but the coordinator still assigns the original commitments.
            const expectedCommitment = {
                identifier: secret.identifier,
                hiding: serializePoint(Point.BASE.multiply(hidingNonce0)),
                binding: serializePoint(Point.BASE.multiply(bindingNonce0))
            };
            const commitment = commitmentList.find((i)=>i.identifier === secret.identifier);
            if (!commitment) throw new Error('missing signer commitment');
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToHex"])(commitment.hiding) !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToHex"])(expectedCommitment.hiding) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToHex"])(commitment.binding) !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToHex"])(expectedCommitment.binding)) throw new Error('incorrect signer commitment');
            if (adjustSecret) secret = adjustSecret(secret, pub);
            if (adjustPublic) pub = adjustPublic(pub);
            const SK = Fn.fromBytes(secret.signingShare);
            const { lambda, challenge, bindingFactor, groupCommitment } = prepareShare(pub.commitments[0], commitmentList, msg, secret.identifier);
            const N = adjustNonces ? adjustNonces(groupCommitment, nonces) : nonces;
            const hidingNonce = adjustNonces ? Fn.fromBytes(N.hiding) : hidingNonce0;
            const bindingNonce = adjustNonces ? Fn.fromBytes(N.binding) : bindingNonce0;
            const t = Fn.mul(Fn.mul(lambda, SK), challenge); // challenge * lambda * SK
            const t2 = Fn.mul(bindingNonce, bindingFactor); // bindingNonce * bindingFactor
            const r = Fn.toBytes(Fn.add(Fn.add(hidingNonce, t2), t)); // t + t2 + hidingNonce
            // RFC 9591 round-one commitments are one-time-use, and round two must use the nonce
            // corresponding to the published commitment. This API returns mutable local nonce bytes,
            // so consume them after a successful signShare() call: later all-zero reuse fails closed.
            nonces.hiding.fill(0);
            nonces.binding.fill(0);
            return r;
        },
        // Each participant (or coordinator) can verify signatures from other participants
        verifyShare (pub, commitmentList, msg, identifier, sigShare) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(pub, {
                signers: 'object',
                commitments: 'object',
                verifyingShares: 'object'
            }, {}, 'pub');
            validateSigners(pub.signers, 'pub.signers');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(pub.commitments, 'pub.commitments');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(commitmentList, 'commitmentList');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(msg, undefined, 'msg');
            parseIdentifier(identifier);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(sigShare, Fn.BYTES, 'sigShare');
            if (adjustPublic) pub = adjustPublic(pub);
            const comm = commitmentList.find((i)=>i.identifier === identifier);
            if (!comm) throw new Error('cannot find identifier commitment');
            const PK = parsePoint(pub.verifyingShares[identifier]);
            const hidingNonceCommitment = parsePoint(comm.hiding);
            const bindingNonceCommitment = parsePoint(comm.binding);
            const { lambda, challenge, bindingFactor, groupCommitment } = prepareShare(pub.commitments[0], commitmentList, msg, identifier);
            // Signature shares, commitments and verifying shares are public: vartime is safe here.
            // hC + bC * bF
            let commShare = hidingNonceCommitment.add(bindingNonceCommitment.multiplyUnsafe(bindingFactor));
            if (adjustGroupCommitmentShare) commShare = adjustGroupCommitmentShare(groupCommitment, commShare);
            const l = Point.BASE.multiplyUnsafe(Fn.fromBytes(sigShare)); // sigShare*G
            // commShare + PK * (challenge * lambda)
            const r = commShare.add(PK.multiplyUnsafe(Fn.mul(challenge, lambda)));
            return l.equals(r);
        },
        // Aggregate multiple signature shares into groupSignature
        aggregate (pub, commitmentList, msg, sigShares) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(pub, {
                signers: 'object',
                commitments: 'object',
                verifyingShares: 'object'
            }, {}, 'pub');
            validateSigners(pub.signers, 'pub.signers');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(pub.commitments, 'pub.commitments');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(commitmentList, 'commitmentList');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(msg, undefined, 'msg');
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(sigShares, {}, {}, 'sigShares');
            // verifyShare() applies adjustPublic too, so keep the original package for attribution.
            const rawPub = pub;
            if (adjustPublic) pub = adjustPublic(pub);
            try {
                validateCommitmentsNum(pub.signers, commitmentList.length);
            } catch  {
                throw new AggErr('aggregation failed', []);
            }
            const ids = commitmentList.map((i)=>i.identifier);
            const seen = new Set();
            for (const id of ids){
                // `sigShares` is identifier-keyed, so duplicate commitments would reuse one share twice.
                if (seen.has(id)) throw new AggErr('aggregation failed', []);
                seen.add(id);
            }
            if (ids.length !== Object.keys(sigShares).length) throw new AggErr('aggregation failed', []);
            for (const id of ids){
                if (!(id in sigShares) || !(id in pub.verifyingShares)) throw new AggErr('aggregation failed', []);
            }
            const GPK = parsePoint(pub.commitments[0]);
            const { groupCommitment } = getGroupCommitment(GPK, commitmentList, msg);
            let z = Fn.ZERO;
            // RFC 9591 Section 5.3 aggregates by summing the validated signature shares.
            for (const id of ids)z = Fn.add(z, Fn.fromBytes(sigShares[id])); // z += zi
            if (!Basic.verify(msg, groupCommitment, z, GPK)) {
                const cheaters = [];
                for (const id of ids){
                    if (!this.verifyShare(rawPub, commitmentList, msg, id, sigShares[id])) cheaters.push(id);
                }
                throw new AggErr('aggregation failed', cheaters);
            }
            return Signature.encode(groupCommitment, z);
        },
        // Basic sign/verify using single key
        sign (msg, secretKey) {
            let sk = Fn.fromBytes(secretKey);
            // Taproot single-key signing needs the same scalar normalization as threshold keys.
            if (adjustScalar) sk = adjustScalar(sk);
            const [R, z] = Basic.sign(msg, sk);
            return Signature.encode(R, z);
        },
        verify (sig, msg, publicKey) {
            const PK = parsePublicKey ? validatePublicPoint(parsePublicKey(publicKey)) : parsePoint(publicKey);
            const { R, z } = Signature.decode(sig);
            return Basic.verify(msg, R, z, PK);
        },
        // Combine multiple secret shares to restore secret
        combineSecret (shares, signers) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(shares, 'shares');
            validateSigners(signers);
            if (shares.length < signers.min || shares.length > signers.max) throw new Error('wrong secret shares array');
            const points = [];
            const seen = {};
            // Interpolate over the full provided share set and reject duplicate identifiers.
            for (const s of shares){
                const idNum = parseIdentifier(s.identifier);
                const id = serializeIdentifier(idNum);
                if (seen[id]) throw new Error('duplicated id=' + id);
                seen[id] = true;
                points.push([
                    idNum,
                    Fn.fromBytes(s.signingShare)
                ]);
            }
            const xCoords = points.map(([x])=>x);
            let res = Fn.ZERO;
            for (const [x, y] of points)res = Fn.add(res, Fn.mul(y, deriveInterpolatingValue(xCoords, x)));
            return Fn.toBytes(res);
        },
        // Utils
        utils: Object.freeze({
            Fn,
            // Test RNG overrides still go through noble's non-zero scalar derivation; this is not a raw
            // "bytes become scalar" escape hatch.
            randomScalar: (rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])=>Fn.toBytes(genPointScalarPair(rng).scalar),
            generateSecretPolynomial: (signers, secret, coeffs, rng)=>{
                const res = generateSecretPolynomial(signers, secret, coeffs, rng);
                return {
                    ...res,
                    commitment: res.commitment.map(serializePoint)
                };
            }
        })
    };
    return Object.freeze(frost);
}
}),
"[project]/sdk/js/node_modules/@noble/curves/abstract/hash-to-curve.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SWUFpSqrtRatio",
    ()=>SWUFpSqrtRatio,
    "_DST_scalar",
    ()=>_DST_scalar,
    "createHasher",
    ()=>createHasher,
    "expand_message_xmd",
    ()=>expand_message_xmd,
    "expand_message_xof",
    ()=>expand_message_xof,
    "hash_to_field",
    ()=>hash_to_field,
    "isogenyMap",
    ()=>isogenyMap,
    "mapToCurveSimpleSWU",
    ()=>mapToCurveSimpleSWU
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/modular.js [app-ssr] (ecmascript)");
;
;
// prettier-ignore
const _0n = /* @__PURE__ */ BigInt(0), _1n = /* @__PURE__ */ BigInt(1), _2n = /* @__PURE__ */ BigInt(2), _3n = /* @__PURE__ */ BigInt(3), _4n = /* @__PURE__ */ BigInt(4);
// Octet Stream to Integer. "spec" implementation of os2ip is 2.5x slower vs bytesToNumberBE.
const os2ip = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberBE"];
// Integer to Octet Stream (numberToBytesBE).
function i2osp(value, length) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(value);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(length);
    // This helper stays on the JS bitwise/u32 fast-path. Callers that need wider encodings should
    // use bigint + numberToBytesBE instead of routing large widths through this small helper.
    if (length < 0 || length > 4) throw new Error('invalid I2OSP length: ' + length);
    if (value < 0 || value > 2 ** (8 * length) - 1) throw new Error('invalid I2OSP input: ' + value);
    const res = Array.from({
        length
    }).fill(0);
    for(let i = length - 1; i >= 0; i--){
        res[i] = value & 0xff;
        value >>>= 8;
    }
    return new Uint8Array(res);
}
// RFC 9380 only applies strxor() to equal-length strings; callers must preserve that invariant.
function strxor(a, b) {
    const arr = new Uint8Array(a.length);
    for(let i = 0; i < a.length; i++){
        arr[i] = a[i] ^ b[i];
    }
    return arr;
}
// User can always use utf8 if they want, by passing Uint8Array.
// If string is passed, we treat it as ASCII: other formats are likely a mistake.
function normDST(DST) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isBytes"])(DST) && typeof DST !== 'string') throw new Error('DST must be Uint8Array or ascii string');
    const dst = typeof DST === 'string' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])(DST) : DST;
    // RFC 9380 §3.1 requirement 2: tags "MUST have nonzero length".
    if (dst.length === 0) throw new Error('DST must be non-empty');
    return dst;
}
function expand_message_xmd(msg, DST, lenInBytes, H) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(msg);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(lenInBytes);
    if (typeof H !== 'function') throw new Error('expand_message_xmd: expected hash function');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(H.outputLen, 'hash.outputLen');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(H.blockLen, 'hash.blockLen');
    DST = normDST(DST);
    // https://www.rfc-editor.org/rfc/rfc9380#section-5.3.3
    if (DST.length > 255) DST = H((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])('H2C-OVERSIZE-DST-'), DST));
    const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
    const ell = Math.ceil(lenInBytes / b_in_bytes);
    if (lenInBytes > 65535 || ell > 255) throw new Error('expand_message_xmd: invalid lenInBytes');
    const DST_prime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(DST, i2osp(DST.length, 1));
    const Z_pad = new Uint8Array(r_in_bytes); // RFC 9380: Z_pad = I2OSP(0, s_in_bytes)
    const l_i_b_str = i2osp(lenInBytes, 2); // len_in_bytes_str
    const b = new Array(ell);
    const b_0 = H((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
    b[0] = H((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(b_0, i2osp(1, 1), DST_prime));
    // `b[0]` already stores RFC `b_1`, so only derive `b_2..b_ell` here. The old `<= ell`
    // loop computed one extra tail block, which was usually sliced away but broke at max `ell=255`
    // by reaching `I2OSP(256, 1)`.
    for(let i = 1; i < ell; i++){
        const args = [
            strxor(b_0, b[i - 1]),
            i2osp(i + 1, 1),
            DST_prime
        ];
        b[i] = H((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(...args));
    }
    const pseudo_random_bytes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(...b);
    return pseudo_random_bytes.slice(0, lenInBytes);
}
function expand_message_xof(msg, DST, lenInBytes, k, H) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(msg);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(lenInBytes);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(k, 'k');
    if (k < 0) throw new Error('expand_message_xof: invalid k');
    if (typeof H !== 'function') throw new Error('expand_message_xof: expected XOF function');
    if (typeof H.create !== 'function') throw new Error('expand_message_xof: expected XOF create');
    DST = normDST(DST);
    if (lenInBytes < 0 || lenInBytes > 65535) throw new Error('expand_message_xof: invalid lenInBytes');
    // https://www.rfc-editor.org/rfc/rfc9380#section-5.3.3
    // RFC 9380 §5.3.3: DST = H("H2C-OVERSIZE-DST-" || a_very_long_DST, ceil(2 * k / 8)).
    if (DST.length > 255) {
        const dkLen = Math.ceil(2 * k / 8);
        DST = H.create({
            dkLen
        }).update((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])('H2C-OVERSIZE-DST-')).update(DST).digest();
    }
    // Oversize DSTs are compressed above; fail closed if a custom XOF still returns one
    // (possible when k > 1020 makes the compression dkLen itself exceed 255 bytes).
    if (DST.length > 255) throw new Error('expand_message_xof: invalid DST');
    return H.create({
        dkLen: lenInBytes
    }).update(msg).update(i2osp(lenInBytes, 2))// 2. DST_prime = DST || I2OSP(len(DST), 1)
    .update(DST).update(i2osp(DST.length, 1)).digest();
}
function hash_to_field(msg, count, options) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(options, {
        p: 'bigint',
        m: 'number',
        k: 'number',
        hash: 'function'
    });
    const { p, k, m, hash, expand, DST } = options;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(hash.outputLen, 'valid hash');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(msg);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(count);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(m, 'm');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(k, 'k');
    // RFC 9380 §5.2 defines hash_to_field over a list of one or more field elements and an integer
    // extension degree `m >= 1`; rejecting here avoids degenerate `[]` / `[[]]` helper outputs.
    // The RFC also treats `p` as a finite-field characteristic; bad values degenerate log2/mod.
    if (p <= BigInt(1)) throw new Error('hash_to_field: expected valid field characteristic');
    if (count < 1) throw new Error('hash_to_field: expected count >= 1');
    if (m < 1) throw new Error('hash_to_field: expected m >= 1');
    if (k < 0) throw new Error('hash_to_field: invalid k');
    const log2p = p.toString(2).length;
    const L = Math.ceil((log2p + k) / 8); // section 5.1 of ietf draft link above
    const len_in_bytes = count * m * L;
    let prb; // pseudo_random_bytes
    if (expand === 'xmd') {
        prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
    } else if (expand === 'xof') {
        prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
    } else if (expand === '_internal_pass') {
        // for internal tests only: msg is used as the uniform bytes directly. Short msg is allowed
        // on purpose (subarray() slices are short): zkcrypto map_scalar vectors feed empty okm.
        prb = msg;
    } else {
        throw new Error('expand must be "xmd" or "xof"');
    }
    const u = new Array(count);
    for(let i = 0; i < count; i++){
        const e = new Array(m);
        for(let j = 0; j < m; j++){
            const elm_offset = L * (j + i * m);
            const tv = prb.subarray(elm_offset, elm_offset + L);
            e[j] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(os2ip(tv), p);
        }
        u[i] = e;
    }
    return u;
}
function isogenyMap(field, map) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateField"])(field);
    // Make same order as in spec
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(map, 'map');
    const coeff = map.map((i, row)=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(i, 'map[' + row + ']');
        if (i.length < 1) throw new Error('isogenyMap: expected non-empty coefficients');
        return Array.from(i).reverse();
    });
    return (x, y)=>{
        const [xn, xd, yn, yd] = coeff.map((val)=>val.reduce((acc, i)=>field.add(field.mul(acc, x), i)));
        const isZero = field.is0(xd) || field.is0(yd);
        // Shipped Weierstrass consumers encode that affine identity as all-zero
        // coordinates, so `passZero=true` intentionally collapses zero
        // denominators to `{ x: 0, y: 0 }`.
        const [xd_inv, yd_inv] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FpInvertBatch"])(field, [
            xd,
            yd
        ], true);
        x = field.mul(xn, xd_inv); // xNum / xDen
        y = field.mul(y, field.mul(yn, yd_inv)); // y * (yNum / yDev)
        // RFC 9380 §6.6.3: if the denominator of either isogeny rational function is
        // zero, the exceptional case must return the identity point on E.
        return isZero ? {
            x: field.ZERO,
            y: field.ZERO
        } : {
            x,
            y
        };
    };
}
const _DST_scalar = 'HashToScalar-';
function createHasher(Point, mapToCurve, defaults) {
    if (typeof mapToCurve !== 'function') throw new Error('mapToCurve() must be defined');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(defaults);
    // `Point` is intentionally not shape-validated eagerly here: point constructors vary across
    // curve families, so this helper only checks the hooks it can validate cheaply. Misconfigured
    // suites fail later when hashing first touches Point.fromAffine / Point.ZERO / clearCofactor().
    const snapshot = (src)=>Object.freeze({
            ...src,
            DST: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isBytes"])(src.DST) ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(src.DST) : src.DST,
            ...src.encodeDST === undefined ? {} : {
                encodeDST: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isBytes"])(src.encodeDST) ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(src.encodeDST) : src.encodeDST
            }
        });
    // Keep one private defaults snapshot for actual hashing and expose fresh
    // detached snapshots via the public getter.
    // Otherwise a caller could mutate `hasher.defaults.DST` in place and poison
    // the singleton hasher for every other consumer in the same process.
    const safeDefaults = snapshot(defaults);
    // Per-call options are H2CDSTOpts: only DST may be overridden. Copying just that key keeps
    // off-type option objects from silently replacing suite parameters (p/m/k/hash/expand) at
    // runtime — same pinning hashToScalar always did for p/m.
    const dstOverride = (options)=>options && options.DST !== undefined ? {
            DST: options.DST
        } : undefined;
    function map(num) {
        return Point.fromAffine(mapToCurve(num));
    }
    function clear(initial) {
        const P = initial.clearCofactor();
        // Keep ZERO as the algebraic cofactor-clearing result here; strict public point-validity
        // surfaces may still reject it later, but createHasher.clear() itself is not that boundary.
        if (P.equals(Point.ZERO)) return Point.ZERO;
        P.assertValidity();
        return P;
    }
    return Object.freeze({
        get defaults () {
            return snapshot(safeDefaults);
        },
        Point,
        hashToCurve (msg, options) {
            const opts = Object.assign({}, safeDefaults, dstOverride(options));
            const u = hash_to_field(msg, 2, opts);
            const u0 = map(u[0]);
            const u1 = map(u[1]);
            return clear(u0.add(u1));
        },
        encodeToCurve (msg, options) {
            const optsDst = safeDefaults.encodeDST === undefined ? {} : {
                DST: safeDefaults.encodeDST
            };
            const opts = Object.assign({}, safeDefaults, optsDst, dstOverride(options));
            const u = hash_to_field(msg, 1, opts);
            const u0 = map(u[0]);
            return clear(u0);
        },
        /** See {@link H2CHasher} */ mapToCurve (scalars) {
            // Curves with m=1 accept only single scalar
            if (safeDefaults.m === 1) {
                if (typeof scalars !== 'bigint') throw new Error('expected bigint (m=1)');
                return clear(map([
                    scalars
                ]));
            }
            if (!Array.isArray(scalars)) throw new Error('expected array of bigints');
            // RFC 9380 represents one GF(p^m) element as exactly m base-field scalars.
            if (scalars.length !== safeDefaults.m) throw new Error(`expected array of ${safeDefaults.m} bigints`);
            for (const i of scalars)if (typeof i !== 'bigint') throw new Error('expected array of bigints');
            return clear(map(scalars));
        },
        // hash_to_scalar can produce 0: https://www.rfc-editor.org/errata/eid8393
        // RFC 9380, draft-irtf-cfrg-bbs-signatures-08. Default scalar DST is the shared generic
        // `HashToScalar-` prefix above unless the caller overrides it per invocation.
        hashToScalar (msg, options) {
            // @ts-ignore
            const N = Point.Fn.ORDER;
            const opts = Object.assign({}, safeDefaults, {
                DST: _DST_scalar
            }, dstOverride(options), {
                p: N,
                m: 1
            });
            return hash_to_field(msg, 1, opts)[0][0];
        }
    });
}
function SWUFpSqrtRatio(Fp, Z) {
    // Fail with the usual field-shape error before touching pow/cmov on malformed field shims.
    const F = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateField"])(Fp);
    // Generic implementation
    const q = F.ORDER;
    let l = _0n;
    for(let o = q - _1n; o % _2n === _0n; o /= _2n)l += _1n;
    const c1 = l; // 1. c1, the largest integer such that 2^c1 divides q - 1.
    // We need 2n ** c1 and 2n ** (c1-1). We can't use **; but we can use <<.
    // 2n ** c1 == 2n << (c1-1)
    const _2n_pow_c1_1 = _2n << c1 - _1n - _1n;
    const _2n_pow_c1 = _2n_pow_c1_1 * _2n;
    const c2 = (q - _1n) / _2n_pow_c1; // 2. c2 = (q - 1) / (2^c1)  # Integer arithmetic
    const c3 = (c2 - _1n) / _2n; // 3. c3 = (c2 - 1) / 2            # Integer arithmetic
    const c4 = _2n_pow_c1 - _1n; // 4. c4 = 2^c1 - 1                # Integer arithmetic
    const c5 = _2n_pow_c1_1; // 5. c5 = 2^(c1 - 1)                  # Integer arithmetic
    const c6 = F.pow(Z, c2); // 6. c6 = Z^c2
    const c7 = F.pow(Z, (c2 + _1n) / _2n); // 7. c7 = Z^((c2 + 1) / 2)
    // RFC 9380 Appendix F.2.1.1 defines sqrt_ratio(u, v) only for v != 0.
    // We keep v=0 on the regular result path with isValid=false instead of
    // throwing so the helper stays closer to the RFC's fixed control flow.
    let sqrtRatio = (u, v)=>{
        let tv1 = c6; // 1. tv1 = c6
        let tv2 = F.pow(v, c4); // 2. tv2 = v^c4
        let tv3 = F.sqr(tv2); // 3. tv3 = tv2^2
        tv3 = F.mul(tv3, v); // 4. tv3 = tv3 * v
        let tv5 = F.mul(u, tv3); // 5. tv5 = u * tv3
        tv5 = F.pow(tv5, c3); // 6. tv5 = tv5^c3
        tv5 = F.mul(tv5, tv2); // 7. tv5 = tv5 * tv2
        tv2 = F.mul(tv5, v); // 8. tv2 = tv5 * v
        tv3 = F.mul(tv5, u); // 9. tv3 = tv5 * u
        let tv4 = F.mul(tv3, tv2); // 10. tv4 = tv3 * tv2
        tv5 = F.pow(tv4, c5); // 11. tv5 = tv4^c5
        let isQR = F.eql(tv5, F.ONE); // 12. isQR = tv5 == 1
        tv2 = F.mul(tv3, c7); // 13. tv2 = tv3 * c7
        tv5 = F.mul(tv4, tv1); // 14. tv5 = tv4 * tv1
        tv3 = F.cmov(tv2, tv3, isQR); // 15. tv3 = CMOV(tv2, tv3, isQR)
        tv4 = F.cmov(tv5, tv4, isQR); // 16. tv4 = CMOV(tv5, tv4, isQR)
        // 17. for i in (c1, c1 - 1, ..., 2):
        for(let i = c1; i > _1n; i--){
            let tv5 = i - _2n; // 18.    tv5 = i - 2
            tv5 = _2n << tv5 - _1n; // 19.    tv5 = 2^tv5
            let tvv5 = F.pow(tv4, tv5); // 20.    tv5 = tv4^tv5
            const e1 = F.eql(tvv5, F.ONE); // 21.    e1 = tv5 == 1
            tv2 = F.mul(tv3, tv1); // 22.    tv2 = tv3 * tv1
            tv1 = F.mul(tv1, tv1); // 23.    tv1 = tv1 * tv1
            tvv5 = F.mul(tv4, tv1); // 24.    tv5 = tv4 * tv1
            tv3 = F.cmov(tv2, tv3, e1); // 25.    tv3 = CMOV(tv2, tv3, e1)
            tv4 = F.cmov(tvv5, tv4, e1); // 26.    tv4 = CMOV(tv5, tv4, e1)
        }
        // RFC 9380 Appendix F.2.1.1 defines sqrt_ratio(u, v) for v != 0.
        // When u = 0 and v != 0, u / v = 0 is square and the computed root is
        // still 0, so widen only the final flag and keep the full control flow.
        return {
            isValid: !F.is0(v) && (isQR || F.is0(u)),
            value: tv3
        };
    };
    if (F.ORDER % _4n === _3n) {
        // sqrt_ratio_3mod4(u, v)
        const c1 = (F.ORDER - _3n) / _4n; // 1. c1 = (q - 3) / 4     # Integer arithmetic
        const c2 = F.sqrt(F.neg(Z)); // 2. c2 = sqrt(-Z)
        sqrtRatio = (u, v)=>{
            let tv1 = F.sqr(v); // 1. tv1 = v^2
            const tv2 = F.mul(u, v); // 2. tv2 = u * v
            tv1 = F.mul(tv1, tv2); // 3. tv1 = tv1 * tv2
            let y1 = F.pow(tv1, c1); // 4. y1 = tv1^c1
            y1 = F.mul(y1, tv2); // 5. y1 = y1 * tv2
            const y2 = F.mul(y1, c2); // 6. y2 = y1 * c2
            const tv3 = F.mul(F.sqr(y1), v); // 7. tv3 = y1^2; 8. tv3 = tv3 * v
            const isQR = F.eql(tv3, u); // 9. isQR = tv3 == u
            let y = F.cmov(y2, y1, isQR); // 10. y = CMOV(y2, y1, isQR)
            return {
                isValid: !F.is0(v) && isQR,
                value: y
            }; // 11. return (isQR, y) isQR ? y : y*c2
        };
    }
    // No curves uses that
    // if (Fp.ORDER % _8n === _5n) // sqrt_ratio_5mod8
    return sqrtRatio;
}
function mapToCurveSimpleSWU(Fp, opts) {
    const F = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateField"])(Fp);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(opts, {}, {}, 'opts');
    const { A, B, Z } = opts;
    if (!F.isValidNot0(A) || !F.isValidNot0(B) || !F.isValid(Z)) throw new Error('mapToCurveSimpleSWU: invalid opts');
    // RFC 9380 §6.6.2 and Appendix H.2 require:
    // 1. Z is non-square in F
    // 2. Z != -1 in F
    // 3. g(x) - Z is irreducible over F
    // 4. g(B / (Z * A)) is square in F
    // We can enforce 1, 2, and 4 with the current field API.
    // Criterion 3 is not checked here because generic `IField<T>` does not expose
    // polynomial-ring / irreducibility operations, and this helper is used for
    // both prime and extension fields.
    if (F.eql(Z, F.neg(F.ONE)) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FpIsSquare"])(F, Z)) throw new Error('mapToCurveSimpleSWU: invalid opts');
    // RFC 9380 Appendix H.2 criterion 4: g(B / (Z * A)) is square in F.
    // x = B / (Z * A)
    const x = F.mul(B, F.inv(F.mul(Z, A)));
    // g(x) = x^3 + A*x + B
    const gx = F.add(F.add(F.mul(F.sqr(x), x), F.mul(A, x)), B);
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FpIsSquare"])(F, gx)) throw new Error('mapToCurveSimpleSWU: invalid opts');
    const sqrtRatio = SWUFpSqrtRatio(F, Z);
    if (!F.isOdd) throw new Error('Field does not have .isOdd()');
    // Input: u, an element of F.
    // Output: (x, y), a point on E.
    return (u)=>{
        // prettier-ignore
        let tv1, tv2, tv3, tv4, tv5, tv6, x, y;
        tv1 = F.sqr(u); // 1.  tv1 = u^2
        tv1 = F.mul(tv1, Z); // 2.  tv1 = Z * tv1
        tv2 = F.sqr(tv1); // 3.  tv2 = tv1^2
        tv2 = F.add(tv2, tv1); // 4.  tv2 = tv2 + tv1
        tv3 = F.add(tv2, F.ONE); // 5.  tv3 = tv2 + 1
        tv3 = F.mul(tv3, B); // 6.  tv3 = B * tv3
        tv4 = F.cmov(Z, F.neg(tv2), !F.eql(tv2, F.ZERO)); // 7.  tv4 = CMOV(Z, -tv2, tv2 != 0)
        tv4 = F.mul(tv4, A); // 8.  tv4 = A * tv4
        tv2 = F.sqr(tv3); // 9.  tv2 = tv3^2
        tv6 = F.sqr(tv4); // 10. tv6 = tv4^2
        tv5 = F.mul(tv6, A); // 11. tv5 = A * tv6
        tv2 = F.add(tv2, tv5); // 12. tv2 = tv2 + tv5
        tv2 = F.mul(tv2, tv3); // 13. tv2 = tv2 * tv3
        tv6 = F.mul(tv6, tv4); // 14. tv6 = tv6 * tv4
        tv5 = F.mul(tv6, B); // 15. tv5 = B * tv6
        tv2 = F.add(tv2, tv5); // 16. tv2 = tv2 + tv5
        x = F.mul(tv1, tv3); // 17.   x = tv1 * tv3
        const { isValid, value } = sqrtRatio(tv2, tv6); // 18. (is_gx1_square, y1) = sqrt_ratio(tv2, tv6)
        y = F.mul(tv1, u); // 19.   y = tv1 * u  -> Z * u^3 * y1
        y = F.mul(y, value); // 20.   y = y * y1
        x = F.cmov(x, tv3, isValid); // 21.   x = CMOV(x, tv3, is_gx1_square)
        y = F.cmov(y, value, isValid); // 22.   y = CMOV(y, y1, is_gx1_square)
        const e1 = F.isOdd(u) === F.isOdd(y); // 23.  e1 = sgn0(u) == sgn0(y)
        y = F.cmov(F.neg(y), y, e1); // 24.   y = CMOV(-y, y, e1)
        const tv4_inv = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FpInvertBatch"])(F, [
            tv4
        ], true)[0];
        x = F.mul(x, tv4_inv); // 25.   x = x / tv4
        return {
            x,
            y
        };
    };
}
}),
"[project]/sdk/js/node_modules/@noble/curves/abstract/modular.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Field",
    ()=>Field,
    "FpDiv",
    ()=>FpDiv,
    "FpInvertBatch",
    ()=>FpInvertBatch,
    "FpIsSquare",
    ()=>FpIsSquare,
    "FpLegendre",
    ()=>FpLegendre,
    "FpPow",
    ()=>FpPow,
    "FpSqrt",
    ()=>FpSqrt,
    "FpSqrtEven",
    ()=>FpSqrtEven,
    "FpSqrtOdd",
    ()=>FpSqrtOdd,
    "getFieldBytesLength",
    ()=>getFieldBytesLength,
    "getMinHashLength",
    ()=>getMinHashLength,
    "invert",
    ()=>invert,
    "invertCt",
    ()=>invertCt,
    "isNegativeLE",
    ()=>isNegativeLE,
    "mapHashToField",
    ()=>mapHashToField,
    "mod",
    ()=>mod,
    "nLength",
    ()=>nLength,
    "pow",
    ()=>pow,
    "pow2",
    ()=>pow2,
    "tonelliShanks",
    ()=>tonelliShanks,
    "validateField",
    ()=>validateField
]);
/**
 * Utils for modular division and fields.
 * Field over 11 is a finite (Galois) field is integer number operations `mod 11`.
 * There is no division: it is replaced by modular multiplicative inverse.
 * @module
 */ /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/utils.js [app-ssr] (ecmascript)");
;
// Numbers aren't used in x25519 / x448 builds
// prettier-ignore
const _0n = /* @__PURE__ */ BigInt(0), _1n = /* @__PURE__ */ BigInt(1), _2n = /* @__PURE__ */ BigInt(2);
// prettier-ignore
const _3n = /* @__PURE__ */ BigInt(3), _4n = /* @__PURE__ */ BigInt(4), _5n = /* @__PURE__ */ BigInt(5);
// prettier-ignore
const _7n = /* @__PURE__ */ BigInt(7), _8n = /* @__PURE__ */ BigInt(8), _9n = /* @__PURE__ */ BigInt(9);
const _15n = /* @__PURE__ */ BigInt(15), _16n = /* @__PURE__ */ BigInt(16);
// 2^64: exponents below this use plain square-and-multiply in pow()/FpPow(); the windowed path's
// table build (14 multiplications) only pays off for longer exponents (break-even ~50 bits).
const POW_WINDOWED_MIN = /* @__PURE__ */ BigInt('0x10000000000000000');
function mod(a, b) {
    if (b <= _0n) throw new Error('mod: expected positive modulus, got ' + b);
    const result = a % b;
    return result >= _0n ? result : b + result;
}
function pow(num, power, modulo) {
    if (modulo <= _1n) throw new Error('pow: expected modulus > 1, got ' + modulo);
    // Non-bigint exponents coerce every comparison below to false and would silently return 1.
    if (typeof power !== 'bigint') throw new TypeError('invalid exponent: expected bigint, got ' + typeof power);
    if (power < _0n) throw new Error('invalid exponent, negatives unsupported');
    if (power === _0n) return _1n;
    if (power === _1n) return num;
    let d = num % modulo;
    if (d < _0n) d += modulo;
    // Control flow in both branches below depends only on the exponent, never on `num` — invertCt()
    // relies on that for its (public-exponent) secret-independence guarantee.
    if (power < POW_WINDOWED_MIN) {
        // Square-and-multiply: cheaper than the windowed path for short exponents.
        let p = _1n;
        while(power > _0n){
            if (power & _1n) p = p * d % modulo;
            d = d * d % modulo;
            power >>= _1n;
        }
        return p;
    }
    // Fixed 4-bit windows, MSB-first: a 14-multiplication table drops per-window cost to <1
    // multiplication (vs ~2 per window for square-and-multiply), ~25-30% faster for the dense
    // 256-bit exponents of sqrt / Legendre / invertCt.
    const digits = [];
    while(power > _0n){
        digits.push(Number(power & _15n));
        power >>= _4n;
    }
    const table = new Array(16);
    table[0] = _1n;
    table[1] = d;
    for(let i = 2; i < 16; i++)table[i] = table[i - 1] * d % modulo;
    let p = table[digits[digits.length - 1]]; // top digit is nonzero: the loop above stops on 0
    for(let w = digits.length - 2; w >= 0; w--){
        p = p * p % modulo;
        p = p * p % modulo;
        p = p * p % modulo;
        p = p * p % modulo;
        const digit = digits[w];
        if (digit !== 0) p = p * table[digit] % modulo;
    }
    return p;
}
function pow2(x, power, modulo) {
    if (modulo <= _1n) throw new Error('pow2: expected modulus > 1, got ' + modulo);
    if (power < _0n) throw new Error('pow2: expected non-negative exponent, got ' + power);
    let res = x;
    while(power-- > _0n){
        res *= res;
        res %= modulo;
    }
    return res;
}
function invert(number, modulo) {
    if (number === _0n) throw new Error('invert: expected non-zero number');
    // modulo = 1 is the zero ring: gcd(x, 1) = 1 makes the loop below "succeed" and return the
    // useless inverse 0. Reject it like pow() and invertCt() do.
    if (modulo <= _1n) throw new Error('invert: expected modulus > 1, got ' + modulo);
    // This is variable-time: the loop count depends on `number`. For a secret-independent
    // (Fermat) alternative over a prime modulus, see {@link invertCt} (~4x slower).
    let a = mod(number, modulo);
    let b = modulo;
    // Only the Bézout coefficient of `number` (x/u chain) is tracked; the coefficient of `modulo`
    // never affects the output, so it is not computed.
    // prettier-ignore
    let x = _0n, u = _1n;
    while(a !== _0n){
        const q = b / a;
        const r = b - a * q;
        const m = x - u * q;
        // prettier-ignore
        b = a, a = r, x = u, u = m;
    }
    const gcd = b;
    if (gcd !== _1n) throw new Error('invert: does not exist');
    return mod(x, modulo);
}
function invertCt(a, prime) {
    if (prime <= _1n) throw new Error('invertCt: expected prime modulus > 1, got ' + prime);
    const an = mod(a, prime);
    if (an === _0n) throw new Error('invertCt: expected non-zero number');
    // Exponent (prime - 2) is public, so FpPow's square-and-multiply is secret-independent.
    const inverse = pow(an, prime - _2n, prime);
    // O(1) safety net: verifies the inverse and rejects composite moduli where a^(p-2) is not one.
    if (mod(an * inverse, prime) !== _1n) throw new Error('invertCt: does not exist');
    return inverse;
}
function assertIsSquare(Fp, root, n) {
    const F = Fp;
    if (!F.eql(F.sqr(root), n)) throw new Error('Cannot find square root');
}
// The Legendre symbol and every sqrt variant here are only defined over an odd (prime) modulus.
// An even ORDER makes their integer divisions — (p-1)/2, (p+1)/4, (p-5)/8, (p+7)/16 — truncate and
// silently return a wrong result, so reject it explicitly at the entry points instead. This is a
// cheap necessary-condition check, not a primality test (composite odd moduli are caught later by
// the Legendre-result / assertIsSquare checks).
function aoddModulus(order, fnName) {
    if ((order & _1n) === _0n) throw new Error(fnName + ': expected odd modulus, got ' + order);
}
// Not all roots are possible! Example which will throw:
// const NUM =
// n = 72057594037927816n;
// Fp = Field(BigInt('0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab'));
function sqrt3mod4(Fp, n) {
    const F = Fp;
    const p1div4 = (F.ORDER + _1n) / _4n;
    const root = F.pow(n, p1div4);
    assertIsSquare(F, root, n);
    return root;
}
// Equivalent `q = 5 (mod 8)` square-root formula (Atkin-style), not the RFC Appendix I.2 CMOV
// pseudocode verbatim.
function sqrt5mod8(Fp, n) {
    const F = Fp;
    const p5div8 = (F.ORDER - _5n) / _8n;
    const n2 = F.mul(n, _2n);
    const v = F.pow(n2, p5div8);
    const nv = F.mul(n, v);
    const i = F.mul(F.mul(nv, _2n), v);
    const root = F.mul(nv, F.sub(i, F.ONE));
    assertIsSquare(F, root, n);
    return root;
}
// Based on RFC9380, Kong algorithm
// prettier-ignore
function sqrt9mod16(P) {
    const Fp_ = Field(P);
    const tn = tonelliShanks(P);
    const c1 = tn(Fp_, Fp_.neg(Fp_.ONE)); //  1. c1 = sqrt(-1) in F, i.e., (c1^2) == -1 in F
    const c2 = tn(Fp_, c1); //  2. c2 = sqrt(c1) in F, i.e., (c2^2) == c1 in F
    const c3 = tn(Fp_, Fp_.neg(c1)); //  3. c3 = sqrt(-c1) in F, i.e., (c3^2) == -c1 in F
    const c4 = (P + _7n) / _16n; //  4. c4 = (q + 7) / 16        # Integer arithmetic
    return (Fp, n)=>{
        const F = Fp;
        let tv1 = F.pow(n, c4); //  1. tv1 = x^c4
        let tv2 = F.mul(tv1, c1); //  2. tv2 = c1 * tv1
        const tv3 = F.mul(tv1, c2); //  3. tv3 = c2 * tv1
        const tv4 = F.mul(tv1, c3); //  4. tv4 = c3 * tv1
        const e1 = F.eql(F.sqr(tv2), n); //  5.  e1 = (tv2^2) == x
        const e2 = F.eql(F.sqr(tv3), n); //  6.  e2 = (tv3^2) == x
        tv1 = F.cmov(tv1, tv2, e1); //  7. tv1 = CMOV(tv1, tv2, e1)  # Select tv2 if (tv2^2) == x
        tv2 = F.cmov(tv4, tv3, e2); //  8. tv2 = CMOV(tv4, tv3, e2)  # Select tv3 if (tv3^2) == x
        const e3 = F.eql(F.sqr(tv2), n); //  9.  e3 = (tv2^2) == x
        const root = F.cmov(tv1, tv2, e3); // 10.  z = CMOV(tv1, tv2, e3)   # Select sqrt from tv1 & tv2
        assertIsSquare(F, root, n);
        return root;
    };
}
function tonelliShanks(P) {
    // Initialization (precomputation).
    // Caching initialization could boost perf by 7%.
    if (P < _3n) throw new Error('sqrt is not defined for small field');
    aoddModulus(P, 'tonelliShanks');
    // Factor P - 1 = Q * 2^S, where Q is odd
    let Q = P - _1n;
    let S = 0;
    while(Q % _2n === _0n){
        Q /= _2n;
        S++;
    }
    // Find the first quadratic non-residue Z >= 2
    let Z = _2n;
    const _Fp = Field(P);
    while(FpLegendre(_Fp, Z) === 1){
        // Basic primality test for P. After x iterations, chance of
        // not finding quadratic non-residue is 2^x, so 2^1000.
        if (Z++ > 1000) throw new Error('Cannot find square root: probably non-prime P');
    }
    // Fast-path; usually done before Z, but we do "primality test".
    if (S === 1) return sqrt3mod4;
    // Slow-path
    // TODO: test on Fp2 and others
    let cc = _Fp.pow(Z, Q); // c = z^Q
    const Q1div2 = (Q + _1n) / _2n;
    return function tonelliSlow(Fp, n) {
        const F = Fp;
        if (F.is0(n)) return n;
        // Check if n is a quadratic residue using Legendre symbol
        if (FpLegendre(F, n) !== 1) throw new Error('Cannot find square root');
        // Initialize variables for the main loop
        let M = S;
        let c = F.mul(F.ONE, cc); // c = z^Q, move cc from field _Fp into field Fp
        let t = F.pow(n, Q); // t = n^Q, first guess at the fudge factor
        let R = F.pow(n, Q1div2); // R = n^((Q+1)/2), first guess at the square root
        // Main loop
        // while t != 1
        while(!F.eql(t, F.ONE)){
            // Unreachable over a genuine field (no zero divisors; n=0 already returned above). A zero t
            // means composite ORDER, where a fabricated root would be wrong: fail closed instead.
            if (F.is0(t)) throw new Error('Cannot find square root: probably non-prime P');
            let i = 1;
            // Find the smallest i >= 1 such that t^(2^i) ≡ 1 (mod P)
            let t_tmp = F.sqr(t); // t^(2^1)
            while(!F.eql(t_tmp, F.ONE)){
                i++;
                t_tmp = F.sqr(t_tmp); // t^(2^2)...
                if (i === M) throw new Error('Cannot find square root');
            }
            // Calculate the exponent for b: 2^(M - i - 1)
            const exponent = _1n << BigInt(M - i - 1); // bigint is important
            const b = F.pow(c, exponent); // b = 2^(M - i - 1)
            // Update variables
            M = i;
            c = F.sqr(b); // c = b^2
            t = F.mul(t, c); // t = (t * b^2)
            R = F.mul(R, b); // R = R*b
        }
        return R;
    };
}
function FpSqrt(P) {
    aoddModulus(P, 'Fp.sqrt');
    // P ≡ 3 (mod 4) => √n = n^((P+1)/4)
    if (P % _4n === _3n) return sqrt3mod4;
    // P ≡ 5 (mod 8) => Atkin algorithm, page 10 of https://eprint.iacr.org/2012/685.pdf
    if (P % _8n === _5n) return sqrt5mod8;
    // P ≡ 9 (mod 16) => Kong algorithm, page 11 of https://eprint.iacr.org/2012/685.pdf (algorithm 4)
    if (P % _16n === _9n) return sqrt9mod16(P);
    // Tonelli-Shanks algorithm
    return tonelliShanks(P);
}
const isNegativeLE = (num, modulo)=>(mod(num, modulo) & _1n) === _1n;
// prettier-ignore
// Arithmetic-only subset checked by validateField(). This is intentionally not the full runtime
// IField contract: helpers like `isValidNot0`, `invertBatch`, `toBytes`, `fromBytes`, `cmov`, and
// field-specific extras like `isOdd` are left to the callers that actually need them.
const FIELD_FIELDS = [
    'create',
    'isValid',
    'is0',
    'neg',
    'inv',
    'sqrt',
    'sqr',
    'eql',
    'add',
    'sub',
    'mul',
    'pow',
    'div',
    'addN',
    'subN',
    'mulN',
    'sqrN'
];
function validateField(field) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aobject"])(field, 'field');
    if (typeof field.ORDER !== 'bigint') throw new TypeError('param "ORDER" is invalid: expected bigint, got ' + typeof field.ORDER);
    // Runtime field implementations must expose real integer byte/bit sizes; fractional / NaN /
    // infinite metadata breaks encoders and caches.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(field.BYTES, 'BYTES');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asafenumber"])(field.BITS, 'BITS');
    for (const name of FIELD_FIELDS)(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["afunction"])(field[name], 'field.' + name);
    // Runtime field implementations must expose positive byte/bit sizes; zero leaks through the
    // numeric shape checks above but still breaks encoding helpers and cached-length assumptions.
    if (field.BYTES < 1 || field.BITS < 1) throw new Error('invalid field: expected BYTES/BITS > 0');
    if (field.ORDER <= _1n) throw new Error('invalid field: expected ORDER > 1, got ' + field.ORDER);
    return field;
}
function FpPow(Fp, num, power) {
    validateField(Fp);
    const F = Fp;
    // Non-bigint exponents (e.g. an accidental field element) coerce every comparison below to
    // false and would silently return ONE.
    if (typeof power !== 'bigint') throw new TypeError('invalid exponent: expected bigint, got ' + typeof power);
    if (power < _0n) throw new Error('invalid exponent, negatives unsupported');
    if (power === _0n) return F.ONE;
    if (power === _1n) return num;
    if (power < POW_WINDOWED_MIN) {
        // Square-and-multiply: cheaper than the windowed path for short exponents (e.g. poseidon
        // sbox x^5), which would waste the 14-multiplication table build.
        let p = F.ONE;
        let d = num;
        while(power > _0n){
            if (power & _1n) p = F.mul(p, d);
            d = F.sqr(d);
            power >>= _1n;
        }
        return p;
    }
    // Fixed 4-bit windows, MSB-first — same shape as pow() above, over generic field ops.
    // Speeds up dense long exponents (extension-field sqrt / Legendre, e.g. Fp2 decompression).
    const digits = [];
    while(power > _0n){
        digits.push(Number(power & _15n));
        power >>= _4n;
    }
    const table = new Array(16);
    table[0] = F.ONE;
    table[1] = num;
    for(let i = 2; i < 16; i++)table[i] = F.mul(table[i - 1], num);
    let p = table[digits[digits.length - 1]]; // top digit is nonzero: the loop above stops on 0
    for(let w = digits.length - 2; w >= 0; w--){
        p = F.sqr(F.sqr(F.sqr(F.sqr(p))));
        const digit = digits[w];
        if (digit !== 0) p = F.mul(p, table[digit]);
    }
    return p;
}
function FpInvertBatch(Fp, nums, passZero = false) {
    validateField(Fp);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aarray"])(nums, 'nums');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abool"])(passZero, 'passZero');
    const F = Fp;
    const inverted = new Array(nums.length).fill(passZero ? F.ZERO : undefined);
    // Walk from first to last, multiply them by each other MOD p
    const multipliedAcc = nums.reduce((acc, num, i)=>{
        if (F.is0(num)) return acc;
        inverted[i] = acc;
        return F.mul(acc, num);
    }, F.ONE);
    // Invert last element
    const invertedAcc = F.inv(multipliedAcc);
    // Walk from last to first, multiply them by inverted each other MOD p
    nums.reduceRight((acc, num, i)=>{
        if (F.is0(num)) return acc;
        // Non-zero `num` means the forward pass already stored a defined prefix product at index i.
        inverted[i] = F.mul(acc, inverted[i]);
        return F.mul(acc, num);
    }, invertedAcc);
    return inverted;
}
function FpDiv(Fp, lhs, rhs) {
    validateField(Fp);
    const F = Fp;
    return F.mul(lhs, typeof rhs === 'bigint' ? invert(rhs, F.ORDER) : F.inv(rhs));
}
function FpLegendre(Fp, n) {
    validateField(Fp);
    const F = Fp;
    aoddModulus(F.ORDER, 'FpLegendre');
    // We can use 3rd argument as optional cache of this value
    // but seems unneeded for now. The operation is very fast.
    const p1mod2 = (F.ORDER - _1n) / _2n;
    const powered = F.pow(n, p1mod2);
    const yes = F.eql(powered, F.ONE);
    const zero = F.eql(powered, F.ZERO);
    const no = F.eql(powered, F.neg(F.ONE));
    if (!yes && !zero && !no) throw new Error('invalid Legendre symbol result');
    return yes ? 1 : zero ? 0 : -1;
}
function FpIsSquare(Fp, n) {
    const l = FpLegendre(Fp, n);
    // Zero is a square too: 0 = 0^2, and Fp.sqrt(0) already returns 0.
    return l !== -1;
}
function nLength(n, nBitLength) {
    // Bit size, byte size of CURVE.n
    if (nBitLength !== undefined) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(nBitLength);
    if (n <= _0n) throw new Error('invalid n length: expected positive n, got ' + n);
    if (nBitLength !== undefined && nBitLength < 1) throw new Error('invalid n length: expected positive bit length, got ' + nBitLength);
    const bits = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bitLen"])(n);
    // Cached bit lengths smaller than ORDER would truncate serialized scalars/elements and poison
    // any math that relies on the derived field metadata.
    if (nBitLength !== undefined && nBitLength < bits) throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
    const _nBitLength = nBitLength !== undefined ? nBitLength : bits;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return {
        nBitLength: _nBitLength,
        nByteLength
    };
}
// Keep the lazy sqrt cache off-instance so Field(...) can return a frozen object. Otherwise the
// cached helper write would keep the field surface externally mutable.
const FIELD_SQRT = new WeakMap();
class _Field {
    ORDER;
    BITS;
    BYTES;
    isLE;
    ZERO = _0n;
    ONE = _1n;
    _lengths;
    _mod;
    constructor(ORDER, opts = {}){
        // ORDER <= 1 is degenerate: ONE would not be a valid field element and helpers like pow/inv
        // would stop modeling field arithmetic.
        if (ORDER <= _1n) throw new Error('invalid field: expected ORDER > 1, got ' + ORDER);
        let _nbitLength = undefined;
        this.isLE = false;
        if (opts != null && typeof opts === 'object') {
            // Cached bit lengths are trusted here and should already be positive / consistent with ORDER.
            if (typeof opts.BITS === 'number') _nbitLength = opts.BITS;
            if (typeof opts.sqrt === 'function') // `_Field.prototype` is frozen below, so custom sqrt hooks must become own properties
            // explicitly instead of relying on writable prototype shadowing via assignment.
            Object.defineProperty(this, 'sqrt', {
                value: opts.sqrt,
                enumerable: true
            });
            if (typeof opts.isLE === 'boolean') this.isLE = opts.isLE;
            if (opts.allowedLengths) this._lengths = Object.freeze(opts.allowedLengths.slice());
            if (typeof opts.modFromBytes === 'boolean') this._mod = opts.modFromBytes;
        }
        const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
        if (nByteLength > 2048) throw new Error('invalid field: expected ORDER of <= 2048 bytes');
        this.ORDER = ORDER;
        this.BITS = nBitLength;
        this.BYTES = nByteLength;
        Object.freeze(this);
    }
    create(num) {
        return mod(num, this.ORDER);
    }
    isValid(num) {
        if (typeof num !== 'bigint') throw new TypeError('invalid field element: expected bigint, got ' + typeof num);
        return _0n <= num && num < this.ORDER; // 0 is valid element, but it's not invertible
    }
    is0(num) {
        return num === _0n;
    }
    // is valid and invertible
    isValidNot0(num) {
        return !this.is0(num) && this.isValid(num);
    }
    isOdd(num) {
        return (num & _1n) === _1n;
    }
    neg(num) {
        return mod(-num, this.ORDER);
    }
    eql(lhs, rhs) {
        return lhs === rhs;
    }
    sqr(num) {
        return mod(num * num, this.ORDER);
    }
    add(lhs, rhs) {
        return mod(lhs + rhs, this.ORDER);
    }
    sub(lhs, rhs) {
        return mod(lhs - rhs, this.ORDER);
    }
    mul(lhs, rhs) {
        return mod(lhs * rhs, this.ORDER);
    }
    pow(num, power) {
        return pow(num, power, this.ORDER);
    }
    div(lhs, rhs) {
        return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
    }
    // Same as above, but doesn't normalize
    sqrN(num) {
        return num * num;
    }
    addN(lhs, rhs) {
        return lhs + rhs;
    }
    subN(lhs, rhs) {
        return lhs - rhs;
    }
    mulN(lhs, rhs) {
        return lhs * rhs;
    }
    inv(num) {
        return invert(num, this.ORDER);
    }
    sqrt(num) {
        // Caching sqrt helpers speeds up sqrt9mod16 by 5x and Tonelli-Shanks by about 10% without keeping
        // the field instance itself mutable.
        let sqrt = FIELD_SQRT.get(this);
        if (!sqrt) FIELD_SQRT.set(this, sqrt = FpSqrt(this.ORDER));
        return sqrt(this, num);
    }
    toBytes(num) {
        // Serialize fixed-width limbs without re-validating the field range. Callers that need a
        // canonical encoding must pass a valid element; some protocols intentionally serialize raw
        // residues here and reduce or validate them elsewhere.
        return this.isLE ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["numberToBytesLE"])(num, this.BYTES) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["numberToBytesBE"])(num, this.BYTES);
    }
    fromBytes(bytes, skipValidation = false) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(bytes);
        const { _lengths: allowedLengths, BYTES, isLE, ORDER, _mod: modFromBytes } = this;
        if (allowedLengths) {
            // `allowedLengths` must list real positive byte lengths; otherwise empty input would get
            // padded into zero and silently decode as a field element.
            if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
                throw new Error('Field.fromBytes: expected ' + allowedLengths + ' bytes, got ' + bytes.length);
            }
            const padded = new Uint8Array(BYTES);
            // isLE add 0 to right, !isLE to the left.
            padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
            bytes = padded;
        }
        if (bytes.length !== BYTES) throw new Error('Field.fromBytes: expected ' + BYTES + ' bytes, got ' + bytes.length);
        let scalar = isLE ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(bytes) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberBE"])(bytes);
        if (modFromBytes) scalar = mod(scalar, ORDER);
        if (!skipValidation) {
            if (!this.isValid(scalar)) throw new Error('invalid field element: outside of range 0..ORDER');
        }
        // Range validation is optional here because some protocols intentionally decode raw residues
        // and reduce or validate them elsewhere.
        return scalar;
    }
    // TODO: we don't need it here, move out to separate fn
    invertBatch(lst) {
        // `passZero` keeps the `bigint[]` contract honest: zero inputs map to `0` instead of leaking
        // `undefined` into a `bigint[]`. Callers that must distinguish non-invertible inputs should use
        // `FpInvertBatch` directly, whose default omits `passZero` and returns `(bigint | undefined)[]`.
        return FpInvertBatch(this, lst, true);
    }
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov(a, b, condition) {
        // Field elements have `isValid(...)`; the CMOV branch bit is a direct runtime input, so reject
        // non-boolean selectors here instead of letting JS truthiness silently change arithmetic.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abool"])(condition, 'condition');
        return condition ? b : a;
    }
}
function Field(ORDER, opts = {}) {
    // Freeze the shared method surface before any instance is reachable; otherwise callers can
    // poison every Field instance by monkey-patching `_Field.prototype` even if each instance is
    // frozen. Freezing here instead of module scope keeps `_Field` tree-shakeable for importers
    // that never construct a field; the call is idempotent and cheap.
    Object.freeze(_Field.prototype);
    return new _Field(ORDER, opts);
}
function FpSqrtOdd(Fp, elm) {
    validateField(Fp);
    const F = Fp;
    if (!F.isOdd) throw new Error("Field doesn't have isOdd");
    const root = F.sqrt(elm);
    return F.isOdd(root) ? root : F.neg(root);
}
function FpSqrtEven(Fp, elm) {
    validateField(Fp);
    const F = Fp;
    if (!F.isOdd) throw new Error("Field doesn't have isOdd");
    const root = F.sqrt(elm);
    return F.isOdd(root) ? F.neg(root) : root;
}
function getFieldBytesLength(fieldOrder) {
    if (typeof fieldOrder !== 'bigint') throw new Error('field order must be bigint');
    // Valid field elements are in 0..ORDER-1, so ORDER <= 1 would make the encoded range degenerate.
    if (fieldOrder <= _1n) throw new Error('field order must be greater than 1');
    // Valid field elements are < ORDER, so the maximal encoded element is ORDER - 1.
    const bitLength = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bitLen"])(fieldOrder - _1n);
    return Math.ceil(bitLength / 8);
}
function getMinHashLength(fieldOrder) {
    const length = getFieldBytesLength(fieldOrder);
    return length + Math.ceil(length / 2);
}
function mapHashToField(key, fieldOrder, isLE = false) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(key);
    const len = key.length;
    const fieldLen = getFieldBytesLength(fieldOrder);
    const minLen = Math.max(getMinHashLength(fieldOrder), 16);
    // No toy-small inputs: the helper is for real scalar derivation, not tiny test curves. No huge
    // inputs: easier to reason about JS timing / allocation behavior.
    if (len < minLen || len > 1024) throw new Error('expected ' + minLen + '-1024 bytes of input, got ' + len);
    const num = isLE ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(key) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberBE"])(key);
    // Map into the non-zero scalar range [1, fieldOrder-1]: reduce mod (fieldOrder-1) to land in
    // [0, fieldOrder-2], then add 1. This shifts the range off zero; it is NOT equal to
    // `mod(num, fieldOrder)` (which spans [0, fieldOrder-1] and can be 0). A residual modulo bias
    // remains but is negligible (~2^-(nBits/2), e.g. ~2^-128 for a 256-bit order) because `key` is
    // required to be at least `getMinHashLength(fieldOrder)` (~1.5x field size) bytes of input.
    const reduced = mod(num, fieldOrder - _1n) + _1n;
    return isLE ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["numberToBytesLE"])(reduced, fieldLen) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["numberToBytesBE"])(reduced, fieldLen);
}
}),
"[project]/sdk/js/node_modules/@noble/curves/abstract/montgomery.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__TEST",
    ()=>__TEST,
    "montgomery",
    ()=>montgomery
]);
/**
 * Montgomery curve methods. It's not really whole montgomery curve,
 * just bunch of very specific methods for X25519 / X448 from
 * [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748)
 * @module
 */ /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/curve.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/modular.js [app-ssr] (ecmascript)");
;
;
;
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
const _2n = /* @__PURE__ */ BigInt(2);
// cswap from RFC7748 "example code", adapted to BigInt.
//
// RFC: "dummy = mask(swap) AND (x_2 XOR x_3), where mask(swap) is the all-1 or all-0 word of the
// same length as x_2 and x_3". On fixed-width machine words both cases cost the same. BigInt has
// no fixed width, so a {0n, 1n} selector does not: V8 short-circuits `0n * v` - and, identically,
// `0n & v`, `v + 0n`, `v - 0n` - to a no-op, while `1n * v` is a real multiply. The ladder calls
// this with swap = k_t XOR k_(t+1), which would make total running time a linear function of how
// often adjacent bits of the secret scalar differ: remotely measurable, and worth ~4 bits of a
// long-term key.
//
// So select with a full-width mask instead, and interpolate rather than mask off a dummy.
/**
 * Selector for cswap(): `P` to keep, `P + 1` to swap, chosen by the low bit of `swap`.
 * Higher bits are ignored, and `swap` is passed in whole rather than as a {0n, 1n} bit on
 * purpose: `P + (swap & _1n)` would short-circuit the addition whenever the bit is clear, which
 * is the very leak this construction avoids, one round-trip further down. Subtracting `swap`
 * with its low bit cleared keeps every operand full-width instead.
 * @param P - Field modulus.
 * @param swap - Value whose low bit selects; ignored above that bit.
 * @returns `P` when the low bit is clear, `P + 1` when it is set.
 */ function cmask(P, swap) {
    return P + swap - (swap >> _1n << _1n);
}
/**
 * Swap two field elements when `mask` is `P + 1`, keep them when it is `P`:
 *
 *   d    = 6P + x_3 - x_2
 *   x_2' = d * mask + x_2   (mod P)      x_3' = (x_2 + x_3) - x_2'
 *
 * The extra `6P * mask` vanishes modulo P, so `mask === P` leaves x_2 and `mask === P + 1`
 * leaves x_3. Without the offset, the reduction dividend changes sign with input order and crosses
 * BigInt limb boundaries; those classes measured differently on the tested Node/V8 build. For
 * canonical inputs, the deliberately left-associative `offset + x_3 - x_2` is between 5P and 7P,
 * keeping the dividend positive and in one word-count band for both RFC fields and masks. Six is
 * the smallest coefficient `c` for which the shared offset `cP` has that property.
 *
 * This reduced the tested sign/size timing ratios, but JavaScript BigInt has no constant-time
 * contract and the contents of the multiply and remainder still vary. Valid ladder states can
 * contain genuine zero coordinates; this construction does not mask those value-shape effects.
 * Computing `x_3'` independently as `((6P + x_2 - x_3) * mask + x_3) % P` is more symmetric.
 * On the tested Node/V8 build, it reduced the timing difference between keeping `(0, v)` and
 * swapping `(v, 0)`—both return `(0, v)`—from about 10%/13% for X25519/X448 to about 3%.
 * Successful calls cannot reach that zero-in-the-first-output case. For the case they can reach,
 * swapping `(0, v)` and keeping `(v, 0)` both return `(v, 0)`; the difference instead grew from
 * about 0.7%/1.1% to 2.7%/2.8%. The extra multiply/remainder also made public
 * `getSharedSecret()` about 16% slower. The retained one-remainder form measured about 2.5%
 * slower than the prior helper for public X25519 `getSharedSecret()` in the same environment.
 * x_3' falls out of the sum, which a swap leaves invariant: no second multiply or reduction is
 * needed. Bind `6P` once per field so production and the timing regression exercise the same
 * configured helper without paying for the multiplication in every ladder round.
 *
 * The returned function is called twice per ladder round, so it validates nothing. Both elements
 * MUST already be reduced mod P; unreduced input silently corrupts the kept-side output.
 * @param P - Field modulus.
 * @returns A field-bound swap function taking mask, x_2, and x_3.
 */ function cswap(P) {
    const offset = BigInt(6) * P;
    return (mask, x_2, x_3)=>{
        const sum = x_2 + x_3;
        const d = offset + x_3 - x_2;
        const a = (d * mask + x_2) % P;
        return {
            x_2: a,
            x_3: sum - a
        };
    };
}
const __TEST = /* @__PURE__ */ Object.freeze({
    cmask,
    cswap
});
function validateOpts(curve) {
    // Validate constructor config eagerly, but do not call user-provided hooks here:
    // `randomBytes` may be transcript-backed or otherwise contextual. Runtime type checks are
    // enough to fail fast on malformed configs without consuming user state.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(curve, {
        P: 'bigint',
        type: 'string',
        adjustScalarBytes: 'function',
        powPminus2: 'function'
    }, {
        randomBytes: 'function',
        scalarMultBase: 'function'
    });
    return Object.freeze({
        ...curve
    });
}
function montgomery(curveDef) {
    const CURVE = validateOpts(curveDef);
    const { P, type, adjustScalarBytes, powPminus2, randomBytes: rand } = CURVE;
    const mulBaseHook = CURVE.scalarMultBase;
    const is25519 = type === 'x25519';
    if (!is25519 && type !== 'x448') throw new Error('invalid type');
    const randomBytes_ = rand === undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"] : rand;
    const montgomeryBits = is25519 ? 255 : 448;
    const swap = cswap(P);
    const fieldLen = is25519 ? 32 : 56;
    const Gu = is25519 ? BigInt(9) : BigInt(5);
    // RFC 7748 #5:
    // The constant a24 is (486662 - 2) / 4 = 121665 for curve25519/X25519 and
    // (156326 - 2) / 4 = 39081 for curve448/X448
    // const a = is25519 ? 486662n : 156326n;
    const a24 = is25519 ? BigInt(121665) : BigInt(39081);
    // RFC: x25519 "the resulting integer is of the form 2^254 plus
    // eight times a value between 0 and 2^251 - 1 (inclusive)"
    // x448: "2^447 plus four times a value between 0 and 2^445 - 1 (inclusive)"
    const minScalar = is25519 ? _2n ** BigInt(254) : _2n ** BigInt(447);
    const maxAdded = is25519 ? BigInt(8) * (_2n ** BigInt(251) - _1n) : BigInt(4) * (_2n ** BigInt(445) - _1n);
    const maxScalar = minScalar + maxAdded + _1n; // (inclusive)
    const modP = (n)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(n, P);
    const GuBytes = encodeU(Gu);
    function encodeU(u) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["numberToBytesLE"])(modP(u), fieldLen);
    }
    function decodeU(u) {
        const _u = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(u, fieldLen, 'uCoordinate'));
        // RFC: When receiving such an array, implementations of X25519
        // (but not X448) MUST mask the most significant bit in the final byte.
        if (is25519) _u[31] &= 127; // 0b0111_1111
        // RFC: Implementations MUST accept non-canonical values and process them as
        // if they had been reduced modulo the field prime.  The non-canonical
        // values are 2^255 - 19 through 2^255 - 1 for X25519 and 2^448 - 2^224
        // - 1 through 2^448 - 1 for X448.
        return modP((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(_u));
    }
    function decodeScalar(scalar) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(adjustScalarBytes((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(scalar, fieldLen, 'scalar'))));
    }
    /**
     * u coordinates whose order divides the cofactor, on the curve and on its quadratic twist -
     * the ladder sends every one of them to zero. Same blocklist libsodium and post-CVE-2017-0379
     * Libgcrypt carry. decodeU() reduces mod P first, so the non-canonical encodings P and P + 1
     * collapse onto 0 and 1, and `type` admits no curve beyond these two, so both lists are total.
     *
     * Complete by construction: x-only doubling sends u to (u^2 - 1)^2 / 4u(u^2 + a*u + 1). Order 4
     * therefore needs (u^2 - 1)^2 === 0, i.e. u = +-1; order 2 needs u(u^2 + a*u + 1) === 0, and
     * a^2 - 4 is a non-residue on both curves, leaving u = 0. curve448 stops there (cofactor 4);
     * curve25519 (cofactor 8) adds the two order-8 roots below. Cross-checked by clearing the
     * cofactor with those same doublings over 200k random u: no sixth value exists.
     */ const lowOrderU = new Set(is25519 ? [
        _0n,
        _1n,
        P - _1n,
        BigInt('325606250916557431795983626356110631294008115727848805560023387167927233504'),
        BigInt('39382357235489614581723060781553021112529911719440698176882885853963445705823')
    ] : [
        _0n,
        _1n,
        P - _1n
    ]);
    function scalarMult(scalar, u) {
        // Some public keys are useless, of low-order. Curve author doesn't think
        // it needs to be validated, but we do it nonetheless.
        // https://cr.yp.to/ecdh.html#validate
        //
        // Reject them BEFORE the ladder. RFC 7748 #6.1 also permits detecting them from the
        // all-zero output, but that first runs all 255 rounds against the long-term secret,
        // handing an unauthenticated attacker a free timing oracle. Low-order inputs also drive
        // the ladder into a degenerate state (x_2 + z_2 === 0) whose extra zero-operand
        // multiplications amplify any residual key-dependent timing.
        const pointU = decodeU(u);
        if (lowOrderU.has(pointU)) throw new Error('invalid private or public key received');
        const pu = montgomeryLadder(pointU, decodeScalar(scalar));
        // Unreachable for RFC 7748 clamped scalars, which are cofactor multiples smaller than the
        // group order; kept because adjustScalarBytes is caller-supplied.
        if (pu === _0n) throw new Error('invalid private or public key received');
        return encodeU(pu);
    }
    // Computes public key from private. By doing scalar multiplication of base point.
    // With a curve-provided fixed-base hook (Edwards tables), the ladder is skipped, but the
    // contract — scalar validation, low-order rejection, encoding — stays identical.
    function scalarMultBase(scalar) {
        if (mulBaseHook === undefined) return scalarMult(scalar, GuBytes);
        const k = decodeScalar(scalar);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aInRange"])('scalar', k, minScalar, maxScalar);
        const pu = modP(mulBaseHook(k));
        if (pu === _0n) throw new Error('invalid private or public key received');
        return encodeU(pu);
    }
    const getPublicKey = scalarMultBase;
    const getSharedSecret = scalarMult;
    /**
     * Montgomery x-only multiplication ladder for the selected X25519/X448 curve.
     * @param pointU - decoded Montgomery u coordinate for the selected curve
     * @param scalar - decoded clamped scalar by which the point is multiplied
     * @returns resulting Montgomery u coordinate for the selected curve
     */ function montgomeryLadder(u, scalar) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aInRange"])('u', u, _0n, P);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aInRange"])('scalar', scalar, minScalar, maxScalar);
        const k = scalar;
        const x_1 = u;
        let x_2 = _1n;
        let z_2 = _0n;
        let x_3 = u;
        let z_3 = _1n;
        // The RFC tracks `swap` across rounds to hold k_t XOR k_(t+1); the low bit of `kx >> t` is
        // the same value, without the carried state. aInRange above pins bit (montgomeryBits - 1)
        // of k set and everything above it clear, so `kx >> t` is never zero and its width is a
        // function of t alone - never of a secret bit.
        const kx = k ^ k >> _1n;
        for(let t = BigInt(montgomeryBits - 1); t >= _0n; t--){
            const mask = cmask(P, kx >> t);
            ({ x_2, x_3 } = swap(mask, x_2, x_3));
            ({ x_2: z_2, x_3: z_3 } = swap(mask, z_2, z_3));
            const A = x_2 + z_2;
            const AA = modP(A * A);
            const B = x_2 - z_2;
            const BB = modP(B * B);
            const E = AA - BB;
            const C = x_3 + z_3;
            const D = x_3 - z_3;
            const DA = modP(D * A);
            const CB = modP(C * B);
            const dacb = DA + CB;
            const da_cb = DA - CB;
            x_3 = modP(dacb * dacb);
            z_3 = modP(x_1 * modP(da_cb * da_cb));
            x_2 = modP(AA * BB);
            z_2 = modP(E * (AA + modP(a24 * E)));
        }
        // trailing cswap: the RFC's `swap` holds k_0 here, which is the low bit of k
        const mask = cmask(P, k);
        ({ x_2, x_3 } = swap(mask, x_2, x_3));
        ({ x_2: z_2, x_3: z_3 } = swap(mask, z_2, z_3));
        const z2 = powPminus2(z_2); // `Fp.pow(x, P - _2n)` is much slower equivalent
        return modP(x_2 * z2); // Return x_2 * (z_2^(p - 2))
    }
    const lengths = {
        secretKey: fieldLen,
        publicKey: fieldLen,
        seed: fieldLen
    };
    const randomSecretKey = (seed)=>{
        seed = seed === undefined ? randomBytes_(fieldLen) : seed;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(seed, lengths.seed, 'seed');
        // Reuse caller-supplied seed bytes verbatim; clamping is deferred until
        // decodeScalar(...) when the secret key is actually used.
        return seed;
    };
    const utils = {
        randomSecretKey
    };
    Object.freeze(lengths);
    Object.freeze(utils);
    return Object.freeze({
        keygen: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createKeygen"])(randomSecretKey, getPublicKey),
        getSharedSecret,
        getPublicKey,
        scalarMult,
        scalarMultBase,
        utils,
        GuBytes: GuBytes.slice(),
        lengths
    });
}
}),
"[project]/sdk/js/node_modules/@noble/curves/abstract/oprf.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createOPRF",
    ()=>createOPRF
]);
/**
 * RFC 9497: Oblivious Pseudorandom Functions (OPRFs) Using Prime-Order Groups.
 * https://www.rfc-editor.org/rfc/rfc9497
 *

OPRF allows to interactively create an `Output = PRF(Input, serverSecretKey)`:

- Server cannot calculate Output by itself: it doesn't know Input
- Client cannot calculate Output by itself: it doesn't know server secretKey
- An attacker interception the communication can't restore Input/Output/serverSecretKey and can't
  link Input to some value.

## Issues

- Low-entropy inputs (e.g. password '123') enable brute-forced dictionary attacks by the server
  (solveable by domain separation in POPRF)
- High-level protocol needs to be constructed on top, because OPRF is low-level

## Use cases

1. **Password-Authenticated Key Exchange (PAKE):** Enables secure password login (e.g., OPAQUE)
   without revealing the password to the server.
2. **Private Set Intersection (PSI):** Allows two parties to compute the intersection of their
   private sets without revealing non-intersecting elements.
3. **Anonymous Credential Systems:** Supports issuance of anonymous, unlinkable credentials
   (e.g., Privacy Pass) using blind OPRF evaluation.
4. **Private Information Retrieval (PIR):** Helps users query databases without revealing which
   item they accessed.
5. **Encrypted Search / Secure Indexing:** Enables keyword search over encrypted data while keeping
   queries private.
6. **Spam Prevention and Rate-Limiting:** Issues anonymous tokens to prevent abuse
   (e.g., CAPTCHA bypass) without compromising user privacy.

## Modes

- OPRF: simple mode, client doesn't need to know server public key
- VOPRF: verifiable mode. It lets the client verify that the server used the
  secret key corresponding to a known public key
- POPRF: partially oblivious mode, VOPRF + domain separation

There is also non-interactive mode (Evaluate), which creates Output
non-interactively with knowledge of the secret key.

Flow:
- (once) Server generates secret and public keys, distributes public keys to clients
  - deterministically: `deriveKeyPair` or just random: `generateKeyPair`
- Client blinds input: `blind(secretInput)`
- Server evaluates blinded input: `blindEvaluate` generated by client, sends result to client
- Client creates output using result of evaluation via 'finalize'

 * @module
 */ /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/curve.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/hash-to-curve.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/modular.js [app-ssr] (ecmascript)");
;
;
;
;
const _DST_scalarBytes = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["_DST_scalar"]);
function createOPRF(opts) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateObject"])(opts, {
        name: 'string',
        hash: 'function',
        hashToScalar: 'function',
        hashToGroup: 'function'
    });
    // Cheap constructor-surface sanity check only: this verifies the generic static hooks/fields that
    // OPRF consumes, but it does not certify point semantics like BASE/ZERO correctness.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validatePointCons"])(opts.Point);
    const { name, Point, hash, hashToGroup: hashToGroupHook, hashToScalar } = opts;
    const { Fn } = Point;
    // POPRF evaluates with 1 / (skS + m), where skS is the long-term server secret. Use a
    // public-exponent Fermat inversion instead of Fn.inv's input-dependent Euclidean loop.
    const invertSecret = (value)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["invertCt"])(value, Fn.ORDER);
    const hashToGroup = (msg, ctx)=>hashToGroupHook(msg, {
            DST: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])('HashToGroup-'), ctx)
        });
    const hashToScalarPrefixed = (msg, ctx)=>hashToScalar(msg, {
            DST: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(_DST_scalarBytes, ctx)
        });
    const randomScalar = (rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])=>{
        if (typeof rng !== 'function') throw new TypeError('"rng" expected function, got type=' + typeof rng);
        // RFC 9497 §2.1 defines RandomScalar as nonzero; blind inversion and generated public keys
        // both rely on keeping this helper in the `1..n-1` range.
        const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapHashToField"])(rng((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getMinHashLength"])(Fn.ORDER)), Fn.ORDER, Fn.isLE);
        // We cannot use Fn.fromBytes here, because field
        // can have different number of bytes (like ed448)
        return Fn.isLE ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(t) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberBE"])(t);
    };
    // Every MSM input in this module is public (hash-derived transcript weights, wire-decoded
    // points, proof scalars), so the vartime shared-doubling-chain walk is safe. It is also
    // 1.6-2.5x faster than pippenger() for all realistic batch sizes (measured up to L=2048).
    const msm = (points, scalars)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mulAddUnsafe"])(Point, points, scalars);
    const getCtx = (mode)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])('OPRFV1-'), new Uint8Array([
            mode
        ]), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])('-' + name));
    const ctxOPRF = getCtx(0x00);
    const ctxVOPRF = getCtx(0x01);
    const ctxPOPRF = getCtx(0x02);
    function encode(...args) {
        const res = [];
        for (const a of args){
            if (typeof a === 'number') res.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["numberToBytesBE"])(a, 2));
            else if (typeof a === 'string') res.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])(a));
            else {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(a);
                res.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["numberToBytesBE"])(a.length, 2), a);
            }
        }
        // No wipe here, since will modify actual bytes
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(...res);
    }
    const inputBytes = (title, bytes)=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(bytes, undefined, title);
        // RFC 9497 §1.2 limits PrivateInput/PublicInput to 2^16 - 1 bytes because these values are
        // length-prefixed with two bytes before use throughout the protocol.
        if (bytes.length > 0xffff) throw new Error(`"${title}" expected Uint8Array of length <= 65535, got length=${bytes.length}`);
        return bytes;
    };
    const hashInput = (...bytes)=>hash(encode(...bytes, 'Finalize'));
    function getTranscripts(B, C, D, ctx) {
        const Bm = B.toBytes();
        const seed = hash(encode(Bm, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])('Seed-'), ctx)));
        const res = [];
        for(let i = 0; i < C.length; i++){
            const Ci = C[i].toBytes();
            const Di = D[i].toBytes();
            const di = hashToScalarPrefixed(encode(seed, i, Ci, Di, 'Composite'), ctx);
            res.push(di);
        }
        return res;
    }
    function computeComposites(B, C, D, ctx) {
        const T = getTranscripts(B, C, D, ctx);
        const M = msm(C, T);
        const Z = msm(D, T);
        return {
            M,
            Z
        };
    }
    function computeCompositesFast(k, B, C, D, ctx) {
        const T = getTranscripts(B, C, D, ctx);
        const M = msm(C, T);
        // RFC 9497 §2.2.1 ComputeCompositesFast derives weights from both C and D in getTranscripts(),
        // then uses the server shortcut Z = k * M instead of a second MSM over D.
        const Z = M.multiply(k);
        return {
            M,
            Z
        };
    }
    function challengeTranscript(B, M, Z, t2, t3, ctx) {
        const [Bm, a0, a1, a2, a3] = [
            B,
            M,
            Z,
            t2,
            t3
        ].map((i)=>i.toBytes());
        return hashToScalarPrefixed(encode(Bm, a0, a1, a2, a3, 'Challenge'), ctx);
    }
    function generateProof(ctx, k, B, C, D, rng) {
        const { M, Z } = computeCompositesFast(k, B, C, D, ctx);
        const r = randomScalar(rng);
        const t2 = Point.BASE.multiply(r);
        const t3 = M.multiply(r);
        const c = challengeTranscript(B, M, Z, t2, t3, ctx);
        const s = Fn.sub(r, Fn.mul(c, k)); // r - c*k
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(...[
            c,
            s
        ].map((i)=>Fn.toBytes(i)));
    }
    function verifyProof(ctx, B, C, D, proof) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(proof, 2 * Fn.BYTES);
        const { M, Z } = computeComposites(B, C, D, ctx);
        const [c, s] = [
            proof.subarray(0, Fn.BYTES),
            proof.subarray(Fn.BYTES)
        ].map((f)=>Fn.fromBytes(f));
        const t2 = msm([
            Point.BASE,
            B
        ], [
            s,
            c
        ]); // s*G + c*B
        const t3 = msm([
            M,
            Z
        ], [
            s,
            c
        ]); // s*M + c*Z
        const expectedC = challengeTranscript(B, M, Z, t2, t3, ctx);
        if (!Fn.eql(c, expectedC)) throw new Error('proof verification failed');
    }
    function generateKeyPair() {
        const skS = randomScalar();
        const pkS = Point.BASE.multiply(skS);
        return {
            secretKey: Fn.toBytes(skS),
            publicKey: pkS.toBytes()
        };
    }
    function deriveKeyPair(ctx, seed, info) {
        // RFC 9497 §3.2.1 defines `seed[32]`; reject other sizes here because this public API already
        // documents a 32-byte seed instead of generic input keying material.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(seed, 32, 'seed');
        info = inputBytes('keyInfo', info);
        const dst = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])('DeriveKeyPair'), ctx);
        const msg = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(seed, encode(info), Uint8Array.of(0));
        for(let counter = 0; counter <= 255; counter++){
            msg[msg.length - 1] = counter;
            const skS = hashToScalar(msg, {
                DST: dst
            });
            if (Fn.is0(skS)) continue; // should not happen
            return {
                secretKey: Fn.toBytes(skS),
                publicKey: Point.BASE.multiply(skS).toBytes()
            };
        }
        throw new Error('Cannot derive key');
    }
    const wirePoint = (label, bytes)=>{
        const point = Point.fromBytes(bytes);
        // RFC 9497 §3.3 says applications MUST reject group-identity Elements received over the wire
        // after deserialization, even if the suite decoder itself accepts the identity encoding.
        if (point.equals(Point.ZERO)) throw new Error(label + ' point at infinity');
        return point;
    };
    function blind(ctx, input, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"]) {
        input = inputBytes('input', input);
        const blind1 = randomScalar(rng);
        const inputPoint = hashToGroup(input, ctx);
        if (inputPoint.equals(Point.ZERO)) throw new Error('Input point at infinity');
        const blinded = inputPoint.multiply(blind1);
        return {
            blind: Fn.toBytes(blind1),
            blinded: blinded.toBytes()
        };
    }
    function evaluate(ctx, secretKey, input) {
        input = inputBytes('input', input);
        const skS = Fn.fromBytes(secretKey);
        const inputPoint = hashToGroup(input, ctx);
        if (inputPoint.equals(Point.ZERO)) throw new Error('Input point at infinity');
        const unblinded = inputPoint.multiply(skS).toBytes();
        return hashInput(input, unblinded);
    }
    const oprf = Object.freeze({
        generateKeyPair,
        deriveKeyPair: (seed, keyInfo)=>deriveKeyPair(ctxOPRF, seed, keyInfo),
        blind: (input, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])=>blind(ctxOPRF, input, rng),
        blindEvaluate (secretKey, blindedPoint) {
            const skS = Fn.fromBytes(secretKey);
            const elm = wirePoint('blinded', blindedPoint);
            return elm.multiply(skS).toBytes();
        },
        finalize (input, blindBytes, evaluatedBytes) {
            input = inputBytes('input', input);
            const blind = Fn.fromBytes(blindBytes);
            const evalPoint = wirePoint('evaluated', evaluatedBytes);
            const unblinded = evalPoint.multiply(Fn.inv(blind)).toBytes();
            return hashInput(input, unblinded);
        },
        evaluate: (secretKey, input)=>evaluate(ctxOPRF, secretKey, input)
    });
    const voprf = Object.freeze({
        generateKeyPair,
        deriveKeyPair: (seed, keyInfo)=>deriveKeyPair(ctxVOPRF, seed, keyInfo),
        blind: (input, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])=>blind(ctxVOPRF, input, rng),
        blindEvaluateBatch (secretKey, publicKey, blinded, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"]) {
            if (!Array.isArray(blinded)) throw new Error('expected array');
            const skS = Fn.fromBytes(secretKey);
            const pkS = wirePoint('public key', publicKey);
            const blindedPoints = blinded.map((i)=>wirePoint('blinded', i));
            const evaluated = blindedPoints.map((i)=>i.multiply(skS));
            const proof = generateProof(ctxVOPRF, skS, pkS, blindedPoints, evaluated, rng);
            return {
                evaluated: evaluated.map((i)=>i.toBytes()),
                proof
            };
        },
        blindEvaluate (secretKey, publicKey, blinded, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"]) {
            const res = this.blindEvaluateBatch(secretKey, publicKey, [
                blinded
            ], rng);
            return {
                evaluated: res.evaluated[0],
                proof: res.proof
            };
        },
        finalizeBatch (items, publicKey, proof) {
            if (!Array.isArray(items)) throw new Error('expected array');
            const pkS = wirePoint('public key', publicKey);
            const blindedPoints = items.map((i)=>wirePoint('blinded', i.blinded));
            const evalPoints = items.map((i)=>wirePoint('evaluated', i.evaluated));
            verifyProof(ctxVOPRF, pkS, blindedPoints, evalPoints, proof);
            // Same unblind+hash as oprf.finalize(), but reuses the evaluated points already decoded
            // (and identity-checked) for verifyProof instead of deserializing each one again.
            return items.map((i, j)=>{
                const input = inputBytes('input', i.input);
                const blind = Fn.fromBytes(i.blind);
                const unblinded = evalPoints[j].multiply(Fn.inv(blind)).toBytes();
                return hashInput(input, unblinded);
            });
        },
        finalize (input, blind, evaluated, blinded, publicKey, proof) {
            return this.finalizeBatch([
                {
                    input,
                    blind,
                    evaluated,
                    blinded
                }
            ], publicKey, proof)[0];
        },
        evaluate: (secretKey, input)=>evaluate(ctxVOPRF, secretKey, input)
    });
    // NOTE: info is domain separation
    const poprf = (info)=>{
        info = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(inputBytes('info', info));
        const m = hashToScalarPrefixed(encode('Info', info), ctxPOPRF);
        const T = Point.BASE.multiply(m);
        return Object.freeze({
            generateKeyPair,
            deriveKeyPair: (seed, keyInfo)=>deriveKeyPair(ctxPOPRF, seed, keyInfo),
            blind (input, publicKey, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"]) {
                input = inputBytes('input', input);
                const pkS = wirePoint('public key', publicKey);
                const tweakedKey = T.add(pkS);
                if (tweakedKey.equals(Point.ZERO)) throw new Error('tweakedKey point at infinity');
                const blind = randomScalar(rng);
                const inputPoint = hashToGroup(input, ctxPOPRF);
                if (inputPoint.equals(Point.ZERO)) throw new Error('Input point at infinity');
                const blindedPoint = inputPoint.multiply(blind);
                return {
                    blind: Fn.toBytes(blind),
                    blinded: blindedPoint.toBytes(),
                    tweakedKey: tweakedKey.toBytes()
                };
            },
            blindEvaluateBatch (secretKey, blinded, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"]) {
                if (!Array.isArray(blinded)) throw new Error('expected array');
                const skS = Fn.fromBytes(secretKey);
                const t = Fn.add(skS, m);
                // "Hence, this error can be a signal for the server to replace its
                // private key". We throw inside; this should be impossible.
                const invT = invertSecret(t);
                const blindedPoints = blinded.map((i)=>wirePoint('blinded', i));
                const evalPoints = blindedPoints.map((i)=>i.multiply(invT));
                const tweakedKey = Point.BASE.multiply(t);
                const proof = generateProof(ctxPOPRF, t, tweakedKey, evalPoints, blindedPoints, rng);
                return {
                    evaluated: evalPoints.map((i)=>i.toBytes()),
                    proof
                };
            },
            blindEvaluate (secretKey, blinded, rng = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"]) {
                const res = this.blindEvaluateBatch(secretKey, [
                    blinded
                ], rng);
                return {
                    evaluated: res.evaluated[0],
                    proof: res.proof
                };
            },
            finalizeBatch (items, proof, tweakedKey) {
                if (!Array.isArray(items)) throw new Error('expected array');
                const inputs = items.map((i)=>inputBytes('input', i.input));
                const evalPoints = items.map((i)=>wirePoint('evaluated', i.evaluated));
                verifyProof(ctxPOPRF, wirePoint('tweakedKey', tweakedKey), evalPoints, items.map((i)=>wirePoint('blinded', i.blinded)), proof);
                return items.map((i, j)=>{
                    const blind = Fn.fromBytes(i.blind);
                    const point = evalPoints[j].multiply(Fn.inv(blind)).toBytes();
                    return hashInput(inputs[j], info, point);
                });
            },
            finalize (input, blind, evaluated, blinded, proof, tweakedKey) {
                return this.finalizeBatch([
                    {
                        input,
                        blind,
                        evaluated,
                        blinded
                    }
                ], proof, tweakedKey)[0];
            },
            evaluate (secretKey, input) {
                input = inputBytes('input', input);
                const skS = Fn.fromBytes(secretKey);
                const inputPoint = hashToGroup(input, ctxPOPRF);
                if (inputPoint.equals(Point.ZERO)) throw new Error('Input point at infinity');
                const t = Fn.add(skS, m);
                const invT = invertSecret(t);
                const unblinded = inputPoint.multiply(invT).toBytes();
                return hashInput(input, info, unblinded);
            }
        });
    };
    const res = {
        name,
        oprf,
        voprf,
        poprf,
        __tests: Object.freeze({
            Fn,
            invertSecret
        })
    };
    return Object.freeze(res);
}
}),
"[project]/sdk/js/node_modules/@noble/curves/ed25519.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ED25519_TORSION_SUBGROUP",
    ()=>ED25519_TORSION_SUBGROUP,
    "_map_to_curve_elligator2_curve25519",
    ()=>_map_to_curve_elligator2_curve25519,
    "ed25519",
    ()=>ed25519,
    "ed25519_FROST",
    ()=>ed25519_FROST,
    "ed25519_hasher",
    ()=>ed25519_hasher,
    "ed25519ctx",
    ()=>ed25519ctx,
    "ed25519ph",
    ()=>ed25519ph,
    "ristretto255",
    ()=>ristretto255,
    "ristretto255_FROST",
    ()=>ristretto255_FROST,
    "ristretto255_hasher",
    ()=>ristretto255_hasher,
    "ristretto255_oprf",
    ()=>ristretto255_oprf,
    "x25519",
    ()=>x25519
]);
/**
 * ed25519 Twisted Edwards curve with following addons:
 * - X25519 ECDH
 * - Ristretto cofactor elimination
 * - Elligator hash-to-group / point indistinguishability
 * @module
 */ /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/sha2.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/utils.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$edwards$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/edwards.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$frost$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/frost.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/hash-to-curve.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/modular.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$montgomery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/montgomery.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$oprf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/abstract/oprf.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/utils.js [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
// prettier-ignore
const _0n = /* @__PURE__ */ BigInt(0), _1n = /* @__PURE__ */ BigInt(1), _2n = /* @__PURE__ */ BigInt(2), _3n = /* @__PURE__ */ BigInt(3);
// prettier-ignore
const _5n = /* @__PURE__ */ BigInt(5), _8n = /* @__PURE__ */ BigInt(8);
// P = 2n**255n - 19n
const ed25519_CURVE_p = /* @__PURE__ */ BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed');
// N = 2n**252n + 27742317777372353535851937790883648493n
// a = Fp.create(BigInt(-1))
// d = -121665/121666 a.k.a. Fp.neg(121665 * Fp.inv(121666))
const ed25519_CURVE = /* @__PURE__ */ (()=>({
        p: ed25519_CURVE_p,
        n: BigInt('0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed'),
        h: _8n,
        a: BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec'),
        d: BigInt('0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3'),
        Gx: BigInt('0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a'),
        Gy: BigInt('0x6666666666666666666666666666666666666666666666666666666666666658')
    }))();
function ed25519_pow_2_252_3(x) {
    // prettier-ignore
    const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
    const P = ed25519_CURVE_p;
    const x2 = x * x % P;
    const b2 = x2 * x % P; // x^3, 11
    const b4 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(b2, _2n, P) * b2 % P; // x^15, 1111
    const b5 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(b4, _1n, P) * x % P; // x^31
    const b10 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(b5, _5n, P) * b5 % P;
    const b20 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(b10, _10n, P) * b10 % P;
    const b40 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(b20, _20n, P) * b20 % P;
    const b80 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(b40, _40n, P) * b40 % P;
    const b160 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(b80, _80n, P) * b80 % P;
    const b240 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(b160, _80n, P) * b80 % P;
    const b250 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(b240, _10n, P) * b10 % P;
    const pow_p_5_8 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(b250, _2n, P) * x % P;
    // ^ This is x^((p-5)/8); multiply by x once more to get x^((p+3)/8).
    return {
        pow_p_5_8,
        b2
    };
}
// Mutates and returns the provided 32-byte buffer in place.
function adjustScalarBytes(bytes) {
    // Section 5: For X25519, in order to decode 32 random bytes as an integer scalar,
    // set the three least significant bits of the first byte
    bytes[0] &= 248; // 0b1111_1000
    // and the most significant bit of the last to zero,
    bytes[31] &= 127; // 0b0111_1111
    // set the second most significant bit of the last byte to 1
    bytes[31] |= 64; // 0b0100_0000
    return bytes;
}
// √(-1) aka √(a) aka 2^((p-1)/4)
// Fp.sqrt(Fp.neg(1))
const ED25519_SQRT_M1 = /* @__PURE__ */ BigInt('19681161376707505956807079304988542015446066515923890162744021073123829784752');
// sqrt(u/v). Returns `{ isValid, value }`; on non-squares `value` is still a
// dummy root-shaped field element so callers can stay constant-time.
function uvRatio(u, v) {
    const P = ed25519_CURVE_p;
    const v3 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(v * v * v, P); // v³
    const v7 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(v3 * v3 * v, P); // v⁷
    // (p+3)/8 and (p-5)/8
    const pow = ed25519_pow_2_252_3(u * v7).pow_p_5_8;
    let x = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(u * v3 * pow, P); // (uv³)(uv⁷)^(p-5)/8
    const vx2 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(v * x * x, P); // vx²
    const root1 = x; // First root candidate
    const root2 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(x * ED25519_SQRT_M1, P); // Second root candidate
    const useRoot1 = vx2 === u; // If vx² = u (mod p), x is a square root
    const useRoot2 = vx2 === (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(-u, P); // If vx² = -u, set x <-- x * 2^((p-1)/4)
    const noRoot = vx2 === (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(-u * ED25519_SQRT_M1, P); // There is no valid root, vx² = -u√(-1)
    if (useRoot1) x = root1;
    if (useRoot2 || noRoot) x = root2; // We return root2 anyway, for const-time
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isNegativeLE"])(x, P)) x = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(-x, P);
    return {
        isValid: useRoot1 || useRoot2,
        value: x
    };
}
const ed25519_Point = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$edwards$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["edwards"])(ed25519_CURVE, {
    uvRatio
});
// Public field alias stays stricter than the RFC 8032 Appendix A sample code:
// `Fp.inv(0)` throws instead of returning `0`.
const Fp = /* @__PURE__ */ (()=>ed25519_Point.Fp)();
function toMontgomery(point) {
    // Birational map from Ed25519 to Curve25519 / X25519:
    //   (u, v) = ((1 + y) / (1 - y), sqrt(-486664) * u / x)
    //   (x, y) = (sqrt(-486664) * u / v, (u - 1) / (u + 1))
    const { y } = point;
    return Fp.toBytes(Fp.div(_1n + y, _1n - y));
}
function toMontgomerySecret(secretKey) {
    const size = ed25519_Point.Fp.BYTES;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(secretKey, size);
    return adjustScalarBytes((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"])(secretKey.subarray(0, size))).subarray(0, size);
}
const Fn = /* @__PURE__ */ (()=>ed25519_Point.Fn)();
// RFC 8032 `dom2` helper for ctx/ph variants only. Plain Ed25519 keeps the
// empty-domain path in `ed()` and would be wrong if routed through this helper.
function ed25519_domain(data, ctx, phflag) {
    if (ctx.length > 255) throw new Error('Context is too big');
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["asciiToBytes"])('SigEd25519 no Ed25519 collisions'), new Uint8Array([
        phflag ? 1 : 0,
        ctx.length
    ]), ctx, data);
}
function ed(opts) {
    // Ed25519 keeps ZIP-215 default verification semantics for consensus compatibility.
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$edwards$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["eddsa"])(ed25519_Point, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"], Object.assign({
        adjustScalarBytes,
        toMontgomery,
        toMontgomerySecret,
        zip215: true
    }, opts));
}
const ed25519 = /* @__PURE__ */ ed({});
const ed25519ctx = /* @__PURE__ */ ed({
    domain: ed25519_domain
});
const ed25519ph = /* @__PURE__ */ ed({
    domain: ed25519_domain,
    prehash: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"]
});
const ed25519_FROST = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$frost$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createFROST"])({
        name: 'FROST-ED25519-SHA512-v1',
        Point: ed25519_Point,
        validatePoint: (p)=>{
            p.assertValidity();
            if (!p.isTorsionFree()) throw new Error('bad point: not torsion-free');
        },
        hash: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"],
        // RFC 9591 keeps H2 undecorated here for RFC 8032 compatibility. In createFROST(),
        // `H2: ''` becomes an empty DST prefix; the built-in hashToScalar fallback treats
        // that the same as omitted DST, even though custom hooks can still observe the empty bag.
        H2: ''
    }))();
const x25519 = /* @__PURE__ */ (()=>{
    const P = ed25519_CURVE_p;
    const powPminus2 = (x)=>{
        // x^(p-2) aka x^(2^255-21)
        const { pow_p_5_8, b2 } = ed25519_pow_2_252_3(x);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["pow2"])(pow_p_5_8, _3n, P) * b2, P);
    };
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$montgomery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["montgomery"])({
        P,
        type: 'x25519',
        powPminus2,
        adjustScalarBytes,
        // ~3x faster fixed-base: [k]B on the birationally-equivalent Edwards curve using cached
        // base tables, mapped back via u = (1+y)/(1-y) = (Z+Y)/(Z-Y) with one Fermat inversion.
        // Same construction as libsodium's crypto_scalarmult_curve25519_base.
        scalarMultBase: (k)=>{
            // Clamped k (≈2^254) exceeds n, but B has prime order n, so [k]B == [k mod n]B.
            const kn = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(k, ed25519_Point.Fn.ORDER);
            // k ≡ 0 (mod n): [k]B is the point at infinity, whose u is 0 in the x-only ladder;
            // returning 0 makes montgomery() reject it exactly like the ladder path.
            if (kn === _0n) return _0n;
            const p = ed25519_Point.BASE.multiply(kn);
            // Z-Y == 0 only at the identity, which kn != 0 excludes.
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])((p.Z + p.Y) * powPminus2((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mod"])(p.Z - p.Y, P)), P);
        }
    });
})();
// Hash To Curve Elligator2 Map (NOTE: different from ristretto255 elligator)
// RFC 9380 Appendix G.2.2 / Err4730 requires `sgn0(c1) = 0` for the Edwards
// map constant below, so use the even root explicitly.
// 1. c1 = (q + 3) / 8 # Integer arithmetic
const ELL2_C1 = /* @__PURE__ */ (()=>(ed25519_CURVE_p + _3n) / _8n)();
const ELL2_C2 = /* @__PURE__ */ (()=>Fp.pow(_2n, ELL2_C1))(); // 2. c2 = 2^c1
const ELL2_C3 = /* @__PURE__ */ (()=>Fp.sqrt(Fp.neg(Fp.ONE)))(); // 3. c3 = sqrt(-1)
const ELL2_J = /* @__PURE__ */ BigInt(486662);
function _map_to_curve_elligator2_curve25519(u) {
    // 4. c4 = (q - 5) / 8: tv2^c4 below reuses the ed25519_pow_2_252_3 addition chain,
    // whose pow_p_5_8 output is exactly x^((p-5)/8).
    let tv1 = Fp.sqr(u); //  1.  tv1 = u^2
    tv1 = Fp.mul(tv1, _2n); //  2.  tv1 = 2 * tv1
    // 3. xd = tv1 + 1 # Nonzero: -1 is square (mod p), tv1 is not
    let xd = Fp.add(tv1, Fp.ONE);
    let x1n = Fp.neg(ELL2_J); //  4.  x1n = -J              # x1 = x1n / xd = -J / (1 + 2 * u^2)
    let tv2 = Fp.sqr(xd); //  5.  tv2 = xd^2
    let gxd = Fp.mul(tv2, xd); //  6.  gxd = tv2 * xd        # gxd = xd^3
    let gx1 = Fp.mul(tv1, ELL2_J); //  7.  gx1 = J * tv1         # x1n + J * xd
    gx1 = Fp.mul(gx1, x1n); //  8.  gx1 = gx1 * x1n       # x1n^2 + J * x1n * xd
    gx1 = Fp.add(gx1, tv2); //  9.  gx1 = gx1 + tv2       # x1n^2 + J * x1n * xd + xd^2
    gx1 = Fp.mul(gx1, x1n); //  10. gx1 = gx1 * x1n       # x1n^3 + J * x1n^2 * xd + x1n * xd^2
    let tv3 = Fp.sqr(gxd); //  11. tv3 = gxd^2
    tv2 = Fp.sqr(tv3); //  12. tv2 = tv3^2           # gxd^4
    tv3 = Fp.mul(tv3, gxd); //  13. tv3 = tv3 * gxd       # gxd^3
    tv3 = Fp.mul(tv3, gx1); //  14. tv3 = tv3 * gx1       # gx1 * gxd^3
    tv2 = Fp.mul(tv2, tv3); //  15. tv2 = tv2 * tv3       # gx1 * gxd^7
    let y11 = ed25519_pow_2_252_3(tv2).pow_p_5_8; //  16. y11 = tv2^c4  # (gx1 * gxd^7)^((p - 5) / 8)
    y11 = Fp.mul(y11, tv3); //  17. y11 = y11 * tv3       # gx1*gxd^3*(gx1*gxd^7)^((p-5)/8)
    let y12 = Fp.mul(y11, ELL2_C3); //  18. y12 = y11 * c3
    tv2 = Fp.sqr(y11); //  19. tv2 = y11^2
    tv2 = Fp.mul(tv2, gxd); //  20. tv2 = tv2 * gxd
    let e1 = Fp.eql(tv2, gx1); //  21.  e1 = tv2 == gx1
    // 22. y1 = CMOV(y12, y11, e1) # If g(x1) is square, this is its sqrt
    let y1 = Fp.cmov(y12, y11, e1);
    let x2n = Fp.mul(x1n, tv1); //  23. x2n = x1n * tv1       # x2 = x2n / xd = 2 * u^2 * x1n / xd
    let y21 = Fp.mul(y11, u); //  24. y21 = y11 * u
    y21 = Fp.mul(y21, ELL2_C2); //  25. y21 = y21 * c2
    let y22 = Fp.mul(y21, ELL2_C3); //  26. y22 = y21 * c3
    let gx2 = Fp.mul(gx1, tv1); //  27. gx2 = gx1 * tv1       # g(x2) = gx2 / gxd = 2 * u^2 * g(x1)
    tv2 = Fp.sqr(y21); //  28. tv2 = y21^2
    tv2 = Fp.mul(tv2, gxd); //  29. tv2 = tv2 * gxd
    let e2 = Fp.eql(tv2, gx2); //  30.  e2 = tv2 == gx2
    // 31. y2 = CMOV(y22, y21, e2) # If g(x2) is square, this is its sqrt
    let y2 = Fp.cmov(y22, y21, e2);
    tv2 = Fp.sqr(y1); //  32. tv2 = y1^2
    tv2 = Fp.mul(tv2, gxd); //  33. tv2 = tv2 * gxd
    let e3 = Fp.eql(tv2, gx1); //  34.  e3 = tv2 == gx1
    let xn = Fp.cmov(x2n, x1n, e3); //  35.  xn = CMOV(x2n, x1n, e3)  # If e3, x = x1, else x = x2
    let y = Fp.cmov(y2, y1, e3); //  36.   y = CMOV(y2, y1, e3)    # If e3, y = y1, else y = y2
    let e4 = Fp.isOdd(y); //  37.  e4 = sgn0(y) == 1        # Fix sign of y
    y = Fp.cmov(y, Fp.neg(y), e3 !== e4); //  38.   y = CMOV(y, -y, e3 XOR e4)
    return {
        xMn: xn,
        xMd: xd,
        yMn: y,
        yMd: _1n
    }; //  39. return (xn, xd, y, 1)
}
// sgn0(c1) MUST equal 0
const ELL2_C1_EDWARDS = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FpSqrtEven"])(Fp, Fp.neg(BigInt(486664))))();
function map_to_curve_elligator2_edwards25519(u) {
    // 1. (xMn, xMd, yMn, yMd) = map_to_curve_elligator2_curve25519(u)
    const { xMn, xMd, yMn, yMd } = _map_to_curve_elligator2_curve25519(u);
    // map_to_curve_elligator2_curve25519(u)
    let xn = Fp.mul(xMn, yMd); //  2.  xn = xMn * yMd
    xn = Fp.mul(xn, ELL2_C1_EDWARDS); //  3.  xn = xn * c1
    let xd = Fp.mul(xMd, yMn); //  4.  xd = xMd * yMn    # xn / xd = c1 * xM / yM
    let yn = Fp.sub(xMn, xMd); //  5.  yn = xMn - xMd
    // 6. yd = xMn + xMd # (n / d - 1) / (n / d + 1) = (n - d) / (n + d)
    let yd = Fp.add(xMn, xMd);
    let tv1 = Fp.mul(xd, yd); //  7. tv1 = xd * yd
    let e = Fp.eql(tv1, Fp.ZERO); //  8.   e = tv1 == 0
    xn = Fp.cmov(xn, Fp.ZERO, e); //  9.  xn = CMOV(xn, 0, e)
    xd = Fp.cmov(xd, Fp.ONE, e); //  10. xd = CMOV(xd, 1, e)
    yn = Fp.cmov(yn, Fp.ONE, e); //  11. yn = CMOV(yn, 1, e)
    yd = Fp.cmov(yd, Fp.ONE, e); //  12. yd = CMOV(yd, 1, e)
    const [xd_inv, yd_inv] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$modular$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FpInvertBatch"])(Fp, [
        xd,
        yd
    ], true); // batch division
    // Noble normalizes the RFC rational representation to affine `{ x, y }`
    // before returning from the internal helper.
    return {
        x: Fp.mul(xn, xd_inv),
        y: Fp.mul(yn, yd_inv)
    }; //  13. return (xn, xd, yn, yd)
}
const ed25519_hasher = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHasher"])(ed25519_Point, (scalars)=>map_to_curve_elligator2_edwards25519(scalars[0]), {
        DST: 'edwards25519_XMD:SHA-512_ELL2_RO_',
        encodeDST: 'edwards25519_XMD:SHA-512_ELL2_NU_',
        p: ed25519_CURVE_p,
        m: 1,
        k: 128,
        expand: 'xmd',
        hash: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"]
    }))();
// √(-1) aka √(a) aka 2^((p-1)/4)
const SQRT_M1 = ED25519_SQRT_M1;
// √(ad - 1)
const SQRT_AD_MINUS_ONE = /* @__PURE__ */ BigInt('25063068953384623474111414158702152701244531502492656460079210482610430750235');
// 1 / √(a-d)
const INVSQRT_A_MINUS_D = /* @__PURE__ */ BigInt('54469307008909316920995813868745141605393597292927456921205312896311721017578');
// 1-d²
const ONE_MINUS_D_SQ = /* @__PURE__ */ BigInt('1159843021668779879193775521855586647937357759715417654439879720876111806838');
// (d-1)²
const D_MINUS_ONE_SQ = /* @__PURE__ */ BigInt('40440834346308536858101042469323190826248399146238708352240133220865137265952');
// `SQRT_RATIO_M1(1, number)` specialization. Returns `{ isValid, value }`,
// where non-squares get the nonnegative `sqrt(SQRT_M1 / number)` branch.
const invertSqrt = (number)=>uvRatio(_1n, number);
const MAX_255B = /* @__PURE__ */ BigInt('0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
// RFC 9496 §4.3.4 MAP parser: masks bit 255 and reduces modulo p for element
// derivation. The decode path has the opposite contract and rejects that bit.
const bytes255ToNumberLE = (bytes)=>Fp.create((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(bytes) & MAX_255B);
/**
 * Computes Elligator map for Ristretto255.
 * Primary formula source is RFC 9496 §4.3.4 MAP; RFC 9380 Appendix B builds
 * `hash_to_ristretto255` on top of this helper.
 * Returns an internal Edwards representative, not a public `_RistrettoPoint`.
 */ function calcElligatorRistrettoMap(r0) {
    const { d } = ed25519_CURVE;
    const r = Fp.mul(Fp.mulN(SQRT_M1, r0), r0); // 1
    const Ns = Fp.mul(Fp.addN(r, _1n), ONE_MINUS_D_SQ); // 2
    let c = BigInt(-1); // 3
    const D = Fp.mul(Fp.subN(c, Fp.mulN(d, r)), Fp.add(r, d)); // 4
    let { isValid: Ns_D_is_sq, value: s } = uvRatio(Ns, D); // 5
    let s_ = Fp.mul(s, r0); // 6
    if (!Fp.isOdd(s_)) s_ = Fp.neg(s_);
    if (!Ns_D_is_sq) s = s_; // 7
    if (!Ns_D_is_sq) c = r; // 8
    const Nt = Fp.sub(Fp.mulN(Fp.mulN(c, Fp.subN(r, _1n)), D_MINUS_ONE_SQ), D); // 9
    const s2 = Fp.sqrN(s);
    const W0 = Fp.mul(Fp.addN(s, s), D); // 10
    const W1 = Fp.mul(Nt, SQRT_AD_MINUS_ONE); // 11
    const W2 = Fp.sub(_1n, s2); // 12
    const W3 = Fp.add(_1n, s2); // 13
    return new ed25519_Point(Fp.mul(W0, W3), Fp.mul(W2, W1), Fp.mul(W1, W3), Fp.mul(W0, W2));
}
/**
 * Wrapper over Edwards Point for ristretto255.
 *
 * Each ed25519/EdwardsPoint has 8 different equivalent points. This can be
 * a source of bugs for protocols like ring signatures. Ristretto was created to solve this.
 * Ristretto point operates in X:Y:Z:T extended coordinates like EdwardsPoint,
 * but it should work in its own namespace: do not combine those two.
 * See [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
 */ class _RistrettoPoint extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$edwards$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PrimeEdwardsPoint"] {
    // Do NOT change syntax: the following gymnastics is done,
    // because typescript strips comments, which makes bundlers disable tree-shaking.
    // prettier-ignore
    static BASE = /* @__PURE__ */ (()=>new _RistrettoPoint(ed25519_Point.BASE))();
    // prettier-ignore
    static ZERO = /* @__PURE__ */ (()=>new _RistrettoPoint(ed25519_Point.ZERO))();
    // prettier-ignore
    static Fp = /* @__PURE__ */ (()=>Fp)();
    // prettier-ignore
    static Fn = /* @__PURE__ */ (()=>Fn)();
    constructor(ep){
        super(ep);
    }
    /**
     * Create one Ristretto255 point from affine Edwards coordinates.
     * This wraps the internal Edwards representative directly and is not a
     * canonical ristretto255 decoding path.
     * Use `toBytes()` / `fromBytes()` if canonical ristretto255 bytes matter.
     */ static fromAffine(ap) {
        return new _RistrettoPoint(ed25519_Point.fromAffine(ap));
    }
    assertSame(other) {
        if (!(other instanceof _RistrettoPoint)) throw new Error('RistrettoPoint expected');
    }
    init(ep) {
        return new _RistrettoPoint(ep);
    }
    static fromBytes(bytes) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(bytes, 32);
        const { a, d } = ed25519_CURVE;
        const s = bytes255ToNumberLE(bytes);
        // 1. Check that s_bytes is the canonical encoding of a field element, or else abort.
        // 3. Check that s is non-negative, or else abort
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["equalBytes"])(Fp.toBytes(s), bytes) || Fp.isOdd(s)) throw new Error('invalid ristretto255 encoding 1');
        const s2 = Fp.sqr(s);
        const u1 = Fp.add(_1n, Fp.mulN(a, s2)); // 4 (a is -1)
        const u2 = Fp.sub(_1n, Fp.mulN(a, s2)); // 5
        const u1_2 = Fp.sqr(u1);
        const u2_2 = Fp.sqr(u2);
        const v = Fp.sub(Fp.mulN(Fp.mulN(a, d), u1_2), u2_2); // 6
        const { isValid, value: I } = invertSqrt(Fp.mul(v, u2_2)); // 7
        const Dx = Fp.mul(I, u2); // 8
        const Dy = Fp.mul(Fp.mulN(I, Dx), v); // 9
        let x = Fp.mul(Fp.addN(s, s), Dx); // 10
        if (Fp.isOdd(x)) x = Fp.neg(x); // 10
        const y = Fp.mul(u1, Dy); // 11
        const t = Fp.mul(x, y); // 12
        if (!isValid || Fp.isOdd(t) || Fp.is0(y)) throw new Error('invalid ristretto255 encoding 2');
        return new _RistrettoPoint(new ed25519_Point(x, y, Fp.ONE, t));
    }
    /**
     * Converts ristretto-encoded string to ristretto point.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode).
     * @param hex - Ristretto-encoded 32 bytes. Not every 32-byte string is valid ristretto encoding
     */ static fromHex(hex) {
        return _RistrettoPoint.fromBytes((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexToBytes"])(hex));
    }
    /**
     * Encodes ristretto point to Uint8Array.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode).
     */ toBytes() {
        let { X, Y, Z, T } = this.ep;
        const u1 = Fp.mul(Fp.add(Z, Y), Fp.sub(Z, Y)); // 1
        const u2 = Fp.mul(X, Y); // 2
        // Square root always exists
        const u2sq = Fp.sqr(u2);
        const { value: invsqrt } = invertSqrt(Fp.mul(u1, u2sq)); // 3
        const D1 = Fp.mul(invsqrt, u1); // 4
        const D2 = Fp.mul(invsqrt, u2); // 5
        const zInv = Fp.mul(Fp.mulN(D1, D2), T); // 6
        let D; // 7
        if (Fp.isOdd(Fp.mul(T, zInv))) {
            let _x = Fp.mul(Y, SQRT_M1);
            let _y = Fp.mul(X, SQRT_M1);
            X = _x;
            Y = _y;
            D = Fp.mul(D1, INVSQRT_A_MINUS_D);
        } else {
            D = D2; // 8
        }
        if (Fp.isOdd(Fp.mul(X, zInv))) Y = Fp.neg(Y); // 9
        let s = Fp.mul(Fp.subN(Z, Y), D); // 10 (check footer's note, no sqrt(-a))
        if (Fp.isOdd(s)) s = Fp.neg(s);
        return Fp.toBytes(s); // 11
    }
    /**
     * Compares two Ristretto points.
     * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals).
     */ equals(other) {
        this.assertSame(other);
        const { X: X1, Y: Y1 } = this.ep;
        const { X: X2, Y: Y2 } = other.ep;
        // (x1 * y2 == y1 * x2) | (y1 * y2 == x1 * x2)
        const one = Fp.eql(Fp.mul(X1, Y2), Fp.mul(Y1, X2));
        const two = Fp.eql(Fp.mul(Y1, Y2), Fp.mul(X1, X2));
        return one || two;
    }
    is0() {
        return this.equals(_RistrettoPoint.ZERO);
    }
}
const ristretto255 = /* @__PURE__ */ (()=>{
    Object.freeze(_RistrettoPoint.BASE);
    Object.freeze(_RistrettoPoint.ZERO);
    Object.freeze(_RistrettoPoint.prototype);
    Object.freeze(_RistrettoPoint);
    return Object.freeze({
        Point: _RistrettoPoint
    });
})();
const ristretto255_hasher = /* @__PURE__ */ Object.freeze({
    Point: _RistrettoPoint,
    /**
  * Spec: https://www.rfc-editor.org/rfc/rfc9380.html#name-hashing-to-ristretto255. Caveats:
  * * There are no test vectors
  * * encodeToCurve / mapToCurve is undefined
  * * mapToCurve would be `calcElligatorRistrettoMap(scalars[0])`, not ristretto255_map!
  * * hashToScalar is undefined too, so we just use OPRF implementation
  * * We cannot re-use 'createHasher', because ristretto255_map is different algorithm/RFC
    (os2ip -> bytes255ToNumberLE)
  * * mapToCurve == calcElligatorRistrettoMap, hashToCurve == ristretto255_map
  * * hashToScalar is undefined in RFC9380 for ristretto, so we use the OPRF
    version here. Using `bytes255ToNumblerLE` will create a different result
    if we use `bytes255ToNumberLE` as os2ip
  * * current version is closest to spec.
  */ hashToCurve (msg, options) {
        // == 'hash_to_ristretto255'
        // Preserve explicit empty/invalid DST overrides so expand_message_xmd() can reject them.
        const DST = options?.DST === undefined ? 'ristretto255_XMD:SHA-512_R255MAP_RO_' : options.DST;
        const xmd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["expand_message_xmd"])(msg, DST, 64, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"]);
        // NOTE: RFC 9380 incorrectly calls this function `ristretto255_map`.
        // In RFC 9496, `map` was the per-point function inside the construction.
        // That also led to confusion that `ristretto255_map` is `mapToCurve`.
        // It is not: it is the older hash-to-curve construction.
        return ristretto255_hasher.deriveToCurve(xmd);
    },
    hashToScalar (msg, options) {
        const DST = options?.DST === undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["_DST_scalar"] : options.DST;
        const xmd = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$hash$2d$to$2d$curve$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["expand_message_xmd"])(msg, DST, 64, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"]);
        return Fn.create((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToNumberLE"])(xmd));
    },
    /**
     * HashToCurve-like construction based on RFC 9496 (Element Derivation).
     * Converts 64 uniform random bytes into a curve point.
     *
     * WARNING: This represents an older hash-to-curve construction from before
     * RFC 9380 was finalized.
     * It was later reused as a component in the newer
     * `hash_to_ristretto255` function defined in RFC 9380.
     */ deriveToCurve (bytes) {
        // https://www.rfc-editor.org/rfc/rfc9496.html#name-element-derivation
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(bytes, 64);
        const r1 = bytes255ToNumberLE(bytes.subarray(0, 32));
        const R1 = calcElligatorRistrettoMap(r1);
        const r2 = bytes255ToNumberLE(bytes.subarray(32, 64));
        const R2 = calcElligatorRistrettoMap(r2);
        return new _RistrettoPoint(R1.add(R2));
    }
});
const ristretto255_oprf = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$oprf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createOPRF"])({
        name: 'ristretto255-SHA512',
        Point: _RistrettoPoint,
        hash: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"],
        hashToGroup: ristretto255_hasher.hashToCurve,
        hashToScalar: ristretto255_hasher.hashToScalar
    }))();
const ristretto255_FROST = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$abstract$2f$frost$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createFROST"])({
        name: 'FROST-RISTRETTO255-SHA512-v1',
        Point: _RistrettoPoint,
        validatePoint: (p)=>{
            // Prime-order wrappers are torsion-free at the abstract-group level.
            p.assertValidity();
        },
        hash: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sha512"]
    }))();
const ED25519_TORSION_SUBGROUP = /* @__PURE__ */ Object.freeze([
    '0100000000000000000000000000000000000000000000000000000000000000',
    'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a',
    '0000000000000000000000000000000000000000000000000000000000000080',
    '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05',
    'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
    '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc85',
    '0000000000000000000000000000000000000000000000000000000000000000',
    'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac03fa'
]);
}),
"[project]/sdk/js/node_modules/@noble/curves/utils.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "aInRange",
    ()=>aInRange,
    "aarray",
    ()=>aarray,
    "abignumber",
    ()=>abignumber,
    "abool",
    ()=>abool,
    "abytes",
    ()=>abytes,
    "afunction",
    ()=>afunction,
    "anumber",
    ()=>anumber,
    "aobject",
    ()=>aobject,
    "asafenumber",
    ()=>asafenumber,
    "asciiToBytes",
    ()=>asciiToBytes,
    "astring",
    ()=>astring,
    "bitGet",
    ()=>bitGet,
    "bitLen",
    ()=>bitLen,
    "bitMask",
    ()=>bitMask,
    "bitSet",
    ()=>bitSet,
    "bytesToHex",
    ()=>bytesToHex,
    "bytesToNumberBE",
    ()=>bytesToNumberBE,
    "bytesToNumberLE",
    ()=>bytesToNumberLE,
    "concatBytes",
    ()=>concatBytes,
    "copyBytes",
    ()=>copyBytes,
    "createHmacDrbg",
    ()=>createHmacDrbg,
    "equalBytes",
    ()=>equalBytes,
    "hexToBytes",
    ()=>hexToBytes,
    "hexToNumber",
    ()=>hexToNumber,
    "inRange",
    ()=>inRange,
    "isBytes",
    ()=>isBytes,
    "isPosBig",
    ()=>isPosBig,
    "notImplemented",
    ()=>notImplemented,
    "numberToBytesBE",
    ()=>numberToBytesBE,
    "numberToBytesLE",
    ()=>numberToBytesLE,
    "numberToHexUnpadded",
    ()=>numberToHexUnpadded,
    "numberToVarBytesBE",
    ()=>numberToVarBytesBE,
    "randomBytes",
    ()=>randomBytes,
    "validateObject",
    ()=>validateObject
]);
/**
 * Hex, bytes and number utilities.
 * @module
 */ /*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/utils.js [app-ssr] (ecmascript)");
;
function aarray(item, title, inner = ()=>{}) {
    if (!Array.isArray(item)) throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
    for(let i = 0; i < item.length; i++)inner(item[i], `${title}[${i}]`);
    return item;
}
const abytes = (value, length, title)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(value, length, title);
const anumber = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"];
function astring(value, title = '') {
    if (typeof value !== 'string') {
        const prefix = title && `"${title}" `;
        throw new TypeError(prefix + 'expected string, got type=' + typeof value);
    }
    return value;
}
function aobject(value, title = 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(title === 'object' ? 'expected valid options object' : `"${title}" expected object, got type=${typeof value}`);
    return value;
}
function afunction(value, title) {
    if (typeof value !== 'function') throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value}`);
    return value;
}
const bytesToHex = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToHex"];
const concatBytes = (...arrays)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["concatBytes"])(...arrays);
const hexToBytes = (hex)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexToBytes"])(hex);
const isBytes = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isBytes"];
const randomBytes = (bytesLength)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])(bytesLength);
const _0n = /* @__PURE__ */ BigInt(0);
const _1n = /* @__PURE__ */ BigInt(1);
// Shared error-message prefix builder. Only called on throw paths, so assert
// success paths never pay for the string concatenation.
const atitle = (title)=>title ? `"${title}" ` : '';
function abool(value, title = '') {
    if (typeof value !== 'boolean') throw new TypeError(atitle(title) + 'expected boolean, got type=' + typeof value);
    return value;
}
function abignumber(n) {
    if (typeof n === 'bigint') {
        if (!isPosBig(n)) throw new RangeError('positive bigint expected, got ' + n);
    } else anumber(n);
    return n;
}
function asafenumber(value, title = '') {
    if (typeof value !== 'number') {
        const prefix = title && `"${title}" `;
        throw new TypeError(prefix + 'expected number, got type=' + typeof value);
    }
    if (!Number.isSafeInteger(value)) {
        const prefix = title && `"${title}" `;
        throw new RangeError(prefix + 'expected safe integer, got ' + value);
    }
}
function numberToHexUnpadded(num) {
    const hex = abignumber(num).toString(16);
    return hex.length & 1 ? '0' + hex : hex;
}
function hexToNumber(hex) {
    if (typeof hex !== 'string') throw new TypeError('hex string expected, got ' + typeof hex);
    return hex === '' ? _0n : BigInt('0x' + hex); // Big Endian
}
function bytesToNumberBE(bytes) {
    return hexToNumber((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToHex"])(bytes));
}
function bytesToNumberLE(bytes) {
    return hexToNumber((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bytesToHex"])(copyBytes((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(bytes)).reverse()));
}
function numberToBytesBE(n, len) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(len);
    if (len === 0) throw new Error('zero output length is invalid');
    n = abignumber(n);
    const expectedLen = len * 2;
    const hex = n.toString(16);
    // Detect overflow before hex parsing so oversized values don't leak the shared odd-hex error.
    if (hex.length > expectedLen) throw new RangeError('number is too large');
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexToBytes"])(hex.padStart(expectedLen, '0'));
}
function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
}
function numberToVarBytesBE(n) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexToBytes"])(numberToHexUnpadded(abignumber(n)));
}
function equalBytes(a, b) {
    a = abytes(a);
    b = abytes(b);
    if (a.length !== b.length) return false;
    let diff = 0;
    for(let i = 0; i < a.length; i++)diff |= a[i] ^ b[i];
    return diff === 0;
}
function copyBytes(bytes) {
    // `Uint8Array.from(...)` would also accept arrays / other typed arrays. Keep this helper strict
    // because callers use it at byte-validation boundaries before mutating the detached copy.
    return Uint8Array.from(abytes(bytes));
}
function asciiToBytes(ascii) {
    if (typeof ascii !== 'string') throw new TypeError('ascii string expected, got ' + typeof ascii);
    return Uint8Array.from(ascii, (c, i)=>{
        const charCode = c.charCodeAt(0);
        if (c.length !== 1 || charCode > 127) {
            throw new RangeError(`string contains non-ASCII character "${ascii[i]}" with code ${charCode} at position ${i}`);
        }
        return charCode;
    });
}
function isPosBig(n) {
    return typeof n === 'bigint' && _0n <= n;
}
function inRange(n, min, max) {
    return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
function aInRange(title, n, min, max) {
    // Why min <= n < max and not a (min < n < max) OR b (min <= n <= max)?
    // consider P=256n, min=0n, max=P
    // - a for min=0 would require -1:          `inRange('x', x, -1n, P)`
    // - b would commonly require subtraction:  `inRange('x', x, 0n, P - 1n)`
    // - our way is the cleanest:               `inRange('x', x, 0n, P)
    if (!inRange(n, min, max)) throw new RangeError('expected valid ' + title + ': ' + min + ' <= n < ' + max + ', got ' + n);
}
function bitLen(n) {
    // Size callers in this repo only use non-negative orders / scalars, so negative inputs are a
    // contract bug and must not silently collapse to zero bits.
    if (n < _0n) throw new Error('expected non-negative bigint, got ' + n);
    // Native radix conversion beats a shift loop at every size, and the loop is quadratic in bits.
    return n === _0n ? 0 : n.toString(2).length;
}
function bitGet(n, pos) {
    if (typeof n !== 'bigint') throw new TypeError('"n" expected bigint, got type=' + typeof n);
    asafenumber(pos, 'pos');
    return n >> BigInt(pos) & _1n;
}
function bitSet(n, pos, value) {
    if (typeof n !== 'bigint') throw new TypeError('"n" expected bigint, got type=' + typeof n);
    asafenumber(pos, 'pos');
    abool(value, 'value');
    const mask = _1n << BigInt(pos);
    // Clearing needs AND-not here; OR with zero leaves an already-set bit untouched.
    return value ? n | mask : n & ~mask;
}
const bitMask = (n)=>{
    asafenumber(n, 'n');
    return (_1n << BigInt(n)) - _1n;
};
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(hashLen, 'hashLen');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(qByteLen, 'qByteLen');
    if (typeof hmacFn !== 'function') throw new TypeError('hmacFn must be a function');
    // creates Uint8Array
    const u8n = (len)=>new Uint8Array(len);
    const NULL = Uint8Array.of();
    const byte0 = Uint8Array.of(0x00);
    const byte1 = Uint8Array.of(0x01);
    const _maxDrbgIters = 1000;
    // Step B, Step C: set hashLen to 8*ceil(hlen/8).
    // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 signatures.
    let v = u8n(hashLen);
    // Steps B and C of RFC6979 3.2.
    let k = u8n(hashLen);
    let i = 0; // Iterations counter, will throw when over 1000
    const reset = ()=>{
        v.fill(1);
        k.fill(0);
        i = 0;
    };
    // hmac(k)(v, ...values)
    const h = (...msgs)=>hmacFn(k, concatBytes(v, ...msgs));
    const reseed = (seed = NULL)=>{
        // HMAC-DRBG reseed() function. Steps D-G
        k = h(byte0, seed); // k = hmac(k || v || 0x00 || seed)
        v = h(); // v = hmac(k || v)
        if (seed.length === 0) return;
        k = h(byte1, seed); // k = hmac(k || v || 0x01 || seed)
        v = h(); // v = hmac(k || v)
    };
    const gen = ()=>{
        // HMAC-DRBG generate() function
        if (i++ >= _maxDrbgIters) throw new Error('drbg: tried max amount of iterations');
        let len = 0;
        const out = [];
        while(len < qByteLen){
            v = h();
            const sl = v.slice();
            out.push(sl);
            len += v.length;
        }
        return concatBytes(...out);
    };
    const genUntil = (seed, pred)=>{
        reset();
        reseed(seed); // Steps D-G
        let res = undefined; // Step H: grind until the predicate accepts a candidate.
        // Falsy values like 0 are valid outputs.
        while((res = pred(gen())) === undefined)reseed();
        reset();
        return res;
    };
    return genUntil;
}
function validateObject(object, fields = {}, optFields = {}, title = 'object') {
    aobject(object, title);
    aobject(fields, 'fields');
    aobject(optFields, 'optFields');
    function checkField(fieldName, expectedType, isOpt) {
        const label = title === 'object' ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
        // Config fields must be explicit own properties. Optional inherited values are rejected too
        // because callers keep reading the same options object after validation.
        const val = object[fieldName];
        // Runtime objects such as Field instances intentionally satisfy required method slots
        // via their shared prototype.
        if (!Object.hasOwn(object, fieldName) && (isOpt ? val !== undefined : expectedType !== 'function')) {
            throw new TypeError(`${label} is invalid: expected own property`);
        }
        if (isOpt && val === undefined) return;
        const current = typeof val;
        if (current !== expectedType || val === null) throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
    }
    const iter = (f, isOpt)=>Object.entries(f).forEach(([k, v])=>checkField(k, v, isOpt));
    iter(fields, false);
    iter(optFields, true);
}
const notImplemented = ()=>{
    throw new Error('not implemented');
};
}),
];

//# sourceMappingURL=0n7g_%40noble_curves_0wknhld._.js.map