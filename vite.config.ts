import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("src/components/InternalCanonicalLifecyclePanel")) {
            return "canonical-lifecycle-panel";
          }
          if (id.includes("@noble/") || id.includes("poseidon-lite")) {
            return "vendor-private-core-crypto";
          }
          if (
            id.includes("src/data/context/PrivacyFlowContext") ||
            id.includes("src/zk/vantaPrivateCore") ||
            id.includes("src/zk/vantaPrivateCoreUnshieldProof") ||
            id.includes("src/zk/vantaPrivateCoreOperatorClient")
          ) {
            return "private-core-runtime";
          }
          if (id.includes("react") || id.includes("react-router-dom")) {
            return "vendor-react";
          }
          if (
            id.includes("@solana/") ||
            id.includes("@coral-xyz/") ||
            id.includes("@meteora-ag/")
          ) {
            return "vendor-solana";
          }
        },
      },
    },
  },
});
