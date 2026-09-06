import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "dist/**",
    ".wrangler/**",
    "node_modules/**",
    "mnt/**",
    "areas.ts",
    "fonnte.ts",
    "reply.ts",
    "route.ts",
    "status.ts",
  ]),
]);
