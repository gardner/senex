"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createLocalExportDownload,
  createLocalExportEnvelope,
  previewLocalImportText,
  restoreLocalExportEnvelope,
  type LocalExportDownload,
  type LocalImportMode,
  type LocalImportPreview,
} from "@/lib/local";

type Status = "idle" | "working" | "complete" | "error";

export function BackupRestorePanel() {
  const [preview, setPreview] = useState<LocalImportPreview | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [preparedDownload, setPreparedDownload] =
    useState<LocalExportDownload | null>(null);
  const manualJsonRef = useRef<HTMLTextAreaElement>(null);

  async function handleDownload() {
    try {
      setStatus("working");
      setMessage(null);
      const envelope = await createLocalExportEnvelope();
      preparedDownload?.revoke();
      setPreparedDownload(createLocalExportDownload(envelope));
      setStatus("complete");
      setMessage("Backup file is ready.");
    } catch (caught) {
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  useEffect(() => {
    return () => preparedDownload?.revoke();
  }, [preparedDownload]);

  async function handleFileInput(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    await previewImportText(await file.text());
  }

  async function previewImportText(text: string) {
    try {
      setStatus("working");
      setMessage(null);
      setPreview(await previewLocalImportText(text));
      setStatus("idle");
    } catch (caught) {
      setPreview(null);
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleRestore(mode: LocalImportMode) {
    if (!preview) return;
    if (mode === "replace" && !confirmReplace()) return;
    try {
      setStatus("working");
      setMessage(null);
      await restoreLocalExportEnvelope(preview.envelope, { mode });
      setStatus("complete");
      setMessage(`Import complete: ${preview.counts.sessions} sessions.`);
      setPreview(null);
    } catch (caught) {
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleManualPreview() {
    await previewImportText(manualJsonRef.current?.value ?? "");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">JSON backup</CardTitle>
        <CardDescription>
          Keep a private file copy of local history or restore a previous Senex
          backup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleDownload}
            disabled={status === "working"}
          >
            Download JSON backup
          </Button>
          {preparedDownload && (
            <a
              className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              href={preparedDownload.url}
              download={preparedDownload.fileName}
              onClick={() => setMessage("Backup download started.")}
            >
              Save prepared backup
            </a>
          )}
          <label className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors">
            Import backup file
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={handleFileInput}
              onInput={handleFileInput}
            />
          </label>
        </div>

        <div className="space-y-2">
          <label htmlFor="backup-json" className="font-medium">
            Backup JSON
          </label>
          <textarea
            id="backup-json"
            ref={manualJsonRef}
            className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleManualPreview()}
            disabled={status === "working"}
          >
            Preview pasted backup
          </Button>
        </div>

        {preview && <ImportPreview preview={preview} />}
        {message && (
          <p
            className={
              status === "error" ? "text-destructive" : "text-muted-foreground"
            }
          >
            {message}
          </p>
        )}
      </CardContent>
      {preview && (
        <CardFooter className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleRestore("merge")}>
            Merge backup
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleRestore("replace")}
          >
            Replace local history
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function ImportPreview({ preview }: { preview: LocalImportPreview }) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">Import preview</h3>
      <div className="grid gap-1 sm:grid-cols-2">
        <PreviewItem label="Sessions" value={preview.counts.sessions} />
        <PreviewItem label="Task runs" value={preview.counts.taskRuns} />
        <PreviewItem label="Trial events" value={preview.counts.trialEvents} />
        <PreviewItem label="Scores" value={preview.counts.scores} />
      </div>
      <p className="text-muted-foreground">
        This preview has not changed local data.
      </p>
      {preview.localImpact.duplicateSessions > 0 && (
        <p>
          Merge will update {preview.localImpact.duplicateSessions} existing
          sessions with matching IDs.
        </p>
      )}
      <p className="text-destructive">
        Replace local history deletes current local records before restoring
        this backup.
      </p>
    </div>
  );
}

function PreviewItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      {label}: {value}
    </div>
  );
}

function confirmReplace() {
  return window.confirm(
    "Replace local history? Current local records will be deleted before this backup is restored.",
  );
}
