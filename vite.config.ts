import { defineConfig } from "vite";
import vinext from "vinext";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

// AIDEV-NOTE: This config matches what `vinext deploy` auto-generates for an
// App Router project. The cloudflare() plugin runs the RSC environment inside
// workerd, which is what makes `cloudflare:workers` bindings (D1 etc.) work in
// `pnpm dev` exactly like they do in production.
export default defineConfig({
  // AIDEV-NOTE: @base-ui/react (used by the shadcn/ui components) marks its
  // modules with per-file "use client" directives. It must be excluded from
  // dependency pre-bundling so @vitejs/plugin-rsc can see those directives
  // and create client references — otherwise importing any components/ui/*
  // file from a server component crashes the RSC environment with
  // "createContext is not a function". vinext propagates this exclude into
  // its rsc/ssr/client environments.
  optimizeDeps: {
    include: [
      "use-sync-external-store/shim",
      "use-sync-external-store/shim/with-selector",
    ],
    exclude: [
      "@base-ui/react",
      "lucide-react",
      "lucide-react/dist/esm/Icon.mjs",
    ],
  },
  plugins: [
    vinext(),
    tailwindcss(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
