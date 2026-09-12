module.exports = [
"[project]/platform/web/node_modules/@swc/helpers/cjs/_interop_require_wildcard.cjs [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) return obj;
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") return {
        default: obj
    };
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) return cache.get(obj);
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) Object.defineProperty(newObj, key, desc);
            else newObj[key] = obj[key];
        }
    }
    newObj.default = obj;
    if (cache) cache.set(obj, newObj);
    return newObj;
}
exports._ = _interop_require_wildcard;
}),
"[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/mod.js [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha20Poly1305$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha20Poly1305.js [app-ssr] (ecmascript)");
;
}),
"[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha/_arx.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createCipher",
    ()=>createCipher,
    "rotl",
    ()=>rotl
]);
/**
 * This file is based on noble-ciphers (https://github.com/paulmillr/noble-ciphers).
 *
 * noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com)
 *
 * The original file is located at:
 * https://github.com/paulmillr/noble-ciphers/blob/749cdf9cd07ebdd19e9b957d0f172f1045179695/src/_arx.ts
 */ /**
 * Basic utils for ARX (add-rotate-xor) salsa and chacha ciphers.

RFC8439 requires multi-step cipher stream, where
authKey starts with counter: 0, actual msg with counter: 1.

For this, we need a way to re-use nonce / counter:

    const counter = new Uint8Array(4);
    chacha(..., counter, ...); // counter is now 1
    chacha(..., counter, ...); // counter is now 2

This is complicated:

- 32-bit counters are enough, no need for 64-bit: max ArrayBuffer size in JS is 4GB
- Original papers don't allow mutating counters
- Counter overflow is undefined [^1]
- Idea A: allow providing (nonce | counter) instead of just nonce, re-use it
- Caveat: Cannot be re-used through all cases:
- * chacha has (counter | nonce)
- * xchacha has (nonce16 | counter | nonce16)
- Idea B: separate nonce / counter and provide separate API for counter re-use
- Caveat: there are different counter sizes depending on an algorithm.
- salsa & chacha also differ in structures of key & sigma:
  salsa20:      s[0] | k(4) | s[1] | nonce(2) | cnt(2) | s[2] | k(4) | s[3]
  chacha:       s(4) | k(8) | cnt(1) | nonce(3)
  chacha20orig: s(4) | k(8) | cnt(2) | nonce(2)
- Idea C: helper method such as `setSalsaState(key, nonce, sigma, data)`
- Caveat: we can't re-use counter array

xchacha [^2] uses the subkey and remaining 8 byte nonce with ChaCha20 as normal
(prefixed by 4 NUL bytes, since [RFC8439] specifies a 12-byte nonce).

[^1]: https://mailarchive.ietf.org/arch/msg/cfrg/gsOnTJzcbgG6OqD8Sc0GO5aR_tU/
[^2]: https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha#appendix-A.2

 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha/utils.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/utils/noble.js [app-ssr] (ecmascript)");
;
// Can't use similar utils.utf8ToBytes, because it uses `TextEncoder` - not available in all envs
const _utf8ToBytes = (str)=>Uint8Array.from(str.split("").map((c)=>c.charCodeAt(0)));
const sigma16 = _utf8ToBytes("expand 16-byte k");
const sigma32 = _utf8ToBytes("expand 32-byte k");
const sigma16_32 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(sigma16);
const sigma32_32 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(sigma32);
function rotl(a, b) {
    return a << b | a >>> 32 - b;
}
// Is byte array aligned to 4 byte offset (u32)?
function isAligned32(b) {
    return b.byteOffset % 4 === 0;
}
// Salsa and Chacha block length is always 512-bit
const BLOCK_LEN = 64;
const BLOCK_LEN32 = 16;
// new Uint32Array([2**32])   // => Uint32Array(1) [ 0 ]
// new Uint32Array([2**32-1]) // => Uint32Array(1) [ 4294967295 ]
const MAX_COUNTER = 2 ** 32 - 1;
const U32_EMPTY = Uint32Array.of();
function runCipher(core, sigma, key, nonce, data, output, counter, rounds) {
    const len = data.length;
    const block = new Uint8Array(BLOCK_LEN);
    const b32 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(block);
    // Make sure that buffers aligned to 4 bytes
    const isAligned = isAligned32(data) && isAligned32(output);
    const d32 = isAligned ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(data) : U32_EMPTY;
    const o32 = isAligned ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(output) : U32_EMPTY;
    for(let pos = 0; pos < len; counter++){
        core(sigma, key, nonce, b32, counter, rounds);
        if (counter >= MAX_COUNTER) throw new Error("arx: counter overflow");
        const take = Math.min(BLOCK_LEN, len - pos);
        // aligned to 4 bytes
        if (isAligned && take === BLOCK_LEN) {
            const pos32 = pos / 4;
            if (pos % 4 !== 0) throw new Error("arx: invalid block position");
            for(let j = 0, posj; j < BLOCK_LEN32; j++){
                posj = pos32 + j;
                o32[posj] = d32[posj] ^ b32[j];
            }
            pos += BLOCK_LEN;
            continue;
        }
        for(let j = 0, posj; j < take; j++){
            posj = pos + j;
            output[posj] = data[posj] ^ block[j];
        }
        pos += take;
    }
}
function createCipher(core, opts) {
    const { allowShortKeys, extendNonceFn, counterLength, counterRight, rounds } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["checkOpts"])({
        allowShortKeys: false,
        counterLength: 8,
        counterRight: false,
        rounds: 20
    }, opts);
    if (typeof core !== "function") throw new Error("core must be a function");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(counterLength);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(rounds);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["abool"])(counterRight);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["abool"])(allowShortKeys);
    return (key, nonce, data, output, counter = 0)=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(key, undefined, "key");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(nonce, undefined, "nonce");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(data, undefined, "data");
        const len = data.length;
        if (output === undefined) output = new Uint8Array(len);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(output, undefined, "output");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(counter);
        if (counter < 0 || counter >= MAX_COUNTER) {
            throw new Error("arx: counter overflow");
        }
        if (output.length < len) {
            throw new Error(`arx: output (${output.length}) is shorter than data (${len})`);
        }
        const toClean = [];
        // Key & sigma
        // key=16 -> sigma16, k=key|key
        // key=32 -> sigma32, k=key
        const l = key.length;
        let k;
        let sigma;
        if (l === 32) {
            toClean.push(k = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(key));
            sigma = sigma32_32;
        } else if (l === 16 && allowShortKeys) {
            k = new Uint8Array(32);
            k.set(key);
            k.set(key, 16);
            sigma = sigma16_32;
            toClean.push(k);
        } else {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(key, 32, "arx key");
            throw new Error("invalid key size");
        // throw new Error(`"arx key" expected Uint8Array of length 32, got length=${l}`);
        }
        // Nonce
        // salsa20:      8   (8-byte counter)
        // chacha20orig: 8   (8-byte counter)
        // chacha20:     12  (4-byte counter)
        // xsalsa20:     24  (16 -> hsalsa,  8 -> old nonce)
        // xchacha20:    24  (16 -> hchacha, 8 -> old nonce)
        // Align nonce to 4 bytes
        if (!isAligned32(nonce)) toClean.push(nonce = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(nonce));
        const k32 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(k);
        // hsalsa & hchacha: handle extended nonce
        if (extendNonceFn) {
            if (nonce.length !== 24) {
                throw new Error(`arx: extended nonce must be 24 bytes`);
            }
            extendNonceFn(sigma, k32, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(nonce.subarray(0, 16)), k32);
            nonce = nonce.subarray(16);
        }
        // Handle nonce counter
        const nonceNcLen = 16 - counterLength;
        if (nonceNcLen !== nonce.length) {
            throw new Error(`arx: nonce must be ${nonceNcLen} or 16 bytes`);
        }
        // Pad counter when nonce is 64 bit
        if (nonceNcLen !== 12) {
            const nc = new Uint8Array(12);
            nc.set(nonce, counterRight ? 0 : 12 - nonce.length);
            nonce = nc;
            toClean.push(nonce);
        }
        const n32 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(nonce);
        runCipher(core, sigma, k32, n32, data, output, counter, rounds);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(...toClean);
        return output;
    };
}
}),
"[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha/_poly1305.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Poly1305",
    ()=>Poly1305,
    "poly1305",
    ()=>poly1305,
    "wrapConstructorWithKey",
    ()=>wrapConstructorWithKey
]);
/**
 * This file is based on noble-ciphers (https://github.com/paulmillr/noble-ciphers).
 *
 * noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com)
 *
 * The original file is located at:
 * https://github.com/paulmillr/noble-ciphers/blob/749cdf9cd07ebdd19e9b957d0f172f1045179695/src/_poly1305.ts
 */ /**
 * Poly1305 ([PDF](https://cr.yp.to/mac/poly1305-20050329.pdf),
 * [wiki](https://en.wikipedia.org/wiki/Poly1305))
 * is a fast and parallel secret-key message-authentication code suitable for
 * a wide variety of applications. It was standardized in
 * [RFC 8439](https://www.rfc-editor.org/rfc/rfc8439) and is now used in TLS 1.3.
 *
 * Polynomial MACs are not perfect for every situation:
 * they lack Random Key Robustness: the MAC can be forged, and can't be used in PAKE schemes.
 * See [invisible salamanders attack](https://keymaterial.net/2020/09/07/invisible-salamanders-in-aes-gcm-siv/).
 * To combat invisible salamanders, `hash(key)` can be included in ciphertext,
 * however, this would violate ciphertext indistinguishability:
 * an attacker would know which key was used - so `HKDF(key, i)`
 * could be used instead.
 *
 * Check out [original website](https://cr.yp.to/mac.html).
 * Based on Public Domain [poly1305-donna](https://github.com/floodyberry/poly1305-donna).
 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha/utils.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/utils/noble.js [app-ssr] (ecmascript)");
;
function u8to16(a, i) {
    return a[i++] & 0xff | (a[i++] & 0xff) << 8;
}
class Poly1305 {
    // Can be speed-up using BigUint64Array, at the cost of complexity
    constructor(key){
        Object.defineProperty(this, "blockLen", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 16
        });
        Object.defineProperty(this, "outputLen", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 16
        });
        Object.defineProperty(this, "buffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Uint8Array(16)
        });
        Object.defineProperty(this, "r", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Uint16Array(10)
        }); // Allocating 1 array with .subarray() here is slower than 3
        Object.defineProperty(this, "h", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Uint16Array(10)
        });
        Object.defineProperty(this, "pad", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Uint16Array(8)
        });
        Object.defineProperty(this, "pos", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "finished", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(key, 32, "key"));
        const t0 = u8to16(key, 0);
        const t1 = u8to16(key, 2);
        const t2 = u8to16(key, 4);
        const t3 = u8to16(key, 6);
        const t4 = u8to16(key, 8);
        const t5 = u8to16(key, 10);
        const t6 = u8to16(key, 12);
        const t7 = u8to16(key, 14);
        // https://github.com/floodyberry/poly1305-donna/blob/e6ad6e091d30d7f4ec2d4f978be1fcfcbce72781/poly1305-donna-16.h#L47
        this.r[0] = t0 & 0x1fff;
        this.r[1] = (t0 >>> 13 | t1 << 3) & 0x1fff;
        this.r[2] = (t1 >>> 10 | t2 << 6) & 0x1f03;
        this.r[3] = (t2 >>> 7 | t3 << 9) & 0x1fff;
        this.r[4] = (t3 >>> 4 | t4 << 12) & 0x00ff;
        this.r[5] = t4 >>> 1 & 0x1ffe;
        this.r[6] = (t4 >>> 14 | t5 << 2) & 0x1fff;
        this.r[7] = (t5 >>> 11 | t6 << 5) & 0x1f81;
        this.r[8] = (t6 >>> 8 | t7 << 8) & 0x1fff;
        this.r[9] = t7 >>> 5 & 0x007f;
        for(let i = 0; i < 8; i++)this.pad[i] = u8to16(key, 16 + 2 * i);
    }
    process(data, offset, isLast = false) {
        const hibit = isLast ? 0 : 1 << 11;
        const { h, r } = this;
        const r0 = r[0];
        const r1 = r[1];
        const r2 = r[2];
        const r3 = r[3];
        const r4 = r[4];
        const r5 = r[5];
        const r6 = r[6];
        const r7 = r[7];
        const r8 = r[8];
        const r9 = r[9];
        const t0 = u8to16(data, offset + 0);
        const t1 = u8to16(data, offset + 2);
        const t2 = u8to16(data, offset + 4);
        const t3 = u8to16(data, offset + 6);
        const t4 = u8to16(data, offset + 8);
        const t5 = u8to16(data, offset + 10);
        const t6 = u8to16(data, offset + 12);
        const t7 = u8to16(data, offset + 14);
        const h0 = h[0] + (t0 & 0x1fff);
        const h1 = h[1] + ((t0 >>> 13 | t1 << 3) & 0x1fff);
        const h2 = h[2] + ((t1 >>> 10 | t2 << 6) & 0x1fff);
        const h3 = h[3] + ((t2 >>> 7 | t3 << 9) & 0x1fff);
        const h4 = h[4] + ((t3 >>> 4 | t4 << 12) & 0x1fff);
        const h5 = h[5] + (t4 >>> 1 & 0x1fff);
        const h6 = h[6] + ((t4 >>> 14 | t5 << 2) & 0x1fff);
        const h7 = h[7] + ((t5 >>> 11 | t6 << 5) & 0x1fff);
        const h8 = h[8] + ((t6 >>> 8 | t7 << 8) & 0x1fff);
        const h9 = h[9] + (t7 >>> 5 | hibit);
        let c = 0;
        let d0 = c + h0 * r0 + h1 * (5 * r9) + h2 * (5 * r8) + h3 * (5 * r7) + h4 * (5 * r6);
        c = d0 >>> 13;
        d0 &= 0x1fff;
        d0 += h5 * (5 * r5) + h6 * (5 * r4) + h7 * (5 * r3) + h8 * (5 * r2) + h9 * (5 * r1);
        c += d0 >>> 13;
        d0 &= 0x1fff;
        let d1 = c + h0 * r1 + h1 * r0 + h2 * (5 * r9) + h3 * (5 * r8) + h4 * (5 * r7);
        c = d1 >>> 13;
        d1 &= 0x1fff;
        d1 += h5 * (5 * r6) + h6 * (5 * r5) + h7 * (5 * r4) + h8 * (5 * r3) + h9 * (5 * r2);
        c += d1 >>> 13;
        d1 &= 0x1fff;
        let d2 = c + h0 * r2 + h1 * r1 + h2 * r0 + h3 * (5 * r9) + h4 * (5 * r8);
        c = d2 >>> 13;
        d2 &= 0x1fff;
        d2 += h5 * (5 * r7) + h6 * (5 * r6) + h7 * (5 * r5) + h8 * (5 * r4) + h9 * (5 * r3);
        c += d2 >>> 13;
        d2 &= 0x1fff;
        let d3 = c + h0 * r3 + h1 * r2 + h2 * r1 + h3 * r0 + h4 * (5 * r9);
        c = d3 >>> 13;
        d3 &= 0x1fff;
        d3 += h5 * (5 * r8) + h6 * (5 * r7) + h7 * (5 * r6) + h8 * (5 * r5) + h9 * (5 * r4);
        c += d3 >>> 13;
        d3 &= 0x1fff;
        let d4 = c + h0 * r4 + h1 * r3 + h2 * r2 + h3 * r1 + h4 * r0;
        c = d4 >>> 13;
        d4 &= 0x1fff;
        d4 += h5 * (5 * r9) + h6 * (5 * r8) + h7 * (5 * r7) + h8 * (5 * r6) + h9 * (5 * r5);
        c += d4 >>> 13;
        d4 &= 0x1fff;
        let d5 = c + h0 * r5 + h1 * r4 + h2 * r3 + h3 * r2 + h4 * r1;
        c = d5 >>> 13;
        d5 &= 0x1fff;
        d5 += h5 * r0 + h6 * (5 * r9) + h7 * (5 * r8) + h8 * (5 * r7) + h9 * (5 * r6);
        c += d5 >>> 13;
        d5 &= 0x1fff;
        let d6 = c + h0 * r6 + h1 * r5 + h2 * r4 + h3 * r3 + h4 * r2;
        c = d6 >>> 13;
        d6 &= 0x1fff;
        d6 += h5 * r1 + h6 * r0 + h7 * (5 * r9) + h8 * (5 * r8) + h9 * (5 * r7);
        c += d6 >>> 13;
        d6 &= 0x1fff;
        let d7 = c + h0 * r7 + h1 * r6 + h2 * r5 + h3 * r4 + h4 * r3;
        c = d7 >>> 13;
        d7 &= 0x1fff;
        d7 += h5 * r2 + h6 * r1 + h7 * r0 + h8 * (5 * r9) + h9 * (5 * r8);
        c += d7 >>> 13;
        d7 &= 0x1fff;
        let d8 = c + h0 * r8 + h1 * r7 + h2 * r6 + h3 * r5 + h4 * r4;
        c = d8 >>> 13;
        d8 &= 0x1fff;
        d8 += h5 * r3 + h6 * r2 + h7 * r1 + h8 * r0 + h9 * (5 * r9);
        c += d8 >>> 13;
        d8 &= 0x1fff;
        let d9 = c + h0 * r9 + h1 * r8 + h2 * r7 + h3 * r6 + h4 * r5;
        c = d9 >>> 13;
        d9 &= 0x1fff;
        d9 += h5 * r4 + h6 * r3 + h7 * r2 + h8 * r1 + h9 * r0;
        c += d9 >>> 13;
        d9 &= 0x1fff;
        c = (c << 2) + c | 0;
        c = c + d0 | 0;
        d0 = c & 0x1fff;
        c = c >>> 13;
        d1 += c;
        h[0] = d0;
        h[1] = d1;
        h[2] = d2;
        h[3] = d3;
        h[4] = d4;
        h[5] = d5;
        h[6] = d6;
        h[7] = d7;
        h[8] = d8;
        h[9] = d9;
    }
    finalize() {
        const { h, pad } = this;
        const g = new Uint16Array(10);
        let c = h[1] >>> 13;
        h[1] &= 0x1fff;
        for(let i = 2; i < 10; i++){
            h[i] += c;
            c = h[i] >>> 13;
            h[i] &= 0x1fff;
        }
        h[0] += c * 5;
        c = h[0] >>> 13;
        h[0] &= 0x1fff;
        h[1] += c;
        c = h[1] >>> 13;
        h[1] &= 0x1fff;
        h[2] += c;
        g[0] = h[0] + 5;
        c = g[0] >>> 13;
        g[0] &= 0x1fff;
        for(let i = 1; i < 10; i++){
            g[i] = h[i] + c;
            c = g[i] >>> 13;
            g[i] &= 0x1fff;
        }
        g[9] -= 1 << 13;
        let mask = (c ^ 1) - 1;
        for(let i = 0; i < 10; i++)g[i] &= mask;
        mask = ~mask;
        for(let i = 0; i < 10; i++)h[i] = h[i] & mask | g[i];
        h[0] = (h[0] | h[1] << 13) & 0xffff;
        h[1] = (h[1] >>> 3 | h[2] << 10) & 0xffff;
        h[2] = (h[2] >>> 6 | h[3] << 7) & 0xffff;
        h[3] = (h[3] >>> 9 | h[4] << 4) & 0xffff;
        h[4] = (h[4] >>> 12 | h[5] << 1 | h[6] << 14) & 0xffff;
        h[5] = (h[6] >>> 2 | h[7] << 11) & 0xffff;
        h[6] = (h[7] >>> 5 | h[8] << 8) & 0xffff;
        h[7] = (h[8] >>> 8 | h[9] << 5) & 0xffff;
        let f = h[0] + pad[0];
        h[0] = f & 0xffff;
        for(let i = 1; i < 8; i++){
            f = (h[i] + pad[i] | 0) + (f >>> 16) | 0;
            h[i] = f & 0xffff;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(g);
    }
    update(data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aexists"])(this);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(data);
        data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(data);
        const { buffer, blockLen } = this;
        const len = data.length;
        for(let pos = 0; pos < len;){
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input
            if (take === blockLen) {
                for(; blockLen <= len - pos; pos += blockLen)this.process(data, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(buffer, 0, false);
                this.pos = 0;
            }
        }
        return this;
    }
    destroy() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(this.h, this.r, this.buffer, this.pad);
    }
    digestInto(out) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aexists"])(this);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aoutput"])(out, this);
        this.finished = true;
        const { buffer, h } = this;
        let { pos } = this;
        if (pos) {
            buffer[pos++] = 1;
            for(; pos < 16; pos++)buffer[pos] = 0;
            this.process(buffer, 0, true);
        }
        this.finalize();
        let opos = 0;
        for(let i = 0; i < 8; i++){
            out[opos++] = h[i] >>> 0;
            out[opos++] = h[i] >>> 8;
        }
        return out;
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
}
function wrapConstructorWithKey(hashCons) {
    const hashC = (msg, key)=>hashCons(key).update(msg).digest();
    const tmp = hashCons(new Uint8Array(32)); // tmp array, used just once below
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (key)=>hashCons(key);
    return hashC;
}
const poly1305 = /** @__PURE__ */ (()=>wrapConstructorWithKey((key)=>new Poly1305(key)))();
}),
"[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha/chacha.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "_poly1305_aead",
    ()=>_poly1305_aead,
    "chacha20",
    ()=>chacha20,
    "chacha20poly1305",
    ()=>chacha20poly1305
]);
/**
 * This file is based on noble-ciphers (https://github.com/paulmillr/noble-ciphers).
 *
 * noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com)
 *
 * The original file is located at:
 * https://github.com/paulmillr/noble-ciphers/blob/749cdf9cd07ebdd19e9b957d0f172f1045179695/src/chacha.ts
 */ /**
 * ChaCha stream cipher, released
 * in 2008. Developed after Salsa20, ChaCha aims to increase diffusion per round.
 * It was standardized in [RFC 8439](https://www.rfc-editor.org/rfc/rfc8439) and
 * is now used in TLS 1.3.
 *
 * [XChaCha20](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha)
 * extended-nonce variant is also provided. Similar to XSalsa, it's safe to use with
 * randomly-generated nonces.
 *
 * Check out [PDF](http://cr.yp.to/chacha/chacha-20080128.pdf) and
 * [wiki](https://en.wikipedia.org/wiki/Salsa20) and
 * [website](https://cr.yp.to/chacha.html).
 *
 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha/_arx.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_poly1305$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha/_poly1305.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha/utils.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/utils/noble.js [app-ssr] (ecmascript)");
;
;
;
/**
 * ChaCha core function. It is implemented twice:
 * 1. Simple loop (chachaCore_small, hchacha_small)
 * 2. Unrolled loop (chachaCore, hchacha) - 4x faster, but larger & harder to read
 * The specific implementation is selected in `createCipher` below.
 */ function chachaCore(s, k, n, out, cnt, rounds = 20) {
    const y00 = s[0], y01 = s[1], y02 = s[2], y03 = s[3], y04 = k[0], y05 = k[1], y06 = k[2], y07 = k[3], y08 = k[4], y09 = k[5], y10 = k[6], y11 = k[7], y12 = cnt, y13 = n[0], y14 = n[1], y15 = n[2]; // Counter  Counter	Nonce   Nonce
    // Save state to temporary variables
    let x00 = y00, x01 = y01, x02 = y02, x03 = y03, x04 = y04, x05 = y05, x06 = y06, x07 = y07, x08 = y08, x09 = y09, x10 = y10, x11 = y11, x12 = y12, x13 = y13, x14 = y14, x15 = y15;
    for(let r = 0; r < rounds; r += 2){
        x00 = x00 + x04 | 0;
        x12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x12 ^ x00, 16);
        x08 = x08 + x12 | 0;
        x04 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x04 ^ x08, 12);
        x00 = x00 + x04 | 0;
        x12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x12 ^ x00, 8);
        x08 = x08 + x12 | 0;
        x04 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x04 ^ x08, 7);
        x01 = x01 + x05 | 0;
        x13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x13 ^ x01, 16);
        x09 = x09 + x13 | 0;
        x05 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x05 ^ x09, 12);
        x01 = x01 + x05 | 0;
        x13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x13 ^ x01, 8);
        x09 = x09 + x13 | 0;
        x05 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x05 ^ x09, 7);
        x02 = x02 + x06 | 0;
        x14 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x14 ^ x02, 16);
        x10 = x10 + x14 | 0;
        x06 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x06 ^ x10, 12);
        x02 = x02 + x06 | 0;
        x14 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x14 ^ x02, 8);
        x10 = x10 + x14 | 0;
        x06 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x06 ^ x10, 7);
        x03 = x03 + x07 | 0;
        x15 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x15 ^ x03, 16);
        x11 = x11 + x15 | 0;
        x07 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x07 ^ x11, 12);
        x03 = x03 + x07 | 0;
        x15 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x15 ^ x03, 8);
        x11 = x11 + x15 | 0;
        x07 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x07 ^ x11, 7);
        x00 = x00 + x05 | 0;
        x15 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x15 ^ x00, 16);
        x10 = x10 + x15 | 0;
        x05 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x05 ^ x10, 12);
        x00 = x00 + x05 | 0;
        x15 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x15 ^ x00, 8);
        x10 = x10 + x15 | 0;
        x05 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x05 ^ x10, 7);
        x01 = x01 + x06 | 0;
        x12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x12 ^ x01, 16);
        x11 = x11 + x12 | 0;
        x06 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x06 ^ x11, 12);
        x01 = x01 + x06 | 0;
        x12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x12 ^ x01, 8);
        x11 = x11 + x12 | 0;
        x06 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x06 ^ x11, 7);
        x02 = x02 + x07 | 0;
        x13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x13 ^ x02, 16);
        x08 = x08 + x13 | 0;
        x07 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x07 ^ x08, 12);
        x02 = x02 + x07 | 0;
        x13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x13 ^ x02, 8);
        x08 = x08 + x13 | 0;
        x07 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x07 ^ x08, 7);
        x03 = x03 + x04 | 0;
        x14 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x14 ^ x03, 16);
        x09 = x09 + x14 | 0;
        x04 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x04 ^ x09, 12);
        x03 = x03 + x04 | 0;
        x14 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x14 ^ x03, 8);
        x09 = x09 + x14 | 0;
        x04 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x04 ^ x09, 7);
    }
    // Write output
    let oi = 0;
    out[oi++] = y00 + x00 | 0;
    out[oi++] = y01 + x01 | 0;
    out[oi++] = y02 + x02 | 0;
    out[oi++] = y03 + x03 | 0;
    out[oi++] = y04 + x04 | 0;
    out[oi++] = y05 + x05 | 0;
    out[oi++] = y06 + x06 | 0;
    out[oi++] = y07 + x07 | 0;
    out[oi++] = y08 + x08 | 0;
    out[oi++] = y09 + x09 | 0;
    out[oi++] = y10 + x10 | 0;
    out[oi++] = y11 + x11 | 0;
    out[oi++] = y12 + x12 | 0;
    out[oi++] = y13 + x13 | 0;
    out[oi++] = y14 + x14 | 0;
    out[oi++] = y15 + x15 | 0;
}
const chacha20 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createCipher"])(chachaCore, {
    counterRight: false,
    counterLength: 4,
    allowShortKeys: false
});
const ZEROS16 = /* @__PURE__ */ new Uint8Array(16);
// Pad to digest size with zeros
const updatePadded = (h, msg)=>{
    h.update(msg);
    const leftover = msg.length % 16;
    if (leftover) h.update(ZEROS16.subarray(leftover));
};
const ZEROS32 = /* @__PURE__ */ new Uint8Array(32);
function computeTag(fn, key, nonce, ciphertext, AAD) {
    if (AAD !== undefined) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(AAD, undefined, "AAD");
    const authKey = fn(key, nonce, ZEROS32);
    const lengths = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["u64Lengths"])(ciphertext.length, AAD ? AAD.length : 0, true);
    // Methods below can be replaced with
    // return poly1305_computeTag_small(authKey, lengths, ciphertext, AAD)
    const h = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$_poly1305$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["poly1305"].create(authKey);
    if (AAD) updatePadded(h, AAD);
    updatePadded(h, ciphertext);
    h.update(lengths);
    const res = h.digest();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(authKey, lengths);
    return res;
}
const _poly1305_aead = (xorStream)=>(key, nonce, AAD)=>{
        const tagLength = 16;
        return {
            encrypt (plaintext, output) {
                const plength = plaintext.length;
                output = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getOutput"])(plength + tagLength, output, false);
                output.set(plaintext);
                const oPlain = output.subarray(0, -tagLength);
                // Actual encryption
                xorStream(key, nonce, oPlain, oPlain, 1);
                const tag = computeTag(xorStream, key, nonce, oPlain, AAD);
                output.set(tag, plength); // append tag
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(tag);
                return output;
            },
            decrypt (ciphertext, output) {
                output = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getOutput"])(ciphertext.length - tagLength, output, false);
                const data = ciphertext.subarray(0, -tagLength);
                const passedTag = ciphertext.subarray(-tagLength);
                const tag = computeTag(xorStream, key, nonce, data, AAD);
                if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["equalBytes"])(passedTag, tag)) throw new Error("invalid tag");
                output.set(ciphertext.subarray(0, -tagLength));
                // Actual decryption
                xorStream(key, nonce, output, output, 1); // start stream with i=1
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(tag);
                return output;
            }
        };
    };
const chacha20poly1305 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["wrapCipher"])({
    blockSize: 64,
    nonceLength: 12,
    tagLength: 16
}, _poly1305_aead(chacha20));
}),
"[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha/utils.js [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "abool",
    ()=>abool,
    "checkOpts",
    ()=>checkOpts,
    "equalBytes",
    ()=>equalBytes,
    "getOutput",
    ()=>getOutput,
    "isAligned32",
    ()=>isAligned32,
    "u64Lengths",
    ()=>u64Lengths,
    "u8",
    ()=>u8,
    "wrapCipher",
    ()=>wrapCipher
]);
/**
 * This file is based on noble-ciphers (https://github.com/paulmillr/noble-ciphers).
 *
 * noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com)
 *
 * The original file is located at:
 * https://github.com/paulmillr/noble-ciphers/blob/749cdf9cd07ebdd19e9b957d0f172f1045179695/src/utils.ts
 */ /**
 * Utilities for hex, bytes, CSPRNG.
 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/utils/noble.js [app-ssr] (ecmascript)");
;
;
function abool(b) {
    if (typeof b !== "boolean") throw new Error(`boolean expected, not ${b}`);
}
function u8(arr) {
    return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
}
const wrapCipher = (params, constructor)=>{
    // deno-lint-ignore no-explicit-any
    function wrappedCipher(key, ...args) {
        // Validate key
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(key, undefined, "key");
        // Big-Endian hardware is rare. Just in case someone still decides to run ciphers:
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLE"]) {
            throw new Error("Non little-endian hardware is not yet supported");
        }
        // Validate nonce if nonceLength is present
        if (params.nonceLength !== undefined) {
            const nonce = args[0];
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(nonce, params.varSizeNonce ? undefined : params.nonceLength, "nonce");
        }
        // Validate AAD if tagLength present
        const tagl = params.tagLength;
        if (tagl && args[1] !== undefined) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(args[1], undefined, "AAD");
        const cipher = constructor(key, ...args);
        const checkOutput = (fnLength, output)=>{
            if (output !== undefined) {
                if (fnLength !== 2) throw new Error("cipher output not supported");
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(output, undefined, "output");
            }
        };
        // Create wrapped cipher with validation and single-use encryption
        let called = false;
        const wrCipher = {
            encrypt (data, output) {
                if (called) {
                    throw new Error("cannot encrypt() twice with same key + nonce");
                }
                called = true;
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(data);
                checkOutput(cipher.encrypt.length, output);
                return cipher.encrypt(data, output);
            },
            decrypt (data, output) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(data);
                if (tagl && data.length < tagl) {
                    throw new Error('"ciphertext" expected length bigger than tagLength=' + tagl);
                }
                checkOutput(cipher.decrypt.length, output);
                return cipher.decrypt(data, output);
            }
        };
        return wrCipher;
    }
    Object.assign(wrappedCipher, params);
    return wrappedCipher;
};
function checkOpts(defaults, opts) {
    if (opts == null || typeof opts !== "object") {
        throw new Error("options must be defined");
    }
    const merged = Object.assign(defaults, opts);
    return merged;
}
function equalBytes(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for(let i = 0; i < a.length; i++)diff |= a[i] ^ b[i];
    return diff === 0;
}
function getOutput(expectedLength, out, onlyAligned = true) {
    if (out === undefined) return new Uint8Array(expectedLength);
    if (out.length !== expectedLength) {
        throw new Error('"output" expected Uint8Array of length ' + expectedLength + ", got: " + out.length);
    }
    if (onlyAligned && !isAligned32(out)) {
        throw new Error("invalid output, must be aligned");
    }
    return out;
}
function u64Lengths(dataLength, aadLength, isLE) {
    abool(isLE);
    const num = new Uint8Array(16);
    const view = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createView"])(num);
    view.setBigUint64(0, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["numberToBigint"])(aadLength), isLE);
    view.setBigUint64(8, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$noble$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["numberToBigint"])(dataLength), isLE);
    return num;
}
function isAligned32(bytes) {
    return bytes.byteOffset % 4 === 0;
} // copy bytes to new u8a (aligned). Because Buffer.slice is broken.
 // Re-exported from @hpke/common.
}),
"[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha20Poly1305.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Chacha20Poly1305",
    ()=>Chacha20Poly1305,
    "Chacha20Poly1305Context",
    ()=>Chacha20Poly1305Context
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$chacha$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha/chacha.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/identifiers.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
;
;
class Chacha20Poly1305Context {
    constructor(key){
        Object.defineProperty(this, "_key", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._key = new Uint8Array((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(key));
    }
    async seal(iv, data, aad) {
        return await this._seal((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(iv), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(data), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(aad));
    }
    async open(iv, data, aad) {
        return await this._open((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(iv), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(data), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(aad));
    }
    _seal(iv, data, aad) {
        return new Promise((resolve)=>{
            const ret = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$chacha$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["chacha20poly1305"])(this._key, new Uint8Array(iv), new Uint8Array(aad)).encrypt(new Uint8Array(data));
            resolve(ret.buffer);
        });
    }
    _open(iv, data, aad) {
        return new Promise((resolve)=>{
            const ret = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha$2f$chacha$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["chacha20poly1305"])(this._key, new Uint8Array(iv), new Uint8Array(aad)).decrypt(new Uint8Array(data));
            resolve(ret.buffer);
        });
    }
}
class Chacha20Poly1305 {
    constructor(){
        /** AeadId.Chacha20Poly1305 (0x0003) */ Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AeadId"].Chacha20Poly1305
        });
        /** 32 */ Object.defineProperty(this, "keySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 32
        });
        /** 12 */ Object.defineProperty(this, "nonceSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 12
        });
        /** 16 */ Object.defineProperty(this, "tagSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 16
        });
    }
    createEncryptionContext(key) {
        return new Chacha20Poly1305Context(key);
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/mod.js [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$aeads$2f$aesGcm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/aeads/aesGcm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$aeads$2f$exportOnly$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/aeads/exportOnly.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$native$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/native.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemX25519$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemX25519.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemX448$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemX448.js [app-ssr] (ecmascript)");
;
;
;
;
;
;
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/aeads/aesGcm.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Aes128Gcm",
    ()=>Aes128Gcm,
    "Aes256Gcm",
    ()=>Aes256Gcm,
    "AesGcmContext",
    ()=>AesGcmContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$aeadEncryptionContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/interfaces/aeadEncryptionContext.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/identifiers.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$algorithm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/algorithm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
;
class AesGcmContext extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$algorithm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NativeAlgorithm"] {
    constructor(key){
        super();
        Object.defineProperty(this, "_rawKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_key", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: undefined
        });
        this._rawKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(key);
    }
    async seal(iv, data, aad) {
        await this._setupKey();
        const alg = {
            name: "AES-GCM",
            iv: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(iv),
            additionalData: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(aad)
        };
        const ct = await this._api.encrypt(alg, this._key, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(data));
        return ct;
    }
    async open(iv, data, aad) {
        await this._setupKey();
        const alg = {
            name: "AES-GCM",
            iv: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(iv),
            additionalData: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(aad)
        };
        const pt = await this._api.decrypt(alg, this._key, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(data));
        return pt;
    }
    async _setupKey() {
        if (this._key !== undefined) {
            return;
        }
        await this._setup();
        const key = await this._importKey(this._rawKey);
        new Uint8Array(this._rawKey).fill(0);
        this._key = key;
        return;
    }
    async _importKey(key) {
        return await this._api.importKey("raw", key, {
            name: "AES-GCM"
        }, true, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$aeadEncryptionContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AEAD_USAGES"]);
    }
}
class Aes128Gcm {
    constructor(){
        /** AeadId.Aes128Gcm (0x0001) */ Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AeadId"].Aes128Gcm
        });
        /** 16 */ Object.defineProperty(this, "keySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 16
        });
        /** 12 */ Object.defineProperty(this, "nonceSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 12
        });
        /** 16 */ Object.defineProperty(this, "tagSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 16
        });
    }
    createEncryptionContext(key) {
        return new AesGcmContext(key);
    }
}
class Aes256Gcm extends Aes128Gcm {
    constructor(){
        super(...arguments);
        /** AeadId.Aes256Gcm (0x0002) */ Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AeadId"].Aes256Gcm
        });
        /** 32 */ Object.defineProperty(this, "keySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 32
        });
        /** 12 */ Object.defineProperty(this, "nonceSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 12
        });
        /** 16 */ Object.defineProperty(this, "tagSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 16
        });
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/aeads/exportOnly.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExportOnly",
    ()=>ExportOnly
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/identifiers.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/errors.js [app-ssr] (ecmascript)");
;
class ExportOnly {
    constructor(){
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AeadId"].ExportOnly
        });
        Object.defineProperty(this, "keySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "nonceSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "tagSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
    createEncryptionContext(_key) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NotSupportedError"]("Export only");
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/cipherSuiteNative.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CipherSuiteNative",
    ()=>CipherSuiteNative
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/identifiers.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/consts.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/utils/misc.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$algorithm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/algorithm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$exporterContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/exporterContext.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$recipientContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/recipientContext.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$senderContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/senderContext.js [app-ssr] (ecmascript)");
;
;
;
;
// b"base_nonce"
// deno-fmt-ignore
const LABEL_BASE_NONCE = new Uint8Array([
    98,
    97,
    115,
    101,
    95,
    110,
    111,
    110,
    99,
    101
]);
// b"exp"
const LABEL_EXP = new Uint8Array([
    101,
    120,
    112
]);
// b"info_hash"
// deno-fmt-ignore
const LABEL_INFO_HASH = new Uint8Array([
    105,
    110,
    102,
    111,
    95,
    104,
    97,
    115,
    104
]);
// b"key"
const LABEL_KEY = new Uint8Array([
    107,
    101,
    121
]);
// b"psk_id_hash"
// deno-fmt-ignore
const LABEL_PSK_ID_HASH = new Uint8Array([
    112,
    115,
    107,
    95,
    105,
    100,
    95,
    104,
    97,
    115,
    104
]);
// b"secret"
const LABEL_SECRET = new Uint8Array([
    115,
    101,
    99,
    114,
    101,
    116
]);
// b"HPKE"
// deno-fmt-ignore
const SUITE_ID_HEADER_HPKE = new Uint8Array([
    72,
    80,
    75,
    69,
    0,
    0,
    0,
    0,
    0,
    0
]);
class CipherSuiteNative extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$algorithm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NativeAlgorithm"] {
    /**
     * @param params A set of parameters for building a cipher suite.
     *
     * If the error occurred, throws {@link InvalidParamError}.
     *
     * @throws {@link InvalidParamError}
     */ constructor(params){
        super();
        Object.defineProperty(this, "_kem", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_kdf", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_aead", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_suiteId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // KEM
        if (typeof params.kem === "number") {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InvalidParamError"]("KemId cannot be used");
        }
        this._kem = params.kem;
        // KDF
        if (typeof params.kdf === "number") {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InvalidParamError"]("KdfId cannot be used");
        }
        this._kdf = params.kdf;
        // AEAD
        if (typeof params.aead === "number") {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InvalidParamError"]("AeadId cannot be used");
        }
        this._aead = params.aead;
        this._suiteId = new Uint8Array(SUITE_ID_HEADER_HPKE);
        this._suiteId.set((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["i2Osp"])(this._kem.id, 2), 4);
        this._suiteId.set((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["i2Osp"])(this._kdf.id, 2), 6);
        this._suiteId.set((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["i2Osp"])(this._aead.id, 2), 8);
        this._kdf.init(this._suiteId);
    }
    /**
     * Gets the KEM context of the ciphersuite.
     */ get kem() {
        return this._kem;
    }
    /**
     * Gets the KDF context of the ciphersuite.
     */ get kdf() {
        return this._kdf;
    }
    /**
     * Gets the AEAD context of the ciphersuite.
     */ get aead() {
        return this._aead;
    }
    /**
     * Creates an encryption context for a sender.
     *
     * If the error occurred, throws {@link DecapError} | {@link ValidationError}.
     *
     * @param params A set of parameters for the sender encryption context.
     * @returns A sender encryption context.
     * @throws {@link EncapError}, {@link ValidationError}
     */ async createSenderContext(params) {
        this._validateInputLength(params);
        await this._setup();
        const dh = await this._kem.encap(params);
        let mode;
        if (params.psk !== undefined) {
            mode = params.senderKey !== undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mode"].AuthPsk : __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mode"].Psk;
        } else {
            mode = params.senderKey !== undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mode"].Auth : __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mode"].Base;
        }
        return await this._keyScheduleS(mode, dh.sharedSecret, dh.enc, params);
    }
    /**
     * Creates an encryption context for a recipient.
     *
     * If the error occurred, throws {@link DecapError}
     * | {@link DeserializeError} | {@link ValidationError}.
     *
     * @param params A set of parameters for the recipient encryption context.
     * @returns A recipient encryption context.
     * @throws {@link DecapError}, {@link DeserializeError}, {@link ValidationError}
     */ async createRecipientContext(params) {
        this._validateInputLength(params);
        await this._setup();
        const sharedSecret = await this._kem.decap(params);
        let mode;
        if (params.psk !== undefined) {
            mode = params.senderPublicKey !== undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mode"].AuthPsk : __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mode"].Psk;
        } else {
            mode = params.senderPublicKey !== undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mode"].Auth : __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mode"].Base;
        }
        return await this._keyScheduleR(mode, sharedSecret, params);
    }
    /**
     * Encrypts a message to a recipient.
     *
     * If the error occurred, throws `EncapError` | `MessageLimitReachedError` | `SealError` | `ValidationError`.
     *
     * @param params A set of parameters for building a sender encryption context.
     * @param pt A plain text as bytes to be encrypted.
     * @param aad Additional authenticated data as bytes fed by an application.
     * @returns A cipher text and an encapsulated key as bytes.
     * @throws {@link EncapError}, {@link MessageLimitReachedError}, {@link SealError}, {@link ValidationError}
     */ async seal(params, pt, aad = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"].buffer) {
        const ctx = await this.createSenderContext(params);
        return {
            ct: await ctx.seal(pt, aad),
            enc: ctx.enc
        };
    }
    /**
     * Decrypts a message from a sender.
     *
     * If the error occurred, throws `DecapError` | `DeserializeError` | `OpenError` | `ValidationError`.
     *
     * @param params A set of parameters for building a recipient encryption context.
     * @param ct An encrypted text as bytes to be decrypted.
     * @param aad Additional authenticated data as bytes fed by an application.
     * @returns A decrypted plain text as bytes.
     * @throws {@link DecapError}, {@link DeserializeError}, {@link OpenError}, {@link ValidationError}
     */ async open(params, ct, aad = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"].buffer) {
        const ctx = await this.createRecipientContext(params);
        return await ctx.open(ct, aad);
    }
    // private verifyPskInputs(mode: Mode, params: KeyScheduleParams) {
    //   const gotPsk = (params.psk !== undefined);
    //   const gotPskId = (params.psk !== undefined && params.psk.id.byteLength > 0);
    //   if (gotPsk !== gotPskId) {
    //     throw new Error('Inconsistent PSK inputs');
    //   }
    //   if (gotPsk && (mode === Mode.Base || mode === Mode.Auth)) {
    //     throw new Error('PSK input provided when not needed');
    //   }
    //   if (!gotPsk && (mode === Mode.Psk || mode === Mode.AuthPsk)) {
    //     throw new Error('Missing required PSK input');
    //   }
    //   return;
    // }
    async _keySchedule(mode, sharedSecret, params) {
        // Currently, there is no point in executing this function
        // because this hpke library does not allow users to explicitly specify the mode.
        //
        // this.verifyPskInputs(mode, params);
        const pskId = params.psk === undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"] : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toUint8Array"])(params.psk.id);
        const pskIdHash = await this._kdf.labeledExtract(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"], LABEL_PSK_ID_HASH, pskId);
        const info = params.info === undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"] : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toUint8Array"])(params.info);
        const infoHash = await this._kdf.labeledExtract(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"], LABEL_INFO_HASH, info);
        const keyScheduleContext = new Uint8Array(1 + pskIdHash.byteLength + infoHash.byteLength);
        keyScheduleContext.set(new Uint8Array([
            mode
        ]), 0);
        keyScheduleContext.set(new Uint8Array(pskIdHash), 1);
        keyScheduleContext.set(new Uint8Array(infoHash), 1 + pskIdHash.byteLength);
        const psk = params.psk === undefined ? __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"] : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toUint8Array"])(params.psk.key);
        const ikm = this._kdf.buildLabeledIkm(LABEL_SECRET, psk);
        const exporterSecretInfo = this._kdf.buildLabeledInfo(LABEL_EXP, keyScheduleContext, this._kdf.hashSize);
        const exporterSecret = await this._kdf.extractAndExpand(sharedSecret, ikm, exporterSecretInfo, this._kdf.hashSize);
        if (this._aead.id === __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AeadId"].ExportOnly) {
            return {
                aead: this._aead,
                exporterSecret: exporterSecret
            };
        }
        const keyInfo = this._kdf.buildLabeledInfo(LABEL_KEY, keyScheduleContext, this._aead.keySize);
        const key = await this._kdf.extractAndExpand(sharedSecret, ikm, keyInfo, this._aead.keySize);
        const baseNonceInfo = this._kdf.buildLabeledInfo(LABEL_BASE_NONCE, keyScheduleContext, this._aead.nonceSize);
        const baseNonce = await this._kdf.extractAndExpand(sharedSecret, ikm, baseNonceInfo, this._aead.nonceSize);
        return {
            aead: this._aead,
            exporterSecret: exporterSecret,
            key: key,
            baseNonce: new Uint8Array(baseNonce),
            seq: 0
        };
    }
    async _keyScheduleS(mode, sharedSecret, enc, params) {
        const res = await this._keySchedule(mode, sharedSecret, params);
        if (res.key === undefined) {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$exporterContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SenderExporterContextImpl"](this._api, this._kdf, res.exporterSecret, enc);
        }
        return new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$senderContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SenderContextImpl"](this._api, this._kdf, res, enc);
    }
    async _keyScheduleR(mode, sharedSecret, params) {
        const res = await this._keySchedule(mode, sharedSecret, params);
        if (res.key === undefined) {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$exporterContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RecipientExporterContextImpl"](this._api, this._kdf, res.exporterSecret);
        }
        return new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$recipientContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RecipientContextImpl"](this._api, this._kdf, res);
    }
    _validateInputLength(params) {
        if (params.info !== undefined && params.info.byteLength > __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["INFO_LENGTH_LIMIT"]) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InvalidParamError"]("Too long info");
        }
        if (params.psk !== undefined) {
            if (params.psk.key.byteLength < __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MINIMUM_PSK_LENGTH"]) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InvalidParamError"](`PSK must have at least ${__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MINIMUM_PSK_LENGTH"]} bytes`);
            }
            if (params.psk.key.byteLength > __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["INPUT_LENGTH_LIMIT"]) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InvalidParamError"]("Too long psk.key");
            }
            if (params.psk.id.byteLength > __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["INPUT_LENGTH_LIMIT"]) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InvalidParamError"]("Too long psk.id");
            }
        }
        return;
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/encryptionContext.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EncryptionContextImpl",
    ()=>EncryptionContextImpl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/utils/misc.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$exporterContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/exporterContext.js [app-ssr] (ecmascript)");
;
;
class EncryptionContextImpl extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$exporterContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ExporterContextImpl"] {
    constructor(api, kdf, params){
        super(api, kdf, params.exporterSecret);
        // AEAD id.
        Object.defineProperty(this, "_aead", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // The length in bytes of a key for the algorithm.
        Object.defineProperty(this, "_nK", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // The length in bytes of a nonce for the algorithm.
        Object.defineProperty(this, "_nN", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // The length in bytes of an authentication tag for the algorithm.
        Object.defineProperty(this, "_nT", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // The end-to-end encryption key information.
        Object.defineProperty(this, "_ctx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        if (params.key === undefined || params.baseNonce === undefined || params.seq === undefined) {
            throw new Error("Required parameters are missing");
        }
        this._aead = params.aead;
        this._nK = this._aead.keySize;
        this._nN = this._aead.nonceSize;
        this._nT = this._aead.tagSize;
        const key = this._aead.createEncryptionContext(params.key);
        this._ctx = {
            key: key,
            baseNonce: params.baseNonce,
            seq: params.seq
        };
    }
    computeNonce(k) {
        const seqBytes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["i2Osp"])(k.seq, k.baseNonce.byteLength);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["xor"])(k.baseNonce, seqBytes).buffer;
    }
    incrementSeq(k) {
        // if (this.seq >= (1 << (8 * this.baseNonce.byteLength)) - 1) {
        if (k.seq > Number.MAX_SAFE_INTEGER) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MessageLimitReachedError"]("Message limit reached");
        }
        k.seq += 1;
        return;
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/exporterContext.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ExporterContextImpl",
    ()=>ExporterContextImpl,
    "RecipientExporterContextImpl",
    ()=>RecipientExporterContextImpl,
    "SenderExporterContextImpl",
    ()=>SenderExporterContextImpl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/consts.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$utils$2f$emitNotSupported$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/utils/emitNotSupported.js [app-ssr] (ecmascript)");
;
;
// b"sec"
const LABEL_SEC = new Uint8Array([
    115,
    101,
    99
]);
class ExporterContextImpl {
    constructor(api, kdf, exporterSecret){
        Object.defineProperty(this, "_api", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "exporterSecret", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_kdf", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._api = api;
        this._kdf = kdf;
        this.exporterSecret = exporterSecret;
    }
    async seal(_data, _aad) {
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$utils$2f$emitNotSupported$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["emitNotSupported"])();
    }
    async open(_data, _aad) {
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$utils$2f$emitNotSupported$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["emitNotSupported"])();
    }
    async export(exporterContext, len) {
        const rawExporterContext = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(exporterContext);
        if (rawExporterContext.byteLength > __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["INPUT_LENGTH_LIMIT"]) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InvalidParamError"]("Too long exporter context");
        }
        try {
            return await this._kdf.labeledExpand(this.exporterSecret, LABEL_SEC, new Uint8Array(rawExporterContext), len);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ExportError"](e);
        }
    }
}
class RecipientExporterContextImpl extends ExporterContextImpl {
}
class SenderExporterContextImpl extends ExporterContextImpl {
    constructor(api, kdf, exporterSecret, enc){
        super(api, kdf, exporterSecret);
        Object.defineProperty(this, "enc", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.enc = enc;
        return;
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemNative.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DhkemP256HkdfSha256Native",
    ()=>DhkemP256HkdfSha256Native,
    "DhkemP384HkdfSha384Native",
    ()=>DhkemP384HkdfSha384Native,
    "DhkemP521HkdfSha512Native",
    ()=>DhkemP521HkdfSha512Native
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kems/dhkem.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkemPrimitives$2f$ec$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kems/dhkemPrimitives/ec.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/identifiers.js [app-ssr] (ecmascript)");
;
class DhkemP256HkdfSha256Native extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dhkem"] {
    constructor(){
        const kdf = new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HkdfSha256Native"]();
        const prim = new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkemPrimitives$2f$ec$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Ec"](__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemP256HkdfSha256, kdf);
        super(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemP256HkdfSha256, prim, kdf);
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemP256HkdfSha256
        });
        Object.defineProperty(this, "secretSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 32
        });
        Object.defineProperty(this, "encSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 65
        });
        Object.defineProperty(this, "publicKeySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 65
        });
        Object.defineProperty(this, "privateKeySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 32
        });
    }
}
class DhkemP384HkdfSha384Native extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dhkem"] {
    constructor(){
        const kdf = new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HkdfSha384Native"]();
        const prim = new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkemPrimitives$2f$ec$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Ec"](__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemP384HkdfSha384, kdf);
        super(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemP384HkdfSha384, prim, kdf);
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemP384HkdfSha384
        });
        Object.defineProperty(this, "secretSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 48
        });
        Object.defineProperty(this, "encSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 97
        });
        Object.defineProperty(this, "publicKeySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 97
        });
        Object.defineProperty(this, "privateKeySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 48
        });
    }
}
class DhkemP521HkdfSha512Native extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dhkem"] {
    constructor(){
        const kdf = new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HkdfSha512Native"]();
        const prim = new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkemPrimitives$2f$ec$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Ec"](__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemP521HkdfSha512, kdf);
        super(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemP521HkdfSha512, prim, kdf);
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemP521HkdfSha512
        });
        Object.defineProperty(this, "secretSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 64
        });
        Object.defineProperty(this, "encSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 133
        });
        Object.defineProperty(this, "publicKeySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 133
        });
        Object.defineProperty(this, "privateKeySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 64
        });
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemPrimitives/x25519.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "X25519",
    ()=>X25519
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/utils/misc.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/consts.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/interfaces/dhkemPrimitives.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$algorithm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/algorithm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
;
const ALG_NAME = "X25519";
// deno-fmt-ignore
const PKCS8_ALG_ID_X25519 = new Uint8Array([
    0x30,
    0x2e,
    0x02,
    0x01,
    0x00,
    0x30,
    0x05,
    0x06,
    0x03,
    0x2b,
    0x65,
    0x6e,
    0x04,
    0x22,
    0x04,
    0x20
]);
const BASE_POINT_X25519 = /* @__PURE__ */ (()=>{
    const p = new Uint8Array(32);
    p[0] = 9;
    return p;
})();
class X25519 extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$algorithm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NativeAlgorithm"] {
    constructor(hkdf){
        super();
        Object.defineProperty(this, "_hkdf", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_alg", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_nPk", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_nSk", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_nDh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_pkcs8AlgId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._alg = {
            name: ALG_NAME
        };
        this._hkdf = hkdf;
        this._nPk = 32;
        this._nSk = 32;
        this._nDh = 32;
        this._pkcs8AlgId = PKCS8_ALG_ID_X25519;
    }
    async serializePublicKey(key) {
        await this._setup();
        try {
            return await this._api.exportKey("raw", key);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SerializeError"](e);
        }
    }
    async deserializePublicKey(key) {
        await this._setup();
        try {
            return await this._importRawKey((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(key), true);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeserializeError"](e);
        }
    }
    async serializePrivateKey(key) {
        await this._setup();
        try {
            const jwk = await this._api.exportKey("jwk", key);
            if (!("d" in jwk)) {
                throw new Error("Not private key");
            }
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["base64UrlToBytes"])(jwk["d"]).buffer;
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SerializeError"](e);
        }
    }
    async deserializePrivateKey(key) {
        await this._setup();
        try {
            return await this._importRawKey((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(key), false);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeserializeError"](e);
        }
    }
    async importKey(format, key, isPublic) {
        await this._setup();
        try {
            if (format === "raw") {
                return await this._importRawKey(key, isPublic);
            }
            // jwk
            if (key instanceof ArrayBuffer) {
                throw new Error("Invalid jwk key format");
            }
            return await this._importJWK(key, isPublic);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeserializeError"](e);
        }
    }
    async generateKeyPair() {
        await this._setup();
        try {
            return await this._api.generateKey(ALG_NAME, true, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KEM_USAGES"]);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NotSupportedError"](e);
        }
    }
    async deriveKeyPair(ikm) {
        await this._setup();
        try {
            const rawIkm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(ikm);
            const dkpPrk = await this._hkdf.labeledExtract(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"], __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LABEL_DKP_PRK"], new Uint8Array(rawIkm));
            const rawSk = await this._hkdf.labeledExpand(dkpPrk, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LABEL_SK"], __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"], this._nSk);
            const rawSkBytes = new Uint8Array(rawSk);
            const sk = await this._deserializePkcs8Key(rawSkBytes);
            rawSkBytes.fill(0);
            return {
                privateKey: sk,
                publicKey: await this.derivePublicKey(sk)
            };
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeriveKeyPairError"](e);
        }
    }
    async derivePublicKey(key) {
        await this._setup();
        try {
            const jwk = await this._api.exportKey("jwk", key);
            delete jwk["d"];
            delete jwk["key_ops"];
            return await this._api.importKey("jwk", jwk, this._alg, true, []);
        } catch  {
            try {
                // Firefox fails to export JWK from some imported X25519 private keys.
                const bp = await this._api.importKey("raw", BASE_POINT_X25519.buffer, this._alg, true, []);
                const bits = await this._api.deriveBits({
                    name: ALG_NAME,
                    public: bp
                }, key, this._nPk * 8);
                return await this._api.importKey("raw", bits, this._alg, true, []);
            } catch (e) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeserializeError"](e);
            }
        }
    }
    async dh(sk, pk) {
        await this._setup();
        try {
            const bits = await this._api.deriveBits({
                name: ALG_NAME,
                public: pk
            }, sk, this._nDh * 8);
            return bits;
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SerializeError"](e);
        }
    }
    async _importRawKey(key, isPublic) {
        if (isPublic && key.byteLength !== this._nPk) {
            throw new Error("Invalid public key for the ciphersuite");
        }
        if (!isPublic && key.byteLength !== this._nSk) {
            throw new Error("Invalid private key for the ciphersuite");
        }
        if (isPublic) {
            return await this._api.importKey("raw", key, this._alg, true, []);
        }
        return await this._deserializePkcs8Key(new Uint8Array(key));
    }
    async _importJWK(key, isPublic) {
        if (typeof key.kty === "undefined" || key.kty !== "OKP") {
            throw new Error(`Invalid kty: ${key.crv}`);
        }
        if (typeof key.crv === "undefined" || key.crv !== ALG_NAME) {
            throw new Error(`Invalid crv: ${key.crv}`);
        }
        if (isPublic) {
            if (typeof key.d !== "undefined") {
                throw new Error("Invalid key: `d` should not be set");
            }
            return await this._api.importKey("jwk", key, this._alg, true, []);
        }
        if (typeof key.d === "undefined") {
            throw new Error("Invalid key: `d` not found");
        }
        return await this._api.importKey("jwk", key, this._alg, true, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KEM_USAGES"]);
    }
    async _deserializePkcs8Key(k) {
        const pkcs8Key = new Uint8Array(this._pkcs8AlgId.length + k.length);
        pkcs8Key.set(this._pkcs8AlgId, 0);
        pkcs8Key.set(k, this._pkcs8AlgId.length);
        return await this._api.importKey("pkcs8", pkcs8Key, this._alg, true, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KEM_USAGES"]);
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemPrimitives/x448.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "X448",
    ()=>X448
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/utils/misc.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/consts.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/interfaces/dhkemPrimitives.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$algorithm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/algorithm.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
;
const ALG_NAME = "X448";
// deno-fmt-ignore
const PKCS8_ALG_ID_X448 = new Uint8Array([
    0x30,
    0x46,
    0x02,
    0x01,
    0x00,
    0x30,
    0x05,
    0x06,
    0x03,
    0x2b,
    0x65,
    0x6f,
    0x04,
    0x3a,
    0x04,
    0x38
]);
const BASE_POINT_X448 = /* @__PURE__ */ (()=>{
    const p = new Uint8Array(56);
    p[0] = 5;
    return p;
})();
class X448 extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$algorithm$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NativeAlgorithm"] {
    constructor(hkdf){
        super();
        Object.defineProperty(this, "_hkdf", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_alg", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_nPk", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_nSk", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_nDh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_pkcs8AlgId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._alg = {
            name: ALG_NAME
        };
        this._hkdf = hkdf;
        this._nPk = 56;
        this._nSk = 56;
        this._nDh = 56;
        this._pkcs8AlgId = PKCS8_ALG_ID_X448;
    }
    async serializePublicKey(key) {
        await this._setup();
        try {
            return await this._api.exportKey("raw", key);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SerializeError"](e);
        }
    }
    async deserializePublicKey(key) {
        await this._setup();
        try {
            return await this._importRawKey((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(key), true);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeserializeError"](e);
        }
    }
    async serializePrivateKey(key) {
        await this._setup();
        try {
            const jwk = await this._api.exportKey("jwk", key);
            if (!("d" in jwk)) {
                throw new Error("Not private key");
            }
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$utils$2f$misc$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["base64UrlToBytes"])(jwk["d"]).buffer;
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SerializeError"](e);
        }
    }
    async deserializePrivateKey(key) {
        await this._setup();
        try {
            return await this._importRawKey((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(key), false);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeserializeError"](e);
        }
    }
    async importKey(format, key, isPublic) {
        await this._setup();
        try {
            if (format === "raw") {
                return await this._importRawKey(key, isPublic);
            }
            // jwk
            if (key instanceof ArrayBuffer) {
                throw new Error("Invalid jwk key format");
            }
            return await this._importJWK(key, isPublic);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeserializeError"](e);
        }
    }
    async generateKeyPair() {
        await this._setup();
        try {
            return await this._api.generateKey(ALG_NAME, true, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KEM_USAGES"]);
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NotSupportedError"](e);
        }
    }
    async deriveKeyPair(ikm) {
        await this._setup();
        try {
            const rawIkm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(ikm);
            const dkpPrk = await this._hkdf.labeledExtract(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"], __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LABEL_DKP_PRK"], new Uint8Array(rawIkm));
            const rawSk = await this._hkdf.labeledExpand(dkpPrk, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LABEL_SK"], __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"], this._nSk);
            const rawSkBytes = new Uint8Array(rawSk);
            const sk = await this._deserializePkcs8Key(rawSkBytes);
            rawSkBytes.fill(0);
            return {
                privateKey: sk,
                publicKey: await this.derivePublicKey(sk)
            };
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeriveKeyPairError"](e);
        }
    }
    async derivePublicKey(key) {
        await this._setup();
        try {
            const jwk = await this._api.exportKey("jwk", key);
            delete jwk["d"];
            delete jwk["key_ops"];
            return await this._api.importKey("jwk", jwk, this._alg, true, []);
        } catch  {
            try {
                // Some runtimes cannot export JWK from imported X448 private keys.
                const bp = await this._api.importKey("raw", BASE_POINT_X448.buffer, this._alg, true, []);
                const bits = await this._api.deriveBits({
                    name: ALG_NAME,
                    public: bp
                }, key, this._nPk * 8);
                return await this._api.importKey("raw", bits, this._alg, true, []);
            } catch (e) {
                throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeserializeError"](e);
            }
        }
    }
    async dh(sk, pk) {
        await this._setup();
        try {
            const bits = await this._api.deriveBits({
                name: ALG_NAME,
                public: pk
            }, sk, this._nDh * 8);
            return bits;
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SerializeError"](e);
        }
    }
    async _importRawKey(key, isPublic) {
        if (isPublic && key.byteLength !== this._nPk) {
            throw new Error("Invalid public key for the ciphersuite");
        }
        if (!isPublic && key.byteLength !== this._nSk) {
            throw new Error("Invalid private key for the ciphersuite");
        }
        if (isPublic) {
            return await this._api.importKey("raw", key, this._alg, true, []);
        }
        return await this._deserializePkcs8Key(new Uint8Array(key));
    }
    async _importJWK(key, isPublic) {
        if (typeof key.kty === "undefined" || key.kty !== "OKP") {
            throw new Error(`Invalid kty: ${key.crv}`);
        }
        if (typeof key.crv === "undefined" || key.crv !== ALG_NAME) {
            throw new Error(`Invalid crv: ${key.crv}`);
        }
        if (isPublic) {
            if (typeof key.d !== "undefined") {
                throw new Error("Invalid key: `d` should not be set");
            }
            return await this._api.importKey("jwk", key, this._alg, true, []);
        }
        if (typeof key.d === "undefined") {
            throw new Error("Invalid key: `d` not found");
        }
        return await this._api.importKey("jwk", key, this._alg, true, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KEM_USAGES"]);
    }
    async _deserializePkcs8Key(k) {
        const pkcs8Key = new Uint8Array(this._pkcs8AlgId.length + k.length);
        pkcs8Key.set(this._pkcs8AlgId, 0);
        pkcs8Key.set(k, this._pkcs8AlgId.length);
        return await this._api.importKey("pkcs8", pkcs8Key, this._alg, true, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$interfaces$2f$dhkemPrimitives$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KEM_USAGES"]);
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemX25519.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DhkemX25519HkdfSha256",
    ()=>DhkemX25519HkdfSha256
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kems/dhkem.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/identifiers.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemPrimitives$2f$x25519$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemPrimitives/x25519.js [app-ssr] (ecmascript)");
;
;
class DhkemX25519HkdfSha256 extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dhkem"] {
    constructor(){
        const kdf = new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HkdfSha256Native"]();
        super(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemX25519HkdfSha256, new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemPrimitives$2f$x25519$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X25519"](kdf), kdf);
        /** KemId.DhkemX25519HkdfSha256 (0x0020) */ Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemX25519HkdfSha256
        });
        /** 32 */ Object.defineProperty(this, "secretSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 32
        });
        /** 32 */ Object.defineProperty(this, "encSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 32
        });
        /** 32 */ Object.defineProperty(this, "publicKeySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 32
        });
        /** 32 */ Object.defineProperty(this, "privateKeySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 32
        });
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemX448.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DhkemX448HkdfSha512",
    ()=>DhkemX448HkdfSha512
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kems/dhkem.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/identifiers.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemPrimitives$2f$x448$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemPrimitives/x448.js [app-ssr] (ecmascript)");
;
;
class DhkemX448HkdfSha512 extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kems$2f$dhkem$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dhkem"] {
    constructor(){
        const kdf = new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HkdfSha512Native"]();
        super(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemX448HkdfSha512, new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemPrimitives$2f$x448$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X448"](kdf), kdf);
        /** KemId.DhkemX448HkdfSha512 (0x0021) */ Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$identifiers$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KemId"].DhkemX448HkdfSha512
        });
        /** 64 */ Object.defineProperty(this, "secretSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 64
        });
        /** 56 */ Object.defineProperty(this, "encSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 56
        });
        /** 56 */ Object.defineProperty(this, "publicKeySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 56
        });
        /** 56 */ Object.defineProperty(this, "privateKeySize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 56
        });
    }
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/mutex.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Mutex",
    ()=>Mutex
]);
var __classPrivateFieldGet = ("TURBOPACK compile-time value", void 0) && ("TURBOPACK compile-time value", void 0).__classPrivateFieldGet || function(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = ("TURBOPACK compile-time value", void 0) && ("TURBOPACK compile-time value", void 0).__classPrivateFieldSet || function(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var _Mutex_locked;
class Mutex {
    constructor(){
        _Mutex_locked.set(this, Promise.resolve());
    }
    async lock() {
        let releaseLock;
        const nextLock = new Promise((resolve)=>{
            releaseLock = resolve;
        });
        const previousLock = __classPrivateFieldGet(this, _Mutex_locked, "f");
        __classPrivateFieldSet(this, _Mutex_locked, nextLock, "f");
        await previousLock;
        return releaseLock;
    }
}
_Mutex_locked = new WeakMap();
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/native.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CipherSuite",
    ()=>CipherSuite,
    "DhkemP256HkdfSha256",
    ()=>DhkemP256HkdfSha256,
    "DhkemP384HkdfSha384",
    ()=>DhkemP384HkdfSha384,
    "DhkemP521HkdfSha512",
    ()=>DhkemP521HkdfSha512,
    "HkdfSha256",
    ()=>HkdfSha256,
    "HkdfSha384",
    ()=>HkdfSha384,
    "HkdfSha512",
    ()=>HkdfSha512
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$cipherSuiteNative$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/cipherSuiteNative.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemNative$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemNative.js [app-ssr] (ecmascript)");
;
;
;
class CipherSuite extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$cipherSuiteNative$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CipherSuiteNative"] {
}
class DhkemP256HkdfSha256 extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemNative$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DhkemP256HkdfSha256Native"] {
}
class DhkemP384HkdfSha384 extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemNative$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DhkemP384HkdfSha384Native"] {
}
class DhkemP521HkdfSha512 extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemNative$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DhkemP521HkdfSha512Native"] {
}
class HkdfSha256 extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HkdfSha256Native"] {
}
class HkdfSha384 extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HkdfSha384Native"] {
}
class HkdfSha512 extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HkdfSha512Native"] {
}
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/recipientContext.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RecipientContextImpl",
    ()=>RecipientContextImpl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/consts.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$encryptionContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/encryptionContext.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$mutex$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/mutex.js [app-ssr] (ecmascript)");
var __classPrivateFieldGet = ("TURBOPACK compile-time value", void 0) && ("TURBOPACK compile-time value", void 0).__classPrivateFieldGet || function(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = ("TURBOPACK compile-time value", void 0) && ("TURBOPACK compile-time value", void 0).__classPrivateFieldSet || function(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var _RecipientContextImpl_mutex;
;
;
;
class RecipientContextImpl extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$encryptionContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EncryptionContextImpl"] {
    constructor(){
        super(...arguments);
        _RecipientContextImpl_mutex.set(this, void 0);
    }
    async open(data, aad = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"].buffer) {
        __classPrivateFieldSet(this, _RecipientContextImpl_mutex, __classPrivateFieldGet(this, _RecipientContextImpl_mutex, "f") ?? new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$mutex$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mutex"](), "f");
        const release = await __classPrivateFieldGet(this, _RecipientContextImpl_mutex, "f").lock();
        let pt;
        try {
            pt = await this._ctx.key.open(this.computeNonce(this._ctx), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(data), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(aad));
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OpenError"](e);
        } finally{
            release();
        }
        this.incrementSeq(this._ctx);
        return pt;
    }
}
_RecipientContextImpl_mutex = new WeakMap();
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/senderContext.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SenderContextImpl",
    ()=>SenderContextImpl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/consts.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/errors.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/kdfs/hkdf.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$encryptionContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/encryptionContext.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$mutex$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/mutex.js [app-ssr] (ecmascript)");
var __classPrivateFieldGet = ("TURBOPACK compile-time value", void 0) && ("TURBOPACK compile-time value", void 0).__classPrivateFieldGet || function(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = ("TURBOPACK compile-time value", void 0) && ("TURBOPACK compile-time value", void 0).__classPrivateFieldSet || function(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var _SenderContextImpl_mutex;
;
;
;
class SenderContextImpl extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$encryptionContext$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EncryptionContextImpl"] {
    constructor(api, kdf, params, enc){
        super(api, kdf, params);
        Object.defineProperty(this, "enc", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        _SenderContextImpl_mutex.set(this, void 0);
        this.enc = enc;
    }
    async seal(data, aad = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$consts$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EMPTY"].buffer) {
        __classPrivateFieldSet(this, _SenderContextImpl_mutex, __classPrivateFieldGet(this, _SenderContextImpl_mutex, "f") ?? new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$mutex$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mutex"](), "f");
        const release = await __classPrivateFieldGet(this, _SenderContextImpl_mutex, "f").lock();
        let ct;
        try {
            ct = await this._ctx.key.seal(this.computeNonce(this._ctx), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(data), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$kdfs$2f$hkdf$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toArrayBuffer"])(aad));
        } catch (e) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SealError"](e);
        } finally{
            release();
        }
        this.incrementSeq(this._ctx);
        return ct;
    }
}
_SenderContextImpl_mutex = new WeakMap();
}),
"[project]/sdk/js/node_modules/@hpke/core/esm/src/utils/emitNotSupported.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "emitNotSupported",
    ()=>emitNotSupported
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$mod$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/mod.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/common/esm/src/errors.js [app-ssr] (ecmascript)");
;
function emitNotSupported() {
    return new Promise((_resolve, reject)=>{
        reject(new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$common$2f$esm$2f$src$2f$errors$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NotSupportedError"]("Not supported"));
    });
}
}),
"[project]/sdk/js/node_modules/@noble/ciphers/_arx.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "_XorStreamPRG",
    ()=>_XorStreamPRG,
    "createCipher",
    ()=>createCipher,
    "createPRG",
    ()=>createPRG,
    "rotl",
    ()=>rotl
]);
/**
 * Basic utils for ARX (add-rotate-xor) salsa and chacha ciphers.

RFC8439 requires multi-step cipher stream, where
authKey starts with counter: 0, actual msg with counter: 1.

For this, we need a way to re-use nonce / counter:

    const counter = new Uint8Array(4);
    chacha(..., counter, ...); // counter is now 1
    chacha(..., counter, ...); // counter is now 2

This is complicated:

- 32-bit counters are enough, no need for 64-bit: max ArrayBuffer size in JS is 4GB
- Original papers don't allow mutating counters
- Counter overflow is undefined [^1]
- Idea A: allow providing (nonce | counter) instead of just nonce, re-use it
- Caveat: Cannot be re-used through all cases:
- * chacha has (counter | nonce)
- * xchacha has (nonce16 | counter | nonce16)
- Idea B: separate nonce / counter and provide separate API for counter re-use
- Caveat: there are different counter sizes depending on an algorithm.
- salsa & chacha also differ in structures of key & sigma:
  salsa20:      s[0] | k(4) | s[1] | nonce(2) | cnt(2) | s[2] | k(4) | s[3]
  chacha:       s(4) | k(8) | cnt(1) | nonce(3)
  chacha20orig: s(4) | k(8) | cnt(2) | nonce(2)
- Idea C: helper method such as `setSalsaState(key, nonce, sigma, data)`
- Caveat: we can't re-use counter array

xchacha uses the subkey and remaining 8 byte nonce with ChaCha20 as normal
(prefixed by 4 NUL bytes, since RFC8439 specifies a 12-byte nonce).
Counter overflow is undefined; see {@link https://mailarchive.ietf.org/arch/msg/cfrg/gsOnTJzcbgG6OqD8Sc0GO5aR_tU/ | the CFRG thread}.
Current noble policy is strict non-wrap for the shared 32-bit counter path:
exported ARX ciphers reject initial `0xffffffff` and stop before any implicit
wrap back to zero.
See {@link https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha#appendix-A.2 | the XChaCha appendix} for the extended-nonce construction.

 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/ciphers/utils.js [app-ssr] (ecmascript)");
;
// Replaces `TextEncoder` for ASCII literals, which is enough for sigma constants.
// Non-ASCII input would not match UTF-8 `TextEncoder` output.
const encodeStr = (str)=>Uint8Array.from(str.split(''), (c)=>c.charCodeAt(0));
// Raw `createCipher(...)` exports consume these native-endian `u32(...)` views directly.
// Public `wrapCipher(...)` APIs reject non-little-endian platforms before reaching this path.
// RFC 8439 §2.3 / RFC 7539 §2.3 only define the 256-bit-key constants; this 16-byte sigma is
// kept for legacy allowShortKeys Salsa/ChaCha variants.
const sigma16_32 = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(encodeStr('expand 16-byte k'))))();
// RFC 8439 §2.3 / RFC 7539 §2.3 define words 0-3 as
// `0x61707865 0x3320646e 0x79622d32 0x6b206574`, i.e. `expand 32-byte k`.
const sigma32_32 = /* @__PURE__ */ (()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(encodeStr('expand 32-byte k'))))();
function rotl(a, b) {
    return a << b | a >>> 32 - b;
}
// Salsa and Chacha block length is always 512-bit
const BLOCK_LEN = 64;
// RFC 8439 §2.2 / RFC 7539 §2.2: the ChaCha state has 16 32-bit words.
const BLOCK_LEN32 = 16;
// Counter policy for the shared public `counter` argument:
// - RFC/IETF ChaCha20 uses a 32-bit counter.
// - OpenSSL/Node `chacha20` instead treat the full 16-byte IV as a 128-bit
//   counter state and carry into the next word.
// - Raw `chacha20orig`, `salsa20`, `xsalsa20`, and `xchacha20` use 64-bit counters in libsodium
//   and libtomcrypt, while some libs (for example libtomcrypt's RFC/IETF path) reject the max
//   boundary instead of carrying.
// - AEAD wrappers diverge too: libsodium `xchacha20poly1305` uses the IETF payload counter from
//   block 1, while `secretstream_xchacha20poly1305` is a different protocol with rekey/reset.
// Noble intentionally throws instead of silently picking one wrap model for users. In the default
// path, even a 32-bit boundary would take 2^32 blocks * 64 bytes = 256 GiB, which is practically
// unreachable for normal JS callers; advanced users who pass `counter` explicitly can implement
// whatever wider carry / wrap policy they need on top.
const MAX_COUNTER = /* @__PURE__ */ (()=>2 ** 32 - 1)();
const U32_EMPTY = /* @__PURE__ */ Uint32Array.of();
function runCipher(core, sigma, key, nonce, data, output, counter, rounds) {
    const len = data.length;
    const block = new Uint8Array(BLOCK_LEN);
    const b32 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(block);
    // Make sure that buffers aligned to 4 bytes
    const isAligned = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLE"] && (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAligned32"])(data) && (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAligned32"])(output);
    const d32 = isAligned ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(data) : U32_EMPTY;
    const o32 = isAligned ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(output) : U32_EMPTY;
    // RFC 8439 §2.4.1 / RFC 7539 §2.4.1 allow XORing one keystream block at a time and
    // truncating the final partial block instead of materializing the whole keystream.
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLE"]) {
        for(let pos = 0; pos < len; counter++){
            core(sigma, key, nonce, b32, counter, rounds);
            // RFC 8439 §2.4 / RFC 7539 §2.4 serialize keystream words in little-endian order.
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])(b32);
            if (counter >= MAX_COUNTER) throw new Error('arx: counter overflow');
            const take = Math.min(BLOCK_LEN, len - pos);
            for(let j = 0, posj; j < take; j++){
                posj = pos + j;
                output[posj] = data[posj] ^ block[j];
            }
            pos += take;
        }
        return;
    }
    for(let pos = 0; pos < len; counter++){
        core(sigma, key, nonce, b32, counter, rounds);
        // See MAX_COUNTER policy note above: never silently wrap the shared public counter.
        if (counter >= MAX_COUNTER) throw new Error('arx: counter overflow');
        const take = Math.min(BLOCK_LEN, len - pos);
        // aligned to 4 bytes
        if (isAligned && take === BLOCK_LEN) {
            const pos32 = pos / 4;
            if (pos % 4 !== 0) throw new Error('arx: invalid block position');
            for(let j = 0, posj; j < BLOCK_LEN32; j++){
                posj = pos32 + j;
                o32[posj] = d32[posj] ^ b32[j];
            }
            pos += BLOCK_LEN;
            continue;
        }
        for(let j = 0, posj; j < take; j++){
            posj = pos + j;
            output[posj] = data[posj] ^ block[j];
        }
        pos += take;
    }
}
function createCipher(core, opts) {
    const { allowShortKeys, extendNonceFn, counterLength, counterRight, rounds } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["checkOpts"])({
        allowShortKeys: false,
        counterLength: 8,
        counterRight: false,
        rounds: 20
    }, opts);
    if (typeof core !== 'function') throw new Error('core must be a function');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(counterLength);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(rounds);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abool"])(counterRight);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abool"])(allowShortKeys);
    return (key, nonce, data, output, counter = 0)=>{
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(key, undefined, 'key');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(nonce, undefined, 'nonce');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(data, undefined, 'data');
        const len = data.length;
        // Raw XorStream APIs return ciphertext/plaintext bytes directly, so caller-provided outputs
        // must match the logical result length exactly instead of returning an oversized workspace.
        const hasOutput = output !== undefined;
        output = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getOutput"])(len, output, false);
        if (hasOutput) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["complexOverlapBytes"])(data, output);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(counter);
        // See MAX_COUNTER policy note above: reject advanced explicit-counter requests before any wrap.
        if (counter < 0 || counter >= MAX_COUNTER) throw new Error('arx: counter overflow');
        const toClean = [];
        // Key & sigma
        // key=16 -> sigma16, k=key|key
        // key=32 -> sigma32, k=key
        let l = key.length;
        let k;
        let sigma;
        if (l === 32) {
            // Copy caller keys too: big-endian normalization, extended-nonce subkey derivation, and
            // final clean(...) all mutate or wipe the temporary buffer in place.
            toClean.push(k = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(key));
            sigma = sigma32_32;
        } else if (l === 16 && allowShortKeys) {
            k = new Uint8Array(32);
            k.set(key);
            k.set(key, 16);
            sigma = sigma16_32;
            toClean.push(k);
        } else {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(key, 32, 'arx key');
            throw new Error('invalid key size');
        // throw new Error(`"arx key" expected Uint8Array of length 32, got length=${l}`);
        }
        // Nonce
        // salsa20:      8   (8-byte counter)
        // chacha20orig: 8   (8-byte counter)
        // chacha20:     12  (4-byte counter)
        // xsalsa20:     24  (16 -> hsalsa,  8 -> old nonce)
        // xchacha20:    24  (16 -> hchacha, 8 -> old nonce)
        // Copy before taking u32(...) views on misaligned inputs, and on big-endian so later
        // swap32IfBE(...) never mutates caller nonce bytes in place.
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLE"] || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAligned32"])(nonce)) toClean.push(nonce = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(nonce));
        let k32 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(k);
        // hsalsa & hchacha: handle extended nonce
        if (extendNonceFn) {
            if (nonce.length !== 24) throw new Error('arx: extended nonce must be 24 bytes');
            const n16 = nonce.subarray(0, 16);
            if (__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLE"]) extendNonceFn(sigma, k32, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(n16), k32);
            else {
                const sigmaRaw = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])(Uint32Array.from(sigma));
                extendNonceFn(sigmaRaw, k32, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(n16), k32);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(sigmaRaw);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])(k32);
            }
            nonce = nonce.subarray(16);
        } else if (!__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLE"]) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])(k32);
        // Handle nonce counter
        const nonceNcLen = 16 - counterLength;
        if (nonceNcLen !== nonce.length) throw new Error(`arx: nonce must be ${nonceNcLen} or 16 bytes`);
        // Normalize 64-bit-nonce layouts to the 12-byte core input: ChaCha/XChaCha prefix 4 zero
        // counter bytes, while Salsa/XSalsa append them after the nonce words.
        if (nonceNcLen !== 12) {
            const nc = new Uint8Array(12);
            nc.set(nonce, counterRight ? 0 : 12 - nonce.length);
            nonce = nc;
            toClean.push(nonce);
        }
        const n32 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u32"])(nonce));
        // Ensure temporary key/nonce copies are wiped even if the remaining
        // runtime guard in runCipher(...) throws on counter overflow.
        try {
            runCipher(core, sigma, k32, n32, data, output, counter, rounds);
            return output;
        } finally{
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(...toClean);
        }
    };
}
class _XorStreamPRG {
    blockLen;
    keyLen;
    nonceLen;
    state;
    buf;
    key;
    nonce;
    pos;
    ctr;
    cipher;
    destroyed = false;
    constructor(cipher, blockLen, keyLen, nonceLen, seed){
        this.cipher = cipher;
        this.blockLen = blockLen;
        this.keyLen = keyLen;
        this.nonceLen = nonceLen;
        this.state = new Uint8Array(this.keyLen + this.nonceLen);
        this.reseed(seed);
        this.ctr = 0;
        this.pos = this.blockLen;
        this.buf = new Uint8Array(this.blockLen);
        // Keep a single key||nonce backing buffer so reseed/addEntropy/clean update the live cipher
        // inputs in place through these subarray views.
        this.key = this.state.subarray(0, this.keyLen);
        this.nonce = this.state.subarray(this.keyLen);
    }
    reseed(seed) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(seed, undefined, 'seed');
        if (!seed || seed.length === 0) throw new Error('entropy required');
        // Mix variable-length entropy cyclically across the whole key||nonce state, then restart the
        // keystream so buffered leftovers from the previous state are never reused.
        for(let i = 0; i < seed.length; i++)this.state[i % this.state.length] ^= seed[i];
        this.ctr = 0;
        this.pos = this.blockLen;
    }
    addEntropy(seed) {
        if (this.destroyed) throw new Error('cannot use destroyed PRG');
        // Reject empty entropy before re-keying, otherwise a throwing call would still advance state.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(seed, undefined, 'seed');
        if (seed.length === 0) throw new Error('entropy required');
        // Re-key from the current stream first, then mix external entropy into the fresh key||nonce
        // state through reseed() so stale buffered bytes are discarded.
        this.state.set(this.randomBytes(this.state.length));
        this.reseed(seed);
    }
    randomBytes(len) {
        if (this.destroyed) throw new Error('cannot use destroyed PRG');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(len);
        if (len === 0) return new Uint8Array(0);
        const avail = this.pos < this.blockLen ? this.blockLen - this.pos : 0;
        const blocks = Math.ceil(Math.max(0, len - avail) / this.blockLen);
        // Preflight overflow so failed reads don't partially consume keystream
        // and leave the PRG repeating blocks.
        if (blocks > 0 && this.ctr > MAX_COUNTER - blocks) throw new Error('arx: counter overflow');
        const out = new Uint8Array(len);
        let outPos = 0;
        // `out` starts zero-filled, and `buf.fill(0)` below does the same for leftovers: XOR-stream
        // ciphers then emit raw keystream bytes directly into those buffers.
        // Serve buffered leftovers first so split reads stay identical to one larger read.
        if (this.pos < this.blockLen) {
            const take = Math.min(len, this.blockLen - this.pos);
            out.set(this.buf.subarray(this.pos, this.pos + take), 0);
            this.pos += take;
            outPos += take;
            if (outPos === len) return out; // fast path
        }
        // Full blocks directly to out
        const full = Math.floor((len - outPos) / this.blockLen);
        if (full > 0) {
            const blockBytes = full * this.blockLen;
            const b = out.subarray(outPos, outPos + blockBytes);
            this.cipher(this.key, this.nonce, b, b, this.ctr);
            this.ctr += full;
            outPos += blockBytes;
        }
        // Save leftovers
        const left = len - outPos;
        if (left > 0) {
            this.buf.fill(0);
            // NOTE: cipher will handle overflow
            this.cipher(this.key, this.nonce, this.buf, this.buf, this.ctr++);
            out.set(this.buf.subarray(0, left), outPos);
            this.pos = left;
        }
        return out;
    }
    // Clone seeds the new instance from this stream, so the source PRG advances too.
    clone() {
        if (this.destroyed) throw new Error('cannot use destroyed PRG');
        return new _XorStreamPRG(this.cipher, this.blockLen, this.keyLen, this.nonceLen, this.randomBytes(this.state.length));
    }
    // Zeroes the current state, leftover buffer, and marks the instance destroyed.
    // The instance fails closed: any later randomBytes()/addEntropy()/clone() throws instead
    // of silently continuing from zero key||nonce state (which would yield predictable output).
    clean() {
        this.pos = 0;
        this.ctr = 0;
        this.buf.fill(0);
        this.state.fill(0);
        this.destroyed = true;
    }
}
const createPRG = (cipher, blockLen, keyLen, nonceLen)=>{
    return (seed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["randomBytes"])(32))=>new _XorStreamPRG(cipher, blockLen, keyLen, nonceLen, seed);
};
}),
"[project]/sdk/js/node_modules/@noble/ciphers/_poly1305.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Poly1305",
    ()=>Poly1305,
    "poly1305",
    ()=>poly1305
]);
/**
 * Poly1305 ({@link https://cr.yp.to/mac/poly1305-20050329.pdf | PDF},
 * {@link https://en.wikipedia.org/wiki/Poly1305 | wiki})
 * is a fast and parallel secret-key message-authentication code suitable for
 * a wide variety of applications. It was standardized in
 * {@link https://www.rfc-editor.org/rfc/rfc8439 | RFC 8439} and is now used in TLS 1.3.
 *
 * Polynomial MACs are not perfect for every situation:
 * they lack Random Key Robustness: the MAC can be forged, and can't be used in PAKE schemes.
 * See {@link https://keymaterial.net/2020/09/07/invisible-salamanders-in-aes-gcm-siv/ | the invisible salamanders attack writeup}.
 * To combat invisible salamanders, `hash(key)` can be included in ciphertext,
 * however, this would violate ciphertext indistinguishability:
 * an attacker would know which key was used - so `HKDF(key, i)`
 * could be used instead.
 *
 * Check out the {@link https://cr.yp.to/mac.html | original website}.
 * Based on public-domain {@link https://github.com/floodyberry/poly1305-donna | poly1305-donna}.
 * @module
 */ // prettier-ignore
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/ciphers/utils.js [app-ssr] (ecmascript)");
;
// A simple-loop reference version (`poly1305_small`) lives in
// `test/misc/micro-ciphers.ts`, provided for auditability.
// Little-endian 2-byte load used by the Poly1305 limb decomposition.
function u8to16(a, i) {
    return a[i++] & 0xff | (a[i++] & 0xff) << 8;
}
class Poly1305 {
    blockLen = 16;
    outputLen = 16;
    buffer = new Uint8Array(16);
    r = new Uint16Array(10);
    h = new Uint16Array(10);
    pad = new Uint16Array(8);
    pos = 0;
    finished = false;
    destroyed = false;
    // Can be speed-up using BigUint64Array, at the cost of complexity
    constructor(key){
        key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(key, 32, 'key'));
        const t0 = u8to16(key, 0);
        const t1 = u8to16(key, 2);
        const t2 = u8to16(key, 4);
        const t3 = u8to16(key, 6);
        const t4 = u8to16(key, 8);
        const t5 = u8to16(key, 10);
        const t6 = u8to16(key, 12);
        const t7 = u8to16(key, 14);
        // RFC 8439 §2.5.1 / RFC 7539 §2.5.1 clamp r before multiplication.
        // These masks unpack that clamped value into 13-bit limbs, while pad
        // keeps the raw s half for finalize().
        // {@link https://github.com/floodyberry/poly1305-donna/blob/e6ad6e091d30d7f4ec2d4f978be1fcfcbce72781/poly1305-donna-16.h#L47 | poly1305-donna reference}
        this.r[0] = t0 & 0x1fff;
        this.r[1] = (t0 >>> 13 | t1 << 3) & 0x1fff;
        this.r[2] = (t1 >>> 10 | t2 << 6) & 0x1f03;
        this.r[3] = (t2 >>> 7 | t3 << 9) & 0x1fff;
        this.r[4] = (t3 >>> 4 | t4 << 12) & 0x00ff;
        this.r[5] = t4 >>> 1 & 0x1ffe;
        this.r[6] = (t4 >>> 14 | t5 << 2) & 0x1fff;
        this.r[7] = (t5 >>> 11 | t6 << 5) & 0x1f81;
        this.r[8] = (t6 >>> 8 | t7 << 8) & 0x1fff;
        this.r[9] = t7 >>> 5 & 0x007f;
        for(let i = 0; i < 8; i++)this.pad[i] = u8to16(key, 16 + 2 * i);
    }
    process(data, offset, isLast = false) {
        // RFC 8439 §2.5 / §2.5.1 and RFC 7539 §2.5 / §2.5.1 add an extra high
        // bit to every full 16-byte block. The final partial block gets its
        // explicit `1` byte during digestInto(), so `hibit` stays zero there.
        const hibit = isLast ? 0 : 1 << 11;
        const { h, r } = this;
        const r0 = r[0];
        const r1 = r[1];
        const r2 = r[2];
        const r3 = r[3];
        const r4 = r[4];
        const r5 = r[5];
        const r6 = r[6];
        const r7 = r[7];
        const r8 = r[8];
        const r9 = r[9];
        const t0 = u8to16(data, offset + 0);
        const t1 = u8to16(data, offset + 2);
        const t2 = u8to16(data, offset + 4);
        const t3 = u8to16(data, offset + 6);
        const t4 = u8to16(data, offset + 8);
        const t5 = u8to16(data, offset + 10);
        const t6 = u8to16(data, offset + 12);
        const t7 = u8to16(data, offset + 14);
        let h0 = h[0] + (t0 & 0x1fff);
        let h1 = h[1] + ((t0 >>> 13 | t1 << 3) & 0x1fff);
        let h2 = h[2] + ((t1 >>> 10 | t2 << 6) & 0x1fff);
        let h3 = h[3] + ((t2 >>> 7 | t3 << 9) & 0x1fff);
        let h4 = h[4] + ((t3 >>> 4 | t4 << 12) & 0x1fff);
        let h5 = h[5] + (t4 >>> 1 & 0x1fff);
        let h6 = h[6] + ((t4 >>> 14 | t5 << 2) & 0x1fff);
        let h7 = h[7] + ((t5 >>> 11 | t6 << 5) & 0x1fff);
        let h8 = h[8] + ((t6 >>> 8 | t7 << 8) & 0x1fff);
        let h9 = h[9] + (t7 >>> 5 | hibit);
        let c = 0;
        let d0 = c + h0 * r0 + h1 * (5 * r9) + h2 * (5 * r8) + h3 * (5 * r7) + h4 * (5 * r6);
        c = d0 >>> 13;
        d0 &= 0x1fff;
        d0 += h5 * (5 * r5) + h6 * (5 * r4) + h7 * (5 * r3) + h8 * (5 * r2) + h9 * (5 * r1);
        c += d0 >>> 13;
        d0 &= 0x1fff;
        let d1 = c + h0 * r1 + h1 * r0 + h2 * (5 * r9) + h3 * (5 * r8) + h4 * (5 * r7);
        c = d1 >>> 13;
        d1 &= 0x1fff;
        d1 += h5 * (5 * r6) + h6 * (5 * r5) + h7 * (5 * r4) + h8 * (5 * r3) + h9 * (5 * r2);
        c += d1 >>> 13;
        d1 &= 0x1fff;
        let d2 = c + h0 * r2 + h1 * r1 + h2 * r0 + h3 * (5 * r9) + h4 * (5 * r8);
        c = d2 >>> 13;
        d2 &= 0x1fff;
        d2 += h5 * (5 * r7) + h6 * (5 * r6) + h7 * (5 * r5) + h8 * (5 * r4) + h9 * (5 * r3);
        c += d2 >>> 13;
        d2 &= 0x1fff;
        let d3 = c + h0 * r3 + h1 * r2 + h2 * r1 + h3 * r0 + h4 * (5 * r9);
        c = d3 >>> 13;
        d3 &= 0x1fff;
        d3 += h5 * (5 * r8) + h6 * (5 * r7) + h7 * (5 * r6) + h8 * (5 * r5) + h9 * (5 * r4);
        c += d3 >>> 13;
        d3 &= 0x1fff;
        let d4 = c + h0 * r4 + h1 * r3 + h2 * r2 + h3 * r1 + h4 * r0;
        c = d4 >>> 13;
        d4 &= 0x1fff;
        d4 += h5 * (5 * r9) + h6 * (5 * r8) + h7 * (5 * r7) + h8 * (5 * r6) + h9 * (5 * r5);
        c += d4 >>> 13;
        d4 &= 0x1fff;
        let d5 = c + h0 * r5 + h1 * r4 + h2 * r3 + h3 * r2 + h4 * r1;
        c = d5 >>> 13;
        d5 &= 0x1fff;
        d5 += h5 * r0 + h6 * (5 * r9) + h7 * (5 * r8) + h8 * (5 * r7) + h9 * (5 * r6);
        c += d5 >>> 13;
        d5 &= 0x1fff;
        let d6 = c + h0 * r6 + h1 * r5 + h2 * r4 + h3 * r3 + h4 * r2;
        c = d6 >>> 13;
        d6 &= 0x1fff;
        d6 += h5 * r1 + h6 * r0 + h7 * (5 * r9) + h8 * (5 * r8) + h9 * (5 * r7);
        c += d6 >>> 13;
        d6 &= 0x1fff;
        let d7 = c + h0 * r7 + h1 * r6 + h2 * r5 + h3 * r4 + h4 * r3;
        c = d7 >>> 13;
        d7 &= 0x1fff;
        d7 += h5 * r2 + h6 * r1 + h7 * r0 + h8 * (5 * r9) + h9 * (5 * r8);
        c += d7 >>> 13;
        d7 &= 0x1fff;
        let d8 = c + h0 * r8 + h1 * r7 + h2 * r6 + h3 * r5 + h4 * r4;
        c = d8 >>> 13;
        d8 &= 0x1fff;
        d8 += h5 * r3 + h6 * r2 + h7 * r1 + h8 * r0 + h9 * (5 * r9);
        c += d8 >>> 13;
        d8 &= 0x1fff;
        let d9 = c + h0 * r9 + h1 * r8 + h2 * r7 + h3 * r6 + h4 * r5;
        c = d9 >>> 13;
        d9 &= 0x1fff;
        d9 += h5 * r4 + h6 * r3 + h7 * r2 + h8 * r1 + h9 * r0;
        c += d9 >>> 13;
        d9 &= 0x1fff;
        c = (c << 2) + c | 0;
        c = c + d0 | 0;
        d0 = c & 0x1fff;
        c = c >>> 13;
        d1 += c;
        h[0] = d0;
        h[1] = d1;
        h[2] = d2;
        h[3] = d3;
        h[4] = d4;
        h[5] = d5;
        h[6] = d6;
        h[7] = d7;
        h[8] = d8;
        h[9] = d9;
    }
    finalize() {
        const { h, pad } = this;
        const g = new Uint16Array(10);
        let c = h[1] >>> 13;
        h[1] &= 0x1fff;
        for(let i = 2; i < 10; i++){
            h[i] += c;
            c = h[i] >>> 13;
            h[i] &= 0x1fff;
        }
        h[0] += c * 5;
        c = h[0] >>> 13;
        h[0] &= 0x1fff;
        h[1] += c;
        c = h[1] >>> 13;
        h[1] &= 0x1fff;
        h[2] += c;
        // RFC 8439 §2.5 / RFC 7539 §2.5 reduce modulo 2^130-5 before repacking
        // to 16-bit words and adding the raw s half.
        g[0] = h[0] + 5;
        c = g[0] >>> 13;
        g[0] &= 0x1fff;
        for(let i = 1; i < 10; i++){
            g[i] = h[i] + c;
            c = g[i] >>> 13;
            g[i] &= 0x1fff;
        }
        g[9] -= 1 << 13;
        let mask = (c ^ 1) - 1;
        for(let i = 0; i < 10; i++)g[i] &= mask;
        mask = ~mask;
        for(let i = 0; i < 10; i++)h[i] = h[i] & mask | g[i];
        h[0] = (h[0] | h[1] << 13) & 0xffff;
        h[1] = (h[1] >>> 3 | h[2] << 10) & 0xffff;
        h[2] = (h[2] >>> 6 | h[3] << 7) & 0xffff;
        h[3] = (h[3] >>> 9 | h[4] << 4) & 0xffff;
        h[4] = (h[4] >>> 12 | h[5] << 1 | h[6] << 14) & 0xffff;
        h[5] = (h[6] >>> 2 | h[7] << 11) & 0xffff;
        h[6] = (h[7] >>> 5 | h[8] << 8) & 0xffff;
        h[7] = (h[8] >>> 8 | h[9] << 5) & 0xffff;
        let f = h[0] + pad[0];
        h[0] = f & 0xffff;
        for(let i = 1; i < 8; i++){
            f = (h[i] + pad[i] | 0) + (f >>> 16) | 0;
            h[i] = f & 0xffff;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(g);
    }
    update(data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aexists"])(this);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(data);
        data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copyBytes"])(data);
        const { buffer, blockLen } = this;
        const len = data.length;
        for(let pos = 0; pos < len;){
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input
            if (take === blockLen) {
                for(; blockLen <= len - pos; pos += blockLen)this.process(data, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(buffer, 0, false);
                this.pos = 0;
            }
        }
        return this;
    }
    destroy() {
        // `aexists(this)` guards update/digest paths, so destroy must mark the instance unusable too.
        this.destroyed = true;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(this.h, this.r, this.buffer, this.pad);
    }
    digestInto(out) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aexists"])(this);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aoutput"])(out, this);
        this.finished = true;
        const { buffer, h } = this;
        let { pos } = this;
        if (pos) {
            // RFC 8439 §2.5 / RFC 7539 §2.5: the final short block appends a
            // single `0x01` byte and zero-fills the remaining bytes before the
            // last multiplication step.
            buffer[pos++] = 1;
            for(; pos < 16; pos++)buffer[pos] = 0;
            this.process(buffer, 0, true);
        }
        this.finalize();
        let opos = 0;
        for(let i = 0; i < 8; i++){
            out[opos++] = h[i] >>> 0;
            out[opos++] = h[i] >>> 8;
        }
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        // Copy out before destroy() zeroes the internal buffer.
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
}
const poly1305 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["wrapMacConstructor"])(32, (key)=>new Poly1305(key));
}),
"[project]/sdk/js/node_modules/@noble/ciphers/chacha.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__TESTS",
    ()=>__TESTS,
    "_poly1305_aead",
    ()=>_poly1305_aead,
    "chacha12",
    ()=>chacha12,
    "chacha20",
    ()=>chacha20,
    "chacha20orig",
    ()=>chacha20orig,
    "chacha20poly1305",
    ()=>chacha20poly1305,
    "chacha8",
    ()=>chacha8,
    "hchacha",
    ()=>hchacha,
    "rngChacha20",
    ()=>rngChacha20,
    "rngChacha8",
    ()=>rngChacha8,
    "xchacha20",
    ()=>xchacha20,
    "xchacha20poly1305",
    ()=>xchacha20poly1305
]);
/**
 * ChaCha stream cipher, released
 * in 2008. Developed after Salsa20, ChaCha aims to increase diffusion per round.
 * It was standardized in
 * {@link https://www.rfc-editor.org/rfc/rfc8439 | RFC 8439} and
 * is now used in TLS 1.3.
 *
 * {@link https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha | XChaCha20}
 * extended-nonce variant is also provided. Similar to XSalsa, it's safe to use with
 * randomly-generated nonces.
 *
 * Check out
 * {@link http://cr.yp.to/chacha/chacha-20080128.pdf | PDF},
 * {@link https://en.wikipedia.org/wiki/Salsa20 | wiki}, and
 * {@link https://cr.yp.to/chacha.html | website}.
 *
 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/ciphers/_arx.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_poly1305$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/ciphers/_poly1305.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/ciphers/utils.js [app-ssr] (ecmascript)");
;
;
;
/**
 * ChaCha core function. Uses an unrolled loop (chachaCore, hchacha) - 4x
 * faster than a simple loop, but larger & harder to read. A simple-loop
 * reference version lives in `test/misc/micro-ciphers.ts`;
 * `test/arx.test.ts` keeps the two aligned.
 * The specific implementation is selected in `createCipher` below.
 */ /** RFC 8439 §2.3 block core for `state = constants | key | counter | nonce`. */ // prettier-ignore
function chachaCore(s, k, n, out, cnt, rounds = 20) {
    let y00 = s[0], y01 = s[1], y02 = s[2], y03 = s[3], y04 = k[0], y05 = k[1], y06 = k[2], y07 = k[3], y08 = k[4], y09 = k[5], y10 = k[6], y11 = k[7], y12 = cnt, y13 = n[0], y14 = n[1], y15 = n[2]; // Counter  Nonce   Nonce   Nonce
    // Save state to temporary variables
    let x00 = y00, x01 = y01, x02 = y02, x03 = y03, x04 = y04, x05 = y05, x06 = y06, x07 = y07, x08 = y08, x09 = y09, x10 = y10, x11 = y11, x12 = y12, x13 = y13, x14 = y14, x15 = y15;
    for(let r = 0; r < rounds; r += 2){
        x00 = x00 + x04 | 0;
        x12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x12 ^ x00, 16);
        x08 = x08 + x12 | 0;
        x04 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x04 ^ x08, 12);
        x00 = x00 + x04 | 0;
        x12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x12 ^ x00, 8);
        x08 = x08 + x12 | 0;
        x04 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x04 ^ x08, 7);
        x01 = x01 + x05 | 0;
        x13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x13 ^ x01, 16);
        x09 = x09 + x13 | 0;
        x05 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x05 ^ x09, 12);
        x01 = x01 + x05 | 0;
        x13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x13 ^ x01, 8);
        x09 = x09 + x13 | 0;
        x05 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x05 ^ x09, 7);
        x02 = x02 + x06 | 0;
        x14 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x14 ^ x02, 16);
        x10 = x10 + x14 | 0;
        x06 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x06 ^ x10, 12);
        x02 = x02 + x06 | 0;
        x14 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x14 ^ x02, 8);
        x10 = x10 + x14 | 0;
        x06 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x06 ^ x10, 7);
        x03 = x03 + x07 | 0;
        x15 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x15 ^ x03, 16);
        x11 = x11 + x15 | 0;
        x07 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x07 ^ x11, 12);
        x03 = x03 + x07 | 0;
        x15 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x15 ^ x03, 8);
        x11 = x11 + x15 | 0;
        x07 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x07 ^ x11, 7);
        x00 = x00 + x05 | 0;
        x15 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x15 ^ x00, 16);
        x10 = x10 + x15 | 0;
        x05 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x05 ^ x10, 12);
        x00 = x00 + x05 | 0;
        x15 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x15 ^ x00, 8);
        x10 = x10 + x15 | 0;
        x05 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x05 ^ x10, 7);
        x01 = x01 + x06 | 0;
        x12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x12 ^ x01, 16);
        x11 = x11 + x12 | 0;
        x06 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x06 ^ x11, 12);
        x01 = x01 + x06 | 0;
        x12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x12 ^ x01, 8);
        x11 = x11 + x12 | 0;
        x06 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x06 ^ x11, 7);
        x02 = x02 + x07 | 0;
        x13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x13 ^ x02, 16);
        x08 = x08 + x13 | 0;
        x07 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x07 ^ x08, 12);
        x02 = x02 + x07 | 0;
        x13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x13 ^ x02, 8);
        x08 = x08 + x13 | 0;
        x07 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x07 ^ x08, 7);
        x03 = x03 + x04 | 0;
        x14 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x14 ^ x03, 16);
        x09 = x09 + x14 | 0;
        x04 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x04 ^ x09, 12);
        x03 = x03 + x04 | 0;
        x14 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x14 ^ x03, 8);
        x09 = x09 + x14 | 0;
        x04 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotl"])(x04 ^ x09, 7);
    }
    // RFC 8439 §2.3 / §2.3.1: add the original state words back in state order.
    let oi = 0;
    out[oi++] = y00 + x00 | 0;
    out[oi++] = y01 + x01 | 0;
    out[oi++] = y02 + x02 | 0;
    out[oi++] = y03 + x03 | 0;
    out[oi++] = y04 + x04 | 0;
    out[oi++] = y05 + x05 | 0;
    out[oi++] = y06 + x06 | 0;
    out[oi++] = y07 + x07 | 0;
    out[oi++] = y08 + x08 | 0;
    out[oi++] = y09 + x09 | 0;
    out[oi++] = y10 + x10 | 0;
    out[oi++] = y11 + x11 | 0;
    out[oi++] = y12 + x12 | 0;
    out[oi++] = y13 + x13 | 0;
    out[oi++] = y14 + x14 | 0;
    out[oi++] = y15 + x15 | 0;
}
function hchacha(s, k, i, out) {
    // Runs the shared chachaCore permutation, then subtracts the RFC 8439 feed-forward
    // it applies, recovering the raw permutation words hchacha needs.
    // LE hosts read the caller arrays in place (no copies); BE hosts get
    // byte-swapped scratch copies, wiped before returning.
    const s2 = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLE"] ? s : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])(s.slice(0, 4));
    const k2 = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLE"] ? k : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])(k.slice(0, 8));
    const i2 = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLE"] ? i : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])(i.slice(0, 4));
    const t = new Uint32Array(16);
    chachaCore(s2, k2, i2.subarray(1), t, i2[0]);
    let oi = 0;
    out[oi++] = t[0] - s2[0] | 0;
    out[oi++] = t[1] - s2[1] | 0;
    out[oi++] = t[2] - s2[2] | 0;
    out[oi++] = t[3] - s2[3] | 0;
    out[oi++] = t[12] - i2[0] | 0;
    out[oi++] = t[13] - i2[1] | 0;
    out[oi++] = t[14] - i2[2] | 0;
    out[oi++] = t[15] - i2[3] | 0;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["swap32IfBE"])(out);
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isLE"]) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(s2, k2, i2);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(t);
}
const chacha20orig = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createCipher"])(chachaCore, {
    counterRight: false,
    counterLength: 8,
    allowShortKeys: true
});
const chacha20 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createCipher"])(chachaCore, {
    counterRight: false,
    counterLength: 4,
    allowShortKeys: false
});
const xchacha20 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createCipher"])(chachaCore, {
    counterRight: false,
    counterLength: 8,
    extendNonceFn: hchacha,
    allowShortKeys: false
});
const chacha8 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createCipher"])(chachaCore, {
    counterRight: false,
    counterLength: 4,
    rounds: 8
});
const chacha12 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createCipher"])(chachaCore, {
    counterRight: false,
    counterLength: 4,
    rounds: 12
});
const __TESTS = /* @__PURE__ */ Object.freeze({
    chachaCore
});
// RFC 8439 §2.8.1 pad16(x): shared zero block for AAD/ciphertext padding.
const ZEROS16 = /* @__PURE__ */ new Uint8Array(16);
// RFC 8439 §2.8 / §2.8.1: aligned inputs add nothing, otherwise append 16-(len%16) zero bytes.
const updatePadded = (h, msg)=>{
    h.update(msg);
    const leftover = msg.length % 16;
    if (leftover) h.update(ZEROS16.subarray(leftover));
};
// RFC 8439 §2.6.1 poly1305_key_gen returns `block[0..31]`, so AEAD key
// generation only needs 32 zero bytes.
const ZEROS32 = /* @__PURE__ */ new Uint8Array(32);
function computeTag(fn, key, nonce, ciphertext, AAD) {
    if (AAD !== undefined) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(AAD, undefined, 'AAD');
    // RFC 8439 §2.6 / §2.8: derive the Poly1305 one-time key from counter 0,
    // then MAC AAD || pad16(AAD) || ciphertext || pad16(ciphertext) || len(AAD) || len(ciphertext).
    const authKey = fn(key, nonce, ZEROS32);
    const lengths = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["u64Lengths"])(ciphertext.length, AAD ? AAD.length : 0, true);
    // Methods below can be replaced with
    // `return poly1305_computeTag_small(authKey, lengths, ciphertext, AAD)`
    // from `test/misc/micro-ciphers.ts`.
    const h = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_poly1305$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["poly1305"].create(authKey);
    if (AAD) updatePadded(h, AAD);
    updatePadded(h, ciphertext);
    h.update(lengths);
    const res = h.digest();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(authKey, lengths);
    return res;
}
const _poly1305_aead = (xorStream)=>(key, nonce, AAD)=>{
        // This borrows caller key/nonce/AAD buffers by reference; mutating them after construction
        // changes future encrypt/decrypt results.
        const tagLength = 16;
        return {
            encrypt (plaintext, output) {
                const plength = plaintext.length;
                output = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getOutput"])(plength + tagLength, output, false);
                output.set(plaintext);
                const oPlain = output.subarray(0, -tagLength);
                // RFC 8439 §2.8: payload encryption starts at counter 1 because counter 0 produced the OTK.
                xorStream(key, nonce, oPlain, oPlain, 1);
                const tag = computeTag(xorStream, key, nonce, oPlain, AAD);
                output.set(tag, plength); // append tag
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(tag);
                return output;
            },
            decrypt (ciphertext, output) {
                output = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getOutput"])(ciphertext.length - tagLength, output, false);
                const data = ciphertext.subarray(0, -tagLength);
                const passedTag = ciphertext.subarray(-tagLength);
                const tag = computeTag(xorStream, key, nonce, data, AAD);
                // RFC 8439 §2.8 / §4: authenticate ciphertext before decrypting it, and compare tags with
                // the constant-time equalBytes() helper rather than decrypting speculative plaintext first.
                if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["equalBytes"])(passedTag, tag)) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(tag);
                    throw new Error('invalid tag');
                }
                output.set(ciphertext.subarray(0, -tagLength));
                // Actual decryption
                xorStream(key, nonce, output, output, 1); // start stream with i=1
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(tag);
                return output;
            }
        };
    };
const chacha20poly1305 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["wrapCipher"])({
    blockSize: 64,
    nonceLength: 12,
    tagLength: 16,
    withAAD: true
}, /* @__PURE__ */ _poly1305_aead(chacha20));
const xchacha20poly1305 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["wrapCipher"])({
    blockSize: 64,
    nonceLength: 24,
    tagLength: 16,
    withAAD: true
}, /* @__PURE__ */ _poly1305_aead(xchacha20));
const rngChacha20 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createPRG"])(chacha20orig, 64, 32, 8);
const rngChacha8 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$_arx$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createPRG"])(chacha8, 64, 32, 12);
}),
"[project]/sdk/js/node_modules/@noble/ciphers/utils.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Utilities for hex, bytes, CSPRNG.
 * @module
 */ /*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) */ __turbopack_context__.s([
    "aarray",
    ()=>aarray,
    "abool",
    ()=>abool,
    "abytes",
    ()=>abytes,
    "aexists",
    ()=>aexists,
    "anumber",
    ()=>anumber,
    "aoutput",
    ()=>aoutput,
    "aoutput32",
    ()=>aoutput32,
    "byteSwap",
    ()=>byteSwap,
    "byteSwap32",
    ()=>byteSwap32,
    "bytesToHex",
    ()=>bytesToHex,
    "bytesToNumberBE",
    ()=>bytesToNumberBE,
    "bytesToUtf8",
    ()=>bytesToUtf8,
    "checkOpts",
    ()=>checkOpts,
    "clean",
    ()=>clean,
    "complexOverlapBytes",
    ()=>complexOverlapBytes,
    "concatBytes",
    ()=>concatBytes,
    "copyBytes",
    ()=>copyBytes,
    "createView",
    ()=>createView,
    "equalBytes",
    ()=>equalBytes,
    "getOutput",
    ()=>getOutput,
    "hexToBytes",
    ()=>hexToBytes,
    "hexToNumber",
    ()=>hexToNumber,
    "isAligned32",
    ()=>isAligned32,
    "isBytes",
    ()=>isBytes,
    "isLE",
    ()=>isLE,
    "managedNonce",
    ()=>managedNonce,
    "numberToBytesBE",
    ()=>numberToBytesBE,
    "overlapBytes",
    ()=>overlapBytes,
    "randomBytes",
    ()=>randomBytes,
    "swap32IfBE",
    ()=>swap32IfBE,
    "swap8IfBE",
    ()=>swap8IfBE,
    "u32",
    ()=>u32,
    "u64Lengths",
    ()=>u64Lengths,
    "u8",
    ()=>u8,
    "utf8ToBytes",
    ()=>utf8ToBytes,
    "wrapCipher",
    ()=>wrapCipher,
    "wrapMacConstructor",
    ()=>wrapMacConstructor
]);
function aarray(item, title, inner = ()=>{}) {
    if (!Array.isArray(item)) throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
    for(let i = 0; i < item.length; i++)inner(item[i], `${title}[${i}]`);
    return item;
}
function isBytes(a) {
    // Plain `instanceof Uint8Array` is too strict for some Buffer / proxy /
    // cross-realm cases. The fallback still requires a real ArrayBuffer view
    // so plain JSON-deserialized `{ constructor: ... }`
    // spoofing is rejected, and `BYTES_PER_ELEMENT === 1` keeps the fallback on byte-oriented views.
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array' && 'BYTES_PER_ELEMENT' in a && a.BYTES_PER_ELEMENT === 1;
}
// Shared error-message prefix builder. Only called on throw paths, so assert
// success paths never pay for the string concatenation.
const atitle = (title)=>title ? `"${title}" ` : '';
function abool(value, title = '') {
    if (typeof value !== 'boolean') throw new TypeError(atitle(title) + 'expected boolean, got type=' + typeof value);
    return value;
}
function anumber(n, title = '') {
    if (typeof n !== 'number') throw new TypeError(atitle(title) + 'expected number, got ' + typeof n);
    if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(atitle(title) + 'expected integer >= 0, got ' + n);
    return n;
}
function abytes(value, length, title = '') {
    // Success path first: this runs at the start of every update() / digestInto(), and the
    // common `abytes(data)` form must not pay for length handling it does not use.
    if (isBytes(value) && (length === undefined || value.length === length)) return value;
    // Error path: recompute freely to build the exact message.
    if (length !== undefined) anumber(length, 'length');
    const bytes = isBytes(value);
    const ofLen = length !== undefined ? ` of length ${length}` : '';
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = atitle(title) + 'expected Uint8Array' + ofLen + ', got ' + got;
    if (!bytes) throw new TypeError(message);
    throw new RangeError(message);
}
const aobject = (value, label)=>{
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(label === 'object' ? 'expected valid options object' : `"${label}" expected object, got type=${typeof value}`);
};
function aexists(instance, checkFinished = true) {
    // Runs on every update()/digestInto(); the flags are library-owned booleans, so only their
    // truthiness is checked - re-validating their type per call was pure hot-path overhead.
    if (instance.destroyed) throw new Error('hash was destroyed');
    if (checkFinished && instance.finished) throw new Error('digest() was already called');
}
function aoutput(out, instance) {
    abytes(out, undefined, 'output');
    // `outputLen` is a library-owned readonly number; the negated comparison keeps failing fast
    // when it is missing/NaN (comparisons with undefined/NaN are false) without an anumber() call.
    const min = instance.outputLen;
    if (!(out.length >= min)) {
        throw new RangeError('"output" expected length >= ' + min);
    }
}
function aoutput32(out, instance) {
    aoutput(out, instance);
    if (!isAligned32(out)) throw new Error('invalid output, must be aligned');
}
function u8(arr) {
    return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
}
function u32(arr) {
    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
    for(let i = 0; i < arrays.length; i++){
        arrays[i].fill(0);
    }
}
function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
const isLE = /* @__PURE__ */ (()=>new Uint8Array(new Uint32Array([
        0x11223344
    ]).buffer)[0] === 0x44)();
function byteSwap(word) {
    return word << 24 & 0xff000000 | word << 8 & 0xff0000 | word >>> 8 & 0xff00 | word >>> 24 & 0xff;
}
const swap8IfBE = isLE ? (n)=>n : (n)=>byteSwap(n) >>> 0;
function byteSwap32(arr) {
    for(let i = 0; i < arr.length; i++){
        arr[i] = byteSwap(arr[i]);
    }
    return arr;
}
const swap32IfBE = isLE ? (u)=>u : byteSwap32;
// Built-in hex conversion:
// {@link https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex | caniuse entry}
const hasHexBuiltin = /* @__PURE__ */ (()=>// @ts-ignore
    typeof Uint8Array.from([]).toHex === 'function' && typeof Uint8Array.fromHex === 'function')();
// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = /* @__PURE__ */ Array.from({
    length: 256
}, (_, i)=>i.toString(16).padStart(2, '0'));
function bytesToHex(bytes) {
    abytes(bytes);
    // @ts-ignore
    if (hasHexBuiltin) return bytes.toHex();
    // pre-caching improves the speed 6x
    let hex = '';
    for(let i = 0; i < bytes.length; i++){
        hex += hexes[bytes[i]];
    }
    return hex;
}
// Strict ASCII nibble parser: non-ASCII hex lookalikes are rejected as undefined.
// ASCII codes: '0'..'9' = 48..57, 'A'..'F' = 65..70, 'a'..'f' = 97..102.
// prettier-ignore
function asciiToBase16(ch) {
    return ch >= 48 && ch <= 57 ? ch - 48 // '2' => 50-48
     : ch >= 65 && ch <= 70 ? ch - (65 - 10) // 'B' => 66-(65-10)
     : ch >= 97 && ch <= 102 ? ch - (97 - 10) // 'b' => 98-(97-10)
     : undefined;
}
function hexToBytes(hex) {
    if (typeof hex !== 'string') throw new TypeError('hex string expected, got ' + typeof hex);
    if (hasHexBuiltin) {
        try {
            return Uint8Array.fromHex(hex);
        } catch (error) {
            if (error instanceof SyntaxError) throw new RangeError(error.message);
            throw error;
        }
    }
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2) throw new RangeError('hex string expected, got unpadded hex of length ' + hl);
    const array = new Uint8Array(al);
    for(let ai = 0, hi = 0; ai < al; ai++, hi += 2){
        const n1 = asciiToBase16(hex.charCodeAt(hi)); // parse first char, multiply it by 16
        const n2 = asciiToBase16(hex.charCodeAt(hi + 1)); // parse second char
        if (n1 === undefined || n2 === undefined) {
            const char = hex[hi] + hex[hi + 1];
            throw new RangeError('hex string expected, got non-hex character "' + char + '" at index ' + hi);
        }
        array[ai] = n1 * 16 + n2; // example: 'A9' => 10*16 + 9
    }
    return array;
}
const _0n = /* @__PURE__ */ BigInt(0);
function hexToNumber(hex) {
    if (typeof hex !== 'string') throw new TypeError('hex string expected, got ' + typeof hex);
    // Numeric parser, not byte-hex decoder: odd-length forms like 'f' are valid,
    // and malformed syntax follows BigInt's native error behavior.
    return hex === '' ? _0n : BigInt('0x' + hex); // Big Endian
}
function bytesToNumberBE(bytes) {
    return hexToNumber(bytesToHex(bytes));
}
/**
 * Validates that a value is a non-negative bigint or safe integer.
 * @param n - Value to validate.
 * @returns The same validated value.
 * @throws On wrong argument ranges or values. {@link RangeError}
 */ function abignumber(n) {
    if (typeof n === 'bigint') {
        if (!(_0n <= n)) throw new RangeError('positive bigint expected, got ' + n);
    } else anumber(n);
    return n;
}
function numberToBytesBE(n, len) {
    anumber(len);
    if (len === 0) throw new Error('zero output length is invalid');
    n = abignumber(n);
    const expectedLen = len * 2;
    const hex = n.toString(16);
    // Detect overflow before hex parsing so oversized values don't leak the shared odd-hex error.
    if (hex.length > expectedLen) throw new RangeError('number is too large');
    return hexToBytes(hex.padStart(expectedLen, '0'));
}
function utf8ToBytes(str) {
    if (typeof str !== 'string') throw new TypeError('string expected');
    return new Uint8Array(new TextEncoder().encode(str)); // {@link https://bugzil.la/1681809 | Firefox bug 1681809}
}
function bytesToUtf8(bytes) {
    return new TextDecoder().decode(bytes);
}
function overlapBytes(a, b) {
    // Zero-length views cannot overwrite anything, even if their offset sits inside another range.
    if (!a.byteLength || !b.byteLength) return false;
    return a.buffer === b.buffer && // best we can do, may fail with an obscure Proxy
    a.byteOffset < b.byteOffset + b.byteLength && // a starts before b end
    b.byteOffset < a.byteOffset + a.byteLength // b starts before a end
    ;
}
function complexOverlapBytes(input, output) {
    // This is very cursed. It works somehow, but I'm completely unsure,
    // reasoning about overlapping aligned windows is very hard.
    if (overlapBytes(input, output) && input.byteOffset < output.byteOffset) throw new Error('complex overlap of input and output is not supported');
}
function concatBytes(...arrays) {
    let sum = 0;
    for(let i = 0; i < arrays.length; i++){
        const a = arrays[i];
        abytes(a);
        sum += a.length;
    }
    const res = new Uint8Array(sum);
    for(let i = 0, pad = 0; i < arrays.length; i++){
        const a = arrays[i];
        res.set(a, pad);
        pad += a.length;
    }
    return res;
}
function checkOpts(defaults, opts) {
    aobject(defaults, 'defaults');
    aobject(opts, 'opts');
    // Mutates defaults by design. __proto__ follows Object.assign semantics here and can only
    // affect this local option object; callers already control this low-level options surface.
    const merged = Object.assign(defaults, opts);
    return merged;
}
function equalBytes(a, b) {
    a = abytes(a);
    b = abytes(b);
    if (a.length !== b.length) return false;
    let diff = 0;
    for(let i = 0; i < a.length; i++)diff |= a[i] ^ b[i];
    return diff === 0;
}
function wrapMacConstructor(keyLen, macCons, fromMsg) {
    const mac = macCons;
    const getArgs = fromMsg || (()=>[]);
    const macC = (msg, key)=>mac(key, ...getArgs(msg)).update(msg).digest();
    const tmp = mac(new Uint8Array(keyLen), ...getArgs(new Uint8Array(0)));
    macC.outputLen = tmp.outputLen;
    macC.blockLen = tmp.blockLen;
    macC.create = (key, ...args)=>mac(key, ...args);
    return macC;
}
const wrapCipher = (params, constructor)=>{
    function wrappedCipher(key, ...args) {
        // Validate key
        abytes(key, undefined, 'key');
        // Validate nonce if nonceLength is present
        if (params.nonceLength !== undefined) {
            const nonce = args[0];
            abytes(nonce, params.varSizeNonce ? undefined : params.nonceLength, 'nonce');
        }
        // Keep tag length available for decrypt-size checks after constructor validation.
        const tagl = params.tagLength;
        const aadStart = params.nonceLength !== undefined ? 1 : 0;
        // No-AAD constructors otherwise silently ignore byte args meant as AAD.
        if (!params.withAAD) {
            for(let i = aadStart; i < args.length; i++)if (isBytes(args[i])) throw new Error('AAD not supported');
        }
        // Validate the first AAD slot early; rest-arg AAD constructors validate the tail themselves.
        if (params.withAAD && args[aadStart] !== undefined) abytes(args[aadStart], undefined, 'AAD');
        const cipher = constructor(key, ...args);
        const checkOutput = (fnLength, output)=>{
            if (output !== undefined) {
                if (fnLength !== 2) throw new Error('cipher output not supported');
                abytes(output, undefined, 'output');
            }
        };
        // Create wrapped cipher with validation and single-use encryption
        let called = false;
        const wrCipher = {
            encrypt (data, output) {
                if (called) throw new Error('cannot encrypt() twice with same key + nonce');
                // Any encrypt attempt consumes the instance, even if validation rejects below.
                called = true;
                abytes(data, undefined, 'data');
                checkOutput(cipher.encrypt.length, output);
                return cipher.encrypt(data, output);
            },
            decrypt (data, output) {
                abytes(data, undefined, 'data');
                if (tagl && data.length < tagl) throw new Error('"ciphertext" expected length >= tagLength=' + tagl);
                checkOutput(cipher.decrypt.length, output);
                return cipher.decrypt(data, output);
            }
        };
        return wrCipher;
    }
    Object.assign(wrappedCipher, params);
    return wrappedCipher;
};
function getOutput(expectedLength, out, onlyAligned = true) {
    if (out === undefined) return new Uint8Array(expectedLength);
    // Keep Buffer/cross-realm Uint8Array support here instead of trusting a shape-compatible object.
    abytes(out, expectedLength, 'output');
    if (onlyAligned && !isAligned32(out)) throw new Error('invalid output, must be aligned');
    return out;
}
function u64Lengths(dataLength, aadLength, isLE) {
    // Reject coercible non-number lengths like '10' and true before BigInt(...) accepts them.
    anumber(dataLength);
    anumber(aadLength);
    abool(isLE);
    const num = new Uint8Array(16);
    const view = createView(num);
    view.setBigUint64(0, BigInt(aadLength), isLE);
    view.setBigUint64(8, BigInt(dataLength), isLE);
    return num;
}
function isAligned32(bytes) {
    return bytes.byteOffset % 4 === 0;
}
function copyBytes(bytes) {
    // `Uint8Array.from(...)` would also accept arrays / other typed arrays. Keep this helper strict
    // because callers use it at byte-validation boundaries before mutating the detached copy.
    return Uint8Array.from(abytes(bytes));
}
function randomBytes(bytesLength = 32) {
    // Match the repo's other length-taking helpers instead of relying on Uint8Array coercion.
    anumber(bytesLength, 'bytesLength');
    const cr = typeof globalThis === 'object' ? globalThis.crypto : null;
    if (typeof cr?.getRandomValues !== 'function') throw new Error('crypto.getRandomValues must be defined');
    // Web Cryptography API Level 2 §10.1.1:
    // if `byteLength > 65536`, throw `QuotaExceededError`.
    // Keep the guard explicit so callers can see the quota in code
    // instead of discovering it by reading the spec or host errors.
    // This wrapper surfaces the same quota as a stable library RangeError.
    if (bytesLength > 65536) throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
    return cr.getRandomValues(new Uint8Array(bytesLength));
}
function managedNonce(fn, randomBytes_ = randomBytes) {
    if (typeof fn !== 'function') throw new TypeError('"fn" expected cipher constructor, got type=' + typeof fn);
    if (typeof randomBytes_ !== 'function') throw new TypeError('"randomBytes_" expected function, got type=' + typeof randomBytes_);
    const { nonceLength } = fn;
    anumber(nonceLength, 'fn.nonceLength');
    const addNonce = (nonce, ciphertext, plaintext)=>{
        const out = concatBytes(nonce, ciphertext);
        // Wrapped ciphers may alias caller plaintext on encrypt(); never zero
        // caller-owned buffers here.
        if (!overlapBytes(plaintext, ciphertext)) ciphertext.fill(0);
        return out;
    };
    // NOTE: we cannot support DST here, it would be mistake:
    // - we don't know how much dst length cipher requires
    // - nonce may unalign dst and break everything
    // - we create new u8a anyway (concatBytes)
    // - previously we passed all args to cipher, but that was mistake!
    const res = (key, ...args)=>({
            encrypt (plaintext) {
                abytes(plaintext, undefined, 'data');
                const nonce = randomBytes_(nonceLength);
                const encrypted = fn(key, nonce, ...args).encrypt(plaintext);
                // @ts-ignore
                if (encrypted instanceof Promise) return encrypted.then((ct)=>addNonce(nonce, ct, plaintext));
                return addNonce(nonce, encrypted, plaintext);
            },
            decrypt (ciphertext) {
                abytes(ciphertext, undefined, 'data');
                const nonce = ciphertext.subarray(0, nonceLength);
                const decrypted = ciphertext.subarray(nonceLength);
                return fn(key, nonce, ...args).decrypt(decrypted);
            }
        });
    // Auto-nonce wrappers still preserve the wrapped payload geometry.
    if ('blockSize' in fn) res.blockSize = fn.blockSize;
    if ('tagLength' in fn) res.tagLength = fn.tagLength;
    if ('withAAD' in fn) res.withAAD = fn.withAAD;
    return res;
}
}),
"[project]/sdk/js/node_modules/@noble/hashes/_md.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Chi",
    ()=>Chi,
    "HashMD",
    ()=>HashMD,
    "Maj",
    ()=>Maj,
    "SHA224_IV",
    ()=>SHA224_IV,
    "SHA256_IV",
    ()=>SHA256_IV,
    "SHA384_IV",
    ()=>SHA384_IV,
    "SHA512_IV",
    ()=>SHA512_IV
]);
/**
 * Internal Merkle-Damgard hash utils.
 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/_u64.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/utils.js [app-ssr] (ecmascript)");
;
;
function Chi(a, b, c) {
    return a & b ^ ~a & c;
}
function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
}
class HashMD {
    blockLen;
    outputLen;
    canXOF = false;
    padOffset;
    isLE;
    // For partial updates less than block size
    buffer;
    view;
    finished = false;
    length = 0;
    pos = 0;
    destroyed = false;
    constructor(blockLen, outputLen, padOffset, isLE){
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.buffer = new Uint8Array(blockLen);
        this.view = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createView"])(this.buffer);
    }
    update(data) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aexists"])(this);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(data);
        const { view, buffer, blockLen } = this;
        const len = data.length;
        let processed = false;
        for(let pos = 0; pos < len;){
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path only when there is no buffered partial block: `take === blockLen` implies
            // `this.pos === 0`, so we can process full blocks directly from the input view.
            if (take === blockLen) {
                const dataView = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createView"])(data);
                for(; blockLen <= len - pos; pos += blockLen)this.process(dataView, pos);
                processed = true;
                continue;
            }
            // When the whole input is buffered in one go (common for short messages), passing `data`
            // directly avoids allocating a subarray view.
            buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
                processed = true;
            }
        }
        this.length += data.length;
        // Shared schedule buffers only pick up input-derived words inside process(); if everything
        // was buffered without processing, there is nothing to zero.
        if (processed) this.roundClean();
        return this;
    }
    digestInto(out) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aexists"])(this);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aoutput"])(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message, then zero-pad the rest of the block
        buffer[pos++] = 0b10000000;
        buffer.fill(0, pos);
        // we have less than padOffset left in buffer, so we cannot put length in
        // current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            buffer.fill(0);
        }
        // `padOffset` reserves the whole length field. For SHA-384/512 the high 64 bits stay zero from
        // the padding fill above, and JS will overflow before user input can make that half non-zero.
        // So we only need to write the low 64 bits here (`length * 8` only scales the exponent of an
        // integer below 2**53, so the split inside the helper stays exact).
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setU64FromNum"])(view, blockLen - 8, this.length * 8, isLE);
        this.process(view, 0);
        // The final block above is processed outside update(), so the shared message-schedule
        // buffers (e.g. SHA256_W) would otherwise retain input-derived words after digest().
        this.roundClean();
        // digest() passes our own `buffer` as `out`; reuse its cached view instead of allocating one.
        const oview = out === buffer ? view : (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createView"])(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which must be fused in single op with modulo by JIT
        const outLen = len / 4;
        const state = this.get();
        // Subclass-misconfiguration invariant: outputLen must be 32-bit aligned and fit the state.
        if (len % 4 || outLen > state.length) throw new Error('invalid outputLen');
        for(let i = 0; i < outLen; i++)oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        // Copy before destroy(): subclasses wipe `buffer` during cleanup, but `digest()` must return
        // fresh bytes to the caller.
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneIntoMeta(to) {
        const { buffer, length, finished, destroyed, pos } = this;
        to.destroyed = destroyed;
        to.finished = finished;
        to.length = length;
        to.pos = pos;
        // Only partial-block bytes need copying: when `length % blockLen === 0`, `pos === 0` and
        // later `update()` / `digestInto()` overwrite `to.buffer` from the start before reading it.
        if (pos) to.buffer.set(buffer); // Avoid a hot modulo guard.
        return to;
    }
    clone() {
        return this._cloneInto();
    }
}
const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19
]);
const SHA224_IV = /* @__PURE__ */ Uint32Array.from([
    0xc1059ed8,
    0x367cd507,
    0x3070dd17,
    0xf70e5939,
    0xffc00b31,
    0x68581511,
    0x64f98fa7,
    0xbefa4fa4
]);
const SHA384_IV = /* @__PURE__ */ Uint32Array.from([
    0xcbbb9d5d,
    0xc1059ed8,
    0x629a292a,
    0x367cd507,
    0x9159015a,
    0x3070dd17,
    0x152fecd8,
    0xf70e5939,
    0x67332667,
    0xffc00b31,
    0x8eb44a87,
    0x68581511,
    0xdb0c2e0d,
    0x64f98fa7,
    0x47b5481d,
    0xbefa4fa4
]);
const SHA512_IV = /* @__PURE__ */ Uint32Array.from([
    0x6a09e667,
    0xf3bcc908,
    0xbb67ae85,
    0x84caa73b,
    0x3c6ef372,
    0xfe94f82b,
    0xa54ff53a,
    0x5f1d36f1,
    0x510e527f,
    0xade682d1,
    0x9b05688c,
    0x2b3e6c1f,
    0x1f83d9ab,
    0xfb41bd6b,
    0x5be0cd19,
    0x137e2179
]);
}),
"[project]/sdk/js/node_modules/@noble/hashes/_u64.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "add",
    ()=>add,
    "add3H",
    ()=>add3H,
    "add3L",
    ()=>add3L,
    "add4H",
    ()=>add4H,
    "add4L",
    ()=>add4L,
    "add5H",
    ()=>add5H,
    "add5L",
    ()=>add5L,
    "fromBig",
    ()=>fromBig,
    "fromNumH",
    ()=>fromNumH,
    "fromNumL",
    ()=>fromNumL,
    "rotr32H",
    ()=>rotr32H,
    "rotr32L",
    ()=>rotr32L,
    "rotrBH",
    ()=>rotrBH,
    "rotrBL",
    ()=>rotrBL,
    "rotrSH",
    ()=>rotrSH,
    "rotrSL",
    ()=>rotrSL,
    "setU64FromNum",
    ()=>setU64FromNum,
    "shrSH",
    ()=>shrSH,
    "shrSL",
    ()=>shrSL,
    "split",
    ()=>split,
    "toBig",
    ()=>toBig
]);
const U32_MASK64 = /* @__PURE__ */ (()=>BigInt(2 ** 32 - 1))();
const _32n = /* @__PURE__ */ BigInt(32);
// Split bigint into two 32-bit halves. With `le=true`, returned fields become `{ h: low, l: high
// }` to match little-endian word order rather than the property names.
function fromBig(n, le = false) {
    if (le) return {
        h: Number(n & U32_MASK64),
        l: Number(n >> _32n & U32_MASK64)
    };
    return {
        h: Number(n >> _32n & U32_MASK64) | 0,
        l: Number(n & U32_MASK64) | 0
    };
}
// Split bigint list into `[highWords, lowWords]` when `le=false`; with `le=true`, the first array
// holds the low halves because `fromBig(...)` swaps the semantic meaning of `h` and `l`.
function split(lst, le = false) {
    const len = lst.length;
    let Ah = new Uint32Array(len);
    let Al = new Uint32Array(len);
    for(let i = 0; i < len; i++){
        const { h, l } = fromBig(lst[i], le);
        [Ah[i], Al[i]] = [
            h,
            l
        ];
    }
    return [
        Ah,
        Al
    ];
}
// Combine explicit `(high, low)` 32-bit halves into a bigint; `>>> 0` normalizes signed JS
// bitwise results back to uint32 first, and little-endian callers must swap.
const toBig = (h, l)=>BigInt(h >>> 0) << _32n | BigInt(l >>> 0);
// Split a JS number into u32 halves without a BigInt allocation. Exact only for integers
// `0 <= n < 2**53`; callers use it on byte / bit counters, which JS length math caps far below
// that (an ArrayBuffer cannot exceed 2**53 - 1 bytes).
const fromNumH = (n)=>n / 2 ** 32 | 0;
const fromNumL = (n)=>n >>> 0;
// Drop-in replacement for `view.setBigUint64(byteOffset, BigInt(n), isLE)` without the per-call
// BigInt allocation. Same `n < 2**53` precondition as `fromNumH`/`fromNumL`.
function setU64FromNum(view, byteOffset, n, isLE) {
    const h = fromNumH(n);
    const l = fromNumL(n);
    view.setUint32(byteOffset, isLE ? l : h, isLE);
    view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
// High 32-bit half of a 64-bit logical right shift for `s` in `0..31`.
const shrSH = (h, _l, s)=>h >>> s;
// Low 32-bit half of a 64-bit logical right shift, valid for `s` in `1..31`.
const shrSL = (h, l, s)=>h << 32 - s | l >>> s;
// High 32-bit half of a 64-bit right rotate, valid for `s` in `1..31`.
const rotrSH = (h, l, s)=>h >>> s | l << 32 - s;
// Low 32-bit half of a 64-bit right rotate, valid for `s` in `1..31`.
const rotrSL = (h, l, s)=>h << 32 - s | l >>> s;
// High 32-bit half of a 64-bit right rotate, valid for `s` in `33..63`; `32` uses `rotr32*`.
const rotrBH = (h, l, s)=>h << 64 - s | l >>> s - 32;
// Low 32-bit half of a 64-bit right rotate, valid for `s` in `33..63`; `32` uses `rotr32*`.
const rotrBL = (h, l, s)=>h >>> s - 32 | l << 64 - s;
// High 32-bit half of a 64-bit right rotate for `s === 32`; this is just the swapped low half.
const rotr32H = (_h, l)=>l;
// Low 32-bit half of a 64-bit right rotate for `s === 32`; this is just the swapped high half.
const rotr32L = (h, _l)=>h;
// 64-bit left rotates (rotl*) are not defined here: sha3.ts, their only consumer, keeps
// local copies so V8 inlines them into keccakP.
// Add two split 64-bit words and return the split `{ h, l }` sum.
// JS uses 32-bit signed integers for bitwise operations, so we cannot simply shift the carry out
// of the low sum and instead use division.
function add(Ah, Al, Bh, Bl) {
    const l = (Al >>> 0) + (Bl >>> 0);
    return {
        h: Ah + Bh + (l / 2 ** 32 | 0) | 0,
        l: l | 0
    };
}
// Addition with more than 2 elements
// Unmasked low-word accumulator for 3-way addition; pass the raw result into `add3H(...)`.
const add3L = (Al, Bl, Cl)=>(Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
// High-word finalize step for 3-way addition; `low` must be the untruncated output of `add3L(...)`.
const add3H = (low, Ah, Bh, Ch)=>Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
// Unmasked low-word accumulator for 4-way addition; pass the raw result into `add4H(...)`.
const add4L = (Al, Bl, Cl, Dl)=>(Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
// High-word finalize step for 4-way addition; `low` must be the untruncated output of `add4L(...)`.
const add4H = (low, Ah, Bh, Ch, Dh)=>Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
// Unmasked low-word accumulator for 5-way addition; pass the raw result into `add5H(...)`.
const add5L = (Al, Bl, Cl, Dl, El)=>(Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
// High-word finalize step for 5-way addition; `low` must be the untruncated output of `add5L(...)`.
const add5H = (low, Ah, Bh, Ch, Dh, Eh)=>Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;
;
}),
"[project]/sdk/js/node_modules/@noble/hashes/hkdf.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "expand",
    ()=>expand,
    "extract",
    ()=>extract,
    "hkdf",
    ()=>hkdf
]);
/**
 * HKDF (RFC 5869): extract + expand in one step.
 * See {@link https://soatok.blog/2021/11/17/understanding-hkdf/}.
 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$hmac$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/hmac.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/utils.js [app-ssr] (ecmascript)");
;
;
function extract(hash, ikm, salt) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ahash"])(hash);
    // NOTE: some libraries treat zero-length array as 'not provided';
    // we don't, since we have undefined as 'not provided'
    // https://github.com/RustCrypto/KDFs/issues/15
    if (salt === undefined) salt = new Uint8Array(hash.outputLen);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$hmac$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hmac"])(hash, salt, ikm);
}
// Shared mutable scratch byte for the RFC 5869 block counter `N`.
// Safe to reuse because `expand()` is synchronous and resets it with `clean(...)` before returning.
const HKDF_COUNTER = /* @__PURE__ */ Uint8Array.of(0);
// Shared RFC 5869 empty string for both `info === undefined` and the first-block `T(0)` input.
const EMPTY_BUFFER = /* @__PURE__ */ Uint8Array.of();
function expand(hash, prk, info, length = 32, _recycled) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ahash"])(hash);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["anumber"])(length, 'length');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(prk, undefined, 'prk');
    const olen = hash.outputLen;
    // RFC 5869 §2.3: PRK is "a pseudorandom key of at least HashLen octets".
    if (prk.length < olen) throw new Error('"prk" must be at least HashLen octets');
    // RFC 5869 §2.3 only bounds `L` by `<= 255*HashLen`; `L=0` is valid and yields empty OKM.
    if (length > 255 * olen) throw new Error('Length must be <= 255*HashLen');
    const blocks = Math.ceil(length / olen);
    if (info === undefined) info = EMPTY_BUFFER;
    else (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(info, undefined, 'info');
    if (!blocks) {
        if (_recycled) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(prk); // Full hkdf() owns this intermediate PRK.
        return new Uint8Array();
    }
    // first L(ength) octets of T
    // The private PRK can become both T and a one-block result after HMAC consumes the key.
    const okm = _recycled && blocks === 1 ? prk : new Uint8Array(blocks * olen);
    const { iHash, oHash } = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$hmac$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hmac"].create(hash, prk);
    // Driving them directly also skips `_HMAC.digestInto`'s per-digest destroy.
    const T = _recycled ? prk : new Uint8Array(olen);
    // Full hkdf() donates one destroyed extract hash; standalone creates one alternating worker.
    const worker = blocks > 1 ? _recycled?.iHash || hash.create() : undefined;
    for(let counter = 0; counter < blocks - 1; counter++){
        HKDF_COUNTER[0] = counter + 1;
        const iWork = iHash._cloneInto(worker);
        // T(0) = empty string (zero length)
        // T(N) = HMAC-Hash(PRK, T(N-1) | info | N)
        if (counter) iWork.update(T);
        iWork.update(info).update(HKDF_COUNTER).digestInto(T);
        oHash._cloneInto(worker).update(T).digestInto(T);
        okm.set(T, olen * counter);
    }
    // Midstates are key-equivalent: they allow computing HMAC(prk, ...) for any message.
    HKDF_COUNTER[0] = blocks; // Final block consumes them; retain worker for cleanup.
    if (blocks > 1) iHash.update(T);
    iHash.update(info).update(HKDF_COUNTER).digestInto(T);
    oHash.update(T).digestInto(T);
    okm.set(T, olen * (blocks - 1));
    iHash.destroy(); // Raw digests may leave key-derived base/worker state; wipe all explicitly.
    oHash.destroy();
    worker?.destroy();
    if (T !== okm) (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(T); // Wipe private T/PRK; standalone preserves caller-owned PRK.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(HKDF_COUNTER);
    // Exact fit: return without the extra copy.
    if (length === okm.length) return okm;
    // Copy the requested prefix, then wipe the full buffer: its tail holds
    // up to HashLen-1 bytes of derived key material past `length`.
    const res = okm.slice(0, length);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(okm);
    return res;
}
const hkdf = (hash, ikm, salt, info, length)=>{
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ahash"])(hash);
    if (salt === undefined) salt = new Uint8Array(hash.outputLen);
    const HMAC = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$hmac$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hmac"].create(hash, salt).update(ikm);
    // The intermediate PRK is secret key material; wipe it instead of
    // leaving it for GC.
    return expand(hash, HMAC.digest(), info, length, HMAC); // expand() owns and consumes it.
};
}),
"[project]/sdk/js/node_modules/@noble/hashes/hmac.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "_HMAC",
    ()=>_HMAC,
    "hmac",
    ()=>hmac
]);
/**
 * HMAC: RFC2104 message authentication code.
 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/utils.js [app-ssr] (ecmascript)");
;
class _HMAC {
    oHash;
    iHash;
    blockLen;
    outputLen;
    canXOF = false;
    finished = false;
    destroyed = false;
    constructor(hash, key){
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ahash"])(hash);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["abytes"])(key, undefined, 'key');
        this.iHash = hash.create();
        if (typeof this.iHash.update !== 'function') throw new Error('expected Hash instance');
        this.blockLen = this.iHash.blockLen;
        this.outputLen = this.iHash.outputLen;
        const blockLen = this.blockLen;
        const pad = new Uint8Array(blockLen);
        // blockLen can be bigger than outputLen
        pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
        for(let i = 0; i < pad.length; i++)pad[i] ^= 0x36;
        this.iHash.update(pad);
        // By doing update (processing of the first block) of the outer hash here,
        // we can re-use it between multiple calls via clone.
        this.oHash = hash.create();
        // Undo internal XOR && apply outer XOR
        for(let i = 0; i < pad.length; i++)pad[i] ^= 0x36 ^ 0x5c;
        this.oHash.update(pad);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(pad);
    }
    update(buf) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aexists"])(this);
        this.iHash.update(buf);
        return this;
    }
    digestInto(out) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aexists"])(this);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["aoutput"])(out, this);
        this.finished = true;
        const buf = out.subarray(0, this.outputLen);
        // Reuse the first outputLen bytes for the inner digest; the outer hash consumes them before
        // overwriting that same prefix with the final tag, leaving any oversized tail untouched.
        this.iHash.digestInto(buf);
        this.oHash.update(buf);
        this.oHash.digestInto(buf);
        this.destroy();
    }
    digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
    }
    _cloneInto(to) {
        // Create new instance without calling constructor since the key
        // is already in state and we don't know it.
        to ||= Object.create(Object.getPrototypeOf(this), {});
        const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.canXOF = canXOF;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
    }
    clone() {
        return this._cloneInto();
    }
    destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
    }
}
const hmac = /* @__PURE__ */ (()=>{
    const hmac_ = (hash, key, message)=>new _HMAC(hash, key).update(message).digest();
    hmac_.create = (hash, key)=>new _HMAC(hash, key);
    return hmac_;
})();
}),
"[project]/sdk/js/node_modules/@noble/hashes/sha2.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "_SHA224",
    ()=>_SHA224,
    "_SHA256",
    ()=>_SHA256,
    "_SHA384",
    ()=>_SHA384,
    "_SHA512",
    ()=>_SHA512,
    "_SHA512_224",
    ()=>_SHA512_224,
    "_SHA512_256",
    ()=>_SHA512_256,
    "sha224",
    ()=>sha224,
    "sha256",
    ()=>sha256,
    "sha384",
    ()=>sha384,
    "sha512",
    ()=>sha512,
    "sha512_224",
    ()=>sha512_224,
    "sha512_256",
    ()=>sha512_256
]);
/**
 * SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
 * SHA256 is the fastest hash implementable in JS, even faster than Blake3.
 * Check out {@link https://www.rfc-editor.org/rfc/rfc4634 | RFC 4634} and
 * {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf | FIPS 180-4}.
 * @module
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_md$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/_md.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/_u64.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/utils.js [app-ssr] (ecmascript)");
;
;
;
/**
 * SHA-224 / SHA-256 round constants from RFC 6234 §5.1: the first 32 bits
 * of the cube roots of the first 64 primes (2..311).
 */ // prettier-ignore
const SHA256_K = /* @__PURE__ */ Uint32Array.from([
    0x428a2f98,
    0x71374491,
    0xb5c0fbcf,
    0xe9b5dba5,
    0x3956c25b,
    0x59f111f1,
    0x923f82a4,
    0xab1c5ed5,
    0xd807aa98,
    0x12835b01,
    0x243185be,
    0x550c7dc3,
    0x72be5d74,
    0x80deb1fe,
    0x9bdc06a7,
    0xc19bf174,
    0xe49b69c1,
    0xefbe4786,
    0x0fc19dc6,
    0x240ca1cc,
    0x2de92c6f,
    0x4a7484aa,
    0x5cb0a9dc,
    0x76f988da,
    0x983e5152,
    0xa831c66d,
    0xb00327c8,
    0xbf597fc7,
    0xc6e00bf3,
    0xd5a79147,
    0x06ca6351,
    0x14292967,
    0x27b70a85,
    0x2e1b2138,
    0x4d2c6dfc,
    0x53380d13,
    0x650a7354,
    0x766a0abb,
    0x81c2c92e,
    0x92722c85,
    0xa2bfe8a1,
    0xa81a664b,
    0xc24b8b70,
    0xc76c51a3,
    0xd192e819,
    0xd6990624,
    0xf40e3585,
    0x106aa070,
    0x19a4c116,
    0x1e376c08,
    0x2748774c,
    0x34b0bcb5,
    0x391c0cb3,
    0x4ed8aa4a,
    0x5b9cca4f,
    0x682e6ff3,
    0x748f82ee,
    0x78a5636f,
    0x84c87814,
    0x8cc70208,
    0x90befffa,
    0xa4506ceb,
    0xbef9a3f7,
    0xc67178f2
]);
/** Reusable SHA-224 / SHA-256 message schedule buffer `W_t` from RFC 6234 §6.2 step 1. */ const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
/** Internal SHA-224 / SHA-256 compression engine from RFC 6234 §6.2. */ class SHA2_32B extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_md$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HashMD"] {
    // We cannot use array here since array allows indexing by variable
    // which means optimizer/compiler cannot use registers.
    // Numeric initializers matter: starting the fields as `undefined` changes
    // V8's field representation and makes sha256 3x slower (measured).
    A = 0;
    B = 0;
    C = 0;
    D = 0;
    E = 0;
    F = 0;
    G = 0;
    H = 0;
    constructor(outputLen, IV){
        super(64, outputLen, 8, false);
        this.A = IV[0] | 0;
        this.B = IV[1] | 0;
        this.C = IV[2] | 0;
        this.D = IV[3] | 0;
        this.E = IV[4] | 0;
        this.F = IV[5] | 0;
        this.G = IV[6] | 0;
        this.H = IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [
            A,
            B,
            C,
            D,
            E,
            F,
            G,
            H
        ];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    _cloneInto(to) {
        (to ||= new this.constructor()).set(...this.get());
        return this._cloneIntoMeta(to);
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for(let i = 0; i < 16; i++, offset += 4)SHA256_W[i] = view.getUint32(offset, false);
        for(let i = 16; i < 64; i++){
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotr"])(W15, 7) ^ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotr"])(W15, 18) ^ W15 >>> 3;
            const s1 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotr"])(W2, 17) ^ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotr"])(W2, 19) ^ W2 >>> 10;
            SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for(let i = 0; i < 64; i++){
            const sigma1 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotr"])(E, 6) ^ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotr"])(E, 11) ^ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotr"])(E, 25);
            const T1 = H + sigma1 + (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_md$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Chi"])(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
            const sigma0 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotr"])(A, 2) ^ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotr"])(A, 13) ^ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotr"])(A, 22);
            const T2 = sigma0 + (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_md$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Maj"])(A, B, C) | 0;
            H = G;
            G = F;
            F = E;
            E = D + T1 | 0;
            D = C;
            C = B;
            B = A;
            A = T1 + T2 | 0;
        }
        // Add the compressed chunk to the current hash value
        A = A + this.A | 0;
        B = B + this.B | 0;
        C = C + this.C | 0;
        D = D + this.D | 0;
        E = E + this.E | 0;
        F = F + this.F | 0;
        G = G + this.G | 0;
        H = H + this.H | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(SHA256_W);
    }
    destroy() {
        // HashMD callers route post-destroy usability through `destroyed`; zeroizing alone still leaves
        // update()/digest() callable on reused instances.
        this.destroyed = true;
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(this.buffer);
    }
}
class _SHA256 extends SHA2_32B {
    constructor(){
        super(32, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_md$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SHA256_IV"]);
    }
}
class _SHA224 extends SHA2_32B {
    constructor(){
        super(28, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_md$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SHA224_IV"]);
    }
}
// SHA2-512 is slower than sha256 in js because u64 operations are slow.
// SHA-384 / SHA-512 round constants from RFC 6234 §5.2:
// 80 full 64-bit words split into high/low halves.
// prettier-ignore
const K512 = /* @__PURE__ */ (()=>__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["split"]([
        '0x428a2f98d728ae22',
        '0x7137449123ef65cd',
        '0xb5c0fbcfec4d3b2f',
        '0xe9b5dba58189dbbc',
        '0x3956c25bf348b538',
        '0x59f111f1b605d019',
        '0x923f82a4af194f9b',
        '0xab1c5ed5da6d8118',
        '0xd807aa98a3030242',
        '0x12835b0145706fbe',
        '0x243185be4ee4b28c',
        '0x550c7dc3d5ffb4e2',
        '0x72be5d74f27b896f',
        '0x80deb1fe3b1696b1',
        '0x9bdc06a725c71235',
        '0xc19bf174cf692694',
        '0xe49b69c19ef14ad2',
        '0xefbe4786384f25e3',
        '0x0fc19dc68b8cd5b5',
        '0x240ca1cc77ac9c65',
        '0x2de92c6f592b0275',
        '0x4a7484aa6ea6e483',
        '0x5cb0a9dcbd41fbd4',
        '0x76f988da831153b5',
        '0x983e5152ee66dfab',
        '0xa831c66d2db43210',
        '0xb00327c898fb213f',
        '0xbf597fc7beef0ee4',
        '0xc6e00bf33da88fc2',
        '0xd5a79147930aa725',
        '0x06ca6351e003826f',
        '0x142929670a0e6e70',
        '0x27b70a8546d22ffc',
        '0x2e1b21385c26c926',
        '0x4d2c6dfc5ac42aed',
        '0x53380d139d95b3df',
        '0x650a73548baf63de',
        '0x766a0abb3c77b2a8',
        '0x81c2c92e47edaee6',
        '0x92722c851482353b',
        '0xa2bfe8a14cf10364',
        '0xa81a664bbc423001',
        '0xc24b8b70d0f89791',
        '0xc76c51a30654be30',
        '0xd192e819d6ef5218',
        '0xd69906245565a910',
        '0xf40e35855771202a',
        '0x106aa07032bbd1b8',
        '0x19a4c116b8d2d0c8',
        '0x1e376c085141ab53',
        '0x2748774cdf8eeb99',
        '0x34b0bcb5e19b48a8',
        '0x391c0cb3c5c95a63',
        '0x4ed8aa4ae3418acb',
        '0x5b9cca4f7763e373',
        '0x682e6ff3d6b2b8a3',
        '0x748f82ee5defb2fc',
        '0x78a5636f43172f60',
        '0x84c87814a1f0ab72',
        '0x8cc702081a6439ec',
        '0x90befffa23631e28',
        '0xa4506cebde82bde9',
        '0xbef9a3f7b2c67915',
        '0xc67178f2e372532b',
        '0xca273eceea26619c',
        '0xd186b8c721c0c207',
        '0xeada7dd6cde0eb1e',
        '0xf57d4f7fee6ed178',
        '0x06f067aa72176fba',
        '0x0a637dc5a2c898a6',
        '0x113f9804bef90dae',
        '0x1b710b35131c471b',
        '0x28db77f523047d84',
        '0x32caab7b40c72493',
        '0x3c9ebe0a15c9bebc',
        '0x431d67c49c100d4c',
        '0x4cc5d4becb3e42b6',
        '0x597f299cfc657e2a',
        '0x5fcb6fab3ad6faec',
        '0x6c44198c4a475817'
    ].map((n)=>BigInt(n))))();
const SHA512_Kh = /* @__PURE__ */ (()=>K512[0])();
const SHA512_Kl = /* @__PURE__ */ (()=>K512[1])();
// Reusable high-half schedule buffer for the RFC 6234 §6.4 64-bit `W_t` words.
const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
// Reusable low-half schedule buffer for the RFC 6234 §6.4 64-bit `W_t` words.
const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
/** Internal SHA-384 / SHA-512 compression engine from RFC 6234 §6.4. */ class SHA2_64B extends __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_md$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HashMD"] {
    // We cannot use array here since array allows indexing by variable
    // which means optimizer/compiler cannot use registers.
    // h -- high 32 bits, l -- low 32 bits
    // Numeric initializers matter: starting the fields as `undefined` changes
    // V8's field representation and slows hashing down (measured on sha256).
    Ah = 0;
    Al = 0;
    Bh = 0;
    Bl = 0;
    Ch = 0;
    Cl = 0;
    Dh = 0;
    Dl = 0;
    Eh = 0;
    El = 0;
    Fh = 0;
    Fl = 0;
    Gh = 0;
    Gl = 0;
    Hh = 0;
    Hl = 0;
    constructor(outputLen, IV){
        super(128, outputLen, 16, false);
        this.Ah = IV[0] | 0;
        this.Al = IV[1] | 0;
        this.Bh = IV[2] | 0;
        this.Bl = IV[3] | 0;
        this.Ch = IV[4] | 0;
        this.Cl = IV[5] | 0;
        this.Dh = IV[6] | 0;
        this.Dl = IV[7] | 0;
        this.Eh = IV[8] | 0;
        this.El = IV[9] | 0;
        this.Fh = IV[10] | 0;
        this.Fl = IV[11] | 0;
        this.Gh = IV[12] | 0;
        this.Gl = IV[13] | 0;
        this.Hh = IV[14] | 0;
        this.Hl = IV[15] | 0;
    }
    // prettier-ignore
    get() {
        const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        return [
            Ah,
            Al,
            Bh,
            Bl,
            Ch,
            Cl,
            Dh,
            Dl,
            Eh,
            El,
            Fh,
            Fl,
            Gh,
            Gl,
            Hh,
            Hl
        ];
    }
    // prettier-ignore
    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
        this.Ah = Ah | 0;
        this.Al = Al | 0;
        this.Bh = Bh | 0;
        this.Bl = Bl | 0;
        this.Ch = Ch | 0;
        this.Cl = Cl | 0;
        this.Dh = Dh | 0;
        this.Dl = Dl | 0;
        this.Eh = Eh | 0;
        this.El = El | 0;
        this.Fh = Fh | 0;
        this.Fl = Fl | 0;
        this.Gh = Gh | 0;
        this.Gl = Gl | 0;
        this.Hh = Hh | 0;
        this.Hl = Hl | 0;
    }
    _cloneInto(to) {
        (to ||= new this.constructor()).set(...this.get());
        return this._cloneIntoMeta(to);
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
        for(let i = 0; i < 16; i++, offset += 4){
            SHA512_W_H[i] = view.getUint32(offset);
            SHA512_W_L[i] = view.getUint32(offset += 4);
        }
        for(let i = 16; i < 80; i++){
            // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
            const W15h = SHA512_W_H[i - 15] | 0;
            const W15l = SHA512_W_L[i - 15] | 0;
            const s0h = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSH"](W15h, W15l, 1) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSH"](W15h, W15l, 8) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shrSH"](W15h, W15l, 7);
            const s0l = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSL"](W15h, W15l, 1) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSL"](W15h, W15l, 8) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shrSL"](W15h, W15l, 7);
            // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
            const W2h = SHA512_W_H[i - 2] | 0;
            const W2l = SHA512_W_L[i - 2] | 0;
            const s1h = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSH"](W2h, W2l, 19) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrBH"](W2h, W2l, 61) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shrSH"](W2h, W2l, 6);
            const s1l = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSL"](W2h, W2l, 19) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrBL"](W2h, W2l, 61) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shrSL"](W2h, W2l, 6);
            // SHA512_W[i] = s0 + s1 + SHA512_W[i - 7] + SHA512_W[i - 16];
            const SUMl = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add4L"](s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
            const SUMh = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add4H"](SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
            SHA512_W_H[i] = SUMh | 0;
            SHA512_W_L[i] = SUMl | 0;
        }
        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        // Compression function main loop, 80 rounds
        for(let i = 0; i < 80; i++){
            // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
            const sigma1h = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSH"](Eh, El, 14) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSH"](Eh, El, 18) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrBH"](Eh, El, 41);
            const sigma1l = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSL"](Eh, El, 14) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSL"](Eh, El, 18) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrBL"](Eh, El, 41);
            //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const CHIh = Eh & Fh ^ ~Eh & Gh;
            const CHIl = El & Fl ^ ~El & Gl;
            // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
            // prettier-ignore
            const T1ll = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add5L"](Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
            const T1h = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add5H"](T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
            const T1l = T1ll | 0;
            // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
            const sigma0h = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSH"](Ah, Al, 28) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrBH"](Ah, Al, 34) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrBH"](Ah, Al, 39);
            const sigma0l = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrSL"](Ah, Al, 28) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrBL"](Ah, Al, 34) ^ __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rotrBL"](Ah, Al, 39);
            const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
            const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
            Hh = Gh | 0;
            Hl = Gl | 0;
            Gh = Fh | 0;
            Gl = Fl | 0;
            Fh = Eh | 0;
            Fl = El | 0;
            ({ h: Eh, l: El } = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add"](Dh | 0, Dl | 0, T1h | 0, T1l | 0));
            Dh = Ch | 0;
            Dl = Cl | 0;
            Ch = Bh | 0;
            Cl = Bl | 0;
            Bh = Ah | 0;
            Bl = Al | 0;
            const All = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add3L"](T1l, sigma0l, MAJl);
            Ah = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add3H"](All, T1h, sigma0h, MAJh);
            Al = All | 0;
        }
        // Add the compressed chunk to the current hash value
        ({ h: Ah, l: Al } = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add"](this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
        ({ h: Bh, l: Bl } = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add"](this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
        ({ h: Ch, l: Cl } = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add"](this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
        ({ h: Dh, l: Dl } = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add"](this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
        ({ h: Eh, l: El } = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add"](this.Eh | 0, this.El | 0, Eh | 0, El | 0));
        ({ h: Fh, l: Fl } = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add"](this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
        ({ h: Gh, l: Gl } = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add"](this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
        ({ h: Hh, l: Hl } = __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_u64$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["add"](this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
    roundClean() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(SHA512_W_H, SHA512_W_L);
    }
    destroy() {
        // HashMD callers route post-destroy usability through `destroyed`; zeroizing alone still leaves
        // update()/digest() callable on reused instances.
        this.destroyed = true;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clean"])(this.buffer);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
class _SHA512 extends SHA2_64B {
    constructor(){
        super(64, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_md$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SHA512_IV"]);
    }
}
class _SHA384 extends SHA2_64B {
    constructor(){
        super(48, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$_md$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SHA384_IV"]);
    }
}
/**
 * Truncated SHA512/256 and SHA512/224.
 * SHA512_IV is XORed with 0xa5a5a5a5a5a5a5a5, then used as "intermediary" IV of SHA512/t.
 * Then t hashes string to produce result IV.
 * See the repo-side derivation recipe in `test/misc/sha2-gen-iv.js`.
 * These IV literals are checked against that script rather than a dedicated
 * local RFC section.
 */ /** SHA-512/224 IV derived by the SHA-512/t recipe in `test/misc/sha2-gen-iv.js` and
 * stored as sixteen big-endian 32-bit halves. */ const T224_IV = /* @__PURE__ */ Uint32Array.from([
    0x8c3d37c8,
    0x19544da2,
    0x73e19966,
    0x89dcd4d6,
    0x1dfab7ae,
    0x32ff9c82,
    0x679dd514,
    0x582f9fcf,
    0x0f6d2b69,
    0x7bd44da8,
    0x77e36f73,
    0x04c48942,
    0x3f9d85a8,
    0x6a1d36c8,
    0x1112e6ad,
    0x91d692a1
]);
/** SHA-512/256 IV derived by the SHA-512/t recipe in `test/misc/sha2-gen-iv.js` and
 * stored as sixteen big-endian 32-bit halves. */ const T256_IV = /* @__PURE__ */ Uint32Array.from([
    0x22312194,
    0xfc2bf72c,
    0x9f555fa3,
    0xc84c64c2,
    0x2393b86b,
    0x6f53b151,
    0x96387719,
    0x5940eabd,
    0x96283ee2,
    0xa88effe3,
    0xbe5e1e25,
    0x53863992,
    0x2b0199fc,
    0x2c85b8aa,
    0x0eb72ddc,
    0x81c52ca2
]);
class _SHA512_224 extends SHA2_64B {
    constructor(){
        super(28, T224_IV);
    }
}
class _SHA512_256 extends SHA2_64B {
    constructor(){
        super(32, T256_IV);
    }
}
const sha256 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHasher"])(()=>new _SHA256(), /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["oidNist"])(0x01));
const sha224 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHasher"])(()=>new _SHA224(), /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["oidNist"])(0x04));
const sha512 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHasher"])(()=>new _SHA512(), /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["oidNist"])(0x03));
const sha384 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHasher"])(()=>new _SHA384(), /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["oidNist"])(0x02));
const sha512_256 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHasher"])(()=>new _SHA512_256(), /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["oidNist"])(0x06));
const sha512_224 = /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createHasher"])(()=>new _SHA512_224(), /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$utils$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["oidNist"])(0x05));
}),
"[project]/sdk/js/node_modules/@noble/hashes/utils.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
 * @param a - value to test
 * @returns `true` when the value is a Uint8Array-compatible view.
 * @example
 * Check whether a value is a Uint8Array-compatible view.
 * ```ts
 * isBytes(new Uint8Array([1, 2, 3]));
 * ```
 */ __turbopack_context__.s([
    "abool",
    ()=>abool,
    "abytes",
    ()=>abytes,
    "aexists",
    ()=>aexists,
    "ahash",
    ()=>ahash,
    "anumber",
    ()=>anumber,
    "aoutput",
    ()=>aoutput,
    "asyncLoop",
    ()=>asyncLoop,
    "byteSwap",
    ()=>byteSwap,
    "byteSwap32",
    ()=>byteSwap32,
    "bytesToHex",
    ()=>bytesToHex,
    "checkOpts",
    ()=>checkOpts,
    "clean",
    ()=>clean,
    "concatBytes",
    ()=>concatBytes,
    "copyBytes",
    ()=>copyBytes,
    "createHasher",
    ()=>createHasher,
    "createView",
    ()=>createView,
    "hexToBytes",
    ()=>hexToBytes,
    "isBytes",
    ()=>isBytes,
    "isLE",
    ()=>isLE,
    "kdfInputToBytes",
    ()=>kdfInputToBytes,
    "nextTick",
    ()=>nextTick,
    "oidNist",
    ()=>oidNist,
    "randomBytes",
    ()=>randomBytes,
    "rotl",
    ()=>rotl,
    "rotr",
    ()=>rotr,
    "swap32IfBE",
    ()=>swap32IfBE,
    "swap8IfBE",
    ()=>swap8IfBE,
    "u32",
    ()=>u32,
    "u8",
    ()=>u8,
    "utf8ToBytes",
    ()=>utf8ToBytes,
    "validateObject",
    ()=>validateObject
]);
function isBytes(a) {
    // Plain `instanceof Uint8Array` is too strict for some Buffer / proxy / cross-realm cases.
    // The fallback still requires a real ArrayBuffer view, so plain
    // JSON-deserialized `{ constructor: ... }` spoofing is rejected, and
    // `BYTES_PER_ELEMENT === 1` keeps the fallback on byte-oriented views.
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array' && 'BYTES_PER_ELEMENT' in a && a.BYTES_PER_ELEMENT === 1;
}
// Shared error-message prefix builder. Only called on throw paths, so assert
// success paths never pay for the string concatenation.
const atitle = (title)=>title ? `"${title}" ` : '';
function anumber(n, title = '') {
    if (typeof n !== 'number') throw new TypeError(atitle(title) + 'expected number, got ' + typeof n);
    if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(atitle(title) + 'expected integer >= 0, got ' + n);
    return n;
}
function abool(value, title = '') {
    if (typeof value !== 'boolean') throw new TypeError(atitle(title) + 'expected boolean, got type=' + typeof value);
    return value;
}
function abytes(value, length, title = '') {
    // Success path first: this runs at the start of every update() / digestInto(), and the
    // common `abytes(data)` form must not pay for length handling it does not use.
    if (isBytes(value) && (length === undefined || value.length === length)) return value;
    // Error path: recompute freely to build the exact message.
    if (length !== undefined) anumber(length, 'length');
    const bytes = isBytes(value);
    const ofLen = length !== undefined ? ` of length ${length}` : '';
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = atitle(title) + 'expected Uint8Array' + ofLen + ', got ' + got;
    if (!bytes) throw new TypeError(message);
    throw new RangeError(message);
}
function copyBytes(bytes) {
    // `Uint8Array.from(...)` would also accept arrays / other typed arrays. Keep this helper strict
    // because callers use it at byte-validation boundaries before mutating the detached copy.
    return Uint8Array.from(abytes(bytes));
}
function ahash(h) {
    if (typeof h !== 'function' || typeof h.create !== 'function') throw new TypeError('expected hash wrapped by utils.createHasher');
    anumber(h.outputLen);
    anumber(h.blockLen);
    // HMAC and KDF callers treat these as real byte lengths; allowing zero lets fake wrappers pass
    // validation and can produce empty outputs instead of failing fast.
    if (h.outputLen < 1 || h.blockLen < 1) throw new Error('hash blockLen / outputLen must be >= 1');
}
const aobject = (value, label)=>{
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError((label === 'object' ? '' : `"${label}" `) + 'expected object, got type=' + typeof value);
};
const aopts = (value, label)=>{
    aobject(value, label);
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`"${label}" expected plain object`);
    // Object.assign() treats an own "__proto__" source key as a write to the target's legacy
    // prototype setter. Reject it before merging so inherited option values cannot be injected.
    if (Object.hasOwn(value, '__proto__')) throw new TypeError(`"${label}.__proto__" is not allowed`);
};
function aexists(instance, checkFinished = true) {
    // Runs on every update()/digestInto(); the flags are library-owned booleans, so only their
    // truthiness is checked - re-validating their type per call was pure hot-path overhead.
    if (instance.destroyed) throw new Error('hash was destroyed');
    if (checkFinished && instance.finished) throw new Error('digest() was already called');
}
function aoutput(out, instance) {
    abytes(out, undefined, 'output');
    // `outputLen` is a library-owned readonly number; the negated comparison keeps failing fast
    // when it is missing/NaN (comparisons with undefined/NaN are false) without an anumber() call.
    const min = instance.outputLen;
    if (!(out.length >= min)) {
        throw new RangeError('"output" expected length >= ' + min);
    }
}
function u8(arr) {
    return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
}
function u32(arr) {
    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
    for(let i = 0; i < arrays.length; i++){
        arrays[i].fill(0);
    }
}
function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
    return word << 32 - shift | word >>> shift;
}
function rotl(word, shift) {
    return word << shift | word >>> 32 - shift >>> 0;
}
const isLE = /* @__PURE__ */ (()=>new Uint8Array(new Uint32Array([
        0x11223344
    ]).buffer)[0] === 0x44)();
function byteSwap(word) {
    return word << 24 & 0xff000000 | word << 8 & 0xff0000 | word >>> 8 & 0xff00 | word >>> 24 & 0xff;
}
const swap8IfBE = isLE ? (n)=>n : (n)=>byteSwap(n) >>> 0;
function byteSwap32(arr) {
    for(let i = 0; i < arr.length; i++){
        arr[i] = byteSwap(arr[i]);
    }
    return arr;
}
const swap32IfBE = isLE ? (u)=>u : byteSwap32;
// Built-in hex conversion https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex
const hasHexBuiltin = /* @__PURE__ */ (()=>// @ts-ignore
    typeof Uint8Array.from([]).toHex === 'function' && typeof Uint8Array.fromHex === 'function')();
// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = /* @__PURE__ */ Array.from({
    length: 256
}, (_, i)=>i.toString(16).padStart(2, '0'));
function bytesToHex(bytes) {
    abytes(bytes);
    // @ts-ignore
    if (hasHexBuiltin) return bytes.toHex();
    // pre-caching improves the speed 6x
    let hex = '';
    for(let i = 0; i < bytes.length; i++){
        hex += hexes[bytes[i]];
    }
    return hex;
}
// Strict ASCII nibble parser: non-ASCII hex lookalikes are rejected as undefined.
// ASCII codes: '0'..'9' = 48..57, 'A'..'F' = 65..70, 'a'..'f' = 97..102.
// prettier-ignore
function asciiToBase16(ch) {
    return ch >= 48 && ch <= 57 ? ch - 48 // '2' => 50-48
     : ch >= 65 && ch <= 70 ? ch - (65 - 10) // 'B' => 66-(65-10)
     : ch >= 97 && ch <= 102 ? ch - (97 - 10) // 'b' => 98-(97-10)
     : undefined;
}
function hexToBytes(hex) {
    if (typeof hex !== 'string') throw new TypeError('hex string expected, got ' + typeof hex);
    if (hasHexBuiltin) {
        try {
            return Uint8Array.fromHex(hex);
        } catch (error) {
            if (error instanceof SyntaxError) throw new RangeError(error.message);
            throw error;
        }
    }
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2) throw new RangeError('hex string expected, got unpadded hex of length ' + hl);
    const array = new Uint8Array(al);
    for(let ai = 0, hi = 0; ai < al; ai++, hi += 2){
        const n1 = asciiToBase16(hex.charCodeAt(hi)); // parse first char, multiply it by 16
        const n2 = asciiToBase16(hex.charCodeAt(hi + 1)); // parse second char
        if (n1 === undefined || n2 === undefined) {
            const char = hex[hi] + hex[hi + 1];
            throw new RangeError('hex string expected, got non-hex character "' + char + '" at index ' + hi);
        }
        array[ai] = n1 * 16 + n2; // example: 'A9' => 10*16 + 9
    }
    return array;
}
function nextTick(onReject) {
    const host = globalThis;
    if (typeof host.scheduler?.yield === 'function') {
        const promise = host.scheduler.yield();
        // Keep the original scheduler rejection; this handler exists only for cleanup.
        if (onReject) promise.catch(onReject);
        return promise;
    }
    return new Promise((resolve)=>host.setTimeout(resolve, 0));
}
async function asyncLoop(iters, tick, cb, onReject) {
    anumber(iters, 'iters');
    anumber(tick, 'tick');
    if (typeof cb !== 'function') throw new TypeError('callback must be a function');
    // Callback is synchronous by contract; asyncLoop only yields between sync work windows.
    let ts = Date.now();
    for(let i = 0; i < iters; i++){
        cb(i);
        // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
        const diff = Date.now() - ts;
        if (diff >= 0 && diff < tick) continue;
        await nextTick(onReject);
        // Track only synchronous work time; scheduler delay after yielding is outside our budget.
        ts = Date.now();
    }
}
function utf8ToBytes(str) {
    if (typeof str !== 'string') throw new TypeError('string expected');
    const encoded = new TextEncoder().encode(str);
    try {
        // Copy into the current realm for Firefox extension contexts. Callers that own the returned
        // buffer can then wipe it independently of TextEncoder's temporary result.
        return new Uint8Array(encoded); // https://bugzil.la/1681809
    } finally{
        clean(encoded);
    }
}
function kdfInputToBytes(data, errorTitle = '') {
    if (typeof data === 'string') return utf8ToBytes(data);
    return abytes(data, undefined, errorTitle);
}
function concatBytes(...arrays) {
    let sum = 0;
    for(let i = 0; i < arrays.length; i++){
        const a = arrays[i];
        abytes(a);
        sum += a.length;
    }
    const res = new Uint8Array(sum);
    for(let i = 0, pad = 0; i < arrays.length; i++){
        const a = arrays[i];
        res.set(a, pad);
        pad += a.length;
    }
    return res;
}
const validateObject = (object, fields = {}, optFields = {}, title = 'object')=>{
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
};
function checkOpts(defaults, opts, title = 'opts') {
    aopts(defaults, 'defaults');
    if (opts !== undefined) aopts(opts, title);
    // Callers read optional fields directly, so omitted values must not fall through to ambient
    // Object.prototype pollution (for example a forged `dkLen` changing SHAKE's default output).
    const merged = Object.assign(Object.create(null), defaults, opts);
    return merged;
}
function createHasher(hashCons, info = {}) {
    if (typeof hashCons !== 'function') throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
    info = checkOpts({}, info, 'info');
    const hashC = (msg, opts)=>hashCons(opts).update(msg).digest();
    const tmp = hashCons(undefined);
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.canXOF = tmp.canXOF;
    hashC.create = (opts)=>hashCons(opts);
    Object.assign(hashC, info);
    return Object.freeze(hashC);
}
function randomBytes(bytesLength = 32) {
    // Match the repo's other length-taking helpers instead of relying on Uint8Array coercion.
    anumber(bytesLength, 'bytesLength');
    const cr = typeof globalThis === 'object' ? globalThis.crypto : null;
    if (typeof cr?.getRandomValues !== 'function') throw new Error('crypto.getRandomValues must be defined');
    // Web Cryptography API Level 2 §10.1.1:
    // if `byteLength > 65536`, throw `QuotaExceededError`.
    // Keep the guard explicit so callers can see the quota in code
    // instead of discovering it by reading the spec or host errors.
    // This wrapper surfaces the same quota as a stable library RangeError.
    if (bytesLength > 65536) throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
    return cr.getRandomValues(new Uint8Array(bytesLength));
}
const oidNist = (suffix)=>({
        // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
        // Larger suffix values would need base-128 OID encoding and a different length byte.
        oid: Uint8Array.from([
            0x06,
            0x09,
            0x60,
            0x86,
            0x48,
            0x01,
            0x65,
            0x03,
            0x04,
            0x02,
            suffix
        ])
    });
}),
];

//# sourceMappingURL=_1o0lonw._.js.map