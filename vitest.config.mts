import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    projects: [
      { extends: true, test: { name: "unit", include: ["src/**/*.test.ts", "worker/**/*.test.ts"], environment: "node" } },
      { extends: true, test: { name: "db", include: ["supabase/tests/**/*.db.test.ts"], environment: "node", testTimeout: 30000, hookTimeout: 60000 } },
    ],
  },
});
