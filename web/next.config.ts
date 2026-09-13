import path from "node:path";
import type { NextConfig } from "next";

// @kunoworld/sdk is linked from ../../sdk/js, outside this package, so the
// bundler root has to include it.
const workspaceRoot = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The container image runs the self-contained server this produces.
  output: "standalone",
  // Lets a second dev server (e.g. the region test run) build into its own directory.
  distDir: process.env.KUNO_DIST_DIR || ".next",
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
