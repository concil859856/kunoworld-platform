(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/platform/web/src/components/site/ConnectDialog.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "buttons": "ConnectDialog-module__hz-rka__buttons",
  "current": "ConnectDialog-module__hz-rka__current",
  "dialog": "ConnectDialog-module__hz-rka__dialog",
  "dot": "ConnectDialog-module__hz-rka__dot",
  "error": "ConnectDialog-module__hz-rka__error",
  "facts": "ConnectDialog-module__hz-rka__facts",
  "form": "ConnectDialog-module__hz-rka__form",
  "hint": "ConnectDialog-module__hz-rka__hint",
  "input": "ConnectDialog-module__hz-rka__input",
  "inputRow": "ConnectDialog-module__hz-rka__inputRow",
  "label": "ConnectDialog-module__hz-rka__label",
  "lede": "ConnectDialog-module__hz-rka__lede",
  "spacer": "ConnectDialog-module__hz-rka__spacer",
  "title": "ConnectDialog-module__hz-rka__title",
  "trigger": "ConnectDialog-module__hz-rka__trigger",
});
}),
"[project]/platform/web/src/components/site/ConnectDialog.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConnectButton",
    ()=>ConnectButton,
    "openConnect",
    ()=>openConnect
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/config.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/errors.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/kuno.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/ConnectDialog.module.css [app-client] (css module)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const OPEN_EVENT = "kuno:open-connect";
function openConnect() {
    window.dispatchEvent(new Event(OPEN_EVENT));
}
function ConnectButton() {
    _s();
    const apiKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useApiKey"])();
    const dialog = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const input = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [draft, setDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [reveal, setReveal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        kind: "idle"
    });
    const titleId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"])();
    const isLocal = /localhost|127\.0\.0\.1/.test(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE"]);
    const open = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ConnectButton.useCallback[open]": ()=>{
            setDraft("");
            setReveal(false);
            setStatus({
                kind: "idle"
            });
            dialog.current?.showModal();
            window.setTimeout({
                "ConnectButton.useCallback[open]": ()=>input.current?.focus()
            }["ConnectButton.useCallback[open]"], 0);
        }
    }["ConnectButton.useCallback[open]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ConnectButton.useEffect": ()=>{
            window.addEventListener(OPEN_EVENT, open);
            return ({
                "ConnectButton.useEffect": ()=>window.removeEventListener(OPEN_EVENT, open)
            })["ConnectButton.useEffect"];
        }
    }["ConnectButton.useEffect"], [
        open
    ]);
    async function connect(event) {
        event.preventDefault();
        const key = draft.trim();
        if (!key) return;
        setStatus({
            kind: "checking"
        });
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeClient"])(key).list(1);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setApiKey"])(key);
            dialog.current?.close();
        } catch (err) {
            const f = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["friendlyError"])(err, "lookup");
            setStatus({
                kind: "error",
                message: `${f.title}. ${f.detail}`.trim(),
                offline: f.code === "network"
            });
        }
    }
    function saveAnyway() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setApiKey"])(draft.trim());
        dialog.current?.close();
    }
    function disconnect() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setApiKey"])(null);
        dialog.current?.close();
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                className: `btn btn-small ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].trigger}`,
                "data-connected": apiKey ? "true" : "false",
                onClick: open,
                title: apiKey ? `Connected with ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["maskKey"])(apiKey)}` : "Connect an API key",
                children: apiKey ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].dot,
                            "aria-hidden": "true"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 79,
                            columnNumber: 13
                        }, this),
                        "Connected"
                    ]
                }, void 0, true, {
                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                    lineNumber: 78,
                    columnNumber: 11
                }, this) : "Connect"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                lineNumber: 70,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dialog", {
                ref: dialog,
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].dialog,
                "aria-labelledby": titleId,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: connect,
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].form,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "eyebrow",
                            children: "Studio access"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 89,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            id: titleId,
                            className: `display ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].title}`,
                            children: "Connect an API key"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 90,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].lede,
                            children: "KunoWorld doesn't have self-serve accounts or billing yet — those come later. For now you connect with an API key issued to you."
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 93,
                            columnNumber: 11
                        }, this),
                        apiKey && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].current,
                            children: [
                                "Connected now with ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["maskKey"])(apiKey)
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 100,
                                    columnNumber: 34
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 99,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].label,
                            htmlFor: `${titleId}-key`,
                            children: "API key"
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 104,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].inputRow,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    ref: input,
                                    id: `${titleId}-key`,
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].input,
                                    type: reveal ? "text" : "password",
                                    autoComplete: "off",
                                    spellCheck: false,
                                    placeholder: "kuno_…",
                                    value: draft,
                                    onChange: (e)=>setDraft(e.target.value)
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 108,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "btn btn-small btn-quiet",
                                    onClick: ()=>setReveal((r)=>!r),
                                    "aria-pressed": reveal,
                                    children: reveal ? "Hide" : "Show"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 119,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 107,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].facts,
                            role: "list",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: [
                                        "Saved only in this browser (localStorage) and sent only to ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                            children: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE"]
                                        }, void 0, false, {
                                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                            lineNumber: 126,
                                            columnNumber: 74
                                        }, this),
                                        " as a bearer token."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 125,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                    children: "Film keys are different: each film's key is made in this browser and never leaves it."
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 128,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 124,
                            columnNumber: 11
                        }, this),
                        isLocal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].hint,
                            children: [
                                "Running the local devkit? Your key is ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                    children: "KUNO_DEV_API_KEY"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 133,
                                    columnNumber: 53
                                }, this),
                                " in ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                    children: "dev.env"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 133,
                                    columnNumber: 86
                                }, this),
                                "."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 132,
                            columnNumber: 13
                        }, this),
                        status.kind === "error" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].error,
                            role: "alert",
                            children: status.message
                        }, void 0, false, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 138,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].buttons,
                            children: [
                                apiKey && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "btn btn-small btn-quiet",
                                    onClick: disconnect,
                                    children: "Disconnect"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 145,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].spacer
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 149,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "btn btn-small",
                                    onClick: ()=>dialog.current?.close(),
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 150,
                                    columnNumber: 13
                                }, this),
                                status.kind === "error" && status.offline ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "btn btn-small btn-primary",
                                    onClick: saveAnyway,
                                    disabled: !draft.trim(),
                                    children: "Save without checking"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 154,
                                    columnNumber: 15
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: "btn btn-small btn-primary",
                                    disabled: !draft.trim() || status.kind === "checking",
                                    children: status.kind === "checking" ? "Checking…" : "Check & connect"
                                }, void 0, false, {
                                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                                    lineNumber: 158,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                            lineNumber: 143,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                    lineNumber: 88,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
                lineNumber: 87,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/site/ConnectDialog.tsx",
        lineNumber: 69,
        columnNumber: 5
    }, this);
}
_s(ConnectButton, "+crga15xTtSybzeAfA9TJbhjVbw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$kuno$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useApiKey"],
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]
    ];
});
_c = ConnectButton;
var _c;
__turbopack_context__.k.register(_c, "ConnectButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/site/Header.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "actions": "Header-module__pcTCwG__actions",
  "header": "Header-module__pcTCwG__header",
  "menuButton": "Header-module__pcTCwG__menuButton",
  "menuIcon": "Header-module__pcTCwG__menuIcon",
  "nav": "Header-module__pcTCwG__nav",
  "wordmark": "Header-module__pcTCwG__wordmark",
});
}),
"[project]/platform/web/src/components/site/Header.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Header",
    ()=>Header
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/ConnectDialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$Header$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/Header.module.css [app-client] (css module)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$LogoMark$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/LogoMark.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
const NAV = [
    {
        href: "/studio",
        label: "Studio"
    },
    {
        href: "/verify",
        label: "Verify"
    },
    {
        href: "/network",
        label: "Network"
    },
    {
        href: "/developers",
        label: "Developers"
    }
];
function Header({ variant = "site" }) {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$Header$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].header,
        "data-variant": variant,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                href: "#main",
                className: "skip-link",
                children: "Skip to content"
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/site/Header.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                href: "/",
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$Header$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].wordmark,
                "aria-label": "KunoWorld, home",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$LogoMark$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LogoMark"], {
                        height: 22
                    }, void 0, false, {
                        fileName: "[project]/platform/web/src/components/site/Header.tsx",
                        lineNumber: 28,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        "aria-hidden": "true",
                        children: [
                            "Kuno",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                                children: "World"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/site/Header.tsx",
                                lineNumber: 30,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/site/Header.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/site/Header.tsx",
                lineNumber: 27,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                "aria-label": "Primary",
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$Header$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].nav,
                "data-open": open,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                    role: "list",
                    id: "primary-nav",
                    children: NAV.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: item.href,
                                "aria-current": pathname?.startsWith(item.href) ? "page" : undefined,
                                onClick: ()=>setOpen(false),
                                children: item.label
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/site/Header.tsx",
                                lineNumber: 37,
                                columnNumber: 15
                            }, this)
                        }, item.href, false, {
                            fileName: "[project]/platform/web/src/components/site/Header.tsx",
                            lineNumber: 36,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/platform/web/src/components/site/Header.tsx",
                    lineNumber: 34,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/platform/web/src/components/site/Header.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$Header$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].actions,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$ConnectDialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ConnectButton"], {}, void 0, false, {
                        fileName: "[project]/platform/web/src/components/site/Header.tsx",
                        lineNumber: 49,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$Header$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].menuButton,
                        "aria-expanded": open,
                        "aria-controls": "primary-nav",
                        onClick: ()=>setOpen((o)=>!o),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "Menu"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/site/Header.tsx",
                                lineNumber: 57,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$Header$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].menuIcon,
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/platform/web/src/components/site/Header.tsx",
                                lineNumber: 58,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/platform/web/src/components/site/Header.tsx",
                        lineNumber: 50,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/platform/web/src/components/site/Header.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/platform/web/src/components/site/Header.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
