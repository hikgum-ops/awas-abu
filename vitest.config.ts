import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "cloudflare:workers": fileURLToPath(
        new URL("./tests/cloudflare-workers.mock.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
  },
});
