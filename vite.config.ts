import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;

          // Vite/Rollup ids may contain backslashes on Windows.
          const normalizedId = id.replace(/\\/g, "/");

          // Core frameworks
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/scheduler/") ||
            normalizedId.includes("/node_modules/use-sync-external-store/")
          ) {
            return "react";
          }
          if (normalizedId.includes("react-router") || normalizedId.includes("@remix-run/router")) return "router";

          // UI + styling
          if (
            normalizedId.includes("@chakra-ui/") ||
            normalizedId.includes("@emotion/") ||
            normalizedId.includes("@floating-ui/") ||
            normalizedId.includes("@ark-ui/") ||
            normalizedId.includes("@zag-js/") ||
            normalizedId.includes("@react-aria/") ||
            normalizedId.includes("@react-stately/") ||
            normalizedId.includes("@internationalized/")
          ) {
            return "chakra";
          }
          if (normalizedId.includes("react-icons")) return "icons";

          // Cloud/auth
          if (
            normalizedId.includes("aws-amplify") ||
            normalizedId.includes("@aws-amplify") ||
            normalizedId.includes("amazon-cognito-identity-js") ||
            normalizedId.includes("@aws-sdk/") ||
            normalizedId.includes("@aws-crypto/")
          ) {
            return "amplify";
          }

          // Charts
          if (normalizedId.includes("recharts") || normalizedId.includes("d3-")) return "charts";

          // Everything else
          return "vendor";
        },
      },
    },
  },
});
