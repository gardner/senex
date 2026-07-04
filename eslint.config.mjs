import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // vinext/Cloudflare outputs and local state:
    "dist/**",
    ".wrangler/**",
    ".vinext/**",
    "worker-configuration.d.ts",
  ]),
  // Complexity guardrails: keep functions simple and files short. If a
  // change trips these, split the function/file rather than raising the
  // limit — that's the point.
  {
    rules: {
      // McCabe cyclomatic complexity per function.
      complexity: ["error", { max: 12 }],
      // Lines per file, ignoring blanks and comments.
      "max-lines": [
        "error",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  // AIDEV-NOTE: shadcn-generated code is not hand-edited (always reinstall
  // via the shadcn CLI), so relax rules its current output trips. The
  // complexity/size limits don't apply — generated UI primitives can be
  // long, and that's fine.
  {
    files: ["components/ui/**", "hooks/use-mobile.ts"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      complexity: "off",
      "max-lines": "off",
    },
  },
]);

export default eslintConfig;
