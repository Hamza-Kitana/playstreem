import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  resolve: {
    alias: [
      { find: "@", replacement: `${process.cwd()}/src` },
      // tslib's Node ESM entry default-imports its CJS build, which breaks once bundled.
      { find: /^tslib$/, replacement: "tslib/tslib.es6.mjs" },
    ],
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  // Avoid broken re-exports in the Vercel/Nitro SSR bundle (Vite 8).
  ssr: {
    noExternal: command === "build" ? true : undefined,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
    }),
    // Nitro auto-detects Vercel during `vercel build`; don't force Cloudflare.
    nitro(),
    viteReact(),
  ],
}));
