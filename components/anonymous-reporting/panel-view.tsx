import {
  CONSENT_CATEGORIES,
  categoryLabel,
  type ActiveConsentState,
  type AnonymousReportingPayload,
  type ConsentCategoryId,
} from "@/lib/anonymous-reporting";
import type {
  AnonymousIdentityRecord,
  ReportingUploadRecord,
} from "@/lib/local";

import {
  ReportingControls,
  ReportingScopeControls,
  type ReportingScopeType,
} from "./panel-controls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

type Status = "idle" | "working" | "error";
type CheckedCategories = Partial<Record<ConsentCategoryId, boolean>>;

export function AnonymousReportingPanelView({
  identity,
  activeConsent,
  uploads,
  checked,
  preview,
  status,
  message,
  scopeType,
  rangeStart,
  rangeEnd,
  controlsDisabled,
  onCheckedChange,
  onScopeTypeChange,
  onRangeStartChange,
  onRangeEndChange,
  onCreateIdentity,
  onCopyStudyId,
  onResetIdentity,
  onSaveConsent,
  onBuildPayload,
  onQueueUpload,
  onSubmitUpload,
  onPause,
  onResume,
  onStop,
}: {
  identity: AnonymousIdentityRecord | null;
  activeConsent: ActiveConsentState;
  uploads: ReportingUploadRecord[];
  checked: CheckedCategories;
  preview: AnonymousReportingPayload | null;
  status: Status;
  message: string | null;
  scopeType: ReportingScopeType;
  rangeStart: string;
  rangeEnd: string;
  controlsDisabled: boolean;
  onCheckedChange: (category: ConsentCategoryId, checked: boolean) => void;
  onScopeTypeChange: (scope: ReportingScopeType) => void;
  onRangeStartChange: (value: string) => void;
  onRangeEndChange: (value: string) => void;
  onCreateIdentity: () => void;
  onCopyStudyId: () => void;
  onResetIdentity: () => void;
  onSaveConsent: () => void;
  onBuildPayload: () => void;
  onQueueUpload: () => void;
  onSubmitUpload: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const latestUpload = uploads.at(-1) ?? null;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Anonymous reporting</CardTitle>
        <CardDescription>
          Share selected local research data under a random study ID.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <ReportingStatus
          identity={identity}
          activeConsent={activeConsent}
          uploads={uploads}
          preview={preview}
        />
        <StudyIdentity identity={identity} latestUpload={latestUpload} />
        <ReportingScopeControls
          scopeType={scopeType}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          disabled={controlsDisabled}
          onScopeTypeChange={onScopeTypeChange}
          onRangeStartChange={onRangeStartChange}
          onRangeEndChange={onRangeEndChange}
        />
        <ConsentChoices
          checked={checked}
          disabled={controlsDisabled}
          onCheckedChange={onCheckedChange}
        />
        <PayloadPreview preview={preview} />
        <ConsentHistory activeConsent={activeConsent} />
        <PanelMessage status={status} message={message} />
      </CardContent>
      <ReportingControls
        identity={identity}
        preview={preview}
        hasSubmittableUpload={uploads.some(isSubmittable)}
        disabled={controlsDisabled}
        onCreateIdentity={onCreateIdentity}
        onCopyStudyId={onCopyStudyId}
        onResetIdentity={onResetIdentity}
        onSaveConsent={onSaveConsent}
        onBuildPayload={onBuildPayload}
        onQueueUpload={onQueueUpload}
        onSubmitUpload={onSubmitUpload}
        onPause={onPause}
        onResume={onResume}
        onStop={onStop}
      />
    </Card>
  );
}

function ReportingStatus({
  identity,
  activeConsent,
  uploads,
  preview,
}: {
  identity: AnonymousIdentityRecord | null;
  activeConsent: ActiveConsentState;
  uploads: ReportingUploadRecord[];
  preview: AnonymousReportingPayload | null;
}) {
  const queuedUploads = uploads.filter((upload) => upload.status === "queued");
  return (
    <div className="grid gap-2 md:grid-cols-3">
      <StatusBlock label="Status" value={identity?.status ?? "off"} />
      <StatusBlock
        label="Consent categories"
        value={`${activeConsent.grantedCategories.length} active`}
      />
      <StatusBlock label="Queued uploads" value={`${queuedUploads.length}`} />
      <StatusBlock
        label="Sessions contributed"
        value={`${preview?.data.sessionSummaries?.length ?? 0}`}
      />
      <StatusBlock
        label="Demographics"
        value={demographicsLabel(activeConsent, preview)}
      />
    </div>
  );
}

function StudyIdentity({
  identity,
  latestUpload,
}: {
  identity: AnonymousIdentityRecord | null;
  latestUpload: ReportingUploadRecord | null;
}) {
  return (
    <div className="space-y-1">
      <p>
        {identity
          ? `Study ID: ${identity.anonymousStudyId}`
          : "Reporting is off."}
      </p>
      {latestUpload && (
        <p className="text-muted-foreground">
          Last upload: {latestUpload.status} at{" "}
          <time dateTime={latestUpload.queuedAt}>
            {new Date(latestUpload.queuedAt).toLocaleString()}
          </time>
        </p>
      )}
    </div>
  );
}

function ConsentChoices({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: CheckedCategories;
  disabled: boolean;
  onCheckedChange: (category: ConsentCategoryId, checked: boolean) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {CONSENT_CATEGORIES.map((category) => (
        <label
          key={category.id}
          className="border-input flex gap-3 rounded-md border px-3 py-2"
        >
          <input
            type="checkbox"
            checked={Boolean(checked[category.id])}
            onChange={(event) =>
              onCheckedChange(category.id, event.target.checked)
            }
            disabled={disabled}
          />
          <span>
            <span className="block font-medium">{category.label}</span>
            <span className="text-muted-foreground block">
              {category.description}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function PayloadPreview({
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

function ConsentHistory({
  activeConsent,
}: {
  activeConsent: ActiveConsentState;
}) {
  if (activeConsent.history.length === 0) return null;
  return (
    <p className="text-muted-foreground">
      Consent history: {activeConsent.history.length} local events.
    </p>
  );
}

function PanelMessage({
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

function StatusBlock({ label, value }: { label: string; value: string }) {
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

function demographicsLabel(
  activeConsent: ActiveConsentState,
  preview: AnonymousReportingPayload | null,
) {
  if (activeConsent.decisions.share_demographics !== "granted") {
    return "not shared";
  }
  return `${preview?.data.demographics?.length ?? 0} answers`;
}

function isSubmittable(upload: ReportingUploadRecord) {
  return upload.status === "queued" || upload.status === "failed";
}
