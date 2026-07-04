import {
  categoryLabel,
  type AnonymousReportingPayload,
} from "@/lib/anonymous-reporting";

type Status = "idle" | "working" | "error";

export function PayloadPreview({
  preview,
}: {
  preview: AnonymousReportingPayload | null;
}) {
  if (!preview) return null;
  return (
    <div className="border-input rounded-md border px-3 py-2">
      <p>{previewLabel(preview)}</p>
      <p className="text-muted-foreground">
        Idempotency key: {preview.idempotencyKey}
      </p>
    </div>
  );
}

export function PanelMessage({
  status,
  message,
}: {
  status: Status;
  message: string | null;
}) {
  if (!message) return null;
  return (
    <p
      className={
        status === "error" ? "text-destructive" : "text-muted-foreground"
      }
    >
      {message}
    </p>
  );
}

export function StatusBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-input rounded-md border px-3 py-2">
      <p>
        {label}: {value}
      </p>
    </div>
  );
}

function previewLabel(preview: AnonymousReportingPayload) {
  if (preview.includedCategories.length === 0) {
    return "Payload includes: no categories";
  }
  return `Payload includes: ${preview.includedCategories
    .map(categoryLabel)
    .join(", ")}`;
}
