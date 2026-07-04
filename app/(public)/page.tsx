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
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <section className="grid gap-8 py-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            No account needed.
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance">
            Start with a quick cognitive check
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
            Run a short attention, memory, or reaction task in your browser.
            Your first result stays on this device. If Senex feels useful, save
            your history afterward with a JSON backup or an account.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href="#task-battery" className={buttonVariants()}>
              Start a quick check
            </a>
            <a
              href="#save-history"
              className={buttonVariants({ variant: "outline" })}
            >
              Save it later
            </a>
            <Link
              href="/sign-up"
              className={buttonVariants({ variant: "ghost" })}
            >
              Create an account
            </Link>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
          <FunnelStep
            step="1"
            title="Try it"
            body="Pick a task and get a local result before deciding anything."
          />
          <FunnelStep
            step="2"
            title="Keep control"
            body="Nothing uploads just because you ran a task."
          />
          <FunnelStep
            step="3"
            title="Save if useful"
            body="Download JSON for offline backup or sign up for continuity."
          />
        </div>
      </section>

      <section id="task-battery" className="scroll-mt-16 py-4">
        <CognitiveTaskPanel />
      </section>

      <section id="save-history" className="scroll-mt-16 py-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Save it after it proves useful.
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
            Senex starts offline so there is no signup wall. Once there is
            history worth keeping, choose the lightest persistence option that
            fits how you want to use it.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Stay offline</CardTitle>
              <CardDescription>No upload, no account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Keep testing privately in this browser and build a local
                baseline first.
              </p>
              <a
                href="#offline-mode"
                className={buttonVariants({ variant: "outline" })}
              >
                Open offline controls
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Download JSON</CardTitle>
              <CardDescription>Portable backup, still private.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Save a file copy of local history so clearing browser data is
                not the end of the record.
              </p>
              <a href="#json-backup" className={buttonVariants()}>
                Prepare backup
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Create an account</CardTitle>
              <CardDescription>
                For continuity and research controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Keep history available beyond one browser and manage sharing
                choices with a signed-in profile.
              </p>
              <Link href="/sign-up" className={buttonVariants()}>
                Create an account
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="offline-mode" className="scroll-mt-16 py-4">
        <OfflineModePanel />
      </section>

      <section className="py-4">
        <BackupRestorePanel />
      </section>

      <section className="grid gap-4 py-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Build your range</CardTitle>
            <CardDescription>One score is not the story.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Repeated sessions help separate normal variation, practice effects,
            and days that deserve a closer look.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>No medical claims</CardTitle>
            <CardDescription>Personal trends only.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Senex tracks repeatable performance patterns and avoids medical
            conclusions it cannot support.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Share deliberately</CardTitle>
            <CardDescription>Consent controls the path.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            Contribute selected data for research later, using a study ID and
            clear controls for what gets included.
          </CardContent>
        </Card>
      </section>

      <section className="py-4">
        <ResearchQuestionnairesPanel />
      </section>

      <section className="py-4">
        <AnonymousReportingPanel />
      </section>
    </div>
  );
}

function FunnelStep({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="grid grid-cols-[2rem_1fr] gap-3">
      <div className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground">
        {step}
      </div>
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="text-muted-foreground mt-1 leading-6">{body}</p>
      </div>
    </div>
  );
}
