module.exports = [
"[turbopack-node]/transforms/postcss.ts?config=[project]/platform/web/postcss.config.mjs { CONFIG => \"[project]/platform/web/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/1p_c_0em44l0._.js",
  "chunks/[root-of-the-server]__1yqpa2x._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts?config=[project]/platform/web/postcss.config.mjs { CONFIG => \"[project]/platform/web/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];