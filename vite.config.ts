import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  worker: {
    format: "es",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer/",
      util: "util/",
    },
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.split(path.sep).join("/");

          if (id.includes("src/components/InternalCanonicalLifecyclePanel")) {
            return "canonical-lifecycle-panel";
          }
          if (normalizedId.includes("node_modules/@noble/curves")) {
            return "vendor-noble-curves";
          }
          if (normalizedId.includes("node_modules/@noble/ciphers")) {
            return "vendor-noble-ciphers";
          }
          if (
            normalizedId.includes("node_modules/@noble/hashes") ||
            normalizedId.includes("node_modules/poseidon-lite")
          ) {
            return "vendor-private-core-hashes";
          }
          if (normalizedId.includes("src/data/context/PrivacyFlowContext")) {
            return "private-core-runtime";
          }
          if (normalizedId.includes("src/zk/vantaPrivateCore")) {
            return "private-core-runtime";
          }
          if (
            normalizedId.includes("node_modules/base64-js") ||
            normalizedId.includes("node_modules/buffer") ||
            normalizedId.includes("node_modules/ieee754")
          ) {
            return "vendor-node-polyfills";
          }
          if (normalizedId.includes("node_modules/@solana/react-hooks")) {
            return "vendor-solana-react";
          }
          if (
            normalizedId.includes("node_modules/react/") ||
            normalizedId.includes("node_modules/react-dom/") ||
            normalizedId.includes("node_modules/react-router-dom/")
          ) {
            return "vendor-react";
          }
          if (normalizedId.includes("node_modules/@meteora-ag/")) {
            return "vendor-meteora";
          }
          if (normalizedId.includes("node_modules/@coral-xyz/")) {
            return "vendor-anchor";
          }
          if (normalizedId.includes("node_modules/@solana/")) {
            return "vendor-solana-core";
          }
        },
      },
    },
  },
});
