import { env } from "cloudflare:workers";

export function SiteFooter() {
  const appEnv = env.APP_ENV || "production";

  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex h-12 w-full max-w-5xl items-center justify-between px-4 text-xs">
        <span>Senex — private cognitive tracking</span>
        {appEnv !== "production" && (
          <span className="rounded-md border px-2 py-0.5 font-mono">
            env: {appEnv}
          </span>
        )}
      </div>
    </footer>
  );
}