_s(Header, "v3TFSdztexVkGEr5cLhcJl2cWfw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = Header;
var _c;
__turbopack_context__.k.register(_c, "Header");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/components/site/LogoMark.module.css [app-client] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "mark": "LogoMark-module__ny7x1a__mark",
});
}),
"[project]/platform/web/src/components/site/LogoMark.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LogoMark",
    ()=>LogoMark
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$LogoMark$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/platform/web/src/components/site/LogoMark.module.css [app-client] (css module)");
;
;
;
/*
 * The KunoWorld monogram.
 *
 * The source artwork is white on its own dark square; the square is keyed out in
 * scripts so the mark sits on whatever surface it lands on. Intrinsic size is the
 * generated file's (393×256) — keep these in step with scripts that rewrite it.
 */ const RATIO = 393 / 256;
function LogoMark({ height = 22, className = "" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        src: "/logo-mark-wide.png",
        alt: "",
        "aria-hidden": "true",
        width: Math.round(height * RATIO),
        height: height,
        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$components$2f$site$2f$LogoMark$2e$module$2e$css__$5b$app$2d$client$5d$__$28$css__module$29$__["default"].mark} ${className}`,
        priority: true
    }, void 0, false, {
        fileName: "[project]/platform/web/src/components/site/LogoMark.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
_c = LogoMark;
var _c;
__turbopack_context__.k.register(_c, "LogoMark");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Public configuration. Everything here is safe to ship to the browser. */ __turbopack_context__.s([
    "API_BASE",
    ()=>API_BASE,
    "DEV_COUNTRY",
    ()=>DEV_COUNTRY,
    "LINKS",
    ()=>LINKS,
    "RELAY_RETENTION_DAYS",
    ()=>RELAY_RETENTION_DAYS,
    "SITE",
    ()=>SITE
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const API_BASE = (("TURBOPACK compile-time value", "http://localhost:8080") || "http://localhost:8080").replace(/\/+$/, "");
const DEV_COUNTRY = ("TURBOPACK compile-time value", "JP")?.trim() || undefined;
const SITE = {
    name: "KunoWorld",
    domain: "kunoworld.com",
    url: "https://kunoworld.com"
};
const LINKS = {
    h3License: "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE",
    ltxLicense: "https://huggingface.co/Lightricks/LTX-2/blob/main/LICENSE",
    subnetRepo: "https://github.com/kunoworld/subnet",
    sdkRepo: "https://github.com/kunoworld/sdk"
};
const RELAY_RETENTION_DAYS = 7;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/errors.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "friendlyError",
    ()=>friendlyError
]);
/** Maps KunoError codes (and a few browser failures) to plain-language copy. */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/config.ts [app-client] (ecmascript)");
;
;
const COPY = {
    insufficient_balance: {
        title: "Not enough balance for this take",
        detail: "Your balance doesn't cover this render, so nothing was sent to a stage. Self-serve accounts and top-ups are coming; for now keys are issued by hand."
    },
    region_restricted: {
        title: "Not licensed in your region yet",
        detail: "MiniMax H3 can't be used where you are yet, and no LTX-2.5 stock can make this kind of shot. Try Frames or Keyframes on LTX-2.5."
    },
    no_attested_worker: {
        title: "No stage could prove its hardware",
        detail: "Your browser checks each stage's proof of hardware before sending anything. None passed just now, so nothing left your device."
    },
    no_capacity: {
        title: "Every stage for this stock is busy or offline",
        detail: "Nothing was sent or charged. Try another stock, or try again in a minute."
    },
    model_disabled: {
        title: "This stock is switched off right now",
        detail: "The network owner has paused this model. Pick another stock."
    },
    mode_unsupported: {
        title: "This stock can't make that shot",
        detail: "Pick a stock that supports this kind of shot."
    },
    mode_unavailable: {
        title: "No stock can make that shot right now",
        detail: "Nothing was sent or charged."
    },
    enclave_unavailable: (phase)=>phase === "submit" ? {
            title: "The stage went away mid-handshake",
            detail: "The stage your browser chose left the network before accepting the job. Nothing was charged — generate again."
        } : {
            title: "The stage went offline",
            detail: "The assigned stage went offline before starting."
        },
    safety_blocked: {
        title: "Blocked by the content policy",
        detail: "The content check inside the sealed stage stopped this request before rendering. It runs inside the stage, so no person read your prompt."
    },
    decrypt_failed: (phase)=>phase === "open" ? {
            title: "This film didn't open with the key in this browser",
            detail: "The film's key lives only in this browser, so it can't be recovered from our side. If you generated it in another browser, open it there."
        } : {
            title: "The stage couldn't open your sealed request",
            detail: "The request didn't decrypt inside the stage — it may have been altered in transit."
        },
    integrity: {
        title: "The film didn't match its certificate",
        detail: "What came back didn't match the stage's signed receipt, so it wasn't shown. Try opening it again."
    },
    unauthorized: {
        title: "That API key wasn't accepted",
        detail: "Connect with a valid key. Self-serve accounts are coming; for now keys are issued by hand."
    },
    invalid_params: {
        title: "The settings don't fit this stock",
        detail: ""
    },
    invalid_inputs: {
        title: "An input couldn't be attached",
        detail: ""
    },
    bad_inputs: {
        title: "An input didn't arrive intact",
        detail: ""
    },
    unsupported_media: {
        title: "Unsupported file type",
        detail: "Use PNG, JPEG or WebP images, MP4, MOV or WebM video, and WAV, MP3, OGG or FLAC audio."
    },
    too_large: {
        title: "That file is too large",
        detail: "Uploads are limited to 512 MB after encryption."
    },
    prompt_too_long: {
        title: "The prompt is too long",
        detail: ""
    },
    unsupported_option: {
        title: "That option isn't available on this stock",
        detail: ""
    },
    expired: {
        title: "This sealed copy has expired",
        detail: `The relay keeps encrypted films for ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RELAY_RETENTION_DAYS"]} days, then deletes them. Download films you want to keep.`
    },
    not_found: (phase)=>phase === "lookup" ? {
            title: "No KunoWorld certificate matches this file",
            detail: ""
        } : {
            title: "Not found",
            detail: "This job isn't on the account connected in this browser."
        },
    queue_timeout: {
        title: "No stage picked this up in time",
        detail: "Submit again."
    },
    internal_error: {
        title: "The render failed inside the stage",
        detail: "The stage reported an internal error."
    },
    timeout: {
        title: "Still rendering after 30 minutes",
        detail: "We stopped waiting. Reopen the studio later — the key for this film is still in this browser."
    },
    job_canceled: {
        title: "Canceled",
        detail: "You canceled this take."
    },
    canceled: {
        title: "Canceled",
        detail: "You canceled this take."
    },
    aborted: {
        title: "Stopped waiting",
        detail: ""
    },
    network: {
        title: "Can't reach KunoWorld",
        detail: `Your browser couldn't reach ${__TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE"]}.`
    }
};
function splitJobError(message) {
    const match = /^([a-z_]+):\s*(.*)$/s.exec(message);
    return match ? {
        code: match[1],
        message: match[2]
    } : {
        code: null,
        message
    };
}
function friendlyError(err, phase) {
    let code = "error";
    let message = err instanceof Error ? err.message : String(err);
    if (err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["KunoError"]) {
        code = err.code;
        if (code === "job_failed") {
            // Failed jobs surface as "job_failed" with the worker's code as a message prefix.
            const parsed = splitJobError(err.message);
            code = parsed.code ?? "internal_error";
            message = parsed.message;
        }
    } else if (err instanceof Error && err.name === "DecryptionError") {
        code = "decrypt_failed";
    } else if (err instanceof TypeError) {
        code = "network";
    }
    const entry = COPY[code];
    const copy = typeof entry === "function" ? entry(phase) : entry;
    const title = copy?.title ?? "Something went wrong";
    const detail = copy?.detail || message || "";
    const charge = phase === "submit" ? "none" : phase === "render" ? "refunded" : phase === "open" ? "kept" : null;
    return {
        code,
        title,
        detail: copy?.detail ? detail : message,
        charge
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/platform/web/src/lib/kuno.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isMac",
    ()=>isMac,
    "keyFingerprint",
    ()=>keyFingerprint,
    "lookupDigest",
    ()=>lookupDigest,
    "makeClient",
    ()=>makeClient,
    "maskKey",
    ()=>maskKey,
    "setApiKey",
    ()=>setApiKey,
    "useApiKey",
    ()=>useApiKey
]);
/**
 * Browser-side access to the KunoWorld API through @kunoworld/sdk.
 * Import only from client components: the SDK does its cryptography with WebCrypto.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/dist/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/platform/web/src/lib/config.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
const KEY_STORAGE = "kuno.apiKey.v1";
const KEY_EVENT = "kuno:apikey";
function readKey() {
    try {
        return window.localStorage.getItem(KEY_STORAGE);
    } catch  {
        return null;
    }
}
function setApiKey(key) {
    try {
        if (key) window.localStorage.setItem(KEY_STORAGE, key);
        else window.localStorage.removeItem(KEY_STORAGE);
    } catch  {
    /* storage blocked: the key lives for this page only */ }
    window.dispatchEvent(new Event(KEY_EVENT));
}
function subscribe(onChange) {
    window.addEventListener("storage", onChange);
    window.addEventListener(KEY_EVENT, onChange);
    return ()=>{
        window.removeEventListener("storage", onChange);
        window.removeEventListener(KEY_EVENT, onChange);
    };
}
function useApiKey() {
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribe, readKey, {
        "useApiKey.useSyncExternalStore": ()=>null
    }["useApiKey.useSyncExternalStore"]);
}
_s(useApiKey, "FpwL93IKMLJZuQQXefVtWynbBPQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"]
    ];
});
function makeClient(apiKey) {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["KunoClient"]({
        apiKey: apiKey ?? undefined,
        baseUrl: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["API_BASE"],
        country: __TURBOPACK__imported__module__$5b$project$5d2f$platform$2f$web$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEV_COUNTRY"]
    });
}
async function lookupDigest(digest) {
    return makeClient().provenanceByDigest(digest);
}
function keyFingerprint(key) {
    let h = 2166136261;
    for(let i = 0; i < key.length; i++){
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
}
function maskKey(key) {
    return key.length > 10 ? `${key.slice(0, 9)}…${key.slice(-4)}` : "••••";
}
const isMac = ()=>typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sdk/js/dist/attestation.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "enclaveIdFor",
    ()=>enclaveIdFor,
    "gpuNonceFor",
    ()=>gpuNonceFor,
    "parseTdxQuote",
    ()=>parseTdxQuote,
    "reportDataFor",
    ()=>reportDataFor,
    "verifyEvidence",
    ()=>verifyEvidence,
    "verifySignature",
    ()=>safeVerify
]);
/**
 * Enclave attestation checks, mirroring kuno_protocol.attestation.
 *
 * Mock evidence (development) is fully verified. For Intel TDX the SDK verifies the
 * measurements against the golden manifest and the REPORTDATA key binding; the quote's
 * Intel signature chain and NVIDIA GPU evidence are verified by validators and the
 * gateway (browsers cannot fetch DCAP collateral). `signatureVerified` reports which.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$ed25519$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/curves/ed25519.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/sha2.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/encoding.js [app-client] (ecmascript)");
;
;
;
const MEASUREMENT_KEYS = [
    "mrtd",
    "rtmr0",
    "rtmr1",
    "rtmr2",
    "rtmr3"
];
function enclaveIdFor(hpkePublicKey, signingPublicKey) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toHex"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["concatBytes"])(hpkePublicKey, signingPublicKey))).slice(0, 32);
}
function gpuNonceFor(nonce, hpkePublicKey, signingPublicKey) {
    const binding = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["concatBytes"])(hpkePublicKey, signingPublicKey));
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["concatBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utf8"])("kuno/v1/gpu"), nonce, binding));
}
function reportDataFor(nonce, hpkePublicKey, signingPublicKey, gpuEvidence) {
    const binding = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["concatBytes"])(hpkePublicKey, signingPublicKey));
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha512"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["concatBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utf8"])("kuno/v1/report"), nonce, binding, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256"])(gpuEvidence ?? new Uint8Array())));
}
/** Byte offsets of the TD report body in a DCAP v4 quote (after the 48-byte header). */ const TDX_FIELDS = [
    [
        "tee_tcb_svn",
        16
    ],
    [
        "mrseam",
        48
    ],
    [
        "mrsignerseam",
        48
    ],
    [
        "seamattributes",
        8
    ],
    [
        "tdattributes",
        8
    ],
    [
        "xfam",
        8
    ],
    [
        "mrtd",
        48
    ],
    [
        "mrconfigid",
        48
    ],
    [
        "mrowner",
        48
    ],
    [
        "mrownerconfig",
        48
    ],
    [
        "rtmr0",
        48
    ],
    [
        "rtmr1",
        48
    ],
    [
        "rtmr2",
        48
    ],
    [
        "rtmr3",
        48
    ],
    [
        "reportdata",
        64
    ]
];
function parseTdxQuote(quote) {
    const bodyLen = TDX_FIELDS.reduce((n, [, size])=>n + size, 0);
    if (quote.length < 48 + bodyLen) throw new Error("quote too short for a TDX v4 quote");
    const view = new DataView(quote.buffer, quote.byteOffset, quote.length);
    if (view.getUint16(0, true) !== 4 || view.getUint32(4, true) !== 0x81) throw new Error("not a TDX v4 quote");
    const fields = {};
    let offset = 48;
    for (const [name, size] of TDX_FIELDS){
        fields[name] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toHex"])(quote.subarray(offset, offset + size));
        offset += size;
    }
    return fields;
}
function verifyEvidence(evidence, manifest, opts = {}) {
    const reasons = [];
    let hpke, sign, nonce, quote, gpu;
    try {
        hpke = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(evidence.hpke_public_key);
        sign = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(evidence.signing_public_key);
        nonce = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fromHex"])(evidence.nonce);
        quote = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(evidence.quote);
        gpu = evidence.gpu_evidence ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(evidence.gpu_evidence) : null;
    } catch  {
        return {
            ok: false,
            enclaveId: "",
            reasons: [
                "malformed evidence encoding"
            ],
            signatureVerified: false,
            measurements: {}
        };
    }
    const verdict = {
        ok: false,
        enclaveId: enclaveIdFor(hpke, sign),
        reasons,
        signatureVerified: false,
        measurements: {}
    };
    if (hpke.length !== 32 || sign.length !== 32) reasons.push("keys must be 32-byte X25519 / Ed25519 public keys");
    if (opts.expectedNonce && (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toHex"])(opts.expectedNonce) !== evidence.nonce) reasons.push("nonce does not match the challenge");
    const now = opts.now ?? Date.now() / 1000;
    if (now - evidence.created_at > manifest.max_evidence_age_s) reasons.push("evidence is older than the manifest allows");
    let reportData = null;
    if (evidence.tee === "mock") {
        try {
            const doc = JSON.parse(new TextDecoder().decode(quote));
            const message = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["concatBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utf8"])("kuno/v1/mock-quote\n"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canonicalJson"])(doc.body));
            const signature = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(doc.signature);
            if (manifest.mock_quote_keys.some((k)=>safeVerify(signature, message, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(k)))) {
                verdict.signatureVerified = true;
                verdict.measurements = doc.body.measurements;
                reportData = doc.body.report_data;
            } else {
                reasons.push("mock quote not signed by a key in the manifest");
            }
        } catch  {
            reasons.push("malformed mock quote");
        }
    } else if (evidence.tee === "tdx") {
        try {
            const fields = parseTdxQuote(quote);
            verdict.measurements = Object.fromEntries(MEASUREMENT_KEYS.map((k)=>[
                    k,
                    fields[k]
                ]));
            reportData = fields.reportdata;
            if (!gpu) reasons.push("GPU evidence is required on TDX workers");
        } catch (err) {
            reasons.push(err.message);
        }
    } else {
        reasons.push(`unsupported TEE ${String(evidence.tee)}`);
    }
    if (reportData !== null && reportData !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toHex"])(reportDataFor(nonce, hpke, sign, gpu))) {
        reasons.push("REPORTDATA does not bind this nonce, these keys and this GPU evidence");
    }
    if (Object.keys(verdict.measurements).length) {
        const allowed = manifest.allowed.find((a)=>a.platform === evidence.tee && a.image_digest === evidence.image_digest && MEASUREMENT_KEYS.every((k)=>verdict.measurements[k] === a[k]));
        if (!allowed) reasons.push("measurements are not in the golden manifest");
        else if (!evidence.profiles.every((p)=>allowed.profiles.includes(p))) reasons.push("image is not approved for all claimed profiles");
    }
    verdict.ok = reasons.length === 0;
    return verdict;
}
function safeVerify(signature, message, publicKey) {
    try {
        return __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$curves$2f$ed25519$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ed25519"].verify(signature, message, publicKey);
    } catch  {
        return false;
    }
}
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sdk/js/dist/client.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "KunoClient",
    ()=>KunoClient,
    "KunoError",
    ()=>KunoError,
    "fitParams",
    ()=>fitParams,
    "inferMode",
    ()=>inferMode,
    "jobAad",
    ()=>jobAad,
    "priceUsd",
    ()=>priceUsd,
    "sniffMime",
    ()=>sniffMime,
    "verifyReceipt",
    ()=>verifyReceipt
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$attestation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/attestation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/crypto.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/encoding.js [app-client] (ecmascript)");
;
;
;
class KunoError extends Error {
    status;
    code;
    constructor(status, code, message){
        super(message);
        this.status = status;
        this.code = code;
        this.name = "KunoError";
    }
}
const MIME_SIGNATURES = [
    [
        "image/png",
        (b)=>b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    ],
    [
        "image/jpeg",
        (b)=>b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    ],
    [
        "image/webp",
        (b)=>ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP"
    ],
    [
        "audio/wav",
        (b)=>ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WAVE"
    ],
    [
        "video/quicktime",
        (b)=>ascii(b, 4, 8) === "ftyp" && ascii(b, 8, 10) === "qt"
    ],
    [
        "video/mp4",
        (b)=>ascii(b, 4, 8) === "ftyp"
    ],
    [
        "video/webm",
        (b)=>b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3
    ],
    [
        "audio/mpeg",
        (b)=>ascii(b, 0, 3) === "ID3" || b[0] === 0xff && (b[1] & 0xe0) === 0xe0
    ],
    [
        "audio/ogg",
        (b)=>ascii(b, 0, 4) === "OggS"
    ],
    [
        "audio/flac",
        (b)=>ascii(b, 0, 4) === "fLaC"
    ]
];
function ascii(bytes, start, end) {
    return String.fromCharCode(...bytes.subarray(start, end));
}
function sniffMime(bytes) {
    return MIME_SIGNATURES.find(([, test])=>test(bytes))?.[0] ?? null;
}
function inferMode(roles) {
    const has = (r)=>roles.includes(r);
    if (has("source_audio")) return "audio_to_video";
    if (has("source_video")) return "video_edit";
    if (has("reference_image") || has("reference_video") || has("reference_audio")) return "reference_to_video";
    if (has("keyframe")) return "keyframes";
    if (has("first_frame") && has("last_frame")) return "first_last_frame";
    if (has("first_frame")) return "image_to_video";
    if (has("last_frame")) return "last_frame";
    return "text_to_video";
}
function priceUsd(profile, resolution, durationS) {
    const rate = profile.pricing.usd_per_second[resolution];
    return rate === undefined ? null : Math.round(rate * durationS * 10000) / 10000;
}
function fitParams(profile, mode, roles, req, fallbackReason) {
    const lim = profile.limits;
    const lenient = fallbackReason !== null;
    let resolution = req.resolution;
    if (resolution === undefined || lenient && !(resolution in lim.sizes)) resolution = Object.keys(lim.sizes)[0];
    const sizes = lim.sizes[resolution] ?? {};
    let aspect = req.aspectRatio;
    if (aspect === undefined || lenient && !(aspect in sizes)) aspect = "16:9" in sizes ? "16:9" : Object.keys(sizes)[0] ?? "16:9";
    let fps = req.fps;
    if (fps === undefined || lenient && !lim.fps.includes(fps)) fps = lim.default_fps;
    let duration = req.durationS;
    if (duration === undefined) duration = Math.min(Math.max(5, lim.min_duration_s), lim.max_duration_s);
    else if (lenient) duration = Math.min(Math.max(duration, lim.min_duration_s), lim.max_duration_s);
    return {
        profile_id: profile.id,
        mode,
        duration_s: duration,
        resolution,
        aspect_ratio: aspect,
        fps,
        audio: (req.audio ?? true) && lim.audio,
        input_roles: roles
    };
}
function jobAad(jobId, enclaveId, params, inputBlobIds) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canonicalJson"])({
        v: 1,
        job_id: jobId,
        enclave_id: enclaveId,
        params,
        inputs: inputBlobIds
    });
}
function verifyReceipt(receipt, signingPublicKey) {
    const message = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["concatBytes"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utf8"])("kuno/v1/receipt\n"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canonicalJson"])(receipt.body));
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$attestation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["verifySignature"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(receipt.signature), message, signingPublicKey);
}
async function toBytes(file) {
    return file instanceof Uint8Array ? file : new Uint8Array(await file.arrayBuffer());
}
class KunoClient {
    opts;
    baseUrl;
    fetchImpl;
    manifestCache;
    modelsCache;
    constructor(opts = {}){
        this.opts = opts;
        this.baseUrl = (opts.baseUrl ?? "https://api.kunoworld.com").replace(/\/$/, "");
        this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
        this.manifestCache = opts.manifest;
    }
    async request(method, path, body, contentType, auth = true) {
        const headers = {};
        if (auth && this.opts.apiKey) headers.authorization = `Bearer ${this.opts.apiKey}`;
        if (this.opts.country) headers["x-kuno-country"] = this.opts.country;
        if (contentType) headers["content-type"] = contentType;
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method,
            headers,
            body
        });
        if (!response.ok) {
            let detail = {};
            try {
                const json = await response.json();
                detail = typeof json.detail === "object" && json.detail ? json.detail : {
                    message: String(json.detail)
                };
            } catch  {
            /* non-JSON error body */ }
            throw new KunoError(response.status, detail.code ?? "error", detail.message ?? response.statusText);
        }
        return response;
    }
    async json(method, path, body, auth = true) {
        const response = await this.request(method, path, body === undefined ? undefined : JSON.stringify(body), body === undefined ? undefined : "application/json", auth);
        return await response.json();
    }
    async models(maxAgeMs = 15000) {
        if (this.modelsCache && Date.now() - this.modelsCache.at < maxAgeMs) return this.modelsCache.value;
        const value = await this.json("GET", "/v1/models", undefined, false);
        this.modelsCache = {
            at: Date.now(),
            value
        };
        return value;
    }
    async manifest() {
        this.manifestCache ??= await this.json("GET", "/v1/manifest", undefined, false);
        return this.manifestCache;
    }
    async route(mode, model, family) {
        const q = new URLSearchParams({
            mode
        });
        if (model) q.set("profile_id", model);
        if (family) q.set("family", family);
        return this.json("GET", `/v1/route?${q}`, undefined, false);
    }
    /** Routes, verifies the enclave, encrypts inputs in this process, seals and submits. */ async submit(req, onStage) {
        const inputs = req.inputs ?? [];
        const roles = inputs.map((i)=>i.role);
        const mode = req.mode ?? inferMode(roles);
        onStage?.("routing");
        const route = await this.route(mode, req.model, req.family);
        const profile = (await this.models(0)).models.find((m)=>m.id === route.profile_id);
        if (!profile) throw new KunoError(404, "unknown_model", `Unknown model ${route.profile_id}.`);
        const params = fitParams(profile, mode, roles, req, route.fallback_reason);
        onStage?.("verifying");
        const enclave = await this.pickEnclave(route);
        onStage?.("encrypting");
        const jobId = crypto.randomUUID();
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openSenderSession"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(enclave.hpke_public_key));
        const refs = [];
        const blobIds = [];
        for (const [index, input] of inputs.entries()){
            const data = await toBytes(input.file);
            const mime = sniffMime(data);
            if (!mime) throw new KunoError(0, "unsupported_media", `Could not recognize the ${input.role} file type.`);
            const sealed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["encryptBlob"])(session.inputKey, `${jobId}/input/${index}`, data);
            onStage?.("uploading");
            const uploaded = await this.request("POST", "/v1/blobs", new Blob([
                new Uint8Array(sealed)
            ]), "application/octet-stream");
            blobIds.push((await uploaded.json()).blob_id);
            refs.push({
                index,
                role: input.role,
                mime,
                sha256: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256Hex"])(data),
                size: data.length,
                time_s: input.timeS ?? null,
                strength: input.strength ?? null,
                hint: input.hint ?? null,
                start_s: input.startS ?? null,
                end_s: input.endS ?? null
            });
        }
        const payload = {
            v: 1,
            prompt: req.prompt,
            negative_prompt: req.negativePrompt ?? null,
            seed: req.seed ?? null,
            inputs: refs,
            options: req.options ?? {}
        };
        const ciphertext = await session.seal((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utf8"])(JSON.stringify(payload)), jobAad(jobId, enclave.enclave_id, params, blobIds));
        onStage?.("submitting");
        await this.json("POST", "/v1/videos", {
            job_id: jobId,
            params,
            enclave_id: enclave.enclave_id,
            enc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64e"])(session.enc),
            ciphertext: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64e"])(ciphertext),
            input_blob_ids: blobIds
        });
        return {
            jobId,
            outputKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64e"])(session.outputKey),
            signingPublicKey: enclave.signing_public_key,
            enclaveId: enclave.enclave_id,
            profileId: profile.id,
            fallbackReason: route.fallback_reason,
            createdAt: Date.now() / 1000
        };
    }
    async pickEnclave(route) {
        const manifest = await this.manifest();
        for (const enclave of route.enclaves){
            const verdict = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$attestation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["verifyEvidence"])(enclave.evidence, manifest);
            if (verdict.ok && verdict.enclaveId === enclave.enclave_id && enclave.evidence.hpke_public_key === enclave.hpke_public_key && enclave.evidence.signing_public_key === enclave.signing_public_key && enclave.evidence.profiles.includes(route.profile_id)) {
                return enclave;
            }
        }
        throw new KunoError(503, "no_attested_worker", "No worker with valid attestation is available for this model right now.");
    }
    async status(jobId) {
        return this.json("GET", `/v1/videos/${jobId}`);
    }
    async list(limit = 50) {
        return this.json("GET", `/v1/videos?limit=${limit}`);
    }
    async cancel(jobId) {
        return this.json("POST", `/v1/videos/${jobId}/cancel`);
    }
    async wait(handle, opts = {}) {
        const deadline = Date.now() + (opts.timeoutMs ?? 30 * 60 * 1000);
        for(;;){
            if (opts.signal?.aborted) throw new KunoError(0, "aborted", "Stopped waiting for the video.");
            const status = await this.status(handle.jobId);
            opts.onProgress?.(status);
            if (status.status === "succeeded") return this.result(handle, status);
            if (status.status === "failed" || status.status === "canceled") {
                throw new KunoError(0, status.error_code ?? `job_${status.status}`, status.error ?? "The job did not complete.");
            }
            if (Date.now() > deadline) throw new KunoError(0, "timeout", `Job ${handle.jobId} is still ${status.status}.`);
            await new Promise((resolve)=>{
                const timer = setTimeout(resolve, opts.pollMs ?? 1000);
                opts.signal?.addEventListener("abort", ()=>{
                    clearTimeout(timer);
                    resolve();
                }, {
                    once: true
                });
            });
        }
    }
    /** Downloads the sealed video, checks it against the enclave-signed receipt, decrypts locally. */ async result(handle, status) {
        status ??= await this.status(handle.jobId);
        if (status.status !== "succeeded" || !status.receipt || !status.output_blob_id) {
            throw new KunoError(0, "not_ready", `Job ${handle.jobId} is ${status.status}.`);
        }
        const receipt = status.receipt;
        const sealed = new Uint8Array(await (await this.request("GET", `/v1/blobs/${status.output_blob_id}`)).arrayBuffer());
        if (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256Hex"])(sealed) !== receipt.body.output_digest) {
            throw new KunoError(0, "integrity", "The downloaded video does not match the enclave's receipt.");
        }
        if (!verifyReceipt(receipt, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(handle.signingPublicKey)) || receipt.body.job_id !== handle.jobId) {
            throw new KunoError(0, "integrity", "The receipt was not signed by the attested enclave for this job.");
        }
        let video;
        try {
            video = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["decryptBlob"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["b64d"])(handle.outputKey), `${handle.jobId}/output/video`, sealed);
        } catch  {
            throw new KunoError(0, "decrypt_failed", "This film did not open with the key held in this browser.");
        }
        if (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256Hex"])(video) !== receipt.body.content_digest) {
            throw new KunoError(0, "integrity", "The decrypted video does not match the receipt.");
        }
        return {
            jobId: handle.jobId,
            video,
            receipt,
            profileId: handle.profileId,
            fallbackReason: handle.fallbackReason
        };
    }
    /** Public: look up the certificate for a video file by its SHA-256. */ async provenance(file) {
        return this.provenanceByDigest(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256Hex"])(await toBytes(file)));
    }
    /** Public: the same lookup when you already have the digest (e.g. a /verify?sha256=… link). */ async provenanceByDigest(contentDigest) {
        return this.json("GET", `/v1/provenance/${encodeURIComponent(contentDigest.toLowerCase())}`, undefined, false);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sdk/js/dist/crypto.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_CHUNK",
    ()=>DEFAULT_CHUNK,
    "DecryptionError",
    ()=>DecryptionError,
    "decryptBlob",
    ()=>decryptBlob,
    "encryptBlob",
    ()=>encryptBlob,
    "openSenderSession",
    ()=>openSenderSession,
    "sha256Hex",
    ()=>sha256Hex
]);
/**
 * Client-side encryption, byte-compatible with kuno_protocol.crypto and kuno_protocol.blobs.
 *
 * Jobs: HPKE (RFC 9180) DHKEM(X25519, HKDF-SHA256) / HKDF-SHA256 / ChaCha20-Poly1305,
 * info "kuno/v1/job". The context exports an input key (for uploaded media) and an
 * output key (the only key that opens the finished video).
 *
 * Blobs: "KUNOB1" | version | chunk_size:u32be | prefix:7, then ChaCha20-Poly1305 chunks
 * with nonce prefix | index:u32be | final:u8 and the header as AAD.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$mod$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/mod.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$native$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/native.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemX25519$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/core/esm/src/kems/dhkemX25519.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$mod$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/mod.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha20Poly1305$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@hpke/chacha20poly1305/esm/src/chacha20Poly1305.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$chacha$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/ciphers/chacha.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$hkdf$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/hkdf.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/node_modules/@noble/hashes/sha2.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/encoding.js [app-client] (ecmascript)");
;
;
;
;
;
;
const HPKE_INFO = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utf8"])("kuno/v1/job");
const EXPORT_INPUT = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utf8"])("kuno/v1/input-key");
const EXPORT_OUTPUT = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utf8"])("kuno/v1/output-key");
const MAGIC = (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utf8"])("KUNOB1");
const VERSION = 1;
const HEADER_LEN = 18;
const TAG_LEN = 16;
const DEFAULT_CHUNK = 1 << 20;
const MAX_CHUNK = 64 << 20;
class DecryptionError extends Error {
    constructor(message){
        super(message);
        this.name = "DecryptionError";
    }
}
const suite = new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$native$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CipherSuite"]({
    kem: new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$kems$2f$dhkemX25519$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DhkemX25519HkdfSha256"](),
    kdf: new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$core$2f$esm$2f$src$2f$native$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HkdfSha256"](),
    aead: new __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$hpke$2f$chacha20poly1305$2f$esm$2f$src$2f$chacha20Poly1305$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Chacha20Poly1305"]()
});
async function openSenderSession(enclavePublicKey) {
    const recipientPublicKey = await suite.kem.deserializePublicKey(enclavePublicKey);
    const ctx = await suite.createSenderContext({
        recipientPublicKey,
        info: HPKE_INFO
    });
    const inputKey = new Uint8Array(await ctx.export(EXPORT_INPUT, 32));
    const outputKey = new Uint8Array(await ctx.export(EXPORT_OUTPUT, 32));
    let sealed = false;
    return {
        enc: new Uint8Array(ctx.enc),
        inputKey,
        outputKey,
        async seal (plaintext, aad) {
            if (sealed) throw new Error("a sender session seals exactly one request");
            sealed = true;
            return new Uint8Array(await ctx.seal(plaintext, aad));
        }
    };
}
function blobKey(baseKey, label) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$hkdf$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hkdf"])(__TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256"], baseKey, undefined, (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["utf8"])(`kuno/v1/blob/${label}`), 32);
}
function nonce(prefix, index, final) {
    const n = new Uint8Array(12);
    n.set(prefix, 0);
    new DataView(n.buffer).setUint32(7, index, false);
    n[11] = final ? 1 : 0;
    return n;
}
function encryptBlob(baseKey, label, plaintext, chunkSize = DEFAULT_CHUNK) {
    if (chunkSize <= 0 || chunkSize > MAX_CHUNK) throw new Error("chunk size out of range");
    const key = blobKey(baseKey, label);
    const prefix = crypto.getRandomValues(new Uint8Array(7));
    const header = new Uint8Array(HEADER_LEN);
    header.set(MAGIC, 0);
    header[6] = VERSION;
    new DataView(header.buffer).setUint32(7, chunkSize, false);
    header.set(prefix, 11);
    const count = Math.max(1, Math.ceil(plaintext.length / chunkSize));
    const parts = [
        header
    ];
    for(let i = 0; i < count; i++){
        const chunk = plaintext.subarray(i * chunkSize, (i + 1) * chunkSize);
        parts.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$chacha$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["chacha20poly1305"])(key, nonce(prefix, i, i === count - 1), header).encrypt(chunk));
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["concatBytes"])(...parts);
}
function decryptBlob(baseKey, label, blob) {
    if (blob.length < HEADER_LEN + TAG_LEN) throw new DecryptionError("blob too short");
    const header = blob.subarray(0, HEADER_LEN);
    const chunkSize = new DataView(header.buffer, header.byteOffset, HEADER_LEN).getUint32(7, false);
    const magicOk = MAGIC.every((b, i)=>header[i] === b);
    if (!magicOk || header[6] !== VERSION || chunkSize <= 0 || chunkSize > MAX_CHUNK) {
        throw new DecryptionError("not a KunoWorld blob");
    }
    const prefix = header.slice(11, 18);
    const key = blobKey(baseKey, label);
    const body = blob.subarray(HEADER_LEN);
    const step = chunkSize + TAG_LEN;
    const count = Math.ceil(body.length / step);
    const parts = [];
    try {
        for(let i = 0; i < count; i++){
            const piece = body.subarray(i * step, (i + 1) * step);
            parts.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$ciphers$2f$chacha$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["chacha20poly1305"])(key, nonce(prefix, i, i === count - 1), header).decrypt(piece));
        }
    } catch  {
        throw new DecryptionError("blob failed authentication (wrong key, label, or tampered/truncated data)");
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["concatBytes"])(...parts);
}
async function sha256Hex(data) {
    if (globalThis.crypto?.subtle) {
        const copy = new Uint8Array(data);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toHex"])(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", copy)));
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toHex"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$node_modules$2f40$noble$2f$hashes$2f$sha2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sha256"])(data));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sdk/js/dist/encoding.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "b64d",
    ()=>b64d,
    "b64e",
    ()=>b64e,
    "canonicalJson",
    ()=>canonicalJson,
    "concatBytes",
    ()=>concatBytes,
    "fromHex",
    ()=>fromHex,
    "toHex",
    ()=>toHex,
    "utf8",
    ()=>utf8
]);
/** Byte and JSON encodings that must match the Python protocol package exactly. */ const encoder = new TextEncoder();
function utf8(text) {
    return encoder.encode(text);
}
function concatBytes(...parts) {
    const out = new Uint8Array(parts.reduce((n, p)=>n + p.length, 0));
    let offset = 0;
    for (const part of parts){
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}
function b64e(bytes) {
    let binary = "";
    for(let i = 0; i < bytes.length; i += 0x8000){
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64d(text) {
    const standard = text.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(standard + "=".repeat((4 - standard.length % 4) % 4));
    const out = new Uint8Array(binary.length);
    for(let i = 0; i < binary.length; i++)out[i] = binary.charCodeAt(i);
    return out;
}
function toHex(bytes) {
    return Array.from(bytes, (b)=>b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex) {
    if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) throw new Error("invalid hex");
    const out = new Uint8Array(hex.length / 2);
    for(let i = 0; i < out.length; i++)out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
}
function canonicalJson(value) {
    return utf8(stringify(value));
}
function stringify(value) {
    if (value === null || typeof value !== "object") {
        if (typeof value === "number" && !Number.isFinite(value)) throw new Error("canonical JSON cannot encode NaN or infinity");
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(stringify).join(",")}]`;
    const entries = Object.entries(value).filter(([, v])=>v !== undefined).sort(([a], [b])=>a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([k, v])=>`${JSON.stringify(k)}:${stringify(v)}`).join(",")}}`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sdk/js/dist/index.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
/**
 * KunoWorld JavaScript SDK.
 *
 *   const kuno = new KunoClient({ apiKey });
 *   const job = await kuno.submit({ prompt: "A lighthouse keeper lights the lamp at dusk", model: "h3-turbo" });
 *   const { video, receipt } = await kuno.wait(job);
 *
 * Prompts and media are encrypted in this process to a GPU enclave whose attestation
 * is checked first; the platform only relays ciphertext.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$types$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/types.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$attestation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/attestation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$crypto$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/crypto.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$sdk$2f$js$2f$dist$2f$encoding$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/sdk/js/dist/encoding.js [app-client] (ecmascript)");
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/sdk/js/dist/types.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Wire types mirroring kuno_protocol (Python). */ __turbopack_context__.s([]);
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0niuu3i._.js.map