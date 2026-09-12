(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/platform/web/src/components/fx/Clip.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "box": "Clip-module__8dmiPa__box",
  "control": "Clip-module__8dmiPa__control",
  "controls": "Clip-module__8dmiPa__controls",
  "empty": "Clip-module__8dmiPa__empty",
  "video": "Clip-module__8dmiPa__video",
});
}),
"[project]/platform/web/src/components/fx/Clip.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Clip",
    ()=>Clip
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Clip$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/fx/Clip.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function Clip({ clip, fallback, ratio, priority = false, sound = false, className = "", children }) {
    _s();
    const videoRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [ready, setReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [muted, setMuted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [playing, setPlaying] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [reduced, setReduced] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const labelId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Clip.useEffect": ()=>{
            const video = videoRef.current;
            if (!video) return;
            const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
            const apply = {
                "Clip.useEffect.apply": ()=>setReduced(motion.matches)
            }["Clip.useEffect.apply"];
            apply();
            motion.addEventListener("change", apply);
            // Play only what the viewer can actually see.
            const observer = new IntersectionObserver({
                "Clip.useEffect": ([entry])=>{
                    if (motion.matches) return;
                    if (entry.isIntersecting) {
                        video.play().then({
                            "Clip.useEffect": ()=>setPlaying(true)
                        }["Clip.useEffect"]).catch({
                            "Clip.useEffect": ()=>{
                            /* autoplay refused; the poster stays and the control appears */ }
                        }["Clip.useEffect"]);
                    } else {
                        video.pause();
                        setPlaying(false);
                    }
                }
            }["Clip.useEffect"], {
                threshold: 0.25
            });
            observer.observe(video);
            const onVisibility = {
                "Clip.useEffect.onVisibility": ()=>{
                    if (document.visibilityState === "hidden") video.pause();
                }
            }["Clip.useEffect.onVisibility"];
            document.addEventListener("visibilitychange", onVisibility);
            return ({
                "Clip.useEffect": ()=>{
                    observer.disconnect();
                    motion.removeEventListener("change", apply);
                    document.removeEventListener("visibilitychange", onVisibility);
                }
            })["Clip.useEffect"];
        }
    }["Clip.useEffect"], [
        clip?.src
    ]);
    if (!clip) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Clip$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].box} ${className}`,
            style: {
                aspectRatio: ratio ?? "16 / 9"
            },
            children: [
                fallback ?? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Clip$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].empty,
                    "aria-hidden": "true"
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/fx/Clip.tsx",
                    lineNumber: 84,
                    columnNumber: 22
                }, this),
                children
            ]
        }, void 0, true, {
            fileName: "[project]/platform/web/src/components/fx/Clip.tsx",
            lineNumber: 83,
            columnNumber: 7
        }, this);
    }
    const toggle = ()=>{
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false));
        } else {
            video.pause();
            setPlaying(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Clip$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].box} ${className}`,
        style: {
            aspectRatio: ratio ?? `${clip.width} / ${clip.height}`
        },
        "data-ready": ready,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                ref: videoRef,
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Clip$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].video,
                poster: clip.poster,
                muted: muted,
                loop: true,
                playsInline: true,
                preload: priority ? "auto" : "none",
                autoPlay: priority,
                "aria-labelledby": labelId,
                onLoadedData: ()=>setReady(true),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
                    src: clip.src,
                    type: "video/mp4"
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/fx/Clip.tsx",
                    lineNumber: 119,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/fx/Clip.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                id: labelId,
                className: "sr-only",
                children: clip.alt
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/fx/Clip.tsx",
                lineNumber: 122,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Clip$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].controls,
                children: [
                    reduced && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Clip$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].control,
                        onClick: toggle,
                        "aria-pressed": playing,
                        children: playing ? "Pause" : "Play"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/fx/Clip.tsx",
                        lineNumber: 128,
                        columnNumber: 11
                    }, this),
                    sound && clip.audio && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Clip$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].control,
                        onClick: ()=>{
                            setMuted((m)=>!m);
                            const video = videoRef.current;
                            if (video?.paused) void video.play().then(()=>setPlaying(true)).catch(()=>{});
                        },
                        "aria-pressed": !muted,
                        children: muted ? "Sound on" : "Sound off"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/fx/Clip.tsx",
                        lineNumber: 133,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/fx/Clip.tsx",
                lineNumber: 126,
                columnNumber: 7
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/fx/Clip.tsx",
        lineNumber: 102,
        columnNumber: 5
    }, this);
}
_s(Clip, "r7W8bpvnN6aJl/2qR4I4Rd60OqY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = Clip;
var _c;
__turbopack_context__.k.register(_c, "Clip");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/fx/Reveal.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "reveal": "Reveal-module__-ImA_a__reveal",
});
}),
"[project]/platform/web/src/components/fx/Reveal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Reveal",
    ()=>Reveal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Reveal$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/fx/Reveal.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...rest }) {
    _s();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Reveal.useEffect": ()=>{
            const node = ref.current;
            if (!node) return;
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                node.dataset.shown = "true";
                return;
            }
            const observer = new IntersectionObserver({
                "Reveal.useEffect": ([entry])=>{
                    if (!entry.isIntersecting) return;
                    node.dataset.shown = "true";
                    observer.disconnect();
                }
            }["Reveal.useEffect"], {
                threshold: 0.15,
                rootMargin: "0px 0px -8% 0px"
            });
            observer.observe(node);
            return ({
                "Reveal.useEffect": ()=>observer.disconnect()
            })["Reveal.useEffect"];
        }
    }["Reveal.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Tag, {
        ref: ref,
        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Reveal$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].reveal} ${className}`,
        "data-shown": "false",
        style: {
            "--reveal-delay": `${delay}s`
        },
        ...rest,
        children: children
    }, void 0, false, {
        fileName: "[project]/platform/web/src/components/fx/Reveal.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
_s(Reveal, "8uVE59eA/r6b92xF80p7sH8rXLk=");
_c = Reveal;
var _c;
__turbopack_context__.k.register(_c, "Reveal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/landing/CheckFilm.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "check": "CheckFilm-module__PuPlQG__check",
  "error": "CheckFilm-module__PuPlQG__error",
  "missing": "CheckFilm-module__PuPlQG__missing",
  "missingTitle": "CheckFilm-module__PuPlQG__missingTitle",
  "placeholder": "CheckFilm-module__PuPlQG__placeholder",
  "result": "CheckFilm-module__PuPlQG__result",
});
}),
"[project]/platform/web/src/components/landing/CheckFilm.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CheckFilm",
    ()=>CheckFilm
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$DropZone$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/verify/DropZone.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/verify/EndCredits.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$useCertificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/verify/useCertificate.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CheckFilm$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/landing/CheckFilm.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function CheckFilm() {
    _s();
    const { state, checkFile, reset } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$useCertificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCertificate"])();
    const busy = state.kind === "hashing" || state.kind === "looking";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CheckFilm$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].check,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$DropZone$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropZone"], {
                onFile: (file)=>void checkFile(file),
                busy: busy,
                size: "small",
                inputId: "landing-check",
                title: busy ? state.kind === "hashing" ? "Hashing in your browser…" : "Looking up the certificate…" : "Drop a video to check it",
                hint: "Only the file's SHA-256 fingerprint leaves your browser."
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CheckFilm$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].result,
                "aria-live": "polite",
                children: [
                    state.kind === "idle" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CheckFilm$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].placeholder,
                        children: "Any film made on KunoWorld can be checked by anyone, without an account. Try one you downloaded from the studio."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                        lineNumber: 29,
                        columnNumber: 11
                    }, this),
                    state.kind === "missing" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CheckFilm$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].missing,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: `display ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CheckFilm$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].missingTitle}`,
                                children: "No KunoWorld certificate matches this file."
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                                lineNumber: 36,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "muted",
                                children: "Edited, re-encoded or re-uploaded copies have a different hash, so they won't match either."
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                                lineNumber: 37,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "btn btn-small",
                                onClick: reset,
                                children: "Try another"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                                lineNumber: 40,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                        lineNumber: 35,
                        columnNumber: 11
                    }, this),
                    state.kind === "error" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CheckFilm$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].error,
                        role: "alert",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                children: state.error.title
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                                lineNumber: 47,
                                columnNumber: 13
                            }, this),
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: state.error.detail
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                                lineNumber: 47,
                                columnNumber: 50
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                        lineNumber: 46,
                        columnNumber: 11
                    }, this),
                    state.kind === "found" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EndCredits"], {
                        variant: "compact",
                        lines: [
                            {
                                role: "Model",
                                value: state.prov.model.name
                            },
                            ...state.prov.model.attribution ? [
                                {
                                    role: "Attribution",
                                    value: state.prov.model.attribution
                                }
                            ] : [],
                            {
                                role: "Signature",
                                value: state.checks.signature && state.prov.signature_valid ? "Valid ✓" : "Invalid ✗",
                                tone: state.checks.signature && state.prov.signature_valid ? "ok" : "bad"
                            },
                            {
                                role: "Rendered",
                                value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utcStamp"])(state.prov.receipt.body.finished_at)
                            },
                            {
                                role: "Content hash",
                                value: state.digest,
                                mono: true
                            }
                        ],
                        footer: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            className: "link",
                            href: `/verify?sha256=${state.digest}`,
                            children: "Read the full certificate"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                            lineNumber: 65,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                        lineNumber: 51,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
                lineNumber: 27,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/landing/CheckFilm.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_s(CheckFilm, "eJDRPKIeiZebiRhe7bwKqgs6Z+0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$useCertificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCertificate"]
    ];
});
_c = CheckFilm;
var _c;
__turbopack_context__.k.register(_c, "CheckFilm");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/landing/CreditsRoll.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "caption": "CreditsRoll-module__aVXonG__caption",
  "crawl": "CreditsRoll-module__aVXonG__crawl",
  "figure": "CreditsRoll-module__aVXonG__figure",
  "roll": "CreditsRoll-module__aVXonG__roll",
});
}),
"[project]/platform/web/src/components/landing/CreditsRoll.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CreditsRoll",
    ()=>CreditsRoll
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/verify/EndCredits.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CreditsRoll$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/landing/CreditsRoll.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
const LINES = [
    {
        role: "Directed by",
        value: "You"
    },
    {
        role: "Model",
        value: "MiniMax H3 Turbo"
    },
    {
        role: "Attribution",
        value: "MiniMax H3"
    },
    {
        role: "Stage",
        value: `Sealed stage ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["edgeCode"])("stage", 8)}…`,
        mono: true
    },
    {
        role: "Proof of hardware",
        value: "Checked by your browser before anything was sent"
    },
    {
        role: "Software image",
        value: `sha256:${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["edgeCode"])("image", 12)}…${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["edgeCode"])("image-tail", 6)}`,
        mono: true
    },
    {
        role: "Content hash",
        value: `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["edgeCode"])("content", 16)}…${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["edgeCode"])("content-tail", 8)}`,
        mono: true
    },
    {
        role: "Signature",
        value: "Valid ✓",
        tone: "ok"
    },
    {
        role: "Rendered",
        value: "2026-09-11 21:04 UTC · 38 s in the stage"
    },
    {
        role: "Format",
        value: "1344×768 · 24 fps · 8 s · stereo audio"
    },
    {
        role: "Seen by",
        value: "Nobody else"
    }
];
function CreditsRoll() {
    _s();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CreditsRoll.useEffect": ()=>{
            const el = ref.current;
            if (!el) return;
            const io = new IntersectionObserver({
                "CreditsRoll.useEffect": ([entry])=>{
                    el.dataset.running = entry.isIntersecting ? "true" : "false";
                }
            }["CreditsRoll.useEffect"]);
            io.observe(el);
            return ({
                "CreditsRoll.useEffect": ()=>io.disconnect()
            })["CreditsRoll.useEffect"];
        }
    }["CreditsRoll.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("figure", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CreditsRoll$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].figure,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: ref,
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CreditsRoll$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].roll,
                "data-running": "false",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CreditsRoll$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].crawl,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EndCredits"], {
                        lines: LINES,
                        title: "Certificate",
                        kicker: "A KunoWorld film"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/CreditsRoll.tsx",
                        lineNumber: 42,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/landing/CreditsRoll.tsx",
                    lineNumber: 41,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/landing/CreditsRoll.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("figcaption", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$CreditsRoll$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].caption,
                children: "Example certificate — values are illustrative. Real ones are looked up by the film's hash."
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/landing/CreditsRoll.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/landing/CreditsRoll.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
_s(CreditsRoll, "8uVE59eA/r6b92xF80p7sH8rXLk=");
_c = CreditsRoll;
var _c;
__turbopack_context__.k.register(_c, "CreditsRoll");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/landing/DevelopingFrame.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "background": "DevelopingFrame-module__lErBuG__background",
  "canvas": "DevelopingFrame-module__lErBuG__canvas",
  "caption": "DevelopingFrame-module__lErBuG__caption",
  "edge": "DevelopingFrame-module__lErBuG__edge",
  "fallback": "DevelopingFrame-module__lErBuG__fallback",
  "frame": "DevelopingFrame-module__lErBuG__frame",
  "gate": "DevelopingFrame-module__lErBuG__gate",
  "mono": "DevelopingFrame-module__lErBuG__mono",
  "replay": "DevelopingFrame-module__lErBuG__replay",
});
}),
"[project]/platform/web/src/components/landing/DevelopingFrame.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DevelopingFrame",
    ()=>DevelopingFrame
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/landing/DevelopingFrame.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
/*
 * The hero: a procedural still that "develops" like a print in a tray.
 * Under the safelight the shadows come up first, then the midtones; the tray
 * settles, the tungsten light comes on, and the keeper lights the lamp.
 * WebGL1, one full-screen triangle, paused offscreen and when the tab is hidden.
 */ const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }
`;
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_expose;
uniform float u_develop;
uniform float u_agitate;
uniform float u_light;
uniform float u_lamp;
uniform float u_push;
varying vec2 v_uv;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

const float HORIZON = 0.40;

float cliffAt(float x) {
  return HORIZON + 0.25 * smoothstep(0.44, 0.03, x) + 0.018 * fbm(vec2(x * 16.0, 3.1)) - 0.008;
}

vec3 scene(vec2 uv, float t, float aspect) {
  float x = uv.x, y = uv.y;
  vec2 p = vec2(x * aspect, y);
  vec2 sun = vec2(0.70, HORIZON + 0.03);

  // Dusk sky
  float sy = clamp((y - HORIZON) / (1.0 - HORIZON), 0.0, 1.0);
  vec3 col = mix(vec3(0.98, 0.60, 0.28), vec3(0.45, 0.25, 0.20), smoothstep(0.0, 0.32, sy));
  col = mix(col, vec3(0.09, 0.10, 0.14), smoothstep(0.28, 1.0, sy));
  float r = length(vec2((x - sun.x) * aspect, y - sun.y));
  col += vec3(1.0, 0.58, 0.26) * 0.6 * exp(-r * 6.5);
  col += vec3(1.0, 0.86, 0.62) * smoothstep(0.036, 0.029, r) * step(HORIZON, y);

  // Clouds, lit from below
  float c = fbm(vec2(x * aspect * 1.3 + t * 0.006, y * 8.0));
  float band = smoothstep(0.47, 0.8, c) * smoothstep(HORIZON + 0.02, HORIZON + 0.14, y);
  vec3 lit = mix(vec3(0.22, 0.12, 0.12), vec3(1.0, 0.64, 0.38), exp(-abs(x - sun.x) * 2.4) * (1.0 - sy * 0.8));
  col = mix(col, lit, band * 0.8);

  // Sea
  if (y < HORIZON) {
    float sd = (HORIZON - y) / HORIZON;
    float w = fbm(vec2(p.x * 2.2 + t * 0.012, y * 55.0 / (0.25 + sd) * 0.25 - t * 0.06));
    vec3 sea = mix(vec3(0.40, 0.23, 0.17), vec3(0.035, 0.035, 0.045), smoothstep(0.0, 0.75, sd));
    sea *= 0.7 + 0.55 * w;
    float path = exp(-pow((x - sun.x) * aspect / (0.035 + sd * 0.28), 2.0));
    float sparkle = smoothstep(0.64, 0.92, noise(vec2(p.x * 95.0, y * 280.0 + t * 0.7)));
    sea += vec3(1.0, 0.68, 0.36) * path * (0.22 + sparkle * 1.3) * (1.0 - sd * 0.55);
    col = sea;
  }

  // Headland
  float cliff = cliffAt(x);
  float land = smoothstep(cliff + 0.0025, cliff - 0.0025, y);
  vec3 landCol = vec3(0.03, 0.026, 0.026) + vec3(0.30, 0.13, 0.06) * 0.12 * smoothstep(cliff - 0.05, cliff, y);
  col = mix(col, landCol, land);

  // Lighthouse
  float lx = 0.155;
  float base = cliffAt(lx) - 0.01;
  float towerH = 0.25;
  float ty = (y - base) / towerH;
  float halfW = mix(0.024, 0.016, clamp(ty, 0.0, 1.0));
  float tower = step(0.0, ty) * step(ty, 1.0) * step(abs(p.x - lx * aspect), halfW);
  vec3 towerCol = vec3(0.05, 0.045, 0.045) + 0.035 * step(0.5, fract(ty * 4.0)) + vec3(0.25, 0.12, 0.05) * 0.2 * smoothstep(-0.02, 0.02, p.x - lx * aspect);
  col = mix(col, towerCol, tower);
  vec2 lamp = vec2(lx * aspect, base + towerH + 0.02);
  float room = step(abs(p.x - lamp.x), 0.021) * step(abs(y - lamp.y), 0.02);
  col = mix(col, vec3(0.07, 0.06, 0.055), room);
  float capY = y - (lamp.y + 0.02);
  float cap = step(0.0, capY) * step(capY, 0.026) * step(abs(p.x - lamp.x), 0.026 - capY * 0.95);
  col = mix(col, vec3(0.035), cap);

  // The lamp and its beam
  vec2 d = p - lamp;
  float lr = length(d);
  float glow = smoothstep(0.017, 0.004, lr) * 1.6 + exp(-lr * 16.0) * 0.55;
  col += u_lamp * vec3(1.0, 0.8, 0.5) * glow;
  float ang = atan(d.y, d.x);
  float sweep = sin(t * 0.45) * 0.28 - 0.06;
  float beam = exp(-pow((ang - sweep) / 0.07, 2.0)) * smoothstep(0.015, 0.06, lr) * exp(-lr * 0.8);
  col += u_lamp * vec3(1.0, 0.82, 0.55) * beam * 0.42 * (1.0 - land);
  // Halation around bright points, as on film
  col += vec3(0.55, 0.12, 0.05) * (exp(-r * 12.0) * 0.25 + u_lamp * exp(-lr * 10.0) * 0.3);
  return col;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 uv = (v_uv - 0.5) / (1.0 + 0.04 * u_push) + 0.5;
  uv += u_agitate * 0.006 * vec2(sin(uv.y * 17.0 + u_time * 2.1), cos(uv.x * 13.0 + u_time * 1.6));

  vec3 img = clamp(scene(uv, u_time, aspect), 0.0, 1.0);
  float L = dot(img, vec3(0.299, 0.587, 0.114));
  float D = 1.0 - L;

  // Development: dense (shadow) areas appear first, broken up so it never reads as a threshold.
  float n = fbm(uv * vec2(aspect, 1.0) * 5.0 + 3.0);
  float dev = clamp((u_develop * 1.38 - (1.0 - D) * 0.92 - (n - 0.5) * 0.2) / 0.34, 0.0, 1.0);
  dev = dev * dev * (3.0 - 2.0 * dev);

  vec3 paper = vec3(0.31, 0.085, 0.055);
  vec3 safelit = paper * (1.0 - D * dev * 0.97);
  safelit += paper * u_agitate * 0.08 * noise(uv * vec2(aspect, 1.0) * 9.0 + u_time * 0.4);
  vec3 graded = pow(img, vec3(1.05)) * vec3(1.05, 0.98, 0.88);
  vec3 col = mix(safelit, graded, u_light) * u_expose;

  vec2 q = v_uv - 0.5;
  col *= 1.0 - dot(q * vec2(0.9, 1.5), q * vec2(0.9, 1.5)) * 0.7;
  col += (hash(v_uv * u_res + fract(u_time * 7.13) * 91.0) - 0.5) * 0.055;
  gl_FragColor = vec4(col, 1.0);
}
`;
const FINAL_T = 9.5;
function seg(t, a, b) {
    const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
}
function timeline(t) {
    return {
        expose: seg(t, 0.1, 1.3),
        develop: seg(t, 0.9, 5.8),
        agitate: seg(t, 0.6, 1.4) * (1 - seg(t, 3.8, 6.2)),
        light: seg(t, 5.9, 7.4),
        lamp: seg(t, 7.3, 8.1),
        push: Math.min(1, t / 50)
    };
}
function compile(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
function DevelopingFrame({ background = false } = {}) {
    _s();
    var _s1 = __turbopack_context__.k.signature();
    const wrapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const replayRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])({
        "DevelopingFrame.useRef[replayRef]": ()=>{}
    }["DevelopingFrame.useRef[replayRef]"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(_s1({
        "DevelopingFrame.useEffect": ()=>{
            _s1();
            const wrap = wrapRef.current;
            const canvas = canvasRef.current;
            if (!wrap || !canvas) return;
            const gl = canvas.getContext("webgl", {
                antialias: false,
                alpha: false,
                powerPreference: "low-power"
            });
            const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT);
            const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG);
            const program = gl && vs && fs ? gl.createProgram() : null;
            if (!gl || !program || !vs || !fs) {
                wrap.dataset.phase = "fallback";
                return;
            }
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                wrap.dataset.phase = "fallback";
                return;
            }
            gl.useProgram(program);
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1,
                -1,
                3,
                -1,
                -1,
                3
            ]), gl.STATIC_DRAW);
            const loc = gl.getAttribLocation(program, "a_pos");
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
            const u = {
                "DevelopingFrame.useEffect.u": (name)=>gl.getUniformLocation(program, name)
            }["DevelopingFrame.useEffect.u"];
            const uni = {
                res: u("u_res"),
                time: u("u_time"),
                expose: u("u_expose"),
                develop: u("u_develop"),
                agitate: u("u_agitate"),
                light: u("u_light"),
                lamp: u("u_lamp"),
                push: u("u_push")
            };
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            let start = performance.now();
            let raf = 0;
            let onscreen = true;
            const resize = {
                "DevelopingFrame.useEffect.resize": ()=>{
                    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
                    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
                    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
                    if (canvas.width !== w || canvas.height !== h) {
                        canvas.width = w;
                        canvas.height = h;
                        gl.viewport(0, 0, w, h);
                    }
                }
            }["DevelopingFrame.useEffect.resize"];
            const draw = {
                "DevelopingFrame.useEffect.draw": (now)=>{
                    resize();
                    const t = reduce ? FINAL_T : (now - start) / 1000;
                    const k = timeline(t);
                    gl.uniform2f(uni.res, canvas.width, canvas.height);
                    gl.uniform1f(uni.time, reduce ? 4 : t);
                    gl.uniform1f(uni.expose, k.expose);
                    gl.uniform1f(uni.develop, k.develop);
                    gl.uniform1f(uni.agitate, k.agitate);
                    gl.uniform1f(uni.light, k.light);
                    gl.uniform1f(uni.lamp, k.lamp);
                    gl.uniform1f(uni.push, reduce ? 0 : k.push);
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                    const phase = k.light > 0.5 ? "lit" : k.expose > 0 ? "developing" : "dark";
                    if (wrap.dataset.phase !== phase) wrap.dataset.phase = phase;
                }
            }["DevelopingFrame.useEffect.draw"];
            const loop = {
                "DevelopingFrame.useEffect.loop": (now)=>{
                    draw(now);
                    raf = onscreen && !reduce && document.visibilityState === "visible" ? requestAnimationFrame(loop) : 0;
                }
            }["DevelopingFrame.useEffect.loop"];
            const kick = {
                "DevelopingFrame.useEffect.kick": ()=>{
                    if (!raf) raf = requestAnimationFrame(loop);
                }
            }["DevelopingFrame.useEffect.kick"];
            const onContextLost = {
                "DevelopingFrame.useEffect.onContextLost": (e)=>{
                    e.preventDefault();
                    cancelAnimationFrame(raf);
                    raf = 0;
                    wrap.dataset.phase = "fallback";
                }
            }["DevelopingFrame.useEffect.onContextLost"];
            canvas.addEventListener("webglcontextlost", onContextLost);
            const io = new IntersectionObserver({
                "DevelopingFrame.useEffect": ([entry])=>{
                    onscreen = entry.isIntersecting;
                    if (onscreen) kick();
                }
            }["DevelopingFrame.useEffect"]);
            io.observe(canvas);
            const ro = new ResizeObserver({
                "DevelopingFrame.useEffect": ()=>kick()
            }["DevelopingFrame.useEffect"]);
            ro.observe(canvas);
            const onVisibility = {
                "DevelopingFrame.useEffect.onVisibility": ()=>{
                    if (document.visibilityState === "visible") kick();
                }
            }["DevelopingFrame.useEffect.onVisibility"];
            document.addEventListener("visibilitychange", onVisibility);
            replayRef.current = ({
                "DevelopingFrame.useEffect": ()=>{
                    start = performance.now();
                    kick();
                }
            })["DevelopingFrame.useEffect"];
            kick();
            return ({
                "DevelopingFrame.useEffect": ()=>{
                    cancelAnimationFrame(raf);
                    io.disconnect();
                    ro.disconnect();
                    document.removeEventListener("visibilitychange", onVisibility);
                    canvas.removeEventListener("webglcontextlost", onContextLost);
                    replayRef.current = ({
                        "DevelopingFrame.useEffect": ()=>{}
                    })["DevelopingFrame.useEffect"];
                    // Free this run's GL objects, but keep the context alive: a canvas only ever
                    // hands out one context, so losing it would leave a remount (React Strict Mode,
                    // fast refresh) with a dead context and no picture.
                    gl.deleteProgram(program);
                    gl.deleteShader(vs);
                    gl.deleteShader(fs);
                    gl.deleteBuffer(buffer);
                }
            })["DevelopingFrame.useEffect"];
        }
    }["DevelopingFrame.useEffect"], "ZdQBZ3rq7bWAAMQq6hlVCmYF0jM=", true), []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: wrapRef,
        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].frame} ${background ? __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].background : ""}`,
        "data-phase": "dark",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].gate,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
                        ref: canvasRef,
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].canvas,
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/DevelopingFrame.tsx",
                        lineNumber: 308,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].fallback,
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/DevelopingFrame.tsx",
                        lineNumber: 309,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "sr-only",
                        children: "An illustration: a lighthouse on a headland at dusk slowly develops out of darkness, like a photographic print."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/DevelopingFrame.tsx",
                        lineNumber: 310,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/landing/DevelopingFrame.tsx",
                lineNumber: 307,
                columnNumber: 7
            }, this),
            !background && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].edge,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "mono",
                        "aria-hidden": "true",
                        children: "KW 5219 ▸ 047 · 2.39:1"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/DevelopingFrame.tsx",
                        lineNumber: 316,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].caption,
                        children: "A procedural still, developed live in your browser — not a model output."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/DevelopingFrame.tsx",
                        lineNumber: 319,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].replay,
                        onClick: ()=>replayRef.current(),
                        children: "Develop again"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/DevelopingFrame.tsx",
                        lineNumber: 320,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/landing/DevelopingFrame.tsx",
                lineNumber: 315,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/landing/DevelopingFrame.tsx",
        lineNumber: 306,
        columnNumber: 5
    }, this);
}
_s(DevelopingFrame, "V/0ngB/pBk3W7CBfhMiYOAQmpW8=");
_c = DevelopingFrame;
var _c;
__turbopack_context__.k.register(_c, "DevelopingFrame");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/landing/FilmStocks.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "band": "FilmStocks-module__jtJIeW__band",
  "bestFor": "FilmStocks-module__jtJIeW__bestFor",
  "box": "FilmStocks-module__jtJIeW__box",
  "brand": "FilmStocks-module__jtJIeW__brand",
  "header": "FilmStocks-module__jtJIeW__header",
  "rate": "FilmStocks-module__jtJIeW__rate",
  "region": "FilmStocks-module__jtJIeW__region",
  "specs": "FilmStocks-module__jtJIeW__specs",
  "spine": "FilmStocks-module__jtJIeW__spine",
  "stockName": "FilmStocks-module__jtJIeW__stockName",
  "stocks": "FilmStocks-module__jtJIeW__stocks",
  "variantMeta": "FilmStocks-module__jtJIeW__variantMeta",
  "variantName": "FilmStocks-module__jtJIeW__variantName",
  "variants": "FilmStocks-module__jtJIeW__variants",
});
}),
"[project]/platform/web/src/components/landing/FilmStocks.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FilmStocks",
    ()=>FilmStocks
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$AvailabilityPill$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/AvailabilityPill.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$LiveModels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/LiveModels.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/shot.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/landing/FilmStocks.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function span(profiles, pick) {
    const all = profiles.flatMap(pick);
    return [
        Math.min(...all),
        Math.max(...all)
    ];
}
function h3Specs(profiles) {
    const director = profiles.find((p)=>p.modes.includes("reference_to_video"));
    const [dMin, dMax] = span(profiles, (p)=>[
            p.limits.min_duration_s,
            p.limits.max_duration_s
        ]);
    const refs = director?.limits.max_inputs;
    return [
        [
            "Resolution",
            Object.keys(profiles[0].limits.sizes).join(" · ")
        ],
        [
            "Length",
            `${dMin}–${dMax} s`
        ],
        [
            "Sound",
            "Native stereo audio, dialogue included"
        ],
        [
            "References",
            refs ? `Up to ${refs.reference_image} images, ${refs.reference_video} clips and ${refs.reference_audio} audio tracks` : "—"
        ],
        [
            "Frames",
            "First, last, or both"
        ],
        [
            "Direction",
            "Edit, extend, or drive a scene from audio"
        ]
    ];
}
function ltxSpecs(profiles) {
    const [dMin, dMax] = span(profiles, (p)=>[
            p.limits.min_duration_s,
            p.limits.max_duration_s
        ]);
    const [fMin, fMax] = span(profiles, (p)=>p.limits.fps);
    const has4k = profiles.some((p)=>"2160p" in p.limits.sizes);
    const keyframes = Math.max(...profiles.map((p)=>p.limits.max_inputs.keyframe ?? 0));
    return [
        [
            "Resolution",
            has4k ? "720p up to 4K" : "720p–1080p"
        ],
        [
            "Length",
            `${dMin}–${dMax} s`
        ],
        [
            "Frame rate",
            `${fMin}–${fMax} fps`
        ],
        [
            "Keyframes",
            `Up to ${keyframes}, placed on a timeline`
        ],
        [
            "Retake",
            "Regenerate a window, keep the rest"
        ],
        [
            "Sound",
            "Native audio, or picture driven by yours"
        ]
    ];
}
function FilmStocks() {
    _s();
    const live = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$LiveModels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLiveModels"])();
    const profiles = live.data ? live.data.models : __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CATALOG"];
    const country = live.data?.country ?? null;
    const boxes = [
        {
            family: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_H3"],
            specs: h3Specs((0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["familyProfiles"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CATALOG"], __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_H3"]))
        },
        {
            family: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_LTX"],
            specs: ltxSpecs((0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["familyProfiles"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CATALOG"], __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_LTX"]))
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].stocks,
        children: boxes.map(({ family, specs })=>{
            const stock = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STOCKS"][family];
            const members = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["familyProfiles"])(profiles, family);
            const h3 = family === __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_H3"];
            const regionLocked = h3 && live.data && members.every((p)=>p.available_in_region === false);
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].box,
                "data-family": h3 ? "h3" : "ltx",
                "aria-labelledby": `stock-${family}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].band,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: stock.code
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                lineNumber: 70,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: h3 ? "COLOR · SOUND · 24 FPS" : "COLOR · SOUND · TO 50 FPS"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                lineNumber: 71,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                        lineNumber: 69,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].spine,
                        "aria-hidden": "true",
                        children: stock.code
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                        lineNumber: 73,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].header,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                id: `stock-${family}`,
                                className: `display ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].brand}`,
                                children: stock.brand
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                lineNumber: 77,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].stockName,
                                children: stock.stockName
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                lineNumber: 80,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                        lineNumber: 76,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].specs,
                        children: specs.map(([k, v])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                        children: k
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                        lineNumber: 85,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                        children: v
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                        lineNumber: 86,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, k, true, {
                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                lineNumber: 84,
                                columnNumber: 17
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                        lineNumber: 82,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].variants,
                        role: "list",
                        children: members.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].variantName,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: h3 ? p.name : `LTX-2.5 ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(p)}`
                                            }, void 0, false, {
                                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                                lineNumber: 94,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: p.tagline
                                            }, void 0, false, {
                                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                                lineNumber: 95,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                        lineNumber: 93,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].variantMeta,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].rate,
                                                title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ratesOf"])(p).map(([r, v])=>`${r}: ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rate"])(v)}/s`).join(" · "),
                                                children: [
                                                    "from ",
                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rate"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["minRate"])(p)),
                                                    "/s"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                                lineNumber: 98,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$AvailabilityPill$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AvailabilityPill"], {
                                                availability: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["availability"])(p, Boolean(live.data)),
                                                compact: true
                                            }, void 0, false, {
                                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                                lineNumber: 101,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                        lineNumber: 97,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, p.id, true, {
                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                lineNumber: 92,
                                columnNumber: 17
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                        lineNumber: 90,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].bestFor,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "eyebrow",
                                children: "Best for"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                                lineNumber: 107,
                                columnNumber: 15
                            }, this),
                            " ",
                            stock.bestFor
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                        lineNumber: 106,
                        columnNumber: 13
                    }, this),
                    h3 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$FilmStocks$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].region,
                        "data-locked": regionLocked ? "true" : "false",
                        children: regionLocked ? "MiniMax H3 isn't licensed in your region yet — shots you start on H3 render on LTX-2.5 where it can make them." : live.data ? `MiniMax H3 is available where you are${country ? "" : ""}.` : "MiniMax H3 availability depends on your region. Its license doesn't yet cover the US, EU, UK or South Korea."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                        lineNumber: 110,
                        columnNumber: 15
                    }, this)
                ]
            }, family, true, {
                fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
                lineNumber: 68,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/platform/web/src/components/landing/FilmStocks.tsx",
        lineNumber: 61,
        columnNumber: 5
    }, this);
}
_s(FilmStocks, "O2+x1X+vqnTF4pfgzSC4jREJ1A8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$LiveModels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLiveModels"]
    ];
});
_c = FilmStocks;
var _c;
__turbopack_context__.k.register(_c, "FilmStocks");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/landing/HeroReel.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "reel": "HeroReel-module__Bvgh6G__reel",
  "scrim": "HeroReel-module__Bvgh6G__scrim",
  "shot": "HeroReel-module__Bvgh6G__shot",
  "tick": "HeroReel-module__Bvgh6G__tick",
  "ticks": "HeroReel-module__Bvgh6G__ticks",
});
}),
"[project]/platform/web/src/components/landing/HeroReel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HeroReel",
    ()=>HeroReel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$reel$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/reel.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/landing/DevelopingFrame.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$HeroReel$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/landing/HeroReel.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
/*
 * The hero: full-bleed footage behind the headline, one shot at a time.
 *
 * This manages its own <video> elements rather than using <Clip>, because every shot is
 * on screen at once and only one may decode at a time. The active shot plays, the next
 * one preloads, the rest stay parked. When a shot ends the reel crossfades to the next.
 *
 * Fallbacks, in order: real footage → the procedural developing frame (WebGL) → a still
 * gradient. Under reduced motion the reel holds a single poster and never cycles.
 */ const HOLD_MS = 9000; // safety advance if 'ended' never fires (autoplay blocked)
function HeroReel() {
    _s();
    const clips = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$reel$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clipsByRole"])("hero");
    const [active, setActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [reduced, setReduced] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const videos = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HeroReel.useEffect": ()=>{
            const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
            const apply = {
                "HeroReel.useEffect.apply": ()=>setReduced(motion.matches)
            }["HeroReel.useEffect.apply"];
            apply();
            motion.addEventListener("change", apply);
            return ({
                "HeroReel.useEffect": ()=>motion.removeEventListener("change", apply)
            })["HeroReel.useEffect"];
        }
    }["HeroReel.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "HeroReel.useEffect": ()=>{
            if (!clips.length) return;
            // Read the preference here rather than trusting `reduced`: it starts false and is set
            // by a separate effect, so gating on state alone lets the first shot begin playing
            // before we ever learn the viewer asked for stillness.
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                videos.current.forEach({
                    "HeroReel.useEffect": (video)=>video?.pause()
                }["HeroReel.useEffect"]);
                return;
            }
            const current = videos.current[active];
            if (!current) return;
            videos.current.forEach({
                "HeroReel.useEffect": (video, i)=>{
                    if (!video || i === active) return;
                    video.pause();
                    if (i !== (active + 1) % clips.length) video.currentTime = 0;
                }
            }["HeroReel.useEffect"]);
            current.currentTime = 0;
            void current.play().catch({
                "HeroReel.useEffect": ()=>{
                /* refused: the poster carries the frame and the timer still advances the reel */ }
            }["HeroReel.useEffect"]);
            const advance = {
                "HeroReel.useEffect.advance": ()=>setActive({
                        "HeroReel.useEffect.advance": (i)=>(i + 1) % clips.length
                    }["HeroReel.useEffect.advance"])
            }["HeroReel.useEffect.advance"];
            current.addEventListener("ended", advance);
            const timer = window.setTimeout(advance, HOLD_MS);
            return ({
                "HeroReel.useEffect": ()=>{
                    current.removeEventListener("ended", advance);
                    window.clearTimeout(timer);
                }
            })["HeroReel.useEffect"];
        }
    }["HeroReel.useEffect"], [
        active,
        clips.length,
        reduced
    ]);
    if (!clips.length) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$HeroReel$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].reel,
            "data-empty": "true",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$DevelopingFrame$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DevelopingFrame"], {
                background: true
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/landing/HeroReel.tsx",
                lineNumber: 72,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/platform/web/src/components/landing/HeroReel.tsx",
            lineNumber: 71,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$HeroReel$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].reel,
        children: [
            clips.map((shot, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                    ref: (node)=>{
                        videos.current[i] = node;
                    },
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$HeroReel$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].shot,
                    "data-active": i === active,
                    poster: shot.poster,
                    muted: true,
                    playsInline: true,
                    preload: i === 0 ? "auto" : "none",
                    "aria-hidden": "true",
                    tabIndex: -1,
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
                        src: shot.src,
                        type: "video/mp4"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/HeroReel.tsx",
                        lineNumber: 94,
                        columnNumber: 11
                    }, this)
                }, shot.id, false, {
                    fileName: "[project]/platform/web/src/components/landing/HeroReel.tsx",
                    lineNumber: 80,
                    columnNumber: 9
                }, this)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$HeroReel$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].scrim,
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/landing/HeroReel.tsx",
                lineNumber: 98,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "sr-only",
                children: clips[active]?.alt
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/landing/HeroReel.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, this),
            !reduced && clips.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$HeroReel$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].ticks,
                role: "tablist",
                "aria-label": "Reel",
                children: clips.map((shot, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        role: "tab",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$HeroReel$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].tick,
                        "data-active": i === active,
                        "aria-selected": i === active,
                        "aria-label": `Shot ${i + 1}`,
                        onClick: ()=>setActive(i)
                    }, shot.id, false, {
                        fileName: "[project]/platform/web/src/components/landing/HeroReel.tsx",
                        lineNumber: 105,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/landing/HeroReel.tsx",
                lineNumber: 103,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/landing/HeroReel.tsx",
        lineNumber: 78,
        columnNumber: 5
    }, this);
}
_s(HeroReel, "+XAJF1Om75SbpZE65ki5dM3zyBY=");
_c = HeroReel;
var _c;
__turbopack_context__.k.register(_c, "HeroReel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/landing/ModeGrid.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "card": "ModeGrid-module__047bHG__card",
  "cell": "ModeGrid-module__047bHG__cell",
  "clip": "ModeGrid-module__047bHG__clip",
  "grid": "ModeGrid-module__047bHG__grid",
  "hint": "ModeGrid-module__047bHG__hint",
  "meta": "ModeGrid-module__047bHG__meta",
  "name": "ModeGrid-module__047bHG__name",
  "note": "ModeGrid-module__047bHG__note",
  "poster": "ModeGrid-module__047bHG__poster",
  "stocks": "ModeGrid-module__047bHG__stocks",
});
}),
"[project]/platform/web/src/components/landing/ModeGrid.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ModeGrid",
    ()=>ModeGrid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Clip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/fx/Clip.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Reveal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/fx/Reveal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$reel$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/reel.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$stills$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/stills.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/validation.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/landing/ModeGrid.module.css [app-client] (css module)");
"use client";
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
/*
 * Every way to start a shot, each one shown rather than described.
 *
 * This is the section that makes the breadth legible: most services offer text and image
 * to video. We route ten modes across two model families, and the stocks that can do each
 * one are read from the same catalog the studio uses, so this can never drift from what
 * the network actually accepts.
 */ const HINTS = {
    text_to_video: "Describe the shot. Nothing else needed.",
    image_to_video: "Start on your image and move from there.",
    last_frame: "Arrive at your image on the final frame.",
    first_last_frame: "Give both ends; the shot travels between them.",
    keyframes: "Pin images to timecodes and hit each one.",
    reference_to_video: "Bring your own cast, props and voices.",
    video_edit: "Change what happens in a clip you already have.",
    extend_video: "Continue a clip past its last frame.",
    audio_to_video: "Picture driven by your own soundtrack.",
    retake: "Regenerate one window, keep the rest of the take."
};
const ORDER = [
    "text_to_video",
    "image_to_video",
    "first_last_frame",
    "keyframes",
    "reference_to_video",
    "audio_to_video",
    "retake",
    "extend_video",
    "video_edit",
    "last_frame"
];
/** Which stocks accept this mode, straight from the profile catalog. */ function stocksFor(mode) {
    const names = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CATALOG"].filter((p)=>p.modes.includes(mode)).map((p)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(p) ? `H3 ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(p)}` : `LTX ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(p)}`);
    if (!names.length) return "";
    const families = new Set(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CATALOG"].filter((p)=>p.modes.includes(mode)).map((p)=>p.family));
    return families.size > 1 ? "Both stocks" : names.join(" · ");
}
function ModeGrid() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].grid,
                role: "list",
                children: ORDER.map((mode, i)=>{
                    const shot = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$reel$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clipForMode"])(mode);
                    // Until a mode has footage, its tile holds a generated still rather than an
                    // empty panel. The still never claims to be video.
                    const holding = shot ? undefined : (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$stills$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["posterForMode"])(mode);
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Reveal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Reveal"], {
                        as: "li",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].cell,
                        delay: i % 3 * 0.08,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/studio",
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].card,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$fx$2f$Clip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Clip"], {
                                    clip: shot,
                                    ratio: "16 / 9",
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].clip,
                                    sound: mode === "audio_to_video",
                                    fallback: holding ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        src: holding.src,
                                        alt: holding.alt,
                                        fill: true,
                                        sizes: "(max-width: 420px) 100vw, (max-width: 620px) 50vw, 33vw",
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].poster
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
                                        lineNumber: 78,
                                        columnNumber: 23
                                    }, this) : undefined
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
                                    lineNumber: 71,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].meta,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].name,
                                            children: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MODE_LABEL"][mode]
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
                                            lineNumber: 89,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].hint,
                                            children: HINTS[mode]
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
                                            lineNumber: 90,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].stocks,
                                            children: stocksFor(mode)
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
                                            lineNumber: 91,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
                                    lineNumber: 88,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
                            lineNumber: 70,
                            columnNumber: 15
                        }, this)
                    }, mode, false, {
                        fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
                        lineNumber: 69,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this),
            !__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$reel$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HAS_FOOTAGE"] && __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$stills$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HAS_STILLS"] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$ModeGrid$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].note,
                children: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$stills$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STILLS_NOTE"]
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
                lineNumber: 98,
                columnNumber: 38
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/landing/ModeGrid.tsx",
        lineNumber: 61,
        columnNumber: 5
    }, this);
}
_c = ModeGrid;
var _c;
__turbopack_context__.k.register(_c, "ModeGrid");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/landing/StagesTonight.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "big": "StagesTonight-module__iVzPWa__big",
  "board": "StagesTonight-module__iVzPWa__board",
  "canvas": "StagesTonight-module__iVzPWa__canvas",
  "foot": "StagesTonight-module__iVzPWa__foot",
  "label": "StagesTonight-module__iVzPWa__label",
  "number": "StagesTonight-module__iVzPWa__number",
  "readout": "StagesTonight-module__iVzPWa__readout",
  "ticker": "StagesTonight-module__iVzPWa__ticker",
});
}),
"[project]/platform/web/src/components/landing/StagesTonight.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StagesTonight",
    ()=>StagesTonight,
    "stageCounts",
    ()=>stageCounts
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$LiveModels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/LiveModels.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$StagesTonight$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/landing/StagesTonight.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function stageCounts(data) {
    if (!data) return null;
    const maxOf = (family)=>Math.max(0, ...data.models.filter((m)=>m.family === family).map((m)=>m.workers ?? 0));
    return {
        all: data.workers_online,
        h3: maxOf(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_H3"]),
        ltx: maxOf(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_LTX"])
    };
}
function mulberry(seed) {
    return ()=>{
        seed |= 0;
        seed = seed + 0x6d2b79f5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function NightLights({ count }) {
    _s();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NightLights.useEffect": ()=>{
            const canvas = ref.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const rand = mulberry(7);
            const dust = Array.from({
                length: 420
            }, {
                "NightLights.useEffect.dust": ()=>({
                        x: rand(),
                        y: 0.35 + rand() * 0.65,
                        a: rand()
                    })
            }["NightLights.useEffect.dust"]);
            const lr = mulberry(1913);
            const lights = Array.from({
                length: Math.min(count, 600)
            }, {
                "NightLights.useEffect.lights": ()=>({
                        x: 0.08 + lr() * 0.84,
                        y: 0.45 + lr() * 0.45,
                        phase: lr() * Math.PI * 2,
                        size: 0.8 + lr() * 0.9
                    })
            }["NightLights.useEffect.lights"]);
            let raf = 0;
            let onscreen = false;
            const draw = {
                "NightLights.useEffect.draw": (now)=>{
                    const dpr = Math.min(window.devicePixelRatio || 1, 2);
                    const w = canvas.clientWidth;
                    const h = canvas.clientHeight;
                    if (canvas.width !== Math.round(w * dpr)) {
                        canvas.width = Math.round(w * dpr);
                        canvas.height = Math.round(h * dpr);
                    }
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    const sky = ctx.createLinearGradient(0, 0, 0, h);
                    sky.addColorStop(0, "#07060a");
                    sky.addColorStop(1, "#0b0907");
                    ctx.fillStyle = sky;
                    ctx.fillRect(0, 0, w, h);
                    // The planet's limb, as seen from a window seat.
                    const cx = w / 2;
                    const r = w * 1.6;
                    const cy = h * 0.32 + r;
                    const glow = ctx.createRadialGradient(cx, cy, r - 2, cx, cy, r + 26);
                    glow.addColorStop(0, "rgba(230,163,74,0.16)");
                    glow.addColorStop(1, "rgba(230,163,74,0)");
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r + 26, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = "#0e0b09";
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fill();
                    for (const d of dust){
                        ctx.fillStyle = `rgba(237,229,216,${0.025 + d.a * 0.04})`;
                        ctx.fillRect(d.x * w, d.y * h, 1, 1);
                    }
                    const t = now / 1000;
                    for (const l of lights){
                        const tw = reduce ? 1 : 0.75 + 0.25 * Math.sin(t * 0.7 + l.phase);
                        const x = l.x * w;
                        const y = l.y * h;
                        const g = ctx.createRadialGradient(x, y, 0, x, y, 14 * l.size);
                        g.addColorStop(0, `rgba(241,183,101,${0.45 * tw})`);
                        g.addColorStop(1, "rgba(241,183,101,0)");
                        ctx.fillStyle = g;
                        ctx.beginPath();
                        ctx.arc(x, y, 14 * l.size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = `rgba(255,226,170,${0.95 * tw})`;
                        ctx.beginPath();
                        ctx.arc(x, y, 1.3 * l.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }["NightLights.useEffect.draw"];
            const loop = {
                "NightLights.useEffect.loop": (now)=>{
                    draw(now);
                    raf = onscreen && !reduce && lights.length ? requestAnimationFrame(loop) : 0;
                }
            }["NightLights.useEffect.loop"];
            const io = new IntersectionObserver({
                "NightLights.useEffect": ([entry])=>{
                    onscreen = entry.isIntersecting;
                    if (onscreen && !raf) raf = requestAnimationFrame(loop);
                }
            }["NightLights.useEffect"]);
            io.observe(canvas);
            const ro = new ResizeObserver({
                "NightLights.useEffect": ()=>{
                    if (!raf) raf = requestAnimationFrame(loop);
                }
            }["NightLights.useEffect"]);
            ro.observe(canvas);
            return ({
                "NightLights.useEffect": ()=>{
                    cancelAnimationFrame(raf);
                    io.disconnect();
                    ro.disconnect();
                }
            })["NightLights.useEffect"];
        }
    }["NightLights.useEffect"], [
        count
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
        ref: ref,
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$StagesTonight$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].canvas,
        "aria-hidden": "true"
    }, void 0, false, {
        fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
        lineNumber: 122,
        columnNumber: 10
    }, this);
}
_s(NightLights, "8uVE59eA/r6b92xF80p7sH8rXLk=");
_c = NightLights;
function StagesTonight() {
    _s1();
    const live = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$LiveModels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLiveModels"])();
    const counts = stageCounts(live.data);
    const dash = "—";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$StagesTonight$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].board,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NightLights, {
                count: counts?.all ?? 0
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                lineNumber: 132,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$StagesTonight$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].readout,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$StagesTonight$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].big,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$StagesTonight$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].number,
                                children: counts ? counts.all : dash
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                                lineNumber: 135,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$StagesTonight$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].label,
                                children: "sealed stages online"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                                lineNumber: 136,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                        lineNumber: 134,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: `mono ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$StagesTonight$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].ticker}`,
                        children: counts ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                "MINIMAX H3 · ",
                                counts.h3,
                                "  /  LTX-2.5 · ",
                                counts.ltx,
                                "  /  LIVE FROM THE NETWORK"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                            lineNumber: 140,
                            columnNumber: 13
                        }, this) : live.settled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: "NETWORK UNREACHABLE FROM THIS BROWSER · NO NUMBERS SHOWN"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                            lineNumber: 144,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: "CHECKING THE NETWORK…"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                            lineNumber: 146,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                        lineNumber: 138,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                lineNumber: 133,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$landing$2f$StagesTonight$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].foot,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: "Each light is a GPU server whose sealed hardware proved itself to the network within the last half hour. Positions are illustrative; the counts are live. The headline counts every stage once. A stage can serve several stocks, so the per-stock figures are lower bounds."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                        lineNumber: 151,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: "/network",
                        className: "link",
                        children: "How the network works →"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                        lineNumber: 156,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
                lineNumber: 150,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/landing/StagesTonight.tsx",
        lineNumber: 131,
        columnNumber: 5
    }, this);
}
_s1(StagesTonight, "O2+x1X+vqnTF4pfgzSC4jREJ1A8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$LiveModels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLiveModels"]
    ];
});
_c1 = StagesTonight;
var _c, _c1;
__turbopack_context__.k.register(_c, "NightLights");
__turbopack_context__.k.register(_c1, "StagesTonight");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/site/AvailabilityPill.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "mark": "AvailabilityPill-module__61gcJa__mark",
  "pill": "AvailabilityPill-module__61gcJa__pill",
});
}),
"[project]/platform/web/src/components/site/AvailabilityPill.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AvailabilityPill",
    ()=>AvailabilityPill
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$AvailabilityPill$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/AvailabilityPill.module.css [app-client] (css module)");
;
;
function AvailabilityPill({ availability, compact = false }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$AvailabilityPill$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].pill,
        "data-state": availability.state,
        "data-compact": compact,
        title: availability.detail,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$AvailabilityPill$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].mark,
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/site/AvailabilityPill.tsx",
                lineNumber: 9,
                columnNumber: 7
            }, this),
            availability.label
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/site/AvailabilityPill.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, this);
}
_c = AvailabilityPill;
var _c;
__turbopack_context__.k.register(_c, "AvailabilityPill");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/site/LiveModels.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LiveModelsProvider",
    ()=>LiveModelsProvider,
    "useLiveModels",
    ()=>useLiveModels
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$useModels$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/useModels.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
const Ctx = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
    data: null,
    settled: false,
    error: null
});
function LiveModelsProvider({ children }) {
    _s();
    const live = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$useModels$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useModels"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Ctx.Provider, {
        value: live,
        children: children
    }, void 0, false, {
        fileName: "[project]/platform/web/src/components/site/LiveModels.tsx",
        lineNumber: 12,
        columnNumber: 10
    }, this);
}
_s(LiveModelsProvider, "N/X7uiMhkMQCsvLYRLABIHSlKMg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$useModels$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useModels"]
    ];
});
_c = LiveModelsProvider;
function useLiveModels() {
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(Ctx);
}
_s1(useLiveModels, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "LiveModelsProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/verify/DropZone.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "frame": "DropZone-module__L3QbRW__frame",
  "hint": "DropZone-module__L3QbRW__hint",
  "pulse": "DropZone-module__L3QbRW__pulse",
  "title": "DropZone-module__L3QbRW__title",
  "zone": "DropZone-module__L3QbRW__zone",
});
}),
"[project]/platform/web/src/components/verify/DropZone.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DropZone",
    ()=>DropZone
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$DropZone$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/verify/DropZone.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function DropZone({ onFile, accept = "video/*", title, hint, busy = false, size = "large", inputId }) {
    _s();
    const [over, setOver] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    function onDrop(e) {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$DropZone$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].zone,
        "data-over": over,
        "data-busy": busy,
        "data-size": size,
        onDragOver: (e)=>{
            e.preventDefault();
            setOver(true);
        },
        onDragLeave: ()=>setOver(false),
        onDrop: onDrop,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                id: inputId,
                type: "file",
                accept: accept,
                className: "sr-only",
                disabled: busy,
                onChange: (e)=>{
                    const file = e.target.files?.[0];
                    if (file) onFile(file);
                    e.target.value = "";
                }
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/verify/DropZone.tsx",
                lineNumber: 47,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$DropZone$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].frame,
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/verify/DropZone.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$DropZone$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].title,
                children: title
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/verify/DropZone.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, this),
            hint && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$DropZone$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].hint,
                children: hint
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/verify/DropZone.tsx",
                lineNumber: 61,
                columnNumber: 16
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/verify/DropZone.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
_s(DropZone, "siF0XJYDDBoO/CBRuKJBjeP7Iig=");
_c = DropZone;
var _c;
__turbopack_context__.k.register(_c, "DropZone");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/verify/EndCredits.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "credits": "EndCredits-module__u0O9iq__credits",
  "footer": "EndCredits-module__u0O9iq__footer",
  "kicker": "EndCredits-module__u0O9iq__kicker",
  "list": "EndCredits-module__u0O9iq__list",
  "mono": "EndCredits-module__u0O9iq__mono",
  "name": "EndCredits-module__u0O9iq__name",
  "note": "EndCredits-module__u0O9iq__note",
  "row": "EndCredits-module__u0O9iq__row",
  "title": "EndCredits-module__u0O9iq__title",
});
}),
"[project]/platform/web/src/components/verify/EndCredits.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EndCredits",
    ()=>EndCredits
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/verify/EndCredits.module.css [app-client] (css module)");
;
;
function EndCredits({ kicker = "A KunoWorld film", title = "Certificate", lines, footer, variant = "full", id }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].credits,
        "data-variant": variant,
        "aria-labelledby": id,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].kicker,
                children: kicker
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/verify/EndCredits.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                id: id,
                className: `display ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].title}`,
                children: title
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/verify/EndCredits.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].list,
                children: lines.map((line)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].row,
                        "data-tone": line.tone,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                children: line.role
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/verify/EndCredits.tsx",
                                lineNumber: 39,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: line.mono ? __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].mono : __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].name,
                                        children: line.value
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/verify/EndCredits.tsx",
                                        lineNumber: 41,
                                        columnNumber: 15
                                    }, this),
                                    line.note && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].note,
                                        children: line.note
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/verify/EndCredits.tsx",
                                        lineNumber: 42,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/platform/web/src/components/verify/EndCredits.tsx",
                                lineNumber: 40,
                                columnNumber: 13
                            }, this)
                        ]
                    }, line.role, true, {
                        fileName: "[project]/platform/web/src/components/verify/EndCredits.tsx",
                        lineNumber: 38,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/verify/EndCredits.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, this),
            footer && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].footer,
                children: footer
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/verify/EndCredits.tsx",
                lineNumber: 47,
                columnNumber: 18
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/verify/EndCredits.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, this);
}
_c = EndCredits;
var _c;
__turbopack_context__.k.register(_c, "EndCredits");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/verify/useCertificate.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useCertificate",
    ()=>useCertificate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/crypto.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$certificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/certificate.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/errors.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/kuno.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
let manifestPromise = null;
function manifestOnce() {
    manifestPromise ??= (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeClient"])().manifest().catch(()=>{
        manifestPromise = null;
        return null;
    });
    return manifestPromise;
}
function useCertificate() {
    _s();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        kind: "idle"
    });
    const run = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const settle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useCertificate.useCallback[settle]": async (ticket, digest, file, lookup)=>{
            try {
                const [prov, manifest] = await Promise.all([
                    lookup(),
                    manifestOnce()
                ]);
                if (ticket !== run.current) return;
                setState({
                    kind: "found",
                    file,
                    digest,
                    prov,
                    checks: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$certificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["checkCertificate"])(prov, file ? digest : null, manifest)
                });
            } catch (err) {
                if (ticket !== run.current) return;
                if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["KunoError"] && err.status === 404) setState({
                    kind: "missing",
                    file,
                    digest
                });
                else setState({
                    kind: "error",
                    file,
                    digest,
                    error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["friendlyError"])(err, "lookup")
                });
            }
        }
    }["useCertificate.useCallback[settle]"], []);
    const checkFile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useCertificate.useCallback[checkFile]": async (file)=>{
            const ticket = ++run.current;
            const meta = {
                name: file.name,
                size: file.size
            };
            setState({
                kind: "hashing",
                file: meta
            });
            let bytes;
            let digest;
            try {
                bytes = new Uint8Array(await file.arrayBuffer());
                digest = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256Hex"])(bytes);
            } catch (err) {
                if (ticket === run.current) setState({
                    kind: "error",
                    file: meta,
                    error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["friendlyError"])(err, "lookup")
                });
                return;
            }
            if (ticket !== run.current) return;
            setState({
                kind: "looking",
                file: meta,
                digest
            });
            // The SDK's public provenance() hashes the same bytes and asks the gateway by digest.
            await settle(ticket, digest, meta, {
                "useCertificate.useCallback[checkFile]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeClient"])().provenance(bytes)
            }["useCertificate.useCallback[checkFile]"]);
        }
    }["useCertificate.useCallback[checkFile]"], [
        settle
    ]);
    const checkDigest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useCertificate.useCallback[checkDigest]": async (digest)=>{
            const clean = digest.trim().toLowerCase();
            const ticket = ++run.current;
            if (!/^[0-9a-f]{64}$/.test(clean)) {
                setState({
                    kind: "error",
                    digest: clean,
                    error: {
                        code: "bad_digest",
                        title: "That isn't a SHA-256 hash",
                        detail: "A film's hash is 64 hexadecimal characters.",
                        charge: null
                    }
                });
                return;
            }
            setState({
                kind: "looking",
                digest: clean
            });
            await settle(ticket, clean, undefined, {
                "useCertificate.useCallback[checkDigest]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lookupDigest"])(clean)
            }["useCertificate.useCallback[checkDigest]"]);
        }
    }["useCertificate.useCallback[checkDigest]"], [
        settle
    ]);
    const reset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useCertificate.useCallback[reset]": ()=>{
            run.current++;
            setState({
                kind: "idle"
            });
        }
    }["useCertificate.useCallback[reset]"], []);
    return {
        state,
        checkFile,
        checkDigest,
        reset
    };
}
_s(useCertificate, "d0n2IV2EmpTDJyNvxL5QS0gVMS8=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * The model catalog. Static pages render from a snapshot of
 * kuno_protocol/profiles.json (the same file the gateway and workers load);
 * live pages replace it with /v1/models, which adds availability and worker counts.
 */ __turbopack_context__.s([
    "CATALOG",
    ()=>CATALOG,
    "FAMILY_H3",
    ()=>FAMILY_H3,
    "FAMILY_LTX",
    ()=>FAMILY_LTX,
    "STOCKS",
    ()=>STOCKS,
    "durationRange",
    ()=>durationRange,
    "familyProfiles",
    ()=>familyProfiles,
    "fpsRange",
    ()=>fpsRange,
    "isH3",
    ()=>isH3,
    "minRate",
    ()=>minRate,
    "normalizeProfile",
    ()=>normalizeProfile,
    "profilesOrCatalog",
    ()=>profilesOrCatalog,
    "ratesOf",
    ()=>ratesOf,
    "resolutionRange",
    ()=>resolutionRange,
    "stockFor",
    ()=>stockFor,
    "variantLabel",
    ()=>variantLabel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$profiles$2e$snapshot$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/profiles.snapshot.json.[json].cjs [app-client] (ecmascript)");
;
const FAMILY_H3 = "minimax-h3";
const FAMILY_LTX = "ltx-2.5";
const LIMIT_DEFAULTS = {
    duration_step_s: 1,
    max_inputs: {},
    input_groups: [],
    max_total_inputs: null,
    visual_required_with_audio: false,
    max_prompt_chars: 2000,
    negative_prompt: false,
    prompt_enhancer: false,
    seed: true
};
function normalizeProfile(profile) {
    return {
        ...profile,
        timeout_s: profile.timeout_s ?? 1800,
        limits: {
            ...LIMIT_DEFAULTS,
            ...profile.limits
        }
    };
}
const CATALOG = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$profiles$2e$snapshot$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].profiles.map(normalizeProfile);
function profilesOrCatalog(live) {
    return live && live.length ? live.map(normalizeProfile) : CATALOG;
}
function isH3(profile) {
    return profile.family === FAMILY_H3;
}
const STOCKS = {
    [FAMILY_H3]: {
        family: FAMILY_H3,
        brand: "MiniMax H3",
        stockName: "The Ensemble Stock",
        code: "KW-H3 768E",
        bestFor: "Performances, dialogue and scenes built from your own cast, props and voices."
    },
    [FAMILY_LTX]: {
        family: FAMILY_LTX,
        brand: "LTX-2.5",
        stockName: "The Fast Stock",
        code: "KW-LTX 4K25",
        bestFor: "Quick drafts, precise keyframes, retakes and high-resolution finals."
    }
};
function stockFor(profile) {
    return STOCKS[profile.family] ?? {
        family: profile.family,
        brand: profile.family,
        stockName: "",
        code: "",
        bestFor: ""
    };
}
const VARIANT_LABELS = {
    "h3-turbo": "Turbo",
    h3: "H3",
    "h3-reference": "Director",
    "ltx-2.5-fast": "Fast",
    "ltx-2.5-pro": "Pro",
    "ltx-2.5-4k": "4K"
};
function variantLabel(profile) {
    return VARIANT_LABELS[profile.id] ?? profile.name;
}
function ratesOf(profile) {
    return Object.entries(profile.pricing.usd_per_second).sort((a, b)=>a[1] - b[1]);
}
function minRate(profile) {
    return Math.min(...Object.values(profile.pricing.usd_per_second));
}
function durationRange(profile) {
    return `${profile.limits.min_duration_s}–${profile.limits.max_duration_s} s`;
}
function resolutionRange(profile) {
    const keys = Object.keys(profile.limits.sizes);
    return keys.length > 1 ? `${keys[0]}–${keys[keys.length - 1]}` : keys[0];
}
function fpsRange(profile) {
    const fps = profile.limits.fps;
    return fps.length > 1 ? `${fps[0]}–${fps[fps.length - 1]} fps` : `${fps[0]} fps`;
}
function familyProfiles(profiles, family) {
    return profiles.filter((p)=>p.family === family);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/certificate.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkCertificate",
    ()=>checkCertificate,
    "hardwareLabel",
    ()=>hardwareLabel,
    "teeLabel",
    ()=>teeLabel
]);
/**
 * Certificate checks that run in the viewer's browser, on top of the gateway's own
 * signature check: the receipt signature, the stage id/key binding, the file hash,
 * and the stage's hardware evidence against the published golden manifest.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/encoding.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$attestation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/attestation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/client.js [app-client] (ecmascript)");
;
function checkCertificate(prov, fileDigest, manifest) {
    const evidence = prov.enclave.evidence;
    let signature = false;
    let stageKeys = false;
    try {
        signature = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["verifyReceipt"])(prov.receipt, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(evidence.signing_public_key)) && prov.receipt.body.enclave_id === prov.enclave.enclave_id;
    } catch  {
        signature = false;
    }
    try {
        stageKeys = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$attestation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["enclaveIdFor"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(evidence.hpke_public_key), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(evidence.signing_public_key)) === prov.enclave.enclave_id;
    } catch  {
        stageKeys = false;
    }
    let hardware = null;
    if (manifest) {
        const verdict = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$attestation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["verifyEvidence"])(evidence, manifest, {
            now: evidence.created_at
        });
        hardware = {
            ok: verdict.ok,
            simulated: evidence.tee === "mock",
            reasons: verdict.reasons
        };
    }
    return {
        hashMatches: fileDigest ? fileDigest.toLowerCase() === prov.receipt.body.content_digest : null,
        signature,
        stageKeys,
        hardware
    };
}
function teeLabel(tee) {
    if (tee === "tdx") return "Intel TDX + NVIDIA confidential computing";
    if (tee === "mock") return "Simulated enclave (development build, not real hardware)";
    return tee;
}
function hardwareLabel(hardware) {
    if (!hardware) return "—";
    const entries = Object.entries(hardware);
    return entries.length ? entries.map(([k, v])=>`${k.replace(/_/g, " ")}: ${v}`).join(" · ") : "—";
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/format.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Small formatting helpers shared by pages and the studio. */ __turbopack_context__.s([
    "bytes",
    ()=>bytes,
    "clockTime",
    ()=>clockTime,
    "countryName",
    ()=>countryName,
    "edgeCode",
    ()=>edgeCode,
    "rate",
    ()=>rate,
    "relativeDay",
    ()=>relativeDay,
    "seconds",
    ()=>seconds,
    "shortHash",
    ()=>shortHash,
    "usd",
    ()=>usd,
    "utcStamp",
    ()=>utcStamp
]);
function usd(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    if (value > 0 && value < 0.1) return `$${trimZeros(value.toFixed(3))}`;
    return `$${value.toFixed(2)}`;
}
function rate(value) {
    return `$${trimZeros(value.toFixed(3))}`;
}
/** "0.060" → "0.06", "0.024" → "0.024": at least two decimals, no trailing zeros beyond that. */ function trimZeros(s) {
    const [whole, frac = ""] = s.split(".");
    return `${whole}.${frac.replace(/0+$/, "").padEnd(2, "0")}`;
}
function shortHash(hash, head = 8, tail = 6) {
    if (!hash) return "—";
    const clean = hash.replace(/^sha256:/, "");
    if (clean.length <= head + tail + 1) return hash;
    return `${hash.startsWith("sha256:") ? "sha256:" : ""}${clean.slice(0, head)}…${clean.slice(-tail)}`;
}
function utcStamp(seconds) {
    const d = new Date(seconds * 1000);
    const pad = (n)=>String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}
function seconds(value, digits = 1) {
    return `${Number(value.toFixed(digits))} s`;
}
function relativeDay(ms, now = Date.now()) {
    const day = (t)=>new Date(t).toDateString();
    if (day(ms) === day(now)) return "Today";
    if (day(ms) === day(now - 86_400_000)) return "Yesterday";
    return new Date(ms).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
}
function clockTime(ms) {
    return new Date(ms).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
    });
}
function edgeCode(seed, length = 16) {
    let h = 2166136261;
    let out = "";
    for(let i = 0; out.length < length; i++){
        h ^= seed.charCodeAt(i % seed.length) + i;
        h = Math.imul(h, 16777619) >>> 0;
        out += (h & 0xffff).toString(16).padStart(4, "0");
    }
    return out.slice(0, length);
}
function bytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
function countryName(code) {
    if (!code) return null;
    try {
        return new Intl.DisplayNames([
            "en"
        ], {
            type: "region"
        }).of(code) ?? code;
    } catch  {
        return code;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/profiles.snapshot.json.[json].cjs [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "version": 2,
    "note": "Capabilities per the official inference code (research/research_model_capabilities.md). Prices and VCU weights are launch estimates pending Phase 0 benchmarks.",
    "profiles": [
        {
            "id": "h3-turbo",
            "family": "minimax-h3",
            "name": "MiniMax H3 Turbo",
            "tagline": "Top open-weight quality with native stereo audio, 8-step distilled",
            "variant": "turbo",
            "checkpoint": "MiniMaxAI/MiniMax-H3 transformer (FL2VA) + lightx2v/Minimax-h3-Turbo 8-step v1.0 @1344x768",
            "runtime": "lightx2v",
            "modes": [
                "text_to_video",
                "image_to_video",
                "last_frame",
                "first_last_frame"
            ],
            "limits": {
                "min_duration_s": 5,
                "max_duration_s": 14,
                "duration_step_s": 1,
                "sizes": {
                    "768p": {
                        "16:9": [
                            1344,
                            768
                        ],
                        "9:16": [
                            768,
                            1344
                        ],
                        "4:3": [
                            1024,
                            768
                        ],
                        "3:4": [
                            768,
                            1024
                        ],
                        "1:1": [
                            768,
                            768
                        ],
                        "21:9": [
                            1536,
                            640
                        ]
                    }
                },
                "fps": [
                    24
                ],
                "default_fps": 24,
                "audio": true,
                "max_inputs": {
                    "first_frame": 1,
                    "last_frame": 1
                },
                "max_prompt_chars": 7000,
                "negative_prompt": false,
                "prompt_enhancer": false
            },
            "hardware_class": "C4",
            "gpus_per_worker": 4,
            "steps": 8,
            "license": {
                "name": "MiniMax H3 Community License",
                "url": "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE",
                "attribution": "MiniMax H3",
                "region_policy": "minimax-h3"
            },
            "pricing": {
                "usd_per_second": {
                    "768p": 0.06
                }
            },
            "vcu_per_output_second": 16
        },
        {
            "id": "h3",
            "family": "minimax-h3",
            "name": "MiniMax H3",
            "tagline": "Full 50-step H3 for maximum fidelity",
            "variant": "quality",
            "checkpoint": "MiniMaxAI/MiniMax-H3 transformer (FL2VA), 50 steps",
            "runtime": "sglang",
            "modes": [
                "text_to_video",
                "image_to_video",
                "last_frame",
                "first_last_frame"
            ],
            "limits": {
                "min_duration_s": 5,
                "max_duration_s": 14,
                "duration_step_s": 1,
                "sizes": {
                    "768p": {
                        "16:9": [
                            1344,
                            768
                        ],
                        "9:16": [
                            768,
                            1344
                        ],
                        "4:3": [
                            1024,
                            768
                        ],
                        "3:4": [
                            768,
                            1024
                        ],
                        "1:1": [
                            768,
                            768
                        ],
                        "21:9": [
                            1536,
                            640
                        ]
                    }
                },
                "fps": [
                    24
                ],
                "default_fps": 24,
                "audio": true,
                "max_inputs": {
                    "first_frame": 1,
                    "last_frame": 1
                },
                "max_prompt_chars": 7000,
                "negative_prompt": false,
                "prompt_enhancer": false
            },
            "hardware_class": "C4",
            "gpus_per_worker": 4,
            "steps": 50,
            "license": {
                "name": "MiniMax H3 Community License",
                "url": "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE",
                "attribution": "MiniMax H3",
                "region_policy": "minimax-h3"
            },
            "pricing": {
                "usd_per_second": {
                    "768p": 0.12
                }
            },
            "vcu_per_output_second": 60
        },
        {
            "id": "h3-reference",
            "family": "minimax-h3",
            "name": "MiniMax H3 Director",
            "tagline": "Direct a scene from up to 9 images, 3 clips and 3 audio tracks — edit, extend or drive video from audio",
            "variant": "quality",
            "checkpoint": "MiniMaxAI/MiniMax-H3 transformer_ref (Ref2VA), 50 steps",
            "runtime": "sglang",
            "modes": [
                "reference_to_video",
                "video_edit",
                "extend_video",
                "audio_to_video"
            ],
            "limits": {
                "min_duration_s": 5,
                "max_duration_s": 14,
                "duration_step_s": 1,
                "sizes": {
                    "768p": {
                        "16:9": [
                            1344,
                            768
                        ],
                        "9:16": [
                            768,
                            1344
                        ],
                        "4:3": [
                            1024,
                            768
                        ],
                        "3:4": [
                            768,
                            1024
                        ],
                        "1:1": [
                            768,
                            768
                        ],
                        "21:9": [
                            1536,
                            640
                        ]
                    }
                },
                "fps": [
                    24
                ],
                "default_fps": 24,
                "audio": true,
                "max_inputs": {
                    "reference_image": 9,
                    "reference_video": 3,
                    "reference_audio": 3,
                    "source_video": 1,
                    "source_audio": 1,
                    "first_frame": 1
                },
                "input_groups": [
                    {
                        "roles": [
                            "reference_image",
                            "first_frame"
                        ],
                        "max": 9
                    },
                    {
                        "roles": [
                            "reference_video",
                            "source_video"
                        ],
                        "max": 3
                    },
                    {
                        "roles": [
                            "reference_audio",
                            "source_audio"
                        ],
                        "max": 3
                    }
                ],
                "max_total_inputs": 12,
                "visual_required_with_audio": true,
                "max_prompt_chars": 7000,
                "negative_prompt": false,
                "prompt_enhancer": false
            },
            "hardware_class": "C4",
            "gpus_per_worker": 4,
            "steps": 50,
            "license": {
                "name": "MiniMax H3 Community License",
                "url": "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE",
                "attribution": "MiniMax H3",
                "region_policy": "minimax-h3"
            },
            "pricing": {
                "usd_per_second": {
                    "768p": 0.1
                }
            },
            "vcu_per_output_second": 64
        },
        {
            "id": "ltx-2.5-fast",
            "family": "ltx-2.5",
            "name": "LTX-2.5 Fast",
            "tagline": "Seconds-fast video with audio, keyframes and retakes",
            "variant": "fast",
            "checkpoint": "Lightricks/LTX-2.5 ltx-2.5-22b-distilled (8+3 steps, x2 latent upscaler)",
            "runtime": "ltx-pipelines",
            "modes": [
                "text_to_video",
                "image_to_video",
                "last_frame",
                "first_last_frame",
                "keyframes",
                "retake"
            ],
            "limits": {
                "min_duration_s": 2,
                "max_duration_s": 20,
                "duration_step_s": 1,
                "sizes": {
                    "720p": {
                        "16:9": [
                            1280,
                            704
                        ],
                        "9:16": [
                            704,
                            1280
                        ],
                        "4:3": [
                            960,
                            704
                        ],
                        "3:4": [
                            704,
                            960
                        ],
                        "1:1": [
                            960,
                            960
                        ],
                        "21:9": [
                            1664,
                            704
                        ]
                    },
                    "1080p": {
                        "16:9": [
                            1920,
                            1088
                        ],
                        "9:16": [
                            1088,
                            1920
                        ],
                        "4:3": [
                            1472,
                            1088
                        ],
                        "3:4": [
                            1088,
                            1472
                        ],
                        "1:1": [
                            1088,
                            1088
                        ],
                        "21:9": [
                            2560,
                            1088
                        ]
                    }
                },
                "fps": [
                    24,
                    25,
                    48,
                    50
                ],
                "default_fps": 24,
                "audio": true,
                "max_inputs": {
                    "first_frame": 1,
                    "last_frame": 1,
                    "keyframe": 8,
                    "source_video": 1
                },
                "max_prompt_chars": 4000,
                "negative_prompt": false,
                "prompt_enhancer": true
            },
            "hardware_class": "C1",
            "gpus_per_worker": 1,
            "steps": 11,
            "license": {
                "name": "LTX-2 Community License",
                "url": "https://huggingface.co/Lightricks/LTX-2/blob/main/LICENSE",
                "attribution": null,
                "region_policy": null
            },
            "pricing": {
                "usd_per_second": {
                    "720p": 0.024,
                    "1080p": 0.04
                }
            },
            "vcu_per_output_second": 5
        },
        {
            "id": "ltx-2.5-pro",
            "family": "ltx-2.5",
            "name": "LTX-2.5 Pro",
            "tagline": "Full LTX-2.5 with guidance, negative prompts and audio-driven video",
            "variant": "pro",
            "checkpoint": "Lightricks/LTX-2.5 ltx-2.5-22b-dev two-stage (30+3 steps)",
            "runtime": "ltx-pipelines",
            "modes": [
                "text_to_video",
                "image_to_video",
                "last_frame",
                "first_last_frame",
                "keyframes",
                "retake",
                "audio_to_video"
            ],
            "limits": {
                "min_duration_s": 2,
                "max_duration_s": 20,
                "duration_step_s": 1,
                "sizes": {
                    "720p": {
                        "16:9": [
                            1280,
                            704
                        ],
                        "9:16": [
                            704,
                            1280
                        ],
                        "4:3": [
                            960,
                            704
                        ],
                        "3:4": [
                            704,
                            960
                        ],
                        "1:1": [
                            960,
                            960
                        ],
                        "21:9": [
                            1664,
                            704
                        ]
                    },
                    "1080p": {
                        "16:9": [
                            1920,
                            1088
                        ],
                        "9:16": [
                            1088,
                            1920
                        ],
                        "4:3": [
                            1472,
                            1088
                        ],
                        "3:4": [
                            1088,
                            1472
                        ],
                        "1:1": [
                            1088,
                            1088
                        ],
                        "21:9": [
                            2560,
                            1088
                        ]
                    }
                },
                "fps": [
                    24,
                    25,
                    48,
                    50
                ],
                "default_fps": 24,
                "audio": true,
                "max_inputs": {
                    "first_frame": 1,
                    "last_frame": 1,
                    "keyframe": 8,
                    "source_video": 1,
                    "source_audio": 1
                },
                "max_prompt_chars": 4000,
                "negative_prompt": true,
                "prompt_enhancer": true
            },
            "hardware_class": "C2",
            "gpus_per_worker": 1,
            "steps": 33,
            "license": {
                "name": "LTX-2 Community License",
                "url": "https://huggingface.co/Lightricks/LTX-2/blob/main/LICENSE",
                "attribution": null,
                "region_policy": null
            },
            "pricing": {
                "usd_per_second": {
                    "720p": 0.04,
                    "1080p": 0.07
                }
            },
            "vcu_per_output_second": 15
        },
        {
            "id": "ltx-2.5-4k",
            "family": "ltx-2.5",
            "name": "LTX-2.5 4K",
            "tagline": "Production-grade 4K with detail refinement",
            "variant": "dfr",
            "checkpoint": "Lightricks/LTX-2.5 DFR pipeline (distilled + pixel detailing IC-LoRA)",
            "runtime": "ltx-pipelines",
            "modes": [
                "text_to_video",
                "image_to_video",
                "keyframes"
            ],
            "limits": {
                "min_duration_s": 2,
                "max_duration_s": 10,
                "duration_step_s": 1,
                "sizes": {
                    "1440p": {
                        "16:9": [
                            2560,
                            1408
                        ],
                        "9:16": [
                            1408,
                            2560
                        ]
                    },
                    "2160p": {
                        "16:9": [
                            3840,
                            2176
                        ],
                        "9:16": [
                            2176,
                            3840
                        ]
                    }
                },
                "fps": [
                    24,
                    25,
                    48,
                    50
                ],
                "default_fps": 24,
                "audio": true,
                "max_inputs": {
                    "first_frame": 1,
                    "keyframe": 8
                },
                "max_prompt_chars": 4000,
                "negative_prompt": false,
                "prompt_enhancer": true
            },
            "hardware_class": "C2",
            "gpus_per_worker": 1,
            "steps": 11,
            "license": {
                "name": "LTX-2 Community License",
                "url": "https://huggingface.co/Lightricks/LTX-2/blob/main/LICENSE",
                "attribution": null,
                "region_policy": null
            },
            "pricing": {
                "usd_per_second": {
                    "1440p": 0.12,
                    "2160p": 0.2
                }
            },
            "vcu_per_output_second": 40,
            "timeout_s": 3600
        }
    ]
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/reel.generated.json.[json].cjs [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = JSON.parse("{\"generated_at\":\"2026-09-12T15:32:55.577Z\",\"clips\":{\"mode-image\":{\"id\":\"mode-image\",\"role\":\"mode\",\"mode\":\"image_to_video\",\"src\":\"/reel/mode-image.mp4\",\"poster\":\"/reel/mode-image.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"A still harbour at dawn coming alive as a boat eases away from the quay.\",\"prompt\":\"The harbour comes alive from this exact frame: one fishing boat eases away from the quay, its wake breaking the flat water, mist lifting, gulls crossing, locked-off camera\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"c36e24ce88c3\"},\"hero-lighthouse\":{\"id\":\"hero-lighthouse\",\"role\":\"hero\",\"src\":\"/reel/hero-lighthouse.mp4\",\"poster\":\"/reel/hero-lighthouse.jpg\",\"width\":1600,\"height\":900,\"duration\":6,\"audio\":false,\"alt\":\"An aerial shot drifting over a dark sea at dusk toward a lighthouse sweeping its beam across low cloud.\",\"prompt\":\"Slow aerial push over a dark restless sea at dusk toward a lighthouse on a black headland, its lamp sweeping a beam across low cloud, amber tungsten light raking the water, anamorphic lens flare, deep shadows, 35mm film grain, cinematic\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"8dc43a7f9285\"},\"hero-wave\":{\"id\":\"hero-wave\",\"role\":\"hero\",\"src\":\"/reel/hero-wave.mp4\",\"poster\":\"/reel/hero-wave.jpg\",\"width\":1600,\"height\":900,\"duration\":6,\"audio\":false,\"alt\":\"A wave breaking in slow motion on black sand, its spray backlit by a low sun.\",\"prompt\":\"A wave breaking in slow motion on black volcanic sand at golden hour, backlit spray catching warm low sun, shallow depth of field, long lens, cinematic, film grain\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"e3cae6cc11fa\"},\"hero-horizon\":{\"id\":\"hero-horizon\",\"role\":\"hero\",\"src\":\"/reel/hero-horizon.mp4\",\"poster\":\"/reel/hero-horizon.jpg\",\"width\":1600,\"height\":900,\"duration\":6,\"audio\":false,\"alt\":\"A low, slow drift over a glassy sea at first light, with a clean horizon between amber sky and indigo water.\",\"prompt\":\"Drifting low and slow over a glassy calm sea at first light, a clean horizon line dividing amber sky from deep indigo water, distant haze, long lens, anamorphic, cinematic\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"1d7447a363b2\"},\"hero-darkroom\":{\"id\":\"hero-darkroom\",\"role\":\"hero\",\"src\":\"/reel/hero-darkroom.mp4\",\"poster\":\"/reel/hero-darkroom.jpg\",\"width\":1600,\"height\":900,\"duration\":6,\"audio\":false,\"alt\":\"A photographic print developing in a tray under red safelight, a coastline appearing out of blank paper.\",\"prompt\":\"Macro shot of a photographic print developing in a chemical tray under deep red safelight, a coastline slowly appearing out of blank paper, gentle ripples, dust in the air, shallow focus, cinematic\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"6fd4c0ef45fc\"},\"mode-first-last\":{\"id\":\"mode-first-last\",\"role\":\"mode\",\"mode\":\"first_last_frame\",\"src\":\"/reel/mode-first-last.mp4\",\"poster\":\"/reel/mode-first-last.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"A storm rolling across a beach, from calm water to rain sweeping the sand.\",\"prompt\":\"A storm rolls in across the beach: calm shallow water gives way to wind flattening the marram grass and then rain sweeping across wet sand, one continuous camera move\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"11eae7b7c2bf\"},\"mode-keyframes\":{\"id\":\"mode-keyframes\",\"role\":\"mode\",\"mode\":\"keyframes\",\"src\":\"/reel/mode-keyframes.mp4\",\"poster\":\"/reel/mode-keyframes.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"A storm building over a beach in three beats, from calm water to rain sweeping the sand.\",\"prompt\":\"A storm builds over a beach in three distinct beats: calm shallow water, then wind flattening the grass, then rain sweeping across the sand, continuous camera, cinematic\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"2e62a208a356\"},\"mode-reference\":{\"id\":\"mode-reference\",\"role\":\"mode\",\"mode\":\"reference_to_video\",\"src\":\"/reel/mode-reference.mp4\",\"poster\":\"/reel/mode-reference.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"A woman in a yellow raincoat walking a stone pier as spray bursts over the wall.\",\"prompt\":\"A woman in a yellow oilskin raincoat walks a stone pier in heavy weather, holding her hood against the wind, sea spray bursting over the wall beside her, handheld, cinematic\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"b30b32205fe7\"},\"mode-extend\":{\"id\":\"mode-extend\",\"role\":\"mode\",\"mode\":\"extend_video\",\"src\":\"/reel/mode-extend.mp4\",\"poster\":\"/reel/mode-extend.jpg\",\"width\":1280,\"height\":720,\"duration\":8,\"audio\":false,\"alt\":\"A long unbroken drift along a shoreline at dusk as the tide pulls back over wet sand.\",\"prompt\":\"A long unbroken drift along a shoreline at dusk, tide pulling back over wet sand, the light slowly failing, distant headland, cinematic, film grain\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"e6ca11810e79\"},\"stock-h3\":{\"id\":\"stock-h3\",\"role\":\"stock\",\"family\":\"minimax-h3\",\"src\":\"/reel/stock-h3.mp4\",\"poster\":\"/reel/stock-h3.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":true,\"alt\":\"A fisherman's face in a wheelhouse at night, lit by instruments, speaking a few words.\",\"prompt\":\"Close on a fisherman's weathered face in a wheelhouse at night, instrument light on his skin, he glances up and speaks a few words, rain on the glass behind him, cinematic portrait\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"a4672fcd1f0a\"},\"stock-ltx\":{\"id\":\"stock-ltx\",\"role\":\"stock\",\"family\":\"ltx-2.5\",\"src\":\"/reel/stock-ltx.mp4\",\"poster\":\"/reel/stock-ltx.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"A fast low pass over breaking surf toward a rocky shore, spray flying past the lens.\",\"prompt\":\"A fast low pass over breaking surf toward a rocky shore, spray flying past the lens, bright overcast light, high shutter speed, crisp detail, cinematic\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"c76e2e98abc7\"},\"custody-seal\":{\"id\":\"custody-seal\",\"role\":\"texture\",\"src\":\"/reel/custody-seal.mp4\",\"poster\":\"/reel/custody-seal.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"Abstract amber light moving slowly through smoked glass and brushed metal.\",\"prompt\":\"Extreme macro of warm amber light moving through smoked glass and brushed metal, slow abstract drift, dust motes, deep black background, cinematic, no text\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"1c811a1d1349\"},\"network-stages\":{\"id\":\"network-stages\",\"role\":\"texture\",\"src\":\"/reel/network-stages.mp4\",\"poster\":\"/reel/network-stages.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"A slow drift past dark server racks, amber status lights breathing in the black.\",\"prompt\":\"Slow drift past racks of server hardware in a dark room, small amber status lights breathing in the black, shallow focus, no text, no logos, cinematic\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"a1fadb402efa\"},\"mode-text\":{\"id\":\"mode-text\",\"role\":\"mode\",\"mode\":\"text_to_video\",\"src\":\"/reel/mode-text.mp4\",\"poster\":\"/reel/mode-text.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"A keeper climbing a spiral staircase with a lantern, light spilling up the stone wall.\",\"prompt\":\"A lighthouse keeper climbs a spiral iron staircase with a lantern, warm light spilling up the stone wall, camera following from below, cinematic, film grain\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"a7e39245fd24\"},\"mode-audio\":{\"id\":\"mode-audio\",\"role\":\"mode\",\"mode\":\"audio_to_video\",\"src\":\"/reel/mode-audio.mp4\",\"poster\":\"/reel/mode-audio.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":true,\"alt\":\"Rain running down the window of a coastal cottage at night, a lamp guttering on the sill.\",\"prompt\":\"Rain drumming on the window of a coastal cottage at night, a paraffin lamp guttering on the sill, water running down the glass, distant surf, cinematic, atmospheric\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"bc15da49f12e\"},\"mode-retake\":{\"id\":\"mode-retake\",\"role\":\"mode\",\"mode\":\"retake\",\"src\":\"/reel/mode-retake.mp4\",\"poster\":\"/reel/mode-retake.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"A rowing boat rocking against a jetty, reflections breaking on the water.\",\"prompt\":\"A rowing boat tied to a jetty rocks gently in the swell, rope creaking, reflections breaking on the water, locked-off camera, overcast light, cinematic\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"7e91033f34c4\"},\"mode-edit\":{\"id\":\"mode-edit\",\"role\":\"mode\",\"mode\":\"video_edit\",\"src\":\"/reel/mode-edit.mp4\",\"poster\":\"/reel/mode-edit.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"A coast road in daylight shifting to heavy snowfall on the same camera move.\",\"prompt\":\"A quiet stretch of coast road shifts from flat daylight into heavy snowfall, the same road and the same camera move, snow settling on the tarmac and the low stone walls\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"80cd19c7376b\"},\"mode-last\":{\"id\":\"mode-last\",\"role\":\"mode\",\"mode\":\"last_frame\",\"src\":\"/reel/mode-last.mp4\",\"poster\":\"/reel/mode-last.jpg\",\"width\":1280,\"height\":720,\"duration\":6,\"audio\":false,\"alt\":\"A gull gliding in and settling on a harbour post, arriving at a held final composition.\",\"prompt\":\"A gull glides in low over the water and settles onto a weathered harbour post, wings folding, the shot coming to rest on that final composition\",\"source\":\"veo-reference\",\"provider\":\"openrouter\",\"model\":\"google/veo-3.1\",\"fingerprint\":\"4b2cff06ef8d\"}}}");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/reel.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ALL_CLIPS",
    ()=>ALL_CLIPS,
    "FOOTAGE_NOTE",
    ()=>FOOTAGE_NOTE,
    "HAS_FOOTAGE",
    ()=>HAS_FOOTAGE,
    "clip",
    ()=>clip,
    "clipForFamily",
    ()=>clipForFamily,
    "clipForMode",
    ()=>clipForMode,
    "clipsByRole",
    ()=>clipsByRole,
    "provenanceOf",
    ()=>provenanceOf
]);
/**
 * The site's footage index, written by scripts/assets.mjs.
 *
 * Every component that shows a clip reads it from here and must render without one:
 * until the footage is generated the index is empty, and the site falls back to its
 * procedural frames. That keeps the design honest in CI and on a fresh checkout.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$reel$2e$generated$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/reel.generated.json.[json].cjs [app-client] (ecmascript)");
;
const INDEX = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$reel$2e$generated$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].clips ?? {};
const ALL_CLIPS = Object.values(INDEX);
_c = ALL_CLIPS;
const HAS_FOOTAGE = ALL_CLIPS.length > 0;
function clip(id) {
    return INDEX[id];
}
function clipsByRole(role) {
    return ALL_CLIPS.filter((c)=>c.role === role);
}
function clipForMode(mode) {
    return ALL_CLIPS.find((c)=>c.mode === mode);
}
function clipForFamily(family) {
    return ALL_CLIPS.find((c)=>c.family === family);
}
/**
 * The provenance line shown under sample footage. Reference renders come from the same
 * open weights the network runs, but they were not made by a sealed stage and carry no
 * certificate — so they never claim one.
 */ const MODEL_LABEL = {
    "veo-reference": "Google Veo 3.1",
    "ltx-reference": "LTX-2",
    "h3-reference": "MiniMax H3"
};
function provenanceOf(c) {
    if (c.source === "kuno") return "Made on the KunoWorld network · certificate attached";
    return `Sample · ${c.model ?? MODEL_LABEL[c.source]}, not made on the network`;
}
/**
 * Derived from the clips actually present rather than hardcoded, so the wording cannot
 * drift from the footage. The samples may come from a model the network does not serve,
 * so this must never imply otherwise — only a film with a certificate can claim that.
 */ function footageNote() {
    const models = Array.from(new Set(ALL_CLIPS.filter((c)=>c.source !== "kuno").map((c)=>c.model ?? MODEL_LABEL[c.source])));
    const made = models.length === 0 ? "third-party models" : models.length === 1 ? models[0] : `${models.slice(0, -1).join(", ")} and ${models.at(-1)}`;
    return `Sample footage on this page was generated with ${made}, to show what each kind of request looks like. ` + "It was not made on the KunoWorld network, is not output from the models the network serves, and carries no " + "certificate — films you make in the studio are.";
}
const FOOTAGE_NOTE = footageNote();
var _c;
__turbopack_context__.k.register(_c, "ALL_CLIPS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/shot.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EDIT_OPS",
    ()=>EDIT_OPS,
    "TABS",
    ()=>TABS,
    "availability",
    ()=>availability,
    "clampSettings",
    ()=>clampSettings,
    "defaultSettings",
    ()=>defaultSettings,
    "durationOptions",
    ()=>durationOptions,
    "estimatePrice",
    ()=>estimatePrice,
    "fallbackNotice",
    ()=>fallbackNotice,
    "frameSize",
    ()=>frameSize,
    "modeFor",
    ()=>modeFor,
    "predictRoute",
    ()=>predictRoute,
    "supportsTab",
    ()=>supportsTab,
    "tabModes",
    ()=>tabModes,
    "unsupportedReason",
    ()=>unsupportedReason
]);
/** Composer vocabulary: tabs, edit operations, shot settings and routing predictions. */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/validation.ts [app-client] (ecmascript)");
;
;
;
const TABS = [
    {
        id: "text",
        label: "Text"
    },
    {
        id: "frames",
        label: "Frames"
    },
    {
        id: "keyframes",
        label: "Keyframes"
    },
    {
        id: "references",
        label: "References"
    },
    {
        id: "edit",
        label: "Edit"
    }
];
const EDIT_OPS = [
    {
        id: "edit",
        label: "Edit",
        mode: "video_edit",
        hint: "Change what happens in a clip, guided by your prompt."
    },
    {
        id: "extend",
        label: "Extend",
        mode: "extend_video",
        hint: "Continue a clip past its last frame."
    },
    {
        id: "retake",
        label: "Retake",
        mode: "retake",
        hint: "Regenerate a window of a clip and keep the rest."
    },
    {
        id: "audio",
        label: "Audio → video",
        mode: "audio_to_video",
        hint: "Picture driven by your own soundtrack."
    }
];
const EDIT_OP_MODE = Object.fromEntries(_c1 = EDIT_OPS.map(_c = (op)=>[
        op.id,
        op.mode
    ]));
_c2 = EDIT_OP_MODE;
const TAB_MODES = {
    text: [
        "text_to_video"
    ],
    frames: [
        "image_to_video",
        "last_frame",
        "first_last_frame"
    ],
    keyframes: [
        "keyframes"
    ],
    references: [
        "reference_to_video"
    ]
};
function tabModes(tab, editOp) {
    return tab === "edit" ? [
        EDIT_OP_MODE[editOp]
    ] : TAB_MODES[tab];
}
function supportsTab(profile, tab, editOp) {
    return tabModes(tab, editOp).some((m)=>profile.modes.includes(m));
}
function unsupportedReason(profile, tab, editOp) {
    if (tab === "references") return "References are a MiniMax H3 Director feature";
    if (tab === "keyframes") return (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(profile) ? "Keyframes are an LTX-2.5 feature" : `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(profile)} doesn't do keyframes`;
    if (tab === "edit") return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(profile)} doesn't do ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MODE_LABEL"][EDIT_OP_MODE[editOp]].toLowerCase()}`;
    if (tab === "frames") return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(profile)} doesn't take frames`;
    return `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(profile)} needs reference media — use References or Edit`;
}
function modeFor(tab, editOp, roles) {
    switch(tab){
        case "text":
            return "text_to_video";
        case "frames":
            {
                const first = roles.includes("first_frame");
                const last = roles.includes("last_frame");
                if (first && last) return "first_last_frame";
                if (last) return "last_frame";
                return "image_to_video";
            }
        case "keyframes":
            return "keyframes";
        case "references":
            return "reference_to_video";
        case "edit":
            return EDIT_OP_MODE[editOp];
    }
}
function defaultSettings(profile) {
    return clampSettings(profile, {
        resolution: "",
        aspectRatio: "16:9",
        durationS: 5,
        fps: profile.limits.default_fps,
        audio: true,
        seed: "",
        negativePrompt: "",
        enhance: false
    });
}
function clampSettings(profile, s) {
    const lim = profile.limits;
    const resolutions = Object.keys(lim.sizes);
    const resolution = resolutions.includes(s.resolution) ? s.resolution : resolutions[0];
    const sizes = lim.sizes[resolution] ?? {};
    const aspects = Object.keys(sizes);
    const aspectRatio = aspects.includes(s.aspectRatio) ? s.aspectRatio : aspects.includes("16:9") ? "16:9" : aspects[0];
    const step = lim.duration_step_s || 1;
    const bounded = Math.min(Math.max(s.durationS, lim.min_duration_s), lim.max_duration_s);
    const durationS = Math.min(lim.max_duration_s, lim.min_duration_s + Math.round((bounded - lim.min_duration_s) / step) * step);
    return {
        ...s,
        resolution,
        aspectRatio,
        durationS,
        fps: lim.fps.includes(s.fps) ? s.fps : lim.default_fps,
        audio: s.audio && lim.audio,
        enhance: s.enhance && lim.prompt_enhancer
    };
}
function durationOptions(profile) {
    const lim = profile.limits;
    const step = lim.duration_step_s || 1;
    const out = [];
    for(let d = lim.min_duration_s; d <= lim.max_duration_s + 1e-9; d += step)out.push(Math.round(d * 100) / 100);
    return out;
}
function frameSize(profile, resolution, aspectRatio) {
    return profile.limits.sizes[resolution]?.[aspectRatio] ?? null;
}
function availability(profile, live) {
    if (!live || profile.workers === undefined) {
        return {
            state: "unknown",
            label: "Status unknown",
            detail: "Couldn't reach the network to check live status."
        };
    }
    if (profile.enabled === false) {
        return {
            state: "off",
            label: "Switched off",
            detail: "The network owner has this stock switched off right now."
        };
    }
    if (profile.available_in_region === false) {
        return {
            state: "region",
            label: "Not in your region",
            detail: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(profile) ? "MiniMax H3 isn't licensed in your region yet (its license excludes the US, EU, UK and South Korea, and unknown locations)." : "Not licensed in your region."
        };
    }
    if (!profile.workers) {
        return {
            state: "empty",
            label: "No stages online",
            detail: "No sealed stage serving this stock is online right now."
        };
    }
    const n = profile.workers;
    return {
        state: "ok",
        label: `${n} stage${n === 1 ? "" : "s"}`,
        detail: `${n} sealed stage${n === 1 ? " is" : "s are"} online for this stock.`
    };
}
function unavailableReason(p) {
    if (p.enabled === false) return "switched_off";
    if (p.available_in_region === false) return "region";
    if (p.workers !== undefined && p.workers <= 0) return "capacity";
    return null;
}
function predictRoute(models, selected, mode) {
    if (!selected.modes.includes(mode)) {
        return {
            ok: false,
            code: "mode_unsupported",
            message: `${selected.name} doesn't do ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MODE_LABEL"][mode].toLowerCase()}.`
        };
    }
    if (!models) return {
        ok: true,
        profile: selected,
        reason: null,
        known: false
    };
    const live = models.models.find((m)=>m.id === selected.id) ?? selected;
    const reason = unavailableReason(live);
    if (!reason) return {
        ok: true,
        profile: live,
        reason: null,
        known: true
    };
    const sw = models.switch;
    const mayFallBack = sw.mode === "auto" || sw.mode === "both" && reason !== "capacity" || reason === "switched_off";
    if (mayFallBack) {
        const alt = models.models.find((m)=>m.family !== live.family && m.modes.includes(mode) && !unavailableReason(m));
        if (alt) return {
            ok: true,
            profile: alt,
            reason,
            known: true
        };
    }
    if (reason === "region") {
        return {
            ok: false,
            code: "region_restricted",
            message: `${live.name} isn't licensed in your region yet, and no other stock can do ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MODE_LABEL"][mode].toLowerCase()}.`
        };
    }
    if (reason === "capacity") {
        return {
            ok: false,
            code: "no_capacity",
            message: `No sealed stages are serving ${live.name} right now.`
        };
    }
    return {
        ok: false,
        code: "model_disabled",
        message: `${live.name} is switched off right now.`
    };
}
function fallbackNotice(reason, requested, actual, future = false) {
    if (!reason || !actual) return null;
    const verb = future ? "this will render on" : "rendered on";
    const req = requested ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(requested) ? "H3" : requested.name : "The chosen stock";
    if (reason === "region") return `${req} isn't licensed in your region yet — ${verb} ${actual.name}.`;
    if (reason === "switched_off") return `${req} is switched off right now — ${verb} ${actual.name}.`;
    if (reason === "capacity") return `No stages were free for ${req} — ${verb} ${actual.name}.`;
    return `${verb[0].toUpperCase()}${verb.slice(1)} ${actual.name}.`;
}
function estimatePrice(profile, mode, roles, settings, fallbackReason) {
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fitParams"])(profile, mode, roles, {
        durationS: settings.durationS,
        resolution: settings.resolution,
        aspectRatio: settings.aspectRatio,
        fps: settings.fps,
        audio: settings.audio
    }, fallbackReason);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["priceUsd"])(profile, params.resolution, params.duration_s);
}
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "EDIT_OP_MODE$Object.fromEntries$EDIT_OPS.map");
__turbopack_context__.k.register(_c1, "EDIT_OP_MODE$Object.fromEntries");
__turbopack_context__.k.register(_c2, "EDIT_OP_MODE");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/stills.generated.json.[json].cjs [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = {
    "generated_at": "2026-09-12T14:23:05.068Z",
    "stills": {
        "in-first-frame": {
            "id": "in-first-frame",
            "role": "input",
            "for": "image_to_video",
            "src": "/stills/in-first-frame.jpg",
            "width": 1280,
            "height": 714,
            "alt": "A still harbour at dawn, boats at their moorings, mist on the water.",
            "prompt": "a still harbour at dawn, fishing boats at their moorings, mist lifting off flat water, a distant headland, nobody in shot",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "c4a6b6b3606f"
        },
        "in-last-frame": {
            "id": "in-last-frame",
            "role": "input",
            "for": "last_frame",
            "src": "/stills/in-last-frame.jpg",
            "width": 1280,
            "height": 714,
            "alt": "A gull settled on a weathered harbour post, sea blurred behind.",
            "prompt": "a single gull settled on a weathered wooden harbour post, wings folded, the sea soft and out of focus behind it",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "04c1c35603cd"
        },
        "in-keyframe-1": {
            "id": "in-keyframe-1",
            "role": "input",
            "for": "keyframes",
            "src": "/stills/in-keyframe-1.jpg",
            "width": 1280,
            "height": 714,
            "alt": "An empty beach under a calm pale sky.",
            "prompt": "an empty beach under a calm pale sky, flat shallow water, long horizon, early light",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "8a378020b118"
        },
        "in-keyframe-2": {
            "id": "in-keyframe-2",
            "role": "input",
            "for": "keyframes",
            "src": "/stills/in-keyframe-2.jpg",
            "width": 1280,
            "height": 714,
            "alt": "The same beach under a storm sky, wind flattening the grass.",
            "prompt": "the same empty beach under a bruised storm sky, wind flattening the marram grass, dark water",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "f761f7e43358"
        },
        "in-keyframe-3": {
            "id": "in-keyframe-3",
            "role": "input",
            "for": "keyframes",
            "src": "/stills/in-keyframe-3.jpg",
            "width": 1280,
            "height": 714,
            "alt": "The same beach in heavy rain sweeping across the sand.",
            "prompt": "the same beach in heavy rain sweeping across wet sand, near-black sky, spray off the breakers",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "d8db3e7a77eb"
        },
        "in-reference-cast": {
            "id": "in-reference-cast",
            "role": "input",
            "for": "reference_to_video",
            "src": "/stills/in-reference-cast.jpg",
            "width": 1280,
            "height": 714,
            "alt": "A reference portrait of a woman in a yellow oilskin raincoat.",
            "prompt": "portrait of a woman in her fifties in a yellow oilskin raincoat, weathered face, hood down, neutral expression, plain background, even light, reference photograph",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "8ca906767add"
        },
        "in-reference-prop": {
            "id": "in-reference-prop",
            "role": "input",
            "for": "reference_to_video",
            "src": "/stills/in-reference-prop.jpg",
            "width": 1280,
            "height": 714,
            "alt": "A reference photograph of a brass storm lantern.",
            "prompt": "a brass paraffin storm lantern, unlit, on a plain background, even light, product reference photograph",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "4923e7122ed3"
        },
        "in-reference-place": {
            "id": "in-reference-place",
            "role": "input",
            "for": "reference_to_video",
            "src": "/stills/in-reference-place.jpg",
            "width": 1280,
            "height": 714,
            "alt": "A reference photograph of a stone harbour pier.",
            "prompt": "a stone harbour pier with iron bollards and a low sea wall, overcast, empty, location reference photograph",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "75858dae3b47"
        },
        "in-source-still": {
            "id": "in-source-still",
            "role": "input",
            "for": "video_edit",
            "src": "/stills/in-source-still.jpg",
            "width": 1280,
            "height": 714,
            "alt": "A quiet coast road in flat daylight, walls either side.",
            "prompt": "a quiet coast road in flat daylight, tarmac still wet, low stone walls either side, grey sky",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "a4c33fa8efe6"
        },
        "poster-text": {
            "id": "poster-text",
            "role": "poster",
            "for": "text_to_video",
            "src": "/stills/poster-text.jpg",
            "width": 1024,
            "height": 572,
            "alt": "A keeper climbing a spiral staircase with a lantern.",
            "prompt": "a lighthouse keeper climbing a spiral iron staircase with a lantern, warm light spilling up the stone wall, seen from below",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "58fdb34f687f"
        },
        "poster-audio": {
            "id": "poster-audio",
            "role": "poster",
            "for": "audio_to_video",
            "src": "/stills/poster-audio.jpg",
            "width": 1024,
            "height": 572,
            "alt": "Rain running down a cottage window at night, a lamp on the sill.",
            "prompt": "rain running down the window of a coastal cottage at night, a paraffin lamp guttering on the sill, water beading on the glass",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "bc9b8a7d40cd"
        },
        "poster-retake": {
            "id": "poster-retake",
            "role": "poster",
            "for": "retake",
            "src": "/stills/poster-retake.jpg",
            "width": 1024,
            "height": 572,
            "alt": "A rowing boat tied to a jetty, reflections breaking.",
            "prompt": "a rowing boat tied to a jetty in a gentle swell, reflections breaking on the water, overcast light",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "47bfa78d4632"
        },
        "poster-extend": {
            "id": "poster-extend",
            "role": "poster",
            "for": "extend_video",
            "src": "/stills/poster-extend.jpg",
            "width": 1024,
            "height": 572,
            "alt": "A shoreline at dusk, tide pulling back over wet sand.",
            "prompt": "a long shoreline at dusk, tide pulling back over wet sand, a distant headland, the light failing",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "6786b5ececbc"
        },
        "poster-first-last": {
            "id": "poster-first-last",
            "role": "poster",
            "for": "first_last_frame",
            "src": "/stills/poster-first-last.jpg",
            "width": 1024,
            "height": 572,
            "alt": "A closed weathered door with sea light beneath it.",
            "prompt": "a closed weathered door in a stone wall, a bright clifftop sea view visible through the gap beneath it, dusk",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "5efcf0121fa1"
        },
        "poster-reference": {
            "id": "poster-reference",
            "role": "poster",
            "for": "reference_to_video",
            "src": "/stills/poster-reference.jpg",
            "width": 1024,
            "height": 572,
            "alt": "A woman in a yellow raincoat walking a pier as spray bursts over the wall.",
            "prompt": "a woman in a yellow raincoat walking a stone pier in heavy weather, sea spray bursting over the wall beside her",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "801062eb2a43"
        },
        "poster-image": {
            "id": "poster-image",
            "role": "poster",
            "for": "image_to_video",
            "src": "/stills/poster-image.jpg",
            "width": 1024,
            "height": 572,
            "alt": "A harbour at dawn as a boat eases away from the quay, its wake breaking the water.",
            "prompt": "a harbour at dawn beginning to stir, one fishing boat easing away from the quay, its wake breaking the flat water, mist parting",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "4549bafd08b0"
        },
        "poster-keyframes": {
            "id": "poster-keyframes",
            "role": "poster",
            "for": "keyframes",
            "src": "/stills/poster-keyframes.jpg",
            "width": 1024,
            "height": 572,
            "alt": "A storm halfway across a beach, wind flattening the grass as rain arrives.",
            "prompt": "a storm halfway across a beach, wind flattening the marram grass, rain arriving over dark water, the last light behind it",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "e6f3f99de0c8"
        },
        "poster-edit": {
            "id": "poster-edit",
            "role": "poster",
            "for": "video_edit",
            "src": "/stills/poster-edit.jpg",
            "width": 1024,
            "height": 572,
            "alt": "A coast road under heavy snowfall, snow settling on the tarmac.",
            "prompt": "a quiet coast road under heavy snowfall, snow settling on the tarmac and the low stone walls, flat white sky",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "41f7abf80df7"
        },
        "poster-last": {
            "id": "poster-last",
            "role": "poster",
            "for": "last_frame",
            "src": "/stills/poster-last.jpg",
            "width": 1024,
            "height": 572,
            "alt": "A gull about to land on a harbour post, wings still spread.",
            "prompt": "a gull on the point of landing on a weathered harbour post, wings still spread, the sea soft behind it",
            "source": "still-reference",
            "model": "google/gemini-3.1-flash-image",
            "fingerprint": "3f7877d5765c"
        }
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/stills.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ALL_STILLS",
    ()=>ALL_STILLS,
    "HAS_STILLS",
    ()=>HAS_STILLS,
    "STILLS_NOTE",
    ()=>STILLS_NOTE,
    "inputsForMode",
    ()=>inputsForMode,
    "posterForMode",
    ()=>posterForMode,
    "still",
    ()=>still
]);
/**
 * The site's stills index, written by scripts/stills.mjs.
 *
 * Two roles that must not be confused:
 *
 *   input   real source media for a mode that takes media — a first frame, a last frame,
 *           keyframes, reference images. These are what we feed LTX-2's image-to-video,
 *           first/last-frame and reference endpoints, so a demo of those modes is an
 *           honest job rather than a text prompt dressed up as an image one.
 *   poster  a holding frame for a mode tile until its clip exists. Replaced by a frame cut
 *           from the real video, and never presented as video.
 *
 * As with the reel, every component reads from here and must render without anything.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$stills$2e$generated$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/stills.generated.json.[json].cjs [app-client] (ecmascript)");
;
const INDEX = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$stills$2e$generated$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].stills ?? {};
const ALL_STILLS = Object.values(INDEX);
_c = ALL_STILLS;
const HAS_STILLS = ALL_STILLS.length > 0;
function still(id) {
    return INDEX[id];
}
function posterForMode(mode) {
    return ALL_STILLS.find((s)=>s.role === "poster" && s.for === mode);
}
function inputsForMode(mode) {
    return ALL_STILLS.filter((s)=>s.role === "input" && s.for === mode);
}
const STILLS_NOTE = "Stills are generated reference images, not network output. The ones marked as inputs are the actual media fed to the model in these examples.";
var _c;
__turbopack_context__.k.register(_c, "ALL_STILLS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/useModels.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useModels",
    ()=>useModels
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/kuno.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function useModels(pollMs = 30_000) {
    _s();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        data: null,
        settled: false,
        error: null
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useModels.useEffect": ()=>{
            const client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeClient"])();
            let alive = true;
            let timer;
            const tick = {
                "useModels.useEffect.tick": async ()=>{
                    if (document.visibilityState === "visible") {
                        try {
                            const data = await client.models(0);
                            if (alive) setState({
                                data,
                                settled: true,
                                error: null
                            });
                        } catch (error) {
                            if (alive) setState({
                                data: null,
                                settled: true,
                                error
                            });
                        }
                    }
                    if (alive) timer = window.setTimeout(tick, pollMs);
                }
            }["useModels.useEffect.tick"];
            const onVisible = {
                "useModels.useEffect.onVisible": ()=>{
                    if (document.visibilityState === "visible") {
                        window.clearTimeout(timer);
                        void tick();
                    }
                }
            }["useModels.useEffect.onVisible"];
            void tick();
            document.addEventListener("visibilitychange", onVisible);
            return ({
                "useModels.useEffect": ()=>{
                    alive = false;
                    window.clearTimeout(timer);
                    document.removeEventListener("visibilitychange", onVisible);
                }
            })["useModels.useEffect"];
        }
    }["useModels.useEffect"], [
        pollMs
    ]);
    return state;
}
_s(useModels, "CH4Mv9otYiKvGORVacMUmaXSCzs=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/validation.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Client-side request checks. Mirrors validate_roles / validate_params in
 * kuno_protocol/profiles.py so problems show inline before anything is encrypted,
 * uploaded or charged. The gateway and the enclave still enforce the same rules.
 */ __turbopack_context__.s([
    "AUDIO_ROLES",
    ()=>AUDIO_ROLES,
    "MODE_LABEL",
    ()=>MODE_LABEL,
    "MODE_ROLES",
    ()=>MODE_ROLES,
    "VISUAL_ROLES",
    ()=>VISUAL_ROLES,
    "validateParams",
    ()=>validateParams,
    "validatePrompt",
    ()=>validatePrompt,
    "validateRoles",
    ()=>validateRoles
]);
const MODE_ROLES = {
    text_to_video: {
        required: [],
        allowed: []
    },
    image_to_video: {
        required: [
            "first_frame"
        ],
        allowed: [
            "first_frame"
        ]
    },
    last_frame: {
        required: [
            "last_frame"
        ],
        allowed: [
            "last_frame"
        ]
    },
    first_last_frame: {
        required: [
            "first_frame",
            "last_frame"
        ],
        allowed: [
            "first_frame",
            "last_frame"
        ]
    },
    keyframes: {
        required: [
            "keyframe"
        ],
        allowed: [
            "keyframe"
        ]
    },
    reference_to_video: {
        required: [],
        allowed: [
            "reference_image",
            "reference_video",
            "reference_audio"
        ]
    },
    video_edit: {
        required: [
            "source_video"
        ],
        allowed: [
            "source_video",
            "reference_image"
        ]
    },
    extend_video: {
        required: [
            "source_video"
        ],
        allowed: [
            "source_video",
            "reference_image"
        ]
    },
    audio_to_video: {
        required: [
            "source_audio"
        ],
        allowed: [
            "source_audio",
            "first_frame",
            "reference_image"
        ]
    },
    retake: {
        required: [
            "source_video"
        ],
        allowed: [
            "source_video"
        ]
    }
};
const VISUAL_ROLES = new Set([
    "first_frame",
    "last_frame",
    "keyframe",
    "reference_image",
    "reference_video",
    "source_video"
]);
const AUDIO_ROLES = new Set([
    "reference_audio",
    "source_audio"
]);
const MODE_LABEL = {
    text_to_video: "Text to video",
    image_to_video: "First frame",
    last_frame: "Last frame",
    first_last_frame: "First & last frame",
    keyframes: "Keyframes",
    reference_to_video: "References",
    video_edit: "Edit",
    extend_video: "Extend",
    audio_to_video: "Audio to video",
    retake: "Retake"
};
const ROLE_NOUN = {
    first_frame: [
        "a first frame",
        "first frames"
    ],
    last_frame: [
        "a last frame",
        "last frames"
    ],
    keyframe: [
        "a keyframe",
        "keyframes"
    ],
    reference_image: [
        "a reference image",
        "reference images"
    ],
    reference_video: [
        "a reference clip",
        "reference clips"
    ],
    reference_audio: [
        "an audio reference",
        "audio references"
    ],
    source_video: [
        "a source video",
        "source videos"
    ],
    source_audio: [
        "a soundtrack",
        "soundtracks"
    ]
};
const singular = (r)=>ROLE_NOUN[r][0];
const plural = (r)=>ROLE_NOUN[r][1];
function joinList(items) {
    if (items.length < 2) return items.join("");
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
function validateRoles(profile, mode, roles) {
    const out = [];
    const lim = profile.limits;
    if (!profile.modes.includes(mode)) {
        out.push({
            code: "mode",
            message: `${profile.name} doesn't do ${MODE_LABEL[mode].toLowerCase()}.`
        });
    }
    const { required, allowed } = MODE_ROLES[mode];
    const present = new Set(roles);
    const count = (r)=>roles.filter((x)=>x === r).length;
    const missing = required.filter((r)=>!present.has(r));
    if (missing.length) {
        out.push({
            code: "missing",
            message: `${MODE_LABEL[mode]} needs ${joinList(missing.map(singular))}.`,
            roles: missing
        });
    }
    const extra = [
        ...present
    ].filter((r)=>!allowed.includes(r));
    if (extra.length) {
        out.push({
            code: "extra",
            message: `${MODE_LABEL[mode]} doesn't take ${joinList(extra.map(plural))}.`,
            roles: extra
        });
    }
    if (mode === "reference_to_video" && present.size === 0) {
        out.push({
            code: "empty",
            message: "Add at least one reference image, clip or audio track."
        });
    }
    for (const role of present){
        if (!allowed.includes(role)) continue;
        const limit = lim.max_inputs[role] ?? 0;
        const n = count(role);
        if (n > limit) {
            out.push({
                code: "max",
                message: limit === 0 ? `${profile.name} doesn't take ${plural(role)}.` : `${profile.name} takes at most ${limit} ${limit === 1 ? plural(role).replace(/s$/, "") : plural(role)} — you have ${n}.`,
                roles: [
                    role
                ]
            });
        }
    }
    for (const group of lim.input_groups ?? []){
        const n = group.roles.reduce((sum, r)=>sum + count(r), 0);
        if (n > group.max) {
            out.push({
                code: "group",
                message: `${profile.name} takes at most ${group.max} across ${joinList(group.roles.map(plural))} — you have ${n}.`,
                roles: group.roles
            });
        }
    }
    if (lim.max_total_inputs != null && roles.length > lim.max_total_inputs) {
        out.push({
            code: "total",
            message: `${profile.name} takes at most ${lim.max_total_inputs} files in total — you have ${roles.length}.`
        });
    }
    if (lim.visual_required_with_audio && [
        ...present
    ].some((r)=>AUDIO_ROLES.has(r)) && ![
        ...present
    ].some((r)=>VISUAL_ROLES.has(r))) {
        out.push({
            code: "audio_visual",
            message: `${profile.name} needs an image or video alongside audio.`,
            roles: [
                "reference_audio",
                "source_audio"
            ]
        });
    }
    return out;
}
function validateParams(profile, params, roles) {
    const out = [];
    const lim = profile.limits;
    if (params.durationS < lim.min_duration_s || params.durationS > lim.max_duration_s) {
        out.push({
            code: "duration",
            message: `Duration must be between ${lim.min_duration_s} and ${lim.max_duration_s} seconds.`
        });
    } else {
        const steps = (params.durationS - lim.min_duration_s) / lim.duration_step_s;
        if (Math.abs(steps - Math.round(steps)) > 1e-6) {
            out.push({
                code: "duration_step",
                message: `Duration must be in ${lim.duration_step_s}-second steps.`
            });
        }
    }
    const sizes = lim.sizes[params.resolution];
    if (!sizes) out.push({
        code: "resolution",
        message: `${profile.name} doesn't render ${params.resolution}.`
    });
    else if (!sizes[params.aspectRatio]) {
        out.push({
            code: "aspect",
            message: `${profile.name} doesn't render ${params.resolution} at ${params.aspectRatio}.`
        });
    }
    if (!lim.fps.includes(params.fps)) out.push({
        code: "fps",
        message: `Frame rate must be one of ${lim.fps.join(", ")} fps.`
    });
    if (params.audio && !lim.audio) out.push({
        code: "audio",
        message: `${profile.name} can't generate audio.`
    });
    return [
        ...out,
        ...validateRoles(profile, params.mode, roles)
    ];
}
function validatePrompt(profile, prompt, negativePrompt) {
    const out = [];
    if (!prompt.trim()) out.push({
        code: "prompt_empty",
        message: "Describe the shot first."
    });
    if (prompt.length > profile.limits.max_prompt_chars) {
        out.push({
            code: "prompt_long",
            message: `Prompts are limited to ${profile.limits.max_prompt_chars.toLocaleString("en-US")} characters on ${profile.name}.`
        });
    }
    if (negativePrompt?.trim() && !profile.limits.negative_prompt) {
        out.push({
            code: "negative",
            message: `${profile.name} doesn't use negative prompts.`
        });
    }
    return out;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=platform_web_src_1zv547o._.js.map