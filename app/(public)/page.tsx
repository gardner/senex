import Link from "next/link";

import { AnonymousReportingPanel } from "@/components/anonymous-reporting-panel";
import { BackupRestorePanel } from "@/components/backup-restore-panel";
import { CognitiveTaskPanel } from "@/components/cognitive-task-panel";
import { OfflineModePanel } from "@/components/offline-mode-panel";
import { ResearchQuestionnairesPanel } from "@/components/research-questionnaires-panel";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <section className="py-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to Senex
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Senex is a Cloudflare-native starter app. It runs on Cloudflare
          Workers, stores data in Cloudflare D1, and signs users in with Better
          Auth — a clean foundation to build your own product on, shipped
          through pull requests.
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/sign-up" className={buttonVariants()}>
            Create an account
          </Link>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline" })}
          >
            Go to the dashboard
          </Link>
        </div>
      </section>

      <section className="py-4">
        <OfflineModePanel />
      </section>

      <section className="py-4">
        <BackupRestorePanel />
      </section>

      <section className="py-4">
        <CognitiveTaskPanel />
      </section>

      <section className="py-4">
        <ResearchQuestionnairesPanel />
      </section>

      <section className="py-4">
        <AnonymousReportingPanel />
      </section>

      <section className="grid gap-4 py-8 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Start with the docs</CardTitle>
            <CardDescription>Run it locally, then ship.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Open <code className="font-mono">README.md</code> and the{" "}
            <code className="font-mono">docs/</code> folder. They cover
            installing the tools, running this app locally, and the stack it is
            built on.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Make a change</CardTitle>
            <CardDescription>Small and safe, on a branch.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Try editing this page&apos;s text in{" "}
            <code className="font-mono">app/(public)/page.tsx</code>, then
            commit, push, and open a pull request.{" "}
            <code className="font-mono">docs/common-commands.md</code> lists the
            commands you need.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deploys are automatic</CardTitle>
            <CardDescription>GitHub → Cloudflare Workers.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Merging a pull request to <code className="font-mono">main</code>{" "}
            deploys to production. See{" "}
            <code className="font-mono">docs/deployment.md</code>.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
