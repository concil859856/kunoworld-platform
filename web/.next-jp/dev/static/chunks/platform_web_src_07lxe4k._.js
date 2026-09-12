(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
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
"[project]/platform/web/src/components/studio/Composer.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "advanced": "Composer-module__KrvNpq__advanced",
  "advancedToggle": "Composer-module__KrvNpq__advancedToggle",
  "blockHint": "Composer-module__KrvNpq__blockHint",
  "blockers": "Composer-module__KrvNpq__blockers",
  "charCount": "Composer-module__KrvNpq__charCount",
  "chip": "Composer-module__KrvNpq__chip",
  "chips": "Composer-module__KrvNpq__chips",
  "composer": "Composer-module__KrvNpq__composer",
  "enhanceNote": "Composer-module__KrvNpq__enhanceNote",
  "field": "Composer-module__KrvNpq__field",
  "footer": "Composer-module__KrvNpq__footer",
  "generate": "Composer-module__KrvNpq__generate",
  "go": "Composer-module__KrvNpq__go",
  "hint": "Composer-module__KrvNpq__hint",
  "kbd": "Composer-module__KrvNpq__kbd",
  "lock": "Composer-module__KrvNpq__lock",
  "messages": "Composer-module__KrvNpq__messages",
  "notice": "Composer-module__KrvNpq__notice",
  "price": "Composer-module__KrvNpq__price",
  "problems": "Composer-module__KrvNpq__problems",
  "prompt": "Composer-module__KrvNpq__prompt",
  "promptWrap": "Composer-module__KrvNpq__promptWrap",
  "route": "Composer-module__KrvNpq__route",
  "staticChip": "Composer-module__KrvNpq__staticChip",
  "tabCount": "Composer-module__KrvNpq__tabCount",
  "tabs": "Composer-module__KrvNpq__tabs",
  "toggle": "Composer-module__KrvNpq__toggle",
  "toggleMark": "Composer-module__KrvNpq__toggleMark",
  "top": "Composer-module__KrvNpq__top",
  "trayArea": "Composer-module__KrvNpq__trayArea",
  "wide": "Composer-module__KrvNpq__wide",
});
}),
"[project]/platform/web/src/components/studio/Composer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Composer",
    ()=>Composer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/ConnectDialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/kuno.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/shot.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/validation.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Composer.module.css [app-client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$composerState$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/composerState.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/ModelPicker.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Trays.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
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
;
const noop = ()=>()=>{};
const QUIET_UNTIL_ATTEMPT = new Set([
    "prompt_empty",
    "missing",
    "empty"
]);
const MAX_SEED = 2 ** 31 - 1;
function Composer({ composer, profiles, live, connected, onGenerate, promptRef }) {
    _s();
    const { state, profile, actions } = composer;
    const lim = profile.limits;
    const [attempted, setAttempted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [advanced, setAdvanced] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const mac = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(noop, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isMac"], {
        "Composer.useSyncExternalStore[mac]": ()=>false
    }["Composer.useSyncExternalStore[mac]"]);
    const ids = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const collected = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Composer.useMemo[collected]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$composerState$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["collectInputs"])(state)
    }["Composer.useMemo[collected]"], [
        state
    ]);
    const mode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["modeFor"])(state.tab, state.editOp, collected.roles);
    const prediction = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["predictRoute"])(live.data, profile, mode);
    const target = prediction.ok ? prediction.profile : profile;
    const reason = prediction.ok ? prediction.reason : null;
    const estimate = prediction.ok ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["estimatePrice"])(target, mode, collected.roles, state.settings, reason) : null;
    // Recomputed each render: cheap, and a manual useMemo here can't be preserved by
    // the React Compiler because its dependencies are objects derived during render.
    const problems = (()=>{
        const s = state.settings;
        const out = [
            ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["validatePrompt"])(profile, state.prompt, lim.negative_prompt ? s.negativePrompt : ""),
            ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["validateParams"])(profile, {
                mode,
                durationS: s.durationS,
                resolution: s.resolution,
                aspectRatio: s.aspectRatio,
                fps: s.fps,
                audio: s.audio
            }, collected.roles)
        ];
        if (state.tab === "frames" && !state.inputs.first && !state.inputs.last) {
            const i = out.findIndex((p)=>p.code === "missing");
            if (i >= 0) out[i] = {
                code: "missing",
                message: "Add a first frame, a last frame, or both.",
                roles: [
                    "first_frame",
                    "last_frame"
                ]
            };
        }
        if (state.tab === "edit" && state.editOp === "retake" && state.inputs.source) {
            const { retakeStart: a, retakeEnd: b } = state.inputs;
            const d = state.inputs.source.info.duration;
            if (!(a >= 0 && b > a)) out.push({
                code: "window",
                message: "The retake window must start before it ends.",
                roles: [
                    "source_video"
                ]
            });
            else if (d && b > d + 0.01) {
                out.push({
                    code: "window_end",
                    message: `The retake window ends after the clip does (${d.toFixed(1)} s).`,
                    roles: [
                        "source_video"
                    ]
                });
            }
        }
        const seed = s.seed.trim();
        if (lim.seed && seed && (!/^\d{1,10}$/.test(seed) || Number(seed) > MAX_SEED)) {
            out.push({
                code: "seed",
                message: `Seeds are whole numbers from 0 to ${MAX_SEED.toLocaleString("en-US")}.`
            });
        }
        if (!prediction.ok) out.push({
            code: prediction.code,
            message: prediction.message
        });
        const seen = new Set();
        return out.filter((p)=>seen.has(p.message) ? false : (seen.add(p.message), true));
    })();
    const shown = attempted ? problems : problems.filter((p)=>!QUIET_UNTIL_ATTEMPT.has(p.code));
    const trayProblems = shown.filter((p)=>p.roles?.length);
    const generalProblems = shown.filter((p)=>!p.roles?.length);
    const blocked = problems.length > 0;
    const routeNotice = prediction.ok ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fallbackNotice"])(reason, profile, target, true) : null;
    function submit() {
        setAttempted(true);
        if (!connected) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openConnect"])();
            return;
        }
        if (blocked || !prediction.ok) return;
        const s = state.settings;
        const seed = s.seed.trim();
        const request = {
            prompt: state.prompt.trim(),
            model: profile.id,
            mode,
            durationS: s.durationS,
            resolution: s.resolution,
            aspectRatio: s.aspectRatio,
            fps: s.fps,
            audio: s.audio,
            seed: lim.seed && seed ? Number(seed) : undefined,
            negativePrompt: lim.negative_prompt && s.negativePrompt.trim() ? s.negativePrompt.trim() : undefined,
            inputs: collected.inputs,
            options: s.enhance && lim.prompt_enhancer ? {
                enhance_prompt: true
            } : undefined
        };
        onGenerate({
            request,
            requested: profile,
            predicted: target,
            fallbackReason: reason,
            mode,
            estimate,
            summaries: collected.summaries,
            snapshot: {
                tab: state.tab,
                editOp: state.editOp,
                profileId: state.profileId,
                prompt: state.prompt,
                settings: state.settings,
                inputs: state.inputs
            }
        });
        setAttempted(false);
    }
    function onPromptKey(e) {
        // Only Cmd/Ctrl+Enter generates. Plain Enter (and Shift+Enter) is a new line, never a spend.
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
        }
    }
    function onTabKey(e) {
        const i = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TABS"].findIndex((t)=>t.id === state.tab);
        let next = -1;
        if (e.key === "ArrowRight") next = (i + 1) % __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TABS"].length;
        else if (e.key === "ArrowLeft") next = (i - 1 + __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TABS"].length) % __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TABS"].length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TABS"].length - 1;
        if (next < 0) return;
        e.preventDefault();
        actions.setTab(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TABS"][next].id);
        document.getElementById(`${ids}-tab-${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TABS"][next].id}`)?.focus();
    }
    const tabCount = (tab)=>{
        const i = state.inputs;
        if (tab === "frames") return Number(Boolean(i.first)) + Number(Boolean(i.last));
        if (tab === "keyframes") return i.keyframes.length;
        if (tab === "references") return i.refImages.length + i.refVideos.length + i.refAudio.length;
        if (tab === "edit") return Number(Boolean(i.source)) + Number(Boolean(i.soundtrack)) + Number(Boolean(i.a2vFirst)) + i.editImages.length;
        return 0;
    };
    const insertToken = (token)=>{
        const p = state.prompt;
        actions.setPrompt(`${p}${p && !/\s$/.test(p) ? " " : ""}${token} `);
        promptRef.current?.focus();
    };
    const sizes = lim.sizes[state.settings.resolution] ?? {};
    const resolutions = Object.keys(lim.sizes);
    const promptNearLimit = state.prompt.length > lim.max_prompt_chars * 0.8;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].composer,
        role: "group",
        "aria-label": "Composer",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].top,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].tabs,
                        role: "tablist",
                        "aria-label": "Shot type",
                        onKeyDown: onTabKey,
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TABS"].map((t)=>{
                            const n = tabCount(t.id);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                id: `${ids}-tab-${t.id}`,
                                type: "button",
                                role: "tab",
                                "aria-selected": state.tab === t.id,
                                "aria-controls": `${ids}-tray`,
                                tabIndex: state.tab === t.id ? 0 : -1,
                                onClick: ()=>actions.setTab(t.id),
                                children: [
                                    t.label,
                                    n > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].tabCount,
                                        children: n
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                        lineNumber: 201,
                                        columnNumber: 27
                                    }, this)
                                ]
                            }, t.id, true, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 190,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 186,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ModelPicker"], {
                        profiles: profiles,
                        selected: profile,
                        onSelect: (p)=>actions.setProfile(p),
                        tab: state.tab,
                        editOp: state.editOp,
                        live: Boolean(live.data)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 206,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                lineNumber: 185,
                columnNumber: 7
            }, this),
            state.notice && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].notice,
                role: "status",
                children: [
                    state.notice,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>actions.setNotice(null),
                        "aria-label": "Dismiss",
                        children: "×"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 219,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                lineNumber: 217,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: `${ids}-tray`,
                role: "tabpanel",
                "aria-labelledby": `${ids}-tab-${state.tab}`,
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].trayArea,
                "data-tab": state.tab,
                children: [
                    state.tab === "frames" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FramesTray"], {
                        composer: composer,
                        problems: trayProblems
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 226,
                        columnNumber: 36
                    }, this),
                    state.tab === "keyframes" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["KeyframesTray"], {
                        composer: composer,
                        problems: trayProblems
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 227,
                        columnNumber: 39
                    }, this),
                    state.tab === "references" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ReferencesTray"], {
                        composer: composer,
                        problems: trayProblems,
                        onInsert: insertToken
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 228,
                        columnNumber: 40
                    }, this),
                    state.tab === "edit" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EditTray"], {
                        composer: composer,
                        problems: trayProblems
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 229,
                        columnNumber: 34
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].promptWrap,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                htmlFor: `${ids}-prompt`,
                                className: "sr-only",
                                children: "Prompt"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 232,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                ref: promptRef,
                                id: `${ids}-prompt`,
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].prompt,
                                value: state.prompt,
                                onChange: (e)=>actions.setPrompt(e.target.value),
                                onKeyDown: onPromptKey,
                                placeholder: state.tab === "references" ? "Direct the scene. Refer to your references as <Picture 1>, <Video 1>, <Audio 1>…" : "Describe the shot: subject, action, camera, light, sound…",
                                rows: 3,
                                spellCheck: true,
                                "aria-describedby": `${ids}-hint`
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 235,
                                columnNumber: 11
                            }, this),
                            promptNearLimit && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].charCount,
                                "data-over": state.prompt.length > lim.max_prompt_chars,
                                children: [
                                    state.prompt.length.toLocaleString("en-US"),
                                    "/",
                                    lim.max_prompt_chars.toLocaleString("en-US")
                                ]
                            }, void 0, true, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 252,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 231,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                lineNumber: 225,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].chips,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].chip,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "Aspect ratio"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 261,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: state.settings.aspectRatio,
                                onChange: (e)=>actions.patchSettings({
                                        aspectRatio: e.target.value
                                    }),
                                children: Object.keys(sizes).map((ar)=>{
                                    const size = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["frameSize"])(profile, state.settings.resolution, ar);
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: ar,
                                        children: [
                                            ar,
                                            size ? ` · ${size[0]}×${size[1]}` : ""
                                        ]
                                    }, ar, true, {
                                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                        lineNumber: 266,
                                        columnNumber: 17
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 262,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 260,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].chip,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "Duration"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 275,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: state.settings.durationS,
                                onChange: (e)=>actions.patchSettings({
                                        durationS: Number(e.target.value)
                                    }),
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["durationOptions"])(profile).map((d)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: d,
                                        children: [
                                            d,
                                            " s"
                                        ]
                                    }, d, true, {
                                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                        lineNumber: 278,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 276,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 274,
                        columnNumber: 9
                    }, this),
                    resolutions.length > 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].chip,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "Resolution"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 286,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: state.settings.resolution,
                                onChange: (e)=>actions.patchSettings({
                                        resolution: e.target.value
                                    }),
                                children: resolutions.map((r)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: r,
                                        children: [
                                            r,
                                            " · ",
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rate"])(profile.pricing.usd_per_second[r]),
                                            "/s"
                                        ]
                                    }, r, true, {
                                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                        lineNumber: 289,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 287,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 285,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].staticChip,
                        title: "This stock renders at one resolution",
                        children: resolutions[0]
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 296,
                        columnNumber: 11
                    }, this),
                    lim.fps.length > 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].chip,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "Frame rate"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 302,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: state.settings.fps,
                                onChange: (e)=>actions.patchSettings({
                                        fps: Number(e.target.value)
                                    }),
                                children: lim.fps.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: f,
                                        children: [
                                            f,
                                            " fps"
                                        ]
                                    }, f, true, {
                                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                        lineNumber: 305,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 303,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 301,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].staticChip,
                        children: [
                            lim.fps[0],
                            " fps"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 312,
                        columnNumber: 11
                    }, this),
                    lim.audio && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].toggle,
                        "aria-pressed": state.settings.audio,
                        onClick: ()=>actions.patchSettings({
                                audio: !state.settings.audio
                            }),
                        title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(profile) ? "MiniMax H3 generates native stereo audio with the picture" : "Generate a soundtrack with the picture",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].toggleMark,
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 322,
                                columnNumber: 13
                            }, this),
                            "Audio"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 315,
                        columnNumber: 11
                    }, this),
                    lim.prompt_enhancer && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].toggle,
                        "aria-pressed": state.settings.enhance,
                        onClick: ()=>actions.patchSettings({
                                enhance: !state.settings.enhance
                            }),
                        title: "Rewrites your prompt inside the sealed stage before rendering. The rewrite never leaves the stage.",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].toggleMark,
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 334,
                                columnNumber: 13
                            }, this),
                            "Enhance prompt"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 327,
                        columnNumber: 11
                    }, this),
                    (lim.seed || lim.negative_prompt) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].advancedToggle,
                        "aria-expanded": advanced,
                        "aria-controls": `${ids}-advanced`,
                        onClick: ()=>setAdvanced((a)=>!a),
                        children: "Advanced"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 339,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                lineNumber: 259,
                columnNumber: 7
            }, this),
            lim.prompt_enhancer && state.settings.enhance && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].enhanceNote,
                children: "The stock rewrites your prompt inside the sealed stage, just before rendering. The rewrite never leaves the stage, so it can't be shown to you here — turn this off to render exactly what you wrote."
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                lineNumber: 348,
                columnNumber: 9
            }, this),
            advanced && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: `${ids}-advanced`,
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].advanced,
                children: [
                    lim.seed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].field,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Seed"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 358,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                inputMode: "numeric",
                                placeholder: "Random",
                                value: state.settings.seed,
                                onChange: (e)=>actions.patchSettings({
                                        seed: e.target.value.replace(/[^\d]/g, "")
                                    })
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 359,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 357,
                        columnNumber: 13
                    }, this),
                    lim.negative_prompt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].field} ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].wide}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Negative prompt"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 369,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                placeholder: "What to avoid",
                                value: state.settings.negativePrompt,
                                onChange: (e)=>actions.patchSettings({
                                        negativePrompt: e.target.value
                                    })
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 370,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 368,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                lineNumber: 355,
                columnNumber: 9
            }, this),
            routeNotice && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].messages,
                "aria-live": "polite",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].route,
                    children: routeNotice
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                    lineNumber: 382,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                lineNumber: 381,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].footer,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        id: `${ids}-hint`,
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].hint,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].lock,
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 388,
                                columnNumber: 11
                            }, this),
                            "Encrypted on this device before upload",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].kbd,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("kbd", {
                                        children: mac ? "⌘" : "Ctrl"
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                        lineNumber: 391,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("kbd", {
                                        children: "↵"
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                        lineNumber: 392,
                                        columnNumber: 13
                                    }, this),
                                    " generates · ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("kbd", {
                                        children: "↵"
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                        lineNumber: 392,
                                        columnNumber: 38
                                    }, this),
                                    " is a new line"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 390,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 387,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].go,
                        children: [
                            connected && blocked && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                id: `${ids}-blocked`,
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].blockers,
                                "aria-live": "polite",
                                children: generalProblems.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    role: "list",
                                    "aria-label": "Problems to fix",
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].problems,
                                    children: generalProblems.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: p.message
                                        }, p.code + p.message, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                            lineNumber: 403,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                    lineNumber: 401,
                                    columnNumber: 17
                                }, this) : trayProblems.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].blockHint,
                                    children: "Fix the highlighted inputs above."
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                    lineNumber: 407,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "sr-only",
                                    children: problems[0].message
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                    lineNumber: 409,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 399,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: `btn btn-primary ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].generate}`,
                                onClick: submit,
                                "aria-disabled": connected && blocked,
                                "aria-describedby": connected && blocked ? `${ids}-blocked` : `${ids}-hint`,
                                title: blocked ? problems[0]?.message : undefined,
                                children: connected ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        "Generate ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].price,
                                            children: estimate === null ? "" : `· ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usd"])(estimate)}`
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                            lineNumber: 423,
                                            columnNumber: 26
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                    lineNumber: 422,
                                    columnNumber: 15
                                }, this) : "Connect to generate"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                                lineNumber: 413,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                        lineNumber: 395,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
                lineNumber: 386,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Composer.tsx",
        lineNumber: 184,
        columnNumber: 5
    }, this);
}
_s(Composer, "WFBa1bNtLvroCisLudeRYjRNC2E=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = Composer;
var _c;
__turbopack_context__.k.register(_c, "Composer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/studio/Feed.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "caption": "Feed-module__6oB4SW__caption",
  "card": "Feed-module__6oB4SW__card",
  "charge": "Feed-module__6oB4SW__charge",
  "day": "Feed-module__6oB4SW__day",
  "developing": "Feed-module__6oB4SW__developing",
  "empty": "Feed-module__6oB4SW__empty",
  "emptyText": "Feed-module__6oB4SW__emptyText",
  "emptyTitle": "Feed-module__6oB4SW__emptyTitle",
  "fallbackFlag": "Feed-module__6oB4SW__fallbackFlag",
  "feed": "Feed-module__6oB4SW__feed",
  "frame": "Feed-module__6oB4SW__frame",
  "grid": "Feed-module__6oB4SW__grid",
  "group": "Feed-module__6oB4SW__group",
  "hit": "Feed-module__6oB4SW__hit",
  "lock": "Feed-module__6oB4SW__lock",
  "meta": "Feed-module__6oB4SW__meta",
  "overlay": "Feed-module__6oB4SW__overlay",
  "prompt": "Feed-module__6oB4SW__prompt",
  "shimmer": "Feed-module__6oB4SW__shimmer",
  "stock": "Feed-module__6oB4SW__stock",
  "suggestions": "Feed-module__6oB4SW__suggestions",
  "video": "Feed-module__6oB4SW__video",
});
}),
"[project]/platform/web/src/components/studio/Feed.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Feed",
    ()=>Feed,
    "stockLabel",
    ()=>stockLabel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/ConnectDialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/library.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/media.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/shot.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Feed.module.css [app-client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Steps.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
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
const SUGGESTIONS = [
    "A lighthouse keeper lights the lamp at dusk, the beam sweeping across a restless sea",
    "Rain on a tram window at night; a woman reads a letter and smiles, neon smearing in the glass",
    "Slow dolly through a darkroom as a print develops in the tray under a red safelight"
];
function stockLabel(profile, fallbackId) {
    if (!profile) return fallbackId;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(profile) ? profile.name : `LTX-2.5 ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(profile)}`;
}
function Feed({ entries, films, profiles, selectedId, connected, onSelect, onNeedFilm, onSuggest }) {
    _s();
    const scroller = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const count = entries.length;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Feed.useEffect": ()=>{
            const el = scroller.current;
            if (el) el.scrollTop = el.scrollHeight;
        }
    }["Feed.useEffect"], [
        count
    ]);
    const groups = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Feed.useMemo[groups]": ()=>{
            const out = [];
            for (const e of entries){
                const day = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["relativeDay"])(e.createdAt);
                const last = out[out.length - 1];
                if (last && last.day === day) last.items.push(e);
                else out.push({
                    day,
                    items: [
                        e
                    ]
                });
            }
            return out;
        }
    }["Feed.useMemo[groups]"], [
        entries
    ]);
    if (entries.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].feed,
            ref: scroller,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].empty,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: `display ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].emptyTitle}`,
                        children: [
                            "The tray is ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                                children: "empty."
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                                lineNumber: 71,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 70,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].emptyText,
                        children: "Describe a shot below. Your prompt and any frames are encrypted in this browser before they leave it; the finished film is opened here too."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 73,
                        columnNumber: 11
                    }, this),
                    !connected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "btn btn-primary btn-small",
                        onClick: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openConnect"],
                        children: "Connect an API key to generate"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 78,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].suggestions,
                        role: "list",
                        "aria-label": "Prompt ideas",
                        children: SUGGESTIONS.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>onSuggest(s),
                                    children: s
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                                    lineNumber: 85,
                                    columnNumber: 17
                                }, this)
                            }, s, false, {
                                fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                                lineNumber: 84,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 82,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                lineNumber: 69,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
            lineNumber: 68,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].feed,
        ref: scroller,
        children: groups.map((g)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].group,
                "aria-label": g.day,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].day,
                        children: g.day
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 100,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].grid,
                        role: "list",
                        children: g.items.map((e)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ResultCard, {
                                entry: e,
                                film: films[e.id],
                                profile: profiles.find((p)=>p.id === e.profileId),
                                requested: profiles.find((p)=>p.id === e.requestedProfileId),
                                selected: e.id === selectedId,
                                onSelect: onSelect,
                                onNeedFilm: onNeedFilm
                            }, e.id, false, {
                                fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                                lineNumber: 103,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 101,
                        columnNumber: 11
                    }, this)
                ]
            }, g.day, true, {
                fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                lineNumber: 99,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
        lineNumber: 97,
        columnNumber: 5
    }, this);
}
_s(Feed, "7N4wwyk0JYAaEjLjmhz7MB3FBpk=");
_c = Feed;
function ResultCard({ entry, film, profile, requested, selected, onSelect, onNeedFilm }) {
    _s1();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const video = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [unplayable, setUnplayable] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const ready = entry.step === "ready";
    const needsFilm = ready && !film;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ResultCard.useEffect": ()=>{
            const el = ref.current;
            if (!el || !needsFilm) return;
            const io = new IntersectionObserver({
                "ResultCard.useEffect": ([hit])=>{
                    if (hit.isIntersecting) {
                        onNeedFilm(entry);
                        io.disconnect();
                    }
                }
            }["ResultCard.useEffect"]);
            io.observe(el);
            return ({
                "ResultCard.useEffect": ()=>io.disconnect()
            })["ResultCard.useEffect"];
        }
    }["ResultCard.useEffect"], [
        needsFilm,
        entry,
        onNeedFilm
    ]);
    const play = ()=>{
        const v = video.current;
        if (v) void v.play().catch(()=>undefined);
    };
    const stop = ()=>{
        const v = video.current;
        if (v) {
            v.pause();
            v.currentTime = 0;
        }
    };
    const aspect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ratioValue"])(entry.settings.aspectRatio);
    const notice = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fallbackNotice"])(entry.fallbackReason, requested, profile);
    const failed = entry.step === "failed" || entry.step === "canceled";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
        ref: ref,
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].card,
        "data-step": entry.step,
        "data-selected": selected,
        onMouseEnter: play,
        onMouseLeave: stop,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].frame,
                style: {
                    aspectRatio: String(aspect)
                },
                children: [
                    ready && film?.url && !unplayable && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                        ref: video,
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].video,
                        src: film.url,
                        muted: true,
                        loop: true,
                        playsInline: true,
                        preload: "metadata",
                        onError: ()=>setUnplayable(true)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 177,
                        columnNumber: 11
                    }, this),
                    ready && film?.url && unplayable && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].overlay,
                        children: "This browser can't preview the film. Download it to watch."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 188,
                        columnNumber: 46
                    }, this),
                    ready && !film?.url && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].overlay,
                        children: film?.error ? film.error.title : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].lock,
                                    "aria-hidden": "true"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                                    lineNumber: 193,
                                    columnNumber: 17
                                }, this),
                                " Sealed · opening here…"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                            lineNumber: 192,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 190,
                        columnNumber: 11
                    }, this),
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isActive"])(entry) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].developing,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Steps"], {
                            entry: entry
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                            lineNumber: 200,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 199,
                        columnNumber: 11
                    }, this),
                    failed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].overlay,
                        "data-tone": "bad",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                            children: entry.error?.title ?? "Failed"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                            lineNumber: 205,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 204,
                        columnNumber: 11
                    }, this),
                    entry.fallbackReason && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].fallbackFlag,
                        title: notice ?? undefined,
                        children: "Fallback"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 208,
                        columnNumber: 34
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                lineNumber: 175,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].caption,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].stock,
                        children: stockLabel(profile, entry.profileId)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 211,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].meta,
                        children: [
                            entry.settings.durationS,
                            " s · ",
                            entry.settings.resolution,
                            " · ",
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clockTime"])(entry.createdAt)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 212,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].prompt,
                        children: entry.prompt
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 215,
                        columnNumber: 9
                    }, this),
                    failed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].charge,
                        children: entry.handle ? `Refunded ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usd"])(entry.price)}` : "Not charged"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 217,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].charge,
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usd"])(entry.price)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                        lineNumber: 219,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                lineNumber: 210,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].hit,
                onClick: ()=>onSelect(entry.id),
                onFocus: play,
                onBlur: stop,
                "aria-label": `Open take: ${entry.prompt || "untitled"} — ${stockLabel(profile, entry.profileId)}`,
                "aria-pressed": selected
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
                lineNumber: 222,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Feed.tsx",
        lineNumber: 174,
        columnNumber: 5
    }, this);
}
_s1(ResultCard, "JniaAWhmMwp9Ux2UM9dQQuwiNu8=");
_c1 = ResultCard;
var _c, _c1;
__turbopack_context__.k.register(_c, "Feed");
__turbopack_context__.k.register(_c1, "ResultCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/studio/Inspector.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "actions": "Inspector-module__Vvi-MW__actions",
  "attribution": "Inspector-module__Vvi-MW__attribution",
  "blank": "Inspector-module__Vvi-MW__blank",
  "blankTitle": "Inspector-module__Vvi-MW__blankTitle",
  "body": "Inspector-module__Vvi-MW__body",
  "certificate": "Inspector-module__Vvi-MW__certificate",
  "charge": "Inspector-module__Vvi-MW__charge",
  "close": "Inspector-module__Vvi-MW__close",
  "details": "Inspector-module__Vvi-MW__details",
  "error": "Inspector-module__Vvi-MW__error",
  "head": "Inspector-module__Vvi-MW__head",
  "inputs": "Inspector-module__Vvi-MW__inputs",
  "inspector": "Inspector-module__Vvi-MW__inspector",
  "mono": "Inspector-module__Vvi-MW__mono",
  "muted": "Inspector-module__Vvi-MW__muted",
  "notice": "Inspector-module__Vvi-MW__notice",
  "panel": "Inspector-module__Vvi-MW__panel",
  "player": "Inspector-module__Vvi-MW__player",
  "playerDark": "Inspector-module__Vvi-MW__playerDark",
  "playerNote": "Inspector-module__Vvi-MW__playerNote",
  "privacy": "Inspector-module__Vvi-MW__privacy",
  "prompt": "Inspector-module__Vvi-MW__prompt",
  "steps": "Inspector-module__Vvi-MW__steps",
  "sub": "Inspector-module__Vvi-MW__sub",
  "tabs": "Inspector-module__Vvi-MW__tabs",
  "title": "Inspector-module__Vvi-MW__title",
  "titleRow": "Inspector-module__Vvi-MW__titleRow",
  "video": "Inspector-module__Vvi-MW__video",
});
}),
"[project]/platform/web/src/components/studio/Inspector.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Inspector",
    ()=>Inspector
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$CertificateView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/verify/CertificateView.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$useCertificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/verify/useCertificate.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/library.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/media.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/shot.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/validation.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Feed.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Inspector.module.css [app-client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Steps.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
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
;
;
;
const ROLE_SHORT = {
    first_frame: "First frame",
    last_frame: "Last frame",
    keyframe: "Keyframe",
    reference_image: "Image",
    reference_video: "Clip",
    reference_audio: "Audio",
    source_video: "Source video",
    source_audio: "Soundtrack"
};
function Inspector({ entry, film, profiles, onClose, onCancel, onRemove, onReuse, onUseLastFrame, onCopyLink, onOpenFilm, titleRef }) {
    _s();
    const [tab, setTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("take");
    const ids = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    if (!entry) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].inspector,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].blank,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].blankTitle,
                        children: "Nothing selected"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                        lineNumber: 67,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: "Pick a take to play it, see its settings, reuse them, or read its certificate."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                        lineNumber: 68,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 66,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
            lineNumber: 65,
            columnNumber: 7
        }, this);
    }
    const profile = profiles.find((p)=>p.id === entry.profileId);
    const requested = profiles.find((p)=>p.id === entry.requestedProfileId);
    const notice = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fallbackNotice"])(entry.fallbackReason, requested, profile);
    const ready = entry.step === "ready";
    const failed = entry.step === "failed" || entry.step === "canceled";
    const size = profile ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["frameSize"])(profile, entry.settings.resolution, entry.settings.aspectRatio) : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].inspector,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].head,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].titleRow,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].title,
                                ref: titleRef,
                                tabIndex: -1,
                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stockLabel"])(profile, entry.profileId)
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                lineNumber: 85,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: `btn btn-small btn-quiet ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].close}`,
                                onClick: onClose,
                                children: "Close"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                lineNumber: 88,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                        lineNumber: 84,
                        columnNumber: 9
                    }, this),
                    profile && (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(profile) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].attribution,
                        children: "Made with MiniMax H3"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                        lineNumber: 92,
                        columnNumber: 38
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].tabs,
                        role: "tablist",
                        "aria-label": "Inspector",
                        children: [
                            "take",
                            "certificate"
                        ].map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                role: "tab",
                                id: `${ids}-${t}-tab`,
                                "aria-controls": `${ids}-${t}`,
                                "aria-selected": tab === t,
                                tabIndex: tab === t ? 0 : -1,
                                onClick: ()=>setTab(t),
                                onKeyDown: (e)=>{
                                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                                        const next = t === "take" ? "certificate" : "take";
                                        setTab(next);
                                        document.getElementById(`${ids}-${next}-tab`)?.focus();
                                    }
                                },
                                children: t === "take" ? "Take" : "Certificate"
                            }, t, false, {
                                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                lineNumber: 95,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                        lineNumber: 93,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].body,
                children: tab === "take" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    role: "tabpanel",
                    id: `${ids}-take`,
                    "aria-labelledby": `${ids}-take-tab`,
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].panel,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Player, {
                            entry: entry,
                            film: film,
                            onOpenFilm: onOpenFilm
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                            lineNumber: 121,
                            columnNumber: 13
                        }, this),
                        notice && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].notice,
                            children: notice
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                            lineNumber: 123,
                            columnNumber: 24
                        }, this),
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isActive"])(entry) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].steps,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Steps"], {
                                entry: entry,
                                variant: "list"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                lineNumber: 127,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                            lineNumber: 126,
                            columnNumber: 15
                        }, this),
                        failed && entry.error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].error,
                            role: "alert",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: entry.error.title
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 133,
                                    columnNumber: 17
                                }, this),
                                entry.error.detail && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: entry.error.detail
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 134,
                                    columnNumber: 40
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].charge,
                                    children: entry.handle ? `Refunded ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usd"])(entry.price)} automatically.` : "Nothing was charged."
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 135,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                            lineNumber: 132,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].actions,
                            children: [
                                ready && film?.url && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    className: "btn btn-small btn-primary",
                                    href: film.url,
                                    download: `kunoworld-${entry.id.slice(0, 8)}.mp4`,
                                    children: "Download"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 143,
                                    columnNumber: 17
                                }, this),
                                ready && entry.receipt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "btn btn-small",
                                    onClick: ()=>onCopyLink(entry),
                                    children: "Copy certificate link"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 148,
                                    columnNumber: 17
                                }, this),
                                ready && film?.url && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "btn btn-small",
                                    onClick: ()=>onUseLastFrame(entry),
                                    children: "Use last frame"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 153,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "btn btn-small",
                                    onClick: ()=>onReuse(entry),
                                    children: "Reuse settings"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 157,
                                    columnNumber: 15
                                }, this),
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isActive"])(entry) && entry.handle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "btn btn-small btn-quiet",
                                    onClick: ()=>onCancel(entry),
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 161,
                                    columnNumber: 17
                                }, this),
                                !(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isActive"])(entry) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "btn btn-small btn-quiet",
                                    onClick: ()=>onRemove(entry),
                                    children: "Remove"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 166,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                            lineNumber: 141,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].prompt,
                            "aria-label": "Prompt",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "eyebrow",
                                    children: "Prompt"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 173,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: entry.prompt
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 174,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                            lineNumber: 172,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dl", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].details,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                            children: "Stock"
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 179,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                            children: [
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stockLabel"])(profile, entry.profileId),
                                                entry.fallbackReason && requested && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].sub,
                                                    children: [
                                                        " · asked for ",
                                                        requested.name
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                                    lineNumber: 182,
                                                    columnNumber: 57
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 180,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 178,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                            children: "Shot"
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 186,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                            children: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MODE_LABEL"][entry.mode]
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 187,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 185,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                            children: "Format"
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 190,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                            children: [
                                                entry.settings.resolution,
                                                " · ",
                                                entry.settings.aspectRatio,
                                                size ? ` · ${size[0]}×${size[1]}` : "",
                                                " · ",
                                                entry.settings.fps,
                                                " fps"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 191,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 189,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                            children: "Length"
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 197,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                            children: [
                                                entry.settings.durationS,
                                                " s · ",
                                                entry.settings.audio ? "with audio" : "silent"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 198,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 196,
                                    columnNumber: 15
                                }, this),
                                entry.settings.seed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                            children: "Seed"
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 204,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                            className: "mono",
                                            children: entry.settings.seed
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 205,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 203,
                                    columnNumber: 17
                                }, this),
                                entry.inputs.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                            children: "Inputs"
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 210,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                role: "list",
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].inputs,
                                                children: entry.inputs.map((i, n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: [
                                                            ROLE_SHORT[i.role] ?? i.role,
                                                            i.timeS !== undefined ? ` @ ${i.timeS} s` : "",
                                                            i.startS !== undefined ? ` ${i.startS}–${i.endS} s` : "",
                                                            " · ",
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].sub,
                                                                children: i.name
                                                            }, void 0, false, {
                                                                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                                                lineNumber: 217,
                                                                columnNumber: 88
                                                            }, this)
                                                        ]
                                                    }, `${i.role}-${n}`, true, {
                                                        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                                        lineNumber: 214,
                                                        columnNumber: 25
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                                lineNumber: 212,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 211,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 209,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                            children: "Price"
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 225,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                            children: failed ? entry.handle ? `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usd"])(entry.price)} — refunded` : "Not charged" : (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usd"])(entry.price)
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 226,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 224,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                            children: "Made"
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 229,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                            children: [
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["relativeDay"])(entry.createdAt),
                                                ", ",
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clockTime"])(entry.createdAt)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 230,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 228,
                                    columnNumber: 15
                                }, this),
                                entry.handle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dt", {
                                            children: "Job"
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 236,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dd", {
                                            className: "mono",
                                            children: entry.id
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                            lineNumber: 237,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                                    lineNumber: 235,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                            lineNumber: 177,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].privacy,
                            children: "Decrypted in this browser with a key that never left it. Neither the stage's owner nor KunoWorld can open this film."
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                            lineNumber: 242,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                    lineNumber: 120,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    role: "tabpanel",
                    id: `${ids}-certificate`,
                    "aria-labelledby": `${ids}-certificate-tab`,
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].panel,
                    children: entry.receipt ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CertificatePanel, {
                        digest: entry.receipt.body.content_digest,
                        onCopy: ()=>onCopyLink(entry)
                    }, entry.id, false, {
                        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                        lineNumber: 250,
                        columnNumber: 15
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].muted,
                        children: failed ? "No certificate — this take didn't finish." : "The certificate is signed when the stage seals the film."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                        lineNumber: 252,
                        columnNumber: 15
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                    lineNumber: 248,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 118,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
        lineNumber: 82,
        columnNumber: 5
    }, this);
}
_s(Inspector, "5nh2CmHMsdnK8yF4GQ0OPGvHKMQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = Inspector;
function Player({ entry, film, onOpenFilm }) {
    _s1();
    const [unplayable, setUnplayable] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const ready = entry.step === "ready";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Player.useEffect": ()=>{
            if (ready && !film) onOpenFilm(entry);
        }
    }["Player.useEffect"], [
        ready,
        film,
        entry,
        onOpenFilm
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].player,
        style: {
            aspectRatio: String((0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ratioValue"])(entry.settings.aspectRatio))
        },
        children: [
            ready && film?.url && !unplayable && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].video,
                src: film.url,
                controls: true,
                playsInline: true,
                preload: "metadata",
                onError: ()=>setUnplayable(true)
            }, film.url, false, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 274,
                columnNumber: 9
            }, this),
            ready && film?.url && unplayable && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].playerNote,
                children: "This browser can't play the film's codec (H.264). Download it to watch."
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 277,
                columnNumber: 9
            }, this),
            ready && !film?.url && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].playerNote,
                children: film?.error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                            children: film.error.title
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                            lineNumber: 283,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                            lineNumber: 284,
                            columnNumber: 15
                        }, this),
                        film.error.detail
                    ]
                }, void 0, true, {
                    fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                    lineNumber: 282,
                    columnNumber: 13
                }, this) : "Downloading the sealed film and decrypting it here…"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 280,
                columnNumber: 9
            }, this),
            !ready && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].playerDark,
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 292,
                columnNumber: 18
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
        lineNumber: 272,
        columnNumber: 5
    }, this);
}
_s1(Player, "tyCFPk/1yt+xk8XNS38XNrnnZY8=");
_c1 = Player;
function CertificatePanel({ digest, onCopy }) {
    _s2();
    const { state, checkDigest } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$useCertificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCertificate"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CertificatePanel.useEffect": ()=>{
            void checkDigest(digest);
        }
    }["CertificatePanel.useEffect"], [
        digest,
        checkDigest
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].certificate,
        children: [
            (state.kind === "looking" || state.kind === "idle") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].muted,
                children: "Reading the certificate…"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 306,
                columnNumber: 63
            }, this),
            state.kind === "found" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$CertificateView$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CertificateView"], {
                prov: state.prov,
                checks: state.checks,
                variant: "compact"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 307,
                columnNumber: 34
            }, this),
            state.kind === "missing" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].muted,
                children: "The gateway has no certificate for this film's hash."
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 308,
                columnNumber: 36
            }, this),
            state.kind === "error" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].muted,
                children: [
                    state.error.title,
                    ". ",
                    state.error.detail
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 310,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].actions,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: "btn btn-small",
                        onClick: onCopy,
                        children: "Copy certificate link"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                        lineNumber: 315,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        className: "btn btn-small btn-quiet",
                        href: `/verify?sha256=${digest}`,
                        target: "_blank",
                        children: "Open on the verify page"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                        lineNumber: 318,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 314,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].privacy,
                children: "The certificate is public by the film's hash. It names the model and the sealed hardware — never your prompt or inputs."
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
                lineNumber: 322,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Inspector.tsx",
        lineNumber: 305,
        columnNumber: 5
    }, this);
}
_s2(CertificatePanel, "mnGonB4pGwVVpfLsUoAcJf9BdqA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$useCertificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCertificate"]
    ];
});
_c2 = CertificatePanel;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Inspector");
__turbopack_context__.k.register(_c1, "Player");
__turbopack_context__.k.register(_c2, "CertificatePanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/studio/MediaSlot.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "audio": "MediaSlot-module__ubCoOq__audio",
  "badge": "MediaSlot-module__ubCoOq__badge",
  "caption": "MediaSlot-module__ubCoOq__caption",
  "label": "MediaSlot-module__ubCoOq__label",
  "media": "MediaSlot-module__ubCoOq__media",
  "name": "MediaSlot-module__ubCoOq__name",
  "note": "MediaSlot-module__ubCoOq__note",
  "plus": "MediaSlot-module__ubCoOq__plus",
  "remove": "MediaSlot-module__ubCoOq__remove",
  "slot": "MediaSlot-module__ubCoOq__slot",
  "wave": "MediaSlot-module__ubCoOq__wave",
});
}),
"[project]/platform/web/src/components/studio/MediaSlot.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ACCEPT",
    ()=>ACCEPT,
    "MediaSlot",
    ()=>MediaSlot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/MediaSlot.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
const ACCEPT = {
    image: "image/png,image/jpeg,image/webp",
    video: "video/mp4,video/quicktime,video/webm",
    audio: "audio/wav,audio/x-wav,audio/mpeg,audio/ogg,audio/flac"
};
function Preview({ item }) {
    if (item.info.kind === "image") {
        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].media,
            src: item.url,
            alt: ""
        }, void 0, false, {
            fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
            lineNumber: 17,
            columnNumber: 12
        }, this);
    }
    if (item.info.kind === "video") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].media,
            src: item.url,
            muted: true,
            playsInline: true,
            preload: "metadata"
        }, void 0, false, {
            fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
            lineNumber: 20,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].audio,
        "aria-hidden": "true",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].wave
        }, void 0, false, {
            fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
            lineNumber: 24,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
_c = Preview;
function MediaSlot({ label, item, accept, onFiles, onRemove, disabled = false, note, badge, multiple = false, size = "md", invalid = false }) {
    _s();
    const [over, setOver] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const ids = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    if (item) {
        const duration = item.info.duration ? ` · ${item.info.duration.toFixed(1)} s` : "";
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("figure", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].slot,
            "data-filled": "true",
            "data-size": size,
            "data-invalid": invalid,
            "aria-label": `${label}: ${item.name}${duration}`,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Preview, {
                    item: item
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
                    lineNumber: 62,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("figcaption", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].caption,
                    children: [
                        badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].badge,
                            children: badge
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
                            lineNumber: 64,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].name,
                            title: item.name,
                            children: [
                                label,
                                duration
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
                            lineNumber: 65,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
                    lineNumber: 63,
                    columnNumber: 9
                }, this),
                onRemove && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "button",
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].remove,
                    onClick: onRemove,
                    "aria-label": `Remove ${label}`,
                    children: "×"
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
                    lineNumber: 71,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
            lineNumber: 61,
            columnNumber: 7
        }, this);
    }
    function onDrop(e) {
        e.preventDefault();
        setOver(false);
        if (disabled || !onFiles) return;
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].slot,
        "data-empty": "true",
        "data-over": over,
        "data-disabled": disabled,
        "data-size": size,
        "data-invalid": invalid,
        onDragOver: (e)=>{
            e.preventDefault();
            if (!disabled) setOver(true);
        },
        onDragLeave: ()=>setOver(false),
        onDrop: onDrop,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "file",
                className: "sr-only",
                accept: accept,
                multiple: multiple,
                disabled: disabled,
                "aria-label": label,
                "aria-invalid": invalid || undefined,
                "aria-describedby": note ? `${ids}-note` : undefined,
                onChange: (e)=>{
                    const files = Array.from(e.target.files ?? []);
                    if (files.length && onFiles) onFiles(files);
                    e.target.value = "";
                }
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
                lineNumber: 104,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].plus,
                "aria-hidden": "true",
                children: "+"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
                lineNumber: 119,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].label,
                "aria-hidden": "true",
                children: label
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
                lineNumber: 122,
                columnNumber: 7
            }, this),
            note && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].note,
                id: `${ids}-note`,
                children: note
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
                lineNumber: 126,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/MediaSlot.tsx",
        lineNumber: 88,
        columnNumber: 5
    }, this);
}
_s(MediaSlot, "QR3lH+RUEMK2Z8pDYUNJKCCJ6/0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c1 = MediaSlot;
var _c, _c1;
__turbopack_context__.k.register(_c, "Preview");
__turbopack_context__.k.register(_c1, "MediaSlot");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/studio/ModelPicker.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "chevron": "ModelPicker-module__oQ2psq__chevron",
  "group": "ModelPicker-module__oQ2psq__group",
  "groupHead": "ModelPicker-module__oQ2psq__groupHead",
  "optHead": "ModelPicker-module__oQ2psq__optHead",
  "optName": "ModelPicker-module__oQ2psq__optName",
  "optSpecs": "ModelPicker-module__oQ2psq__optSpecs",
  "optTag": "ModelPicker-module__oQ2psq__optTag",
  "option": "ModelPicker-module__oQ2psq__option",
  "panel": "ModelPicker-module__oQ2psq__panel",
  "picker": "ModelPicker-module__oQ2psq__picker",
  "trigger": "ModelPicker-module__oQ2psq__trigger",
  "triggerFamily": "ModelPicker-module__oQ2psq__triggerFamily",
  "triggerName": "ModelPicker-module__oQ2psq__triggerName",
  "why": "ModelPicker-module__oQ2psq__why",
});
}),
"[project]/platform/web/src/components/studio/ModelPicker.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ModelPicker",
    ()=>ModelPicker
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$AvailabilityPill$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/AvailabilityPill.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/shot.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/ModelPicker.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function ModelPicker({ profiles, selected, onSelect, tab, editOp, live }) {
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const trigger = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const panel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ModelPicker.useEffect": ()=>{
            if (!open) return;
            const onDown = {
                "ModelPicker.useEffect.onDown": (e)=>{
                    const t = e.target;
                    if (!panel.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false);
                }
            }["ModelPicker.useEffect.onDown"];
            document.addEventListener("pointerdown", onDown);
            const first = panel.current?.querySelector('[role="option"][aria-selected="true"]') ?? panel.current?.querySelector('[role="option"]:not([aria-disabled="true"])');
            first?.focus();
            return ({
                "ModelPicker.useEffect": ()=>document.removeEventListener("pointerdown", onDown)
            })["ModelPicker.useEffect"];
        }
    }["ModelPicker.useEffect"], [
        open
    ]);
    function choose(p) {
        onSelect(p);
        setOpen(false);
        trigger.current?.focus();
    }
    function onKeyDown(e) {
        const opts = Array.from(panel.current?.querySelectorAll('[role="option"]') ?? []);
        const i = opts.indexOf(document.activeElement);
        const move = (to)=>{
            e.preventDefault();
            opts[(to + opts.length) % opts.length]?.focus();
        };
        if (e.key === "ArrowDown") move(i + 1);
        else if (e.key === "ArrowUp") move(i - 1);
        else if (e.key === "Home") move(0);
        else if (e.key === "End") move(opts.length - 1);
        else if (e.key === "Escape" || e.key === "Tab") {
            if (e.key === "Escape") e.preventDefault();
            setOpen(false);
            trigger.current?.focus();
        }
    }
    const selectedAvailability = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["availability"])(selected, live);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].picker,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                ref: trigger,
                type: "button",
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].trigger,
                "aria-haspopup": "listbox",
                "aria-expanded": open,
                "aria-controls": open ? `${id}-list` : undefined,
                onClick: ()=>setOpen((o)=>!o),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].triggerFamily,
                        "data-family": (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(selected) ? "h3" : "ltx",
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STOCKS"][selected.family]?.brand ?? selected.family
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                        lineNumber: 85,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].triggerName,
                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(selected)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                        lineNumber: 88,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$AvailabilityPill$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AvailabilityPill"], {
                        availability: selectedAvailability,
                        compact: true
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                        lineNumber: 89,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].chevron,
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                        lineNumber: 90,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "sr-only",
                        children: "Change film stock"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                        lineNumber: 91,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                lineNumber: 76,
                columnNumber: 7
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: panel,
                id: `${id}-list`,
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].panel,
                role: "listbox",
                "aria-label": "Film stock",
                onKeyDown: onKeyDown,
                children: [
                    __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_H3"],
                    __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_LTX"]
                ].map((family)=>{
                    const stock = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STOCKS"][family];
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        role: "group",
                        "aria-labelledby": `${id}-${family}`,
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].group,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                id: `${id}-${family}`,
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].groupHead,
                                "data-family": family === __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_H3"] ? "h3" : "ltx",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        children: stock.brand
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                        lineNumber: 101,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                                        children: stock.stockName
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                        lineNumber: 102,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                lineNumber: 100,
                                columnNumber: 17
                            }, this),
                            profiles.filter((p)=>p.family === family).map((p)=>{
                                const fits = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supportsTab"])(p, tab, editOp);
                                const av = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["availability"])(p, live);
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    role: "option",
                                    tabIndex: -1,
                                    "aria-selected": p.id === selected.id,
                                    "aria-disabled": !fits,
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].option,
                                    onClick: ()=>fits && choose(p),
                                    onKeyDown: (e)=>{
                                        if ((e.key === "Enter" || e.key === " ") && fits) {
                                            e.preventDefault();
                                            choose(p);
                                        }
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].optHead,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].optName,
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(p) ? p.name : `LTX-2.5 ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(p)}`
                                                }, void 0, false, {
                                                    fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                                    lineNumber: 126,
                                                    columnNumber: 27
                                                }, this),
                                                fits ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$AvailabilityPill$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AvailabilityPill"], {
                                                    availability: av,
                                                    compact: true
                                                }, void 0, false, {
                                                    fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                                    lineNumber: 127,
                                                    columnNumber: 35
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].why,
                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["unsupportedReason"])(p, tab, editOp)
                                                }, void 0, false, {
                                                    fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                                    lineNumber: 127,
                                                    columnNumber: 84
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                            lineNumber: 125,
                                            columnNumber: 25
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].optTag,
                                            children: p.tagline
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                            lineNumber: 129,
                                            columnNumber: 25
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].optSpecs,
                                            children: [
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolutionRange"])(p),
                                                " · ",
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["durationRange"])(p),
                                                " · ",
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fpsRange"])(p),
                                                " · from ",
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rate"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["minRate"])(p)),
                                                "/s"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                            lineNumber: 130,
                                            columnNumber: 25
                                        }, this),
                                        fits && (av.state === "region" || av.state === "off" || av.state === "empty") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$ModelPicker$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].why,
                                            children: av.detail
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                            lineNumber: 134,
                                            columnNumber: 27
                                        }, this)
                                    ]
                                }, p.id, true, {
                                    fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                                    lineNumber: 110,
                                    columnNumber: 23
                                }, this);
                            })
                        ]
                    }, family, true, {
                        fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                        lineNumber: 99,
                        columnNumber: 15
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
                lineNumber: 95,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/ModelPicker.tsx",
        lineNumber: 75,
        columnNumber: 5
    }, this);
}
_s(ModelPicker, "c84ecZ23wEw1ABwwvM8XeX9zbNs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = ModelPicker;
var _c;
__turbopack_context__.k.register(_c, "ModelPicker");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/studio/Rail.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "close": "Rail-module__Ja4w6G__close",
  "count": "Rail-module__Ja4w6G__count",
  "day": "Rail-module__Ja4w6G__day",
  "empty": "Rail-module__Ja4w6G__empty",
  "filters": "Rail-module__Ja4w6G__filters",
  "foot": "Rail-module__Ja4w6G__foot",
  "footButtons": "Rail-module__Ja4w6G__footButtons",
  "group": "Rail-module__Ja4w6G__group",
  "head": "Rail-module__Ja4w6G__head",
  "item": "Rail-module__Ja4w6G__item",
  "itemText": "Rail-module__Ja4w6G__itemText",
  "license": "Rail-module__Ja4w6G__license",
  "list": "Rail-module__Ja4w6G__list",
  "meta": "Rail-module__Ja4w6G__meta",
  "prompt": "Rail-module__Ja4w6G__prompt",
  "rail": "Rail-module__Ja4w6G__rail",
  "rail-stripe": "Rail-module__Ja4w6G__rail-stripe",
  "restore": "Rail-module__Ja4w6G__restore",
  "search": "Rail-module__Ja4w6G__search",
  "searchNote": "Rail-module__Ja4w6G__searchNote",
  "state": "Rail-module__Ja4w6G__state",
  "title": "Rail-module__Ja4w6G__title",
});
}),
"[project]/platform/web/src/components/studio/Rail.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Rail",
    ()=>Rail
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/ConnectDialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/config.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/library.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Rail.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
const FILTERS = [
    {
        id: "all",
        label: "All"
    },
    {
        id: "active",
        label: "Rendering"
    },
    {
        id: "ready",
        label: "Ready"
    },
    {
        id: "failed",
        label: "Failed"
    }
];
function stockName(profileId) {
    const p = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CATALOG"].find((x)=>x.id === profileId);
    if (!p) return profileId;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(p) ? p.name : `LTX-2.5 ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["variantLabel"])(p)}`;
}
function backup(entries) {
    const blob = new Blob([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["exportEntries"])(entries)
    ], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kunoworld-film-keys-${new Date().toISOString().slice(0, 10)}.json`;
    // Some browsers only honour a click on an anchor that is in the document.
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url), 2000);
}
function Rail({ entries, selectedId, onSelect, onForget, onRestore, connected, onClose }) {
    _s();
    const [query, setQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [filter, setFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("all");
    const groups = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Rail.useMemo[groups]": ()=>{
            const q = query.trim().toLowerCase();
            const shown = [
                ...entries
            ].reverse().filter({
                "Rail.useMemo[groups].shown": (e)=>{
                    if (filter === "active" && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isActive"])(e)) return false;
                    if (filter === "ready" && e.step !== "ready") return false;
                    if (filter === "failed" && e.step !== "failed" && e.step !== "canceled") return false;
                    return !q || e.prompt.toLowerCase().includes(q) || stockName(e.profileId).toLowerCase().includes(q);
                }
            }["Rail.useMemo[groups].shown"]);
            const out = [];
            for (const e of shown){
                const day = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["relativeDay"])(e.createdAt);
                const last = out[out.length - 1];
                if (last && last.day === day) last.items.push(e);
                else out.push({
                    day,
                    items: [
                        e
                    ]
                });
            }
            return out;
        }
    }["Rail.useMemo[groups]"], [
        entries,
        query,
        filter
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].rail,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].head,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].title,
                        children: [
                            "Library ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].count,
                                children: entries.length
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                lineNumber: 85,
                                columnNumber: 19
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                        lineNumber: 84,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: `btn btn-small btn-quiet ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].close}`,
                        onClick: onClose,
                        children: "Close"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].search,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "sr-only",
                        children: "Search the library"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                        lineNumber: 93,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "search",
                        placeholder: "Search takes",
                        value: query,
                        onChange: (e)=>setQuery(e.target.value)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                        lineNumber: 94,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                lineNumber: 92,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].searchNote,
                children: "Search runs on this device."
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].filters,
                role: "group",
                "aria-label": "Filter",
                children: FILTERS.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        "aria-pressed": filter === f.id,
                        onClick: ()=>setFilter(f.id),
                        children: f.label
                    }, f.id, false, {
                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                        lineNumber: 100,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                lineNumber: 98,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].list,
                children: [
                    !connected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].empty,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                children: "Connect an API key to start a library. Each key keeps its own."
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                lineNumber: 109,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "btn btn-small btn-primary",
                                onClick: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openConnect"],
                                children: "Connect"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                lineNumber: 110,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                        lineNumber: 108,
                        columnNumber: 11
                    }, this),
                    connected && entries.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].empty,
                        children: "Takes you make appear here, newest first."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                        lineNumber: 115,
                        columnNumber: 47
                    }, this),
                    groups.map((g)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].group,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].day,
                                    children: g.day
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                    lineNumber: 118,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    role: "list",
                                    children: g.items.map((e)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].item,
                                                "aria-current": e.id === selectedId ? "true" : undefined,
                                                "data-step": e.step,
                                                onClick: ()=>onSelect(e.id),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].state,
                                                        "aria-hidden": "true"
                                                    }, void 0, false, {
                                                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                                        lineNumber: 129,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].itemText,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].prompt,
                                                                children: e.prompt || "Untitled take"
                                                            }, void 0, false, {
                                                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                                                lineNumber: 131,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].meta,
                                                                children: [
                                                                    stockName(e.profileId),
                                                                    " · ",
                                                                    e.settings.durationS,
                                                                    " s · ",
                                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clockTime"])(e.createdAt)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                                                lineNumber: 132,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                                        lineNumber: 130,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "sr-only",
                                                        children: e.step === "ready" ? "ready" : e.step === "failed" ? "failed" : e.step === "canceled" ? "canceled" : "rendering"
                                                    }, void 0, false, {
                                                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                                        lineNumber: 136,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                                lineNumber: 122,
                                                columnNumber: 19
                                            }, this)
                                        }, e.id, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                            lineNumber: 121,
                                            columnNumber: 17
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                    lineNumber: 119,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, g.day, true, {
                            fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                            lineNumber: 117,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                lineNumber: 106,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].foot,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: "Each film's key is stored only in this browser. Clear this site's data and those films can't be opened — download what you want to keep."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                        lineNumber: 148,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].footButtons,
                        children: [
                            entries.some((e)=>e.handle) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "btn btn-small",
                                onClick: ()=>backup(entries),
                                title: "Anyone with this file can open these films",
                                children: "Back up keys"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                lineNumber: 154,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: `btn btn-small ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].restore}`,
                                title: "Load a backup file to bring film keys back to this browser",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        "aria-hidden": "true",
                                        children: "Restore keys"
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                        lineNumber: 160,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "file",
                                        className: "sr-only",
                                        accept: "application/json,.json",
                                        "aria-label": "Restore keys",
                                        onChange: (e)=>{
                                            const file = e.target.files?.[0];
                                            e.target.value = "";
                                            if (file) onRestore(file);
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                        lineNumber: 161,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                lineNumber: 159,
                                columnNumber: 11
                            }, this),
                            entries.some((e)=>e.handle) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "btn btn-small btn-quiet",
                                onClick: onForget,
                                children: "Forget all"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                lineNumber: 174,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                        lineNumber: 152,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].license,
                        children: [
                            "MiniMax H3 is used under the",
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LINKS"].h3License,
                                target: "_blank",
                                rel: "noreferrer",
                                children: "MiniMax H3 Community License"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                lineNumber: 181,
                                columnNumber: 11
                            }, this),
                            "; LTX-2.5 under the",
                            " ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LINKS"].ltxLicense,
                                target: "_blank",
                                rel: "noreferrer",
                                children: "LTX-2 Community License"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                                lineNumber: 185,
                                columnNumber: 11
                            }, this),
                            "."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                        lineNumber: 179,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
                lineNumber: 147,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Rail.tsx",
        lineNumber: 82,
        columnNumber: 5
    }, this);
}
_s(Rail, "7d1N7MniZRHBxcw3MOYymh1PuMs=");
_c = Rail;
var _c;
__turbopack_context__.k.register(_c, "Rail");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/studio/Steps.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "bar": "Steps-module__hBK_8W__bar",
  "detail": "Steps-module__hBK_8W__detail",
  "dot": "Steps-module__hBK_8W__dot",
  "fill": "Steps-module__hBK_8W__fill",
  "label": "Steps-module__hBK_8W__label",
  "list": "Steps-module__hBK_8W__list",
  "name": "Steps-module__hBK_8W__name",
  "segments": "Steps-module__hBK_8W__segments",
  "step-pulse": "Steps-module__hBK_8W__step-pulse",
  "text": "Steps-module__hBK_8W__text",
});
}),
"[project]/platform/web/src/components/studio/Steps.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Steps",
    ()=>Steps,
    "stepLabel",
    ()=>stepLabel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Steps.module.css [app-client] (css module)");
;
;
const ORDER = [
    "encrypting",
    "uploading",
    "queued",
    "generating",
    "sealing",
    "decrypting",
    "ready"
];
const LABEL = {
    encrypting: "Encrypting",
    uploading: "Uploading",
    queued: "Queued",
    generating: "Generating",
    sealing: "Sealing",
    decrypting: "Decrypting",
    ready: "Ready",
    failed: "Failed",
    canceled: "Canceled"
};
const DETAIL = {
    encrypting: "Your browser checks the stage's proof of hardware, then seals your prompt and media to it.",
    uploading: "Only ciphertext travels to the relay.",
    queued: "Waiting for the sealed stage to pick it up.",
    generating: "Rendering inside the sealed stage.",
    sealing: "The stage encrypts the film to your key and signs its receipt.",
    decrypting: "Downloading the sealed film and opening it here, with a key that never left this browser.",
    ready: "Opened here and checked against its signed receipt."
};
function stepLabel(entry) {
    if (entry.step === "generating") return `Generating ${Math.round(entry.progress * 100)}%`;
    return LABEL[entry.step];
}
function Steps({ entry, variant = "bar" }) {
    const current = ORDER.indexOf(entry.step);
    const state = (i)=>current < 0 ? "todo" : i < current ? "done" : i === current ? "current" : "todo";
    if (variant === "bar") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].bar,
            role: "progressbar",
            "aria-valuemin": 0,
            "aria-valuemax": ORDER.length,
            "aria-valuenow": Math.max(0, current),
            "aria-valuetext": stepLabel(entry),
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].segments,
                    role: "list",
                    children: ORDER.slice(0, -1).map((step, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            "data-state": state(i),
                            children: step === "generating" && state(i) === "current" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].fill,
                                style: {
                                    width: `${Math.round(entry.progress * 100)}%`
                                }
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
                                lineNumber: 46,
                                columnNumber: 17
                            }, this)
                        }, step, false, {
                            fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
                            lineNumber: 44,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
                    lineNumber: 42,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].label,
                    children: stepLabel(entry)
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
                    lineNumber: 51,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
            lineNumber: 41,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].list,
        role: "list",
        children: ORDER.map((step, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                "data-state": state(i),
                "aria-current": state(i) === "current" ? "step" : undefined,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].dot,
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
                        lineNumber: 60,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].text,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].name,
                                children: [
                                    step === "generating" && state(i) === "current" ? stepLabel(entry) : LABEL[step],
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "sr-only",
                                        children: state(i) === "done" ? " — done" : state(i) === "current" ? " — current step" : " — not started"
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
                                        lineNumber: 64,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
                                lineNumber: 62,
                                columnNumber: 13
                            }, this),
                            state(i) === "current" && DETAIL[step] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Steps$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].detail,
                                children: DETAIL[step]
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
                                lineNumber: 68,
                                columnNumber: 56
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
                        lineNumber: 61,
                        columnNumber: 11
                    }, this)
                ]
            }, step, true, {
                fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
                lineNumber: 59,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/platform/web/src/components/studio/Steps.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
_c = Steps;
var _c;
__turbopack_context__.k.register(_c, "Steps");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/studio/Studio.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "center": "Studio-module__c_M2aa__center",
  "composer": "Studio-module__c_M2aa__composer",
  "heading": "Studio-module__c_M2aa__heading",
  "inspector": "Studio-module__c_M2aa__inspector",
  "inspectorToggle": "Studio-module__c_M2aa__inspectorToggle",
  "keysNote": "Studio-module__c_M2aa__keysNote",
  "rail": "Studio-module__c_M2aa__rail",
  "railToggle": "Studio-module__c_M2aa__railToggle",
  "scrim": "Studio-module__c_M2aa__scrim",
  "seal": "Studio-module__c_M2aa__seal",
  "sealDot": "Studio-module__c_M2aa__sealDot",
  "studio": "Studio-module__c_M2aa__studio",
  "toast": "Studio-module__c_M2aa__toast",
  "toolbar": "Studio-module__c_M2aa__toolbar",
});
}),
"[project]/platform/web/src/components/studio/Studio.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Studio",
    ()=>Studio
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/ConnectDialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/errors.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/kuno.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/library.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/media.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/shot.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$useModels$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/useModels.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Composer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$composerState$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/composerState.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Feed.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Inspector.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Rail.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Studio.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
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
;
;
;
;
;
function statusPatch(s) {
    const base = {
        price: s.price_usd
    };
    if (s.status === "queued") return {
        ...base,
        step: "queued",
        progress: 0
    };
    if (s.status === "running") {
        if (s.stage === "sealing" || s.progress >= 0.92) return {
            ...base,
            step: "sealing",
            progress: 1
        };
        return {
            ...base,
            step: "generating",
            progress: Math.min(1, Math.max(0, (s.progress - 0.05) / 0.85))
        };
    }
    if (s.status === "succeeded") return {
        ...base,
        step: "decrypting",
        progress: 1,
        receipt: s.receipt ?? undefined
    };
    return base;
}
function Studio() {
    _s();
    const apiKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useApiKey"])();
    const live = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$useModels$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useModels"])(20_000);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StudioSession, {
        apiKey: apiKey,
        live: live
    }, apiKey ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["keyFingerprint"])(apiKey) : "anonymous", false, {
        fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
        lineNumber: 43,
        columnNumber: 10
    }, this);
}
_s(Studio, "711eg2nlDpG5eyC+yqCbjmDocu8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useApiKey"],
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$useModels$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useModels"]
    ];
});
_c = Studio;
function StudioSession({ apiKey, live }) {
    _s1();
    const fingerprint = apiKey ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["keyFingerprint"])(apiKey) : null;
    const client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "StudioSession.useMemo[client]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeClient"])(apiKey)
    }["StudioSession.useMemo[client]"], [
        apiKey
    ]);
    const profiles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "StudioSession.useMemo[profiles]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["profilesOrCatalog"])(live.data?.models)
    }["StudioSession.useMemo[profiles]"], [
        live.data
    ]);
    const composer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$composerState$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useComposer"])(profiles);
    const { actions: composerActions, state: composerState } = composer;
    const [entries, setEntries] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "StudioSession.useState": ()=>fingerprint ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadLibrary"])(fingerprint) : []
    }["StudioSession.useState"]);
    const [selectedId, setSelectedId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [films, setFilms] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [inspectorOpen, setInspectorOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [railOpen, setRailOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [toast, setToast] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const initialEntries = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(entries);
    const controllers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    const inputCache = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    const filmsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(films);
    const entriesRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(entries);
    const toastTimer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    const promptRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const inspectorTitle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const slots = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])({
        free: 2,
        queue: []
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StudioSession.useEffect": ()=>{
            filmsRef.current = films;
        }
    }["StudioSession.useEffect"], [
        films
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StudioSession.useEffect": ()=>{
            entriesRef.current = entries;
        }
    }["StudioSession.useEffect"], [
        entries
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StudioSession.useEffect": ()=>{
            if (fingerprint) (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveLibrary"])(fingerprint, entries);
        }
    }["StudioSession.useEffect"], [
        fingerprint,
        entries
    ]);
    // Pick a sensible first stock once live availability is known, unless the user already chose.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StudioSession.useEffect": ()=>{
            if (!live.data || composerState.touched) return;
            const current = profiles.find({
                "StudioSession.useEffect.current": (p)=>p.id === composerState.profileId
            }["StudioSession.useEffect.current"]);
            const ok = {
                "StudioSession.useEffect.ok": (p)=>p.enabled !== false && p.available_in_region !== false && (p.workers ?? 0) > 0 && (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supportsTab"])(p, composerState.tab, composerState.editOp)
            }["StudioSession.useEffect.ok"];
            if (current && ok(current)) return;
            const pick = profiles.find(ok);
            if (pick) composerActions.setProfile(pick, true);
        }
    }["StudioSession.useEffect"], [
        live.data,
        profiles,
        composerState.touched,
        composerState.profileId,
        composerState.tab,
        composerState.editOp,
        composerActions
    ]);
    const notify = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[notify]": (message)=>{
            setToast(message);
            window.clearTimeout(toastTimer.current);
            toastTimer.current = window.setTimeout({
                "StudioSession.useCallback[notify]": ()=>setToast(null)
            }["StudioSession.useCallback[notify]"], 4200);
        }
    }["StudioSession.useCallback[notify]"], []);
    const update = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[update]": (id, patch)=>{
            setEntries({
                "StudioSession.useCallback[update]": (list)=>list.map({
                        "StudioSession.useCallback[update]": (e)=>e.id === id ? {
                                ...e,
                                ...patch
                            } : e
                    }["StudioSession.useCallback[update]"])
            }["StudioSession.useCallback[update]"]);
        }
    }["StudioSession.useCallback[update]"], []);
    const setFilm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[setFilm]": (id, film)=>{
            setFilms({
                "StudioSession.useCallback[setFilm]": (f)=>({
                        ...f,
                        [id]: film
                    })
            }["StudioSession.useCallback[setFilm]"]);
        }
    }["StudioSession.useCallback[setFilm]"], []);
    const acquire = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[acquire]": async ()=>{
            const s = slots.current;
            if (s.free > 0) {
                s.free -= 1;
                return;
            }
            await new Promise({
                "StudioSession.useCallback[acquire]": (resolve)=>s.queue.push(resolve)
            }["StudioSession.useCallback[acquire]"]);
        }
    }["StudioSession.useCallback[acquire]"], []);
    const release = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[release]": ()=>{
            const s = slots.current;
            const next = s.queue.shift();
            if (next) next();
            else s.free += 1;
        }
    }["StudioSession.useCallback[release]"], []);
    /** Polls a job to completion, then downloads, verifies and decrypts it here. */ const watch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[watch]": async (entry)=>{
            if (!entry.handle) return;
            const id = entry.id;
            controllers.current.get(id)?.abort();
            const ctrl = new AbortController();
            controllers.current.set(id, ctrl);
            let last = null;
            try {
                const result = await client.wait(entry.handle, {
                    signal: ctrl.signal,
                    pollMs: 1000,
                    onProgress: {
                        "StudioSession.useCallback[watch]": (s)=>{
                            last = s;
                            update(id, statusPatch(s));
                        }
                    }["StudioSession.useCallback[watch]"]
                });
                const url = URL.createObjectURL(new Blob([
                    new Uint8Array(result.video)
                ], {
                    type: "video/mp4"
                }));
                setFilm(id, {
                    url
                });
                update(id, {
                    step: "ready",
                    progress: 1,
                    receipt: result.receipt,
                    profileId: result.profileId,
                    error: undefined
                });
            } catch (err) {
                if (ctrl.signal.aborted) return;
                const lastStatus = last;
                if (lastStatus?.status === "succeeded") {
                    setFilm(id, {
                        error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["friendlyError"])(err, "open")
                    });
                    update(id, {
                        step: "ready",
                        progress: 1,
                        receipt: lastStatus.receipt ?? undefined
                    });
                } else {
                    const error = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["friendlyError"])(err, "render");
                    // The gateway reports a cancel as error_code "canceled"; older builds sent no
                    // code at all and the SDK synthesised "job_canceled". Accept both.
                    const canceled = error.code === "canceled" || error.code === "job_canceled";
                    update(id, {
                        step: canceled ? "canceled" : "failed",
                        error
                    });
                }
            } finally{
                if (controllers.current.get(id) === ctrl) controllers.current.delete(id);
            }
        }
    }["StudioSession.useCallback[watch]"], [
        client,
        update,
        setFilm
    ]);
    // Resume anything that was still rendering when the page was last closed.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StudioSession.useEffect": ()=>{
            const ctrls = controllers.current;
            for (const e of initialEntries.current)if (e.handle && (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isActive"])(e)) void watch(e);
            return ({
                "StudioSession.useEffect": ()=>{
                    ctrls.forEach({
                        "StudioSession.useEffect": (c)=>c.abort()
                    }["StudioSession.useEffect"]);
                    ctrls.clear();
                }
            })["StudioSession.useEffect"];
        }
    }["StudioSession.useEffect"], [
        watch
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "StudioSession.useEffect": ()=>{
            return ({
                "StudioSession.useEffect": ()=>{
                    Object.values(filmsRef.current).forEach({
                        "StudioSession.useEffect": (f)=>f.url && URL.revokeObjectURL(f.url)
                    }["StudioSession.useEffect"]);
                }
            })["StudioSession.useEffect"];
        }
    }["StudioSession.useEffect"], []);
    /** Re-downloads a finished film's ciphertext and decrypts it locally (two at a time). */ const ensureFilm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[ensureFilm]": async (entry)=>{
            const current = filmsRef.current[entry.id];
            if (!entry.handle || entry.step !== "ready" || current?.url || current?.opening || current?.error) return;
            filmsRef.current = {
                ...filmsRef.current,
                [entry.id]: {
                    opening: true
                }
            };
            setFilm(entry.id, {
                opening: true
            });
            await acquire();
            try {
                const result = await client.result(entry.handle);
                const url = URL.createObjectURL(new Blob([
                    new Uint8Array(result.video)
                ], {
                    type: "video/mp4"
                }));
                setFilm(entry.id, {
                    url
                });
                if (!entry.receipt) update(entry.id, {
                    receipt: result.receipt
                });
            } catch (err) {
                setFilm(entry.id, {
                    error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["friendlyError"])(err, "open")
                });
            } finally{
                release();
            }
        }
    }["StudioSession.useCallback[ensureFilm]"], [
        client,
        acquire,
        release,
        setFilm,
        update
    ]);
    const generate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[generate]": async (sub)=>{
            if (!apiKey) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openConnect"])();
                return;
            }
            const localId = `local-${crypto.randomUUID()}`;
            const draft = {
                id: localId,
                handle: null,
                createdAt: Date.now(),
                prompt: sub.request.prompt,
                tab: sub.snapshot.tab,
                editOp: sub.snapshot.editOp,
                mode: sub.mode,
                requestedProfileId: sub.requested.id,
                profileId: sub.predicted.id,
                fallbackReason: sub.fallbackReason,
                settings: sub.snapshot.settings,
                inputs: sub.summaries,
                step: "encrypting",
                progress: 0,
                price: sub.estimate
            };
            setEntries({
                "StudioSession.useCallback[generate]": (list)=>[
                        ...list,
                        draft
                    ]
            }["StudioSession.useCallback[generate]"]);
            setSelectedId(localId);
            inputCache.current.set(localId, sub.snapshot);
            let handle;
            try {
                handle = await client.submit(sub.request, {
                    "StudioSession.useCallback[generate]": (stage)=>update(localId, {
                            step: stage === "uploading" || stage === "submitting" ? "uploading" : "encrypting"
                        })
                }["StudioSession.useCallback[generate]"]);
            } catch (err) {
                update(localId, {
                    step: "failed",
                    error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["friendlyError"])(err, "submit")
                });
                return;
            }
            const next = {
                ...draft,
                id: handle.jobId,
                handle,
                profileId: handle.profileId,
                fallbackReason: handle.fallbackReason,
                step: "queued"
            };
            inputCache.current.set(handle.jobId, sub.snapshot);
            inputCache.current.delete(localId);
            setEntries({
                "StudioSession.useCallback[generate]": (list)=>list.map({
                        "StudioSession.useCallback[generate]": (e)=>e.id === localId ? next : e
                    }["StudioSession.useCallback[generate]"])
            }["StudioSession.useCallback[generate]"]);
            setSelectedId({
                "StudioSession.useCallback[generate]": (cur)=>cur === localId ? handle.jobId : cur
            }["StudioSession.useCallback[generate]"]);
            void watch(next);
        }
    }["StudioSession.useCallback[generate]"], [
        apiKey,
        client,
        update,
        watch
    ]);
    const selected = entries.find((e)=>e.id === selectedId) ?? null;
    const select = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[select]": (id)=>{
            setSelectedId(id);
            setInspectorOpen(true);
            setRailOpen(false);
            // Follow the selection with the keyboard, and pull focus out of the drawer that just closed.
            window.setTimeout({
                "StudioSession.useCallback[select]": ()=>inspectorTitle.current?.focus()
            }["StudioSession.useCallback[select]"], 0);
        }
    }["StudioSession.useCallback[select]"], []);
    const cancel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[cancel]": async (entry)=>{
            try {
                await client.cancel(entry.id);
                notify("Canceled. The price is refunded automatically.");
            } catch (err) {
                notify((0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["friendlyError"])(err, "render").title);
            }
        }
    }["StudioSession.useCallback[cancel]"], [
        client,
        notify
    ]);
    const remove = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[remove]": (entry)=>{
            const ok = window.confirm("Remove this take from the library? This deletes the only key to the film from this browser — download it first if you want to keep it.");
            if (!ok) return;
            controllers.current.get(entry.id)?.abort();
            const film = filmsRef.current[entry.id];
            if (film?.url) URL.revokeObjectURL(film.url);
            setEntries({
                "StudioSession.useCallback[remove]": (list)=>list.filter({
                        "StudioSession.useCallback[remove]": (e)=>e.id !== entry.id
                    }["StudioSession.useCallback[remove]"])
            }["StudioSession.useCallback[remove]"]);
            setSelectedId({
                "StudioSession.useCallback[remove]": (cur)=>cur === entry.id ? null : cur
            }["StudioSession.useCallback[remove]"]);
        }
    }["StudioSession.useCallback[remove]"], []);
    const reuse = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[reuse]": (entry)=>{
            const cached = inputCache.current.get(entry.id);
            const snapshot = cached ?? {
                tab: entry.tab,
                editOp: entry.editOp,
                profileId: entry.requestedProfileId,
                prompt: entry.prompt,
                settings: entry.settings,
                inputs: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$composerState$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EMPTY_INPUTS"]
            };
            const lostInputs = !cached && entry.inputs.length > 0;
            composerActions.load(snapshot, lostInputs ? "Settings restored. Frames and references aren't kept after a reload — add them again." : null);
            setInspectorOpen(false);
            promptRef.current?.focus();
            notify("Settings are back in the composer.");
        }
    }["StudioSession.useCallback[reuse]"], [
        composerActions,
        notify
    ]);
    const useLastFrame = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[useLastFrame]": async (entry)=>{
            const url = filmsRef.current[entry.id]?.url;
            if (!url) return;
            try {
                const blob = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["extractLastFrame"])(url);
                const item = composerActions.addMedia(new File([
                    blob
                ], `last-frame-${entry.id.slice(0, 8)}.png`, {
                    type: "image/png"
                }));
                composerActions.setTab("frames");
                composerActions.updateInputs({
                    "StudioSession.useCallback[useLastFrame]": (inputs)=>({
                            ...inputs,
                            first: item
                        })
                }["StudioSession.useCallback[useLastFrame]"]);
                setInspectorOpen(false);
                promptRef.current?.focus();
                notify("The last frame is now the first frame of a new shot.");
            } catch (err) {
                notify(`Couldn't grab the last frame: ${err.message}.`);
            }
        }
    }["StudioSession.useCallback[useLastFrame]"], [
        composerActions,
        notify
    ]);
    const copyLink = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[copyLink]": async (entry)=>{
            if (!entry.receipt) return;
            const link = `${window.location.origin}/verify?sha256=${entry.receipt.body.content_digest}`;
            try {
                await navigator.clipboard.writeText(link);
                notify("Certificate link copied. It reveals nothing but the film's credits.");
            } catch  {
                window.prompt("Copy the certificate link:", link);
            }
        }
    }["StudioSession.useCallback[copyLink]"], [
        notify
    ]);
    /** Reads a film-key backup and adds back anything this browser has forgotten. */ const restore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[restore]": async (file)=>{
            let restored;
            try {
                restored = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$library$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseBackup"])(await file.text());
            } catch (err) {
                notify(`Couldn't read that backup — ${err.message}.`);
                return;
            }
            const known = new Set(entriesRef.current.map({
                "StudioSession.useCallback[restore]": (e)=>e.id
            }["StudioSession.useCallback[restore]"]));
            const fresh = restored.filter({
                "StudioSession.useCallback[restore].fresh": (e)=>!known.has(e.id)
            }["StudioSession.useCallback[restore].fresh"]);
            if (!fresh.length) {
                notify("Those film keys are already in this library.");
                return;
            }
            setEntries({
                "StudioSession.useCallback[restore]": (list)=>[
                        ...list,
                        ...fresh
                    ].sort({
                        "StudioSession.useCallback[restore]": (a, b)=>a.createdAt - b.createdAt
                    }["StudioSession.useCallback[restore]"])
            }["StudioSession.useCallback[restore]"]);
            notify(`Restored ${fresh.length} film key${fresh.length === 1 ? "" : "s"}. Open a take to decrypt it again.`);
        }
    }["StudioSession.useCallback[restore]"], [
        notify
    ]);
    const forgetAll = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "StudioSession.useCallback[forgetAll]": ()=>{
            const ok = window.confirm("Forget the whole library? This deletes every film key stored in this browser. Films you haven't downloaded can't be opened afterwards.");
            if (!ok) return;
            controllers.current.forEach({
                "StudioSession.useCallback[forgetAll]": (c)=>c.abort()
            }["StudioSession.useCallback[forgetAll]"]);
            controllers.current.clear();
            setEntries([]);
            setSelectedId(null);
        }
    }["StudioSession.useCallback[forgetAll]"], []);
    const counts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "StudioSession.useMemo[counts]": ()=>{
            if (!live.data) return null;
            const max = Math.max(0, ...live.data.models.map({
                "StudioSession.useMemo[counts].max": (m)=>m.workers ?? 0
            }["StudioSession.useMemo[counts].max"]));
            return {
                stages: max,
                h3Here: live.data.models.some({
                    "StudioSession.useMemo[counts]": (m)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isH3"])(m) && m.available_in_region
                }["StudioSession.useMemo[counts]"])
            };
        }
    }["StudioSession.useMemo[counts]"], [
        live.data
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].studio,
        "data-inspector": inspectorOpen && selected ? "open" : "closed",
        "data-rail": railOpen ? "open" : "closed",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].rail,
                "aria-label": "Library",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Rail$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Rail"], {
                    entries: entries,
                    selectedId: selectedId,
                    onSelect: select,
                    onForget: forgetAll,
                    onRestore: restore,
                    connected: Boolean(apiKey),
                    onClose: ()=>setRailOpen(false)
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                    lineNumber: 390,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                lineNumber: 389,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].center,
                "aria-label": "Takes",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].toolbar,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: `btn btn-small ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].railToggle}`,
                                onClick: ()=>setRailOpen(true),
                                children: [
                                    "Library · ",
                                    entries.length
                                ]
                            }, void 0, true, {
                                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                                lineNumber: 403,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].heading,
                                children: "Studio"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                                lineNumber: 406,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].seal,
                                title: "Stages are checked by your browser before anything is sent",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].sealDot,
                                        "data-live": counts ? "true" : "false",
                                        "aria-hidden": "true"
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                                        lineNumber: 408,
                                        columnNumber: 13
                                    }, this),
                                    counts ? `Sealed · ${counts.stages} stage${counts.stages === 1 ? "" : "s"} online` : live.settled ? "Network unreachable" : "Checking network…"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                                lineNumber: 407,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].keysNote,
                                children: "Film keys stay in this browser"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                                lineNumber: 411,
                                columnNumber: 11
                            }, this),
                            selected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: `btn btn-small ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].inspectorToggle}`,
                                onClick: ()=>setInspectorOpen(true),
                                children: "Inspector"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                                lineNumber: 413,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                        lineNumber: 402,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Feed$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Feed"], {
                        entries: entries,
                        films: films,
                        profiles: profiles,
                        selectedId: selectedId,
                        connected: Boolean(apiKey),
                        onSelect: select,
                        onNeedFilm: ensureFilm,
                        onSuggest: (text)=>{
                            composerActions.setPrompt(text);
                            promptRef.current?.focus();
                        }
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                        lineNumber: 418,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                lineNumber: 401,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].composer,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Composer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Composer"], {
                    composer: composer,
                    profiles: profiles,
                    live: live,
                    connected: Boolean(apiKey),
                    onGenerate: generate,
                    promptRef: promptRef
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                    lineNumber: 434,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                lineNumber: 433,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].inspector,
                "aria-label": "Inspector",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Inspector$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Inspector"], {
                    entry: selected,
                    film: selected ? films[selected.id] : undefined,
                    profiles: profiles,
                    onClose: ()=>setInspectorOpen(false),
                    onCancel: cancel,
                    onRemove: remove,
                    onReuse: reuse,
                    onUseLastFrame: useLastFrame,
                    onCopyLink: copyLink,
                    onOpenFilm: ensureFilm,
                    titleRef: inspectorTitle
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                    lineNumber: 438,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                lineNumber: 437,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].scrim,
                onClick: ()=>{
                    setInspectorOpen(false);
                    setRailOpen(false);
                },
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                lineNumber: 453,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Studio$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].toast,
                role: "status",
                "aria-live": "polite",
                children: toast
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
                lineNumber: 455,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Studio.tsx",
        lineNumber: 388,
        columnNumber: 5
    }, this);
}
_s1(StudioSession, "TeqjSL6rcprQMZjL/T3jAjsbEYE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$composerState$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useComposer"]
    ];
});
_c1 = StudioSession;
var _c, _c1;
__turbopack_context__.k.register(_c, "Studio");
__turbopack_context__.k.register(_c1, "StudioSession");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/studio/Trays.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "arrow": "Trays-module__yT0sYG__arrow",
  "between": "Trays-module__yT0sYG__between",
  "check": "Trays-module__yT0sYG__check",
  "counter": "Trays-module__yT0sYG__counter",
  "editImages": "Trays-module__yT0sYG__editImages",
  "editRow": "Trays-module__yT0sYG__editRow",
  "framesRow": "Trays-module__yT0sYG__framesRow",
  "iconButton": "Trays-module__yT0sYG__iconButton",
  "insert": "Trays-module__yT0sYG__insert",
  "keyframe": "Trays-module__yT0sYG__keyframe",
  "marker": "Trays-module__yT0sYG__marker",
  "muted": "Trays-module__yT0sYG__muted",
  "ops": "Trays-module__yT0sYG__ops",
  "problems": "Trays-module__yT0sYG__problems",
  "refGroup": "Trays-module__yT0sYG__refGroup",
  "refGroups": "Trays-module__yT0sYG__refGroups",
  "refHead": "Trays-module__yT0sYG__refHead",
  "refItem": "Trays-module__yT0sYG__refItem",
  "slotList": "Trays-module__yT0sYG__slotList",
  "subhead": "Trays-module__yT0sYG__subhead",
  "textButton": "Trays-module__yT0sYG__textButton",
  "tickEnd": "Trays-module__yT0sYG__tickEnd",
  "tickStart": "Trays-module__yT0sYG__tickStart",
  "time": "Trays-module__yT0sYG__time",
  "timeline": "Trays-module__yT0sYG__timeline",
  "track": "Trays-module__yT0sYG__track",
  "tray": "Trays-module__yT0sYG__tray",
  "trayHead": "Trays-module__yT0sYG__trayHead",
  "trayHint": "Trays-module__yT0sYG__trayHint",
  "warn": "Trays-module__yT0sYG__warn",
  "window": "Trays-module__yT0sYG__window",
  "windowBar": "Trays-module__yT0sYG__windowBar",
  "windowInputs": "Trays-module__yT0sYG__windowInputs",
  "windowSel": "Trays-module__yT0sYG__windowSel",
});
}),
"[project]/platform/web/src/components/studio/Trays.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EditTray",
    ()=>EditTray,
    "FramesTray",
    ()=>FramesTray,
    "KeyframesTray",
    ()=>KeyframesTray,
    "ReferencesTray",
    ()=>ReferencesTray
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/media.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/shot.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/validation.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$composerState$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/composerState.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/MediaSlot.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/studio/Trays.module.css [app-client] (css module)");
"use client";
;
;
;
;
;
;
;
function RoleProblems({ problems, roles }) {
    const mine = problems.filter((p)=>p.roles?.some((r)=>roles.includes(r)));
    if (!mine.length) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].problems,
        role: "list",
        children: mine.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                children: p.message
            }, p.code + p.message, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 25,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
