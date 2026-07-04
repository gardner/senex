import path from "node:path";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// AIDEV-NOTE: Tests run inside REAL workerd with a REAL (in-memory) D1 —
// no mocks. We deliberately do NOT point at wrangler.jsonc: its `main`
// (worker/index.ts) imports vinext virtual modules that only exist under
// the vinext vite plugin, which would break test startup. Instead the
// bindings the code under test needs are declared here, and the committed
// SQL migrations are applied in tests/apply-migrations.ts before each
// test file (storage is isolated per file).
export default defineConfig({
  resolve: {
    // Mirror tsconfig's "@/*" alias.
    alias: { "@": __dirname },
  },
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(
        path.join(__dirname, "migrations"),
      );

      return {
        miniflare: {
          compatibilityDate: "2026-06-10",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          bindings: {
            // Test-only binding consumed by tests/apply-migrations.ts.
            TEST_MIGRATIONS: migrations,
            BETTER_AUTH_SECRET: "test-only-secret-at-least-32-characters",
            BETTER_AUTH_URL: "http://localhost:3000",
            APP_ENV: "test",
          },
        },
      };
    }),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/apply-migrations.ts"],
  },
});