_c = RoleProblems;
function CropWarning({ item, aspect, label }) {
    if (!item || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["willCrop"])(item.info.width, item.info.height, aspect)) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].warn,
        children: [
            label,
            " is ",
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ratioLabel"])(item.info.width, item.info.height),
            "; the shot is ",
            aspect,
            ", so it will be cropped to fill."
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
        lineNumber: 34,
        columnNumber: 5
    }, this);
}
_c1 = CropWarning;
function FramesTray({ composer, problems }) {
    const { state, profile, actions } = composer;
    const { first, last } = state.inputs;
    const allowFirst = profile.modes.includes("image_to_video") || profile.modes.includes("first_last_frame");
    const allowLast = profile.modes.includes("last_frame") || profile.modes.includes("first_last_frame");
    const set = (key)=>(files)=>{
            const item = actions.addMedia(files[0]);
            actions.updateInputs((i)=>({
                    ...i,
                    [key]: item
                }));
        };
    const swap = ()=>actions.updateInputs((i)=>({
                ...i,
                first: i.last,
                last: i.first
            }));
    const loop = ()=>{
        if (!first) return;
        const copy = actions.addMedia(first.file, first.name);
        actions.updateInputs((i)=>({
                ...i,
                last: copy
            }));
    };
    const hint = first && last ? "The shot travels from your first frame to your last." : first ? "The shot starts on your frame." : last ? "The shot ends on your frame." : "Add a first frame, a last frame, or both.";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].tray,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].framesRow,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                        label: "First frame",
                        item: first,
                        accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].image,
                        onFiles: set("first"),
                        onRemove: ()=>actions.updateInputs((i)=>({
                                    ...i,
                                    first: null
                                })),
                        disabled: !allowFirst,
                        badge: "IN"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 71,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].between,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].iconButton,
                                onClick: swap,
                                disabled: !first && !last || !allowLast,
                                "aria-label": "Swap first and last frames",
                                title: "Swap",
                                children: "⇄"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                lineNumber: 81,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].arrow,
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                lineNumber: 84,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].textButton,
                                onClick: loop,
                                disabled: !first || !allowLast,
                                title: "Use the first frame as the last frame too, for a loop",
                                children: "Loop"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                lineNumber: 85,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 80,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                        label: "Last frame",
                        item: last,
                        accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].image,
                        onFiles: set("last"),
                        onRemove: ()=>actions.updateInputs((i)=>({
                                    ...i,
                                    last: null
                                })),
                        disabled: !allowLast,
                        note: !allowLast ? `${profile.name} takes a first frame only` : undefined,
                        badge: "OUT"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 89,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].trayHint,
                        children: hint
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 99,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 70,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CropWarning, {
                item: first,
                aspect: state.settings.aspectRatio,
                label: "The first frame"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 101,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CropWarning, {
                item: last,
                aspect: state.settings.aspectRatio,
                label: "The last frame"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 102,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RoleProblems, {
                problems: problems,
                roles: [
                    "first_frame",
                    "last_frame"
                ]
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 103,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
        lineNumber: 69,
        columnNumber: 5
    }, this);
}
_c2 = FramesTray;
function KeyframesTray({ composer, problems }) {
    const { state, profile, actions } = composer;
    const { keyframes, keyframesAuto } = state.inputs;
    const max = profile.limits.max_inputs.keyframe ?? 0;
    const duration = state.settings.durationS;
    const times = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$composerState$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["keyframeTimes"])(keyframes, keyframesAuto, duration);
    const add = (files)=>{
        const room = Math.max(0, max - keyframes.length);
        if (files.length > room) actions.setNotice(`Only ${room} more keyframe${room === 1 ? "" : "s"} fit on ${profile.name}.`);
        const items = files.slice(0, room).map((f)=>({
                ...actions.addMedia(f),
                timeS: duration
            }));
        actions.updateInputs((i)=>({
                ...i,
                keyframes: [
                    ...i.keyframes,
                    ...items
                ]
            }));
    };
    const setTime = (index, value)=>actions.updateInputs((i)=>({
                ...i,
                keyframesAuto: false,
                keyframes: i.keyframes.map((it, n)=>({
                        ...it,
                        timeS: n === index ? value : times[n]
                    }))
            }));
    const setAuto = (auto)=>actions.updateInputs((i)=>({
                ...i,
                keyframesAuto: auto,
                keyframes: auto ? i.keyframes : i.keyframes.map((it, n)=>({
                        ...it,
                        timeS: times[n]
                    }))
            }));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].tray,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].trayHead,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].counter,
                        "data-over": keyframes.length > max,
                        children: [
                            keyframes.length,
                            "/",
                            max,
                            " keyframes"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 139,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].check,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "checkbox",
                                checked: keyframesAuto,
                                onChange: (e)=>setAuto(e.target.checked)
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                lineNumber: 143,
                                columnNumber: 11
                            }, this),
                            "Space evenly across ",
                            duration,
                            " s"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 142,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 138,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].timeline,
                "aria-hidden": "true",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].track
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 148,
                        columnNumber: 9
                    }, this),
                    times.map((t, n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].marker,
                            style: {
                                left: `${duration ? t / duration * 100 : 0}%`
                            },
                            children: n + 1
                        }, keyframes[n].id, false, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 150,
                            columnNumber: 11
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].tickStart,
                        children: "0 s"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 154,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].tickEnd,
                        children: [
                            duration,
                            " s"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 155,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 147,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].slotList,
                role: "list",
                children: [
                    keyframes.map((it, n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].keyframe,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                                    size: "sm",
                                    label: `Keyframe ${n + 1}`,
                                    item: it,
                                    accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].image,
                                    onRemove: ()=>actions.updateInputs((i)=>({
                                                ...i,
                                                keyframes: i.keyframes.filter((_, k)=>k !== n)
                                            }))
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                    lineNumber: 160,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].time,
                                    children: [
                                        "at",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "number",
                                            min: 0,
                                            max: duration,
                                            step: 0.1,
                                            value: times[n],
                                            onChange: (e)=>setTime(n, Number(e.target.value)),
                                            "aria-label": `Keyframe ${n + 1} time in seconds`
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                            lineNumber: 169,
                                            columnNumber: 15
                                        }, this),
                                        "s"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                    lineNumber: 167,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, it.id, true, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 159,
                            columnNumber: 11
                        }, this)),
                    keyframes.length < max && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                            size: "sm",
                            label: "Add keyframes",
                            accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].image,
                            multiple: true,
                            onFiles: add,
                            note: `${max - keyframes.length} left`
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 184,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 183,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 157,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RoleProblems, {
                problems: problems,
                roles: [
                    "keyframe"
                ]
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 188,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
        lineNumber: 137,
        columnNumber: 5
    }, this);
}
_c3 = KeyframesTray;
// ---------------------------------------------------------------- references
const REF_GROUPS = [
    {
        key: "refImages",
        role: "reference_image",
        title: "Images",
        tag: "Picture",
        accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].image
    },
    {
        key: "refVideos",
        role: "reference_video",
        title: "Videos",
        tag: "Video",
        accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].video
    },
    {
        key: "refAudio",
        role: "reference_audio",
        title: "Audio",
        tag: "Audio",
        accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].audio
    }
];
function durationWarnings(items, noun) {
    const out = [];
    const known = items.map((i)=>i.info.duration).filter((d)=>d !== undefined);
    if (known.some((d)=>d < 2 || d > 15)) out.push(`${noun} work best at 2–15 s each.`);
    const total = known.reduce((a, b)=>a + b, 0);
    if (total > 15) out.push(`${noun} add up to ${total.toFixed(1)} s; MiniMax H3 uses at most 15 s in total.`);
    return out;
}
function ReferencesTray({ composer, problems, onInsert }) {
    const { state, profile, actions } = composer;
    const lim = profile.limits;
    const total = state.inputs.refImages.length + state.inputs.refVideos.length + state.inputs.refAudio.length;
    const maxTotal = lim.max_total_inputs ?? Infinity;
    const warnings = [
        ...durationWarnings(state.inputs.refVideos, "Reference clips"),
        ...durationWarnings(state.inputs.refAudio, "Audio references")
    ];
    const add = (key, role)=>(files)=>{
            const room = Math.max(0, Math.min((lim.max_inputs[role] ?? 0) - state.inputs[key].length, maxTotal - total));
            if (files.length > room) actions.setNotice(`Only ${room} more ${role === "reference_image" ? "image" : role === "reference_video" ? "clip" : "audio track"}${room === 1 ? "" : "s"} fit.`);
            const items = files.slice(0, room).map((f)=>actions.addMedia(f));
            actions.updateInputs((i)=>({
                    ...i,
                    [key]: [
                        ...i[key],
                        ...items
                    ]
                }));
        };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].tray,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].trayHead,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].counter,
                        "data-over": total > maxTotal,
                        children: [
                            total,
                            "/",
                            Number.isFinite(maxTotal) ? maxTotal : "—",
                            " files"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 227,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].trayHint,
                        children: "Order matters — refer to them in your prompt as <Picture 1>, <Video 1>, <Audio 1>."
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 230,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 226,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].refGroups,
                children: REF_GROUPS.map((g)=>{
                    const items = state.inputs[g.key];
                    const max = lim.max_inputs[g.role] ?? 0;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].refGroup,
                        "aria-label": `${g.title} references`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].refHead,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: g.title
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                        lineNumber: 241,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].counter,
                                        "data-over": items.length > max,
                                        children: [
                                            items.length,
                                            "/",
                                            max
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                        lineNumber: 242,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                lineNumber: 240,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].slotList,
                                role: "list",
                                children: [
                                    items.map((it, n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].refItem,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                                                    size: "sm",
                                                    label: `${g.tag} ${n + 1}`,
                                                    item: it,
                                                    accept: g.accept,
                                                    badge: `@${g.tag}${n + 1}`,
                                                    onRemove: ()=>actions.updateInputs((i)=>({
                                                                ...i,
                                                                [g.key]: i[g.key].filter((x)=>x.id !== it.id)
                                                            }))
                                                }, void 0, false, {
                                                    fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                                    lineNumber: 249,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].insert,
                                                    onClick: ()=>onInsert(`<${g.tag} ${n + 1}>`),
                                                    "aria-label": `Insert <${g.tag} ${n + 1}> into the prompt`,
                                                    children: "Insert"
                                                }, void 0, false, {
                                                    fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                                    lineNumber: 257,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, it.id, true, {
                                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                            lineNumber: 248,
                                            columnNumber: 19
                                        }, this)),
                                    items.length < max && total < maxTotal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                                            size: "sm",
                                            label: `Add ${g.title.toLowerCase()}`,
                                            accept: g.accept,
                                            multiple: true,
                                            onFiles: add(g.key, g.role)
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                            lineNumber: 264,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                        lineNumber: 263,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                lineNumber: 246,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RoleProblems, {
                                problems: problems,
                                roles: [
                                    g.role
                                ]
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                lineNumber: 268,
                                columnNumber: 15
                            }, this)
                        ]
                    }, g.key, true, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 239,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 234,
                columnNumber: 7
            }, this),
            warnings.map((w)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].warn,
                    children: w
                }, w, false, {
                    fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                    lineNumber: 274,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
        lineNumber: 225,
        columnNumber: 5
    }, this);
}
_c4 = ReferencesTray;
// ---------------------------------------------------------------- edit
function RetakeWindow({ duration, start, end, onChange }) {
    const max = duration ?? 60;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("fieldset", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].window,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("legend", {
                children: "Window to regenerate"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 298,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].windowBar,
                "aria-hidden": "true",
                children: duration ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].windowSel,
                    style: {
                        left: `${Math.min(100, start / max * 100)}%`,
                        width: `${Math.max(0, Math.min(100, (end - start) / max * 100))}%`
                    }
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                    lineNumber: 301,
                    columnNumber: 11
                }, this) : null
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 299,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].windowInputs,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        children: [
                            "From",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "number",
                                min: 0,
                                max: max,
                                step: 0.1,
                                value: start,
                                "aria-label": "Retake window start in seconds",
                                onChange: (e)=>onChange(Number(e.target.value), end)
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                lineNumber: 310,
                                columnNumber: 11
                            }, this),
                            "s"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 308,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        children: [
                            "to",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "number",
                                min: 0,
                                max: max,
                                step: 0.1,
                                value: end,
                                "aria-label": "Retake window end in seconds",
                                onChange: (e)=>onChange(start, Number(e.target.value))
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                lineNumber: 323,
                                columnNumber: 11
                            }, this),
                            "s"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 321,
                        columnNumber: 9
                    }, this),
                    duration ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].muted,
                        children: [
                            "of ",
                            duration.toFixed(1),
                            " s"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 334,
                        columnNumber: 21
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].muted,
                        children: "clip length unknown"
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 334,
                        columnNumber: 88
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 307,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
        lineNumber: 297,
        columnNumber: 5
    }, this);
}
_c5 = RetakeWindow;
function EditImages({ composer, max }) {
    const { state, actions } = composer;
    const items = state.inputs.editImages;
    const add = (files)=>{
        const room = Math.max(0, max - items.length);
        const added = files.slice(0, room).map((f)=>actions.addMedia(f));
        actions.updateInputs((i)=>({
                ...i,
                editImages: [
                    ...i.editImages,
                    ...added
                ]
            }));
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].editImages,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].subhead,
                children: [
                    "Reference images · optional · ",
                    items.length,
                    "/",
                    max
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 350,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].slotList,
                role: "list",
                children: [
                    items.map((it, n)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                                size: "sm",
                                label: `Picture ${n + 1}`,
                                item: it,
                                accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].image,
                                badge: `@Picture${n + 1}`,
                                onRemove: ()=>actions.updateInputs((i)=>({
                                            ...i,
                                            editImages: i.editImages.filter((x)=>x.id !== it.id)
                                        }))
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                                lineNumber: 356,
                                columnNumber: 13
                            }, this)
                        }, it.id, false, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 355,
                            columnNumber: 11
                        }, this)),
                    items.length < max && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                            size: "sm",
                            label: "Add images",
                            accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].image,
                            multiple: true,
                            onFiles: add
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 368,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 367,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 353,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
        lineNumber: 349,
        columnNumber: 5
    }, this);
}
_c6 = EditImages;
function EditTray({ composer, problems }) {
    const { state, profile, actions } = composer;
    const i = state.inputs;
    const op = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EDIT_OPS"].find((o)=>o.id === state.editOp) ?? __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EDIT_OPS"][0];
    const allowed = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MODE_ROLES"][op.mode].allowed;
    const refMax = allowed.includes("reference_image") ? profile.limits.max_inputs.reference_image ?? 0 : 0;
    const firstAllowed = allowed.includes("first_frame") && (profile.limits.max_inputs.first_frame ?? 0) > 0;
    const setSingle = (key)=>(files)=>{
            const item = actions.addMedia(files[0]);
            actions.updateInputs((x)=>({
                    ...x,
                    [key]: item
                }));
        };
    const clear = (key)=>()=>actions.updateInputs((x)=>({
                    ...x,
                    [key]: null
                }));
    function onOpsKey(e) {
        const n = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EDIT_OPS"].findIndex((o)=>o.id === state.editOp);
        const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EDIT_OPS"][(n + dir + __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EDIT_OPS"].length) % __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EDIT_OPS"].length];
        actions.setEditOp(next.id);
        e.currentTarget.querySelector(`[data-op="${next.id}"]`)?.focus();
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].tray,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].ops,
                role: "radiogroup",
                "aria-label": "Edit operation",
                onKeyDown: onOpsKey,
                children: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EDIT_OPS"].map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        "data-op": o.id,
                        type: "button",
                        role: "radio",
                        "aria-checked": o.id === state.editOp,
                        tabIndex: o.id === state.editOp ? 0 : -1,
                        onClick: ()=>actions.setEditOp(o.id),
                        children: o.label
                    }, o.id, false, {
                        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                        lineNumber: 404,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 402,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].trayHint,
                children: op.hint
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 417,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].editRow,
                children: op.id !== "audio" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                            label: "Source video",
                            item: i.source,
                            accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].video,
                            onFiles: setSingle("source"),
                            onRemove: clear("source"),
                            badge: "SRC"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 421,
                            columnNumber: 13
                        }, this),
                        op.id === "retake" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RetakeWindow, {
                            duration: i.source?.info.duration,
                            start: i.retakeStart,
                            end: i.retakeEnd,
                            onChange: (a, b)=>actions.updateInputs((x)=>({
                                        ...x,
                                        retakeStart: a,
                                        retakeEnd: b
                                    }))
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 423,
                            columnNumber: 15
                        }, this),
                        op.id !== "retake" && refMax > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(EditImages, {
                            composer: composer,
                            max: refMax
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 430,
                            columnNumber: 50
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                    lineNumber: 420,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                            label: "Soundtrack",
                            item: i.soundtrack,
                            accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].audio,
                            onFiles: setSingle("soundtrack"),
                            onRemove: clear("soundtrack"),
                            badge: "SND"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 434,
                            columnNumber: 13
                        }, this),
                        firstAllowed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MediaSlot"], {
                            label: "First frame",
                            note: "optional",
                            item: i.a2vFirst,
                            accept: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$MediaSlot$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ACCEPT"].image,
                            onFiles: setSingle("a2vFirst"),
                            onRemove: clear("a2vFirst"),
                            badge: "IN"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 436,
                            columnNumber: 15
                        }, this),
                        refMax > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(EditImages, {
                            composer: composer,
                            max: refMax
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                            lineNumber: 446,
                            columnNumber: 28
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                    lineNumber: 433,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 418,
                columnNumber: 7
            }, this),
            op.id === "audio" && profile.limits.visual_required_with_audio && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$studio$2f$Trays$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].trayHint,
                children: [
                    profile.name,
                    " needs an image alongside the soundtrack."
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 451,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RoleProblems, {
                problems: problems,
                roles: [
                    "source_video",
                    "source_audio",
                    "reference_image",
                    "first_frame"
                ]
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
                lineNumber: 453,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/studio/Trays.tsx",
        lineNumber: 401,
        columnNumber: 5
    }, this);
}
_c7 = EditTray;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7;
__turbopack_context__.k.register(_c, "RoleProblems");
__turbopack_context__.k.register(_c1, "CropWarning");
__turbopack_context__.k.register(_c2, "FramesTray");
__turbopack_context__.k.register(_c3, "KeyframesTray");
__turbopack_context__.k.register(_c4, "ReferencesTray");
__turbopack_context__.k.register(_c5, "RetakeWindow");
__turbopack_context__.k.register(_c6, "EditImages");
__turbopack_context__.k.register(_c7, "EditTray");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/studio/composerState.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EMPTY_INPUTS",
    ()=>EMPTY_INPUTS,
    "collectInputs",
    ()=>collectInputs,
    "keyframeTimes",
    ()=>keyframeTimes,
    "makeItem",
    ()=>makeItem,
    "useComposer",
    ()=>useComposer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/catalog.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/media.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/shot.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
let seq = 0;
function makeItem(file, name) {
    seq += 1;
    return {
        id: `m${seq}-${Date.now().toString(36)}`,
        file,
        name: name ?? (file instanceof File ? file.name : "media"),
        url: URL.createObjectURL(file),
        info: {
            kind: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["kindOf"])(file)
        }
    };
}
const EMPTY_INPUTS = {
    first: null,
    last: null,
    keyframes: [],
    keyframesAuto: true,
    refImages: [],
    refVideos: [],
    refAudio: [],
    source: null,
    soundtrack: null,
    a2vFirst: null,
    editImages: [],
    retakeStart: 0,
    retakeEnd: 2
};
const SINGLE_KEYS = [
    "first",
    "last",
    "source",
    "soundtrack",
    "a2vFirst"
];
const LIST_KEYS = [
    "keyframes",
    "refImages",
    "refVideos",
    "refAudio",
    "editImages"
];
function mapItems(inputs, fn) {
    const next = {
        ...inputs
    };
    for (const k of SINGLE_KEYS)next[k] = inputs[k] ? fn(inputs[k]) : null;
    for (const k of LIST_KEYS)next[k] = inputs[k].map(fn);
    return next;
}
function keyframeTimes(items, auto, duration) {
    if (auto) {
        return items.map((_, i)=>items.length === 1 ? 0 : Math.round(i * duration / (items.length - 1) * 100) / 100);
    }
    return items.map((it)=>Math.min(Math.max(it.timeS ?? 0, 0), duration));
}
function collectInputs(state) {
    const { tab, editOp, inputs: i, settings } = state;
    const out = [];
    if (tab === "frames") {
        if (i.first) out.push({
            role: "first_frame",
            item: i.first
        });
        if (i.last) out.push({
            role: "last_frame",
            item: i.last
        });
    } else if (tab === "keyframes") {
        const times = keyframeTimes(i.keyframes, i.keyframesAuto, settings.durationS);
        i.keyframes.map((item, n)=>({
                item,
                t: times[n]
            })).sort((a, b)=>a.t - b.t).forEach(({ item, t })=>out.push({
                role: "keyframe",
                item,
                timeS: t
            }));
    } else if (tab === "references") {
        i.refImages.forEach((item)=>out.push({
                role: "reference_image",
                item
            }));
        i.refVideos.forEach((item)=>out.push({
                role: "reference_video",
                item
            }));
        i.refAudio.forEach((item)=>out.push({
                role: "reference_audio",
                item
            }));
    } else if (tab === "edit") {
        if (editOp === "audio") {
            if (i.soundtrack) out.push({
                role: "source_audio",
                item: i.soundtrack
            });
            if (i.a2vFirst) out.push({
                role: "first_frame",
                item: i.a2vFirst
            });
            i.editImages.forEach((item)=>out.push({
                    role: "reference_image",
                    item
                }));
        } else {
            if (i.source) {
                out.push(editOp === "retake" ? {
                    role: "source_video",
                    item: i.source,
                    startS: i.retakeStart,
                    endS: i.retakeEnd
                } : {
                    role: "source_video",
                    item: i.source
                });
            }
            if (editOp !== "retake") i.editImages.forEach((item)=>out.push({
                    role: "reference_image",
                    item
                }));
        }
    }
    return {
        items: out,
        roles: out.map((o)=>o.role),
        inputs: out.map((o)=>({
                role: o.role,
                file: o.item.file,
                timeS: o.timeS,
                startS: o.startS,
                endS: o.endS
            })),
        summaries: out.map((o)=>({
                role: o.role,
                name: o.item.name,
                timeS: o.timeS,
                startS: o.startS,
                endS: o.endS
            }))
    };
}
function usable(p) {
    return p.enabled !== false && p.available_in_region !== false && (p.workers === undefined || p.workers > 0);
}
/** Describes what clampSettings changed, so nothing changes silently. */ function describeChanges(before, after) {
    const out = [];
    if (before.durationS !== after.durationS) out.push(`${after.durationS} s`);
    if (before.resolution && before.resolution !== after.resolution) out.push(after.resolution);
    if (before.aspectRatio !== after.aspectRatio) out.push(after.aspectRatio);
    if (before.fps !== after.fps) out.push(`${after.fps} fps`);
    if (before.audio !== after.audio) out.push(after.audio ? "audio on" : "no audio");
    if (before.enhance !== after.enhance) out.push("enhance off");
    return out;
}
function withProfile(state, profile, reason) {
    const settings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clampSettings"])(profile, state.settings);
    const changes = describeChanges(state.settings, settings);
    const parts = [
        reason,
        changes.length ? `Adjusted to fit ${profile.name}: ${changes.join(", ")}.` : null
    ].filter(Boolean);
    return {
        ...state,
        profileId: profile.id,
        settings,
        notice: parts.length ? parts.join(" ") : null
    };
}
function ensureProfile(state, profiles) {
    const current = profiles.find((p)=>p.id === state.profileId);
    if (current && (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supportsTab"])(current, state.tab, state.editOp)) return state;
    const candidates = profiles.filter((p)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supportsTab"])(p, state.tab, state.editOp));
    const pick = candidates.find((p)=>p.family === current?.family && usable(p)) ?? candidates.find(usable) ?? candidates[0];
    if (!pick) return state;
    const what = state.tab === "edit" ? __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EDIT_OPS"].find((o)=>o.id === state.editOp)?.label : __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TABS"].find((t)=>t.id === state.tab)?.label;
    return withProfile(state, pick, `${what} needs a different stock — switched to ${pick.name}.`);
}
function reducer(state, action) {
    switch(action.type){
        case "tab":
            return ensureProfile({
                ...state,
                tab: action.tab,
                notice: null
            }, action.profiles);
        case "editOp":
            return ensureProfile({
                ...state,
                editOp: action.op,
                notice: null
            }, action.profiles);
        case "profile":
            return {
                ...withProfile(state, action.profile, null),
                touched: state.touched || !action.auto
            };
        case "prompt":
            return {
                ...state,
                prompt: action.prompt
            };
        case "settings":
            return {
                ...state,
                settings: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clampSettings"])(action.profile, {
                    ...state.settings,
                    ...action.patch
                })
            };
        case "inputs":
            return {
                ...state,
                inputs: action.update(state.inputs)
            };
        case "item":
            return {
                ...state,
                inputs: mapItems(state.inputs, (it)=>it.id === action.id ? {
                        ...it,
                        ...action.patch
                    } : it)
            };
        case "load":
            {
                const profile = action.profiles.find((p)=>p.id === action.snapshot.profileId) ?? action.profiles[0];
                const loaded = {
                    ...state,
                    ...action.snapshot,
                    profileId: profile.id,
                    settings: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clampSettings"])(profile, action.snapshot.settings),
                    notice: action.notice,
                    touched: true
                };
                return ensureProfile(loaded, action.profiles);
            }
        case "notice":
            return {
                ...state,
                notice: action.notice
            };
    }
}
function initialState() {
    const profile = __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$catalog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CATALOG"][0];
    return {
        tab: "text",
        editOp: "edit",
        profileId: profile.id,
        prompt: "",
        settings: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$shot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["defaultSettings"])(profile),
        inputs: EMPTY_INPUTS,
        notice: null,
        touched: false
    };
}
function useComposer(profiles) {
    _s();
    const [state, dispatch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useReducer"])(reducer, undefined, initialState);
    const profile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useComposer.useMemo[profile]": ()=>profiles.find({
                "useComposer.useMemo[profile]": (p)=>p.id === state.profileId
            }["useComposer.useMemo[profile]"]) ?? profiles[0]
    }["useComposer.useMemo[profile]"], [
        profiles,
        state.profileId
    ]);
    const probe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useComposer.useCallback[probe]": (item)=>{
            void (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$media$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["probeMedia"])(item.file, item.url).then({
                "useComposer.useCallback[probe]": (info)=>dispatch({
                        type: "item",
                        id: item.id,
                        patch: {
                            info
                        }
                    })
            }["useComposer.useCallback[probe]"]);
        }
    }["useComposer.useCallback[probe]"], []);
    /** Wraps files as media items and starts reading their dimensions/duration. */ const addMedia = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useComposer.useCallback[addMedia]": (file, name)=>{
            const item = makeItem(file, name);
            probe(item);
            return item;
        }
    }["useComposer.useCallback[addMedia]"], [
        probe
    ]);
    const actions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useComposer.useMemo[actions]": ()=>({
                setTab: ({
                    "useComposer.useMemo[actions]": (tab)=>dispatch({
                            type: "tab",
                            tab,
                            profiles
                        })
                })["useComposer.useMemo[actions]"],
                setEditOp: ({
                    "useComposer.useMemo[actions]": (op)=>dispatch({
                            type: "editOp",
                            op,
                            profiles
                        })
                })["useComposer.useMemo[actions]"],
                setProfile: ({
                    "useComposer.useMemo[actions]": (p, auto = false)=>dispatch({
                            type: "profile",
                            profile: p,
                            auto
                        })
                })["useComposer.useMemo[actions]"],
                setPrompt: ({
                    "useComposer.useMemo[actions]": (prompt)=>dispatch({
                            type: "prompt",
                            prompt
                        })
                })["useComposer.useMemo[actions]"],
                patchSettings: ({
                    "useComposer.useMemo[actions]": (patch)=>dispatch({
                            type: "settings",
                            patch,
                            profile
                        })
                })["useComposer.useMemo[actions]"],
                updateInputs: ({
                    "useComposer.useMemo[actions]": (update)=>dispatch({
                            type: "inputs",
                            update
                        })
                })["useComposer.useMemo[actions]"],
                patchItem: ({
                    "useComposer.useMemo[actions]": (id, patch)=>dispatch({
                            type: "item",
                            id,
                            patch
                        })
                })["useComposer.useMemo[actions]"],
                load: ({
                    "useComposer.useMemo[actions]": (snapshot, notice)=>dispatch({
                            type: "load",
                            snapshot,
                            profiles,
                            notice
                        })
                })["useComposer.useMemo[actions]"],
                setNotice: ({
                    "useComposer.useMemo[actions]": (notice)=>dispatch({
                            type: "notice",
                            notice
                        })
                })["useComposer.useMemo[actions]"],
                addMedia
            })
    }["useComposer.useMemo[actions]"], [
        profiles,
        profile,
        addMedia
    ]);
    return {
        state,
        profile,
        actions
    };
}
_s(useComposer, "OnSui8UnTAZ6Oy7MQwTFQTTVvDk=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/verify/CertificateView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CertificateView",
    ()=>CertificateView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$certificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/certificate.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/format.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/verify/EndCredits.tsx [app-client] (ecmascript)");
;
;
;
;
const tick = (ok)=>ok ? "✓" : "✗";
function CertificateView({ prov, checks, variant = "full", id }) {
    const body = prov.receipt.body;
    const video = body.video;
    const signatureOk = checks.signature && prov.signature_valid;
    const lines = [
        {
            role: "Model",
            value: prov.model.name
        },
        ...prov.model.attribution ? [
            {
                role: "Attribution",
                value: prov.model.attribution
            }
        ] : [],
        {
            role: "Stage (enclave)",
            value: prov.enclave.enclave_id,
            mono: true
        },
        {
            role: "Sealed hardware",
            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$certificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["teeLabel"])(prov.enclave.tee),
            tone: prov.enclave.tee === "mock" ? undefined : checks.hardware?.ok ? "ok" : undefined
        },
        {
            role: "Hardware",
            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$certificate$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hardwareLabel"])(prov.enclave.hardware),
            mono: true
        },
        {
            role: "Software image",
            value: prov.enclave.image_digest,
            mono: true
        },
        {
            role: "Attestation digest",
            value: body.attestation_digest,
            mono: true,
            note: checks.hardware ? checks.hardware.ok ? `${tick(true)} Evidence matched the published manifest when recorded${checks.hardware.simulated ? " (simulated quote)" : ""}` : `${tick(false)} Evidence didn't match the manifest: ${checks.hardware.reasons.join("; ")}` : "Manifest unavailable — evidence not re-checked here"
        },
        {
            role: "Content hash",
            value: body.content_digest,
            mono: true,
            note: checks.hashMatches === null ? "Looked up by hash" : checks.hashMatches ? `${tick(true)} Matches the file you checked` : `${tick(false)} Does not match the file`
        },
        {
            role: "Signature",
            value: signatureOk ? "Valid ✓" : "Invalid ✗",
            tone: signatureOk ? "ok" : "bad",
            note: `${tick(checks.signature)} checked in your browser · ${tick(prov.signature_valid)} checked by the gateway · ${tick(checks.stageKeys)} stage id matches its keys`
        },
        {
            role: "Rendered",
            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utcStamp"])(body.finished_at),
            note: `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["seconds"])(body.finished_at - body.started_at)} in the stage · ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["seconds"])(body.gpu_seconds)} of GPU time`
        },
        {
            role: "Format",
            value: `${video.width}×${video.height} · ${video.fps} fps · ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$format$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["seconds"])(video.duration_s)}${video.audio ? " · stereo audio" : " · silent"}`
        },
        {
            role: "Job",
            value: body.job_id,
            mono: true
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$verify$2f$EndCredits$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EndCredits"], {
        lines: lines,
        variant: variant,
        id: id
    }, void 0, false, {
        fileName: "[project]/platform/web/src/components/verify/CertificateView.tsx",
        lineNumber: 74,
        columnNumber: 10
    }, this);
}
_c = CertificateView;
var _c;
__turbopack_context__.k.register(_c, "CertificateView");
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
"[project]/platform/web/src/lib/library.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * The studio library: one entry per take, persisted in this browser's localStorage.
 * Each entry holds the SDK JobHandle — including the output key, the only key that
 * opens the finished film. Nothing here is ever sent to the server; films are
 * re-downloaded as ciphertext and decrypted locally when opened.
 */ __turbopack_context__.s([
    "BACKUP_KIND",
    ()=>BACKUP_KIND,
    "BACKUP_VERSION",
    ()=>BACKUP_VERSION,
    "exportEntries",
    ()=>exportEntries,
    "isActive",
    ()=>isActive,
    "loadLibrary",
    ()=>loadLibrary,
    "parseBackup",
    ()=>parseBackup,
    "saveLibrary",
    ()=>saveLibrary
]);
const PREFIX = "kuno.library.v1:";
const MAX_ENTRIES = 300;
function loadLibrary(fingerprint) {
    try {
        const raw = window.localStorage.getItem(PREFIX + fingerprint);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((e)=>e && typeof e.id === "string" && e.handle) : [];
    } catch  {
        return [];
    }
}
function saveLibrary(fingerprint, entries) {
    try {
        const persistable = entries.filter((e)=>e.handle).slice(-MAX_ENTRIES);
        window.localStorage.setItem(PREFIX + fingerprint, JSON.stringify(persistable));
        return true;
    } catch  {
        return false;
    }
}
function isActive(entry) {
    return ![
        "ready",
        "failed",
        "canceled"
    ].includes(entry.step);
}
const BACKUP_KIND = "kunoworld-film-keys";
const BACKUP_VERSION = 2;
const FALLBACK_SETTINGS = {
    resolution: "",
    aspectRatio: "16:9",
    durationS: 5,
    fps: 24,
    audio: true,
    seed: "",
    negativePrompt: "",
    enhance: false
};
function exportEntries(entries) {
    // `error` is transient UI state; JSON.stringify drops the undefined.
    const films = entries.filter((e)=>e.handle).map((e)=>({
            ...e,
            error: undefined
        }));
    return JSON.stringify({
        kind: BACKUP_KIND,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        films
    }, null, 2);
}
function restorable(entry) {
    const e = entry;
    const h = e?.handle;
    return Boolean(h && typeof h.jobId === "string" && typeof h.outputKey === "string" && typeof h.signingPublicKey === "string");
}
/** Fills anything an older or hand-edited backup left out, so a restore never renders a broken card. */ function normalize(entry) {
    const handle = entry.handle;
    const step = entry.step === "failed" || entry.step === "canceled" ? entry.step : "ready";
    return {
        ...entry,
        id: handle.jobId,
        handle,
        createdAt: typeof entry.createdAt === "number" ? entry.createdAt : (handle.createdAt ?? 0) * 1000 || Date.now(),
        prompt: typeof entry.prompt === "string" ? entry.prompt : "",
        tab: entry.tab ?? "text",
        editOp: entry.editOp ?? "edit",
        mode: entry.mode ?? "text_to_video",
        requestedProfileId: entry.requestedProfileId ?? handle.profileId,
        profileId: entry.profileId ?? handle.profileId,
        fallbackReason: entry.fallbackReason ?? handle.fallbackReason ?? null,
        settings: {
            ...FALLBACK_SETTINGS,
            ...entry.settings
        },
        inputs: Array.isArray(entry.inputs) ? entry.inputs : [],
        step,
        progress: 1,
        price: typeof entry.price === "number" ? entry.price : null,
        error: undefined
    };
}
function parseBackup(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch  {
        throw new Error("that file isn't JSON");
    }
    if (!data || data.kind !== BACKUP_KIND) throw new Error("that isn't a KunoWorld film-key backup");
    if (!Array.isArray(data.films)) throw new Error("the backup has no films list");
    const films = data.films.filter(restorable).map(normalize);
    if (!films.length) throw new Error("the backup holds no film keys");
    return films;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/media.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Browser media helpers: probing local files and grabbing frames. Nothing here uploads. */ __turbopack_context__.s([
    "extractLastFrame",
    ()=>extractLastFrame,
    "kindOf",
    ()=>kindOf,
    "probeMedia",
    ()=>probeMedia,
    "ratioLabel",
    ()=>ratioLabel,
    "ratioValue",
    ()=>ratioValue,
    "willCrop",
    ()=>willCrop
]);
function kindOf(file) {
    const t = file.type;
    if (t.startsWith("image/")) return "image";
    if (t.startsWith("video/")) return "video";
    if (t.startsWith("audio/")) return "audio";
    return "unknown";
}
function once(target, ok, timeoutMs = 8000) {
    return new Promise((resolve, reject)=>{
        const timer = window.setTimeout(()=>cleanup(new Error("timed out reading media")), timeoutMs);
        const onOk = ()=>cleanup();
        const onErr = ()=>cleanup(new Error("this browser can't decode the media"));
        function cleanup(err) {
            window.clearTimeout(timer);
            target.removeEventListener(ok, onOk);
            target.removeEventListener("error", onErr);
            if (err) reject(err);
            else resolve();
        }
        target.addEventListener(ok, onOk);
        target.addEventListener("error", onErr);
    });
}
async function probeMedia(file, url) {
    const kind = kindOf(file);
    try {
        if (kind === "image") {
            const img = new Image();
            img.src = url;
            await img.decode();
            return {
                kind,
                width: img.naturalWidth,
                height: img.naturalHeight
            };
        }
        if (kind === "video" || kind === "audio") {
            const el = document.createElement(kind);
            el.preload = "metadata";
            el.src = url;
            await once(el, "loadedmetadata");
            const info = {
                kind,
                duration: Number.isFinite(el.duration) ? el.duration : undefined
            };
            if (el instanceof HTMLVideoElement) {
                info.width = el.videoWidth || undefined;
                info.height = el.videoHeight || undefined;
            }
            el.removeAttribute("src");
            return info;
        }
    } catch  {
    /* fall through: unknown dimensions */ }
    return {
        kind
    };
}
async function extractLastFrame(src) {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;
    await once(video, "loadeddata", 15000);
    const target = Math.max(0, (Number.isFinite(video.duration) ? video.duration : 0) - 0.05);
    if (Math.abs(video.currentTime - target) > 0.001) {
        const seeked = once(video, "seeked", 15000);
        video.currentTime = target;
        await seeked;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width) throw new Error("this browser can't decode the film to grab a frame");
    ctx.drawImage(video, 0, 0);
    video.removeAttribute("src");
    return new Promise((resolve, reject)=>canvas.toBlob((blob)=>blob ? resolve(blob) : reject(new Error("couldn't encode the frame")), "image/png"));
}
function ratioLabel(width, height) {
    if (!width || !height) return null;
    const known = [
        [
            "21:9",
            21 / 9
        ],
        [
            "16:9",
            16 / 9
        ],
        [
            "4:3",
            4 / 3
        ],
        [
            "1:1",
            1
        ],
        [
            "3:4",
            3 / 4
        ],
        [
            "9:16",
            9 / 16
        ]
    ];
    const r = width / height;
    const [label, value] = known.reduce((best, cur)=>Math.abs(cur[1] - r) < Math.abs(best[1] - r) ? cur : best);
    return Math.abs(value - r) / value < 0.04 ? label : `${width}×${height}`;
}
function ratioValue(label) {
    const [w, h] = label.split(":").map(Number);
    return w && h ? w / h : 16 / 9;
}
function willCrop(width, height, aspect) {
    if (!width || !height) return false;
    const r = width / height;
    const target = ratioValue(aspect);
    return Math.abs(r - target) / target > 0.06;
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

//# sourceMappingURL=platform_web_src_07lxe4k._.js.map