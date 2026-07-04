import type { AnonymousReportingPayload } from "@/lib/anonymous-reporting";
import type { AnonymousIdentityRecord } from "@/lib/local";

import { Button } from "../ui/button";

export type ReportingScopeType =
  | "all_existing_history"
  | "from_today"
  | "date_range";

export function ReportingScopeControls({
  scopeType,
  rangeStart,
  rangeEnd,
  disabled,
  onScopeTypeChange,
  onRangeStartChange,
  onRangeEndChange,
}: {
  scopeType: ReportingScopeType;
  rangeStart: string;
  rangeEnd: string;
  disabled: boolean;
  onScopeTypeChange: (scope: ReportingScopeType) => void;
  onRangeStartChange: (value: string) => void;
  onRangeEndChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      <label className="space-y-1">
        <span className="block font-medium">Share range</span>
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          value={scopeType}
          onChange={(event) =>
            onScopeTypeChange(event.target.value as ReportingScopeType)
          }
          disabled={disabled}
        >
          <option value="all_existing_history">All existing history</option>
          <option value="from_today">Today</option>
          <option value="date_range">Date range</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="block font-medium">From</span>
        <input
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          type="date"
          value={rangeStart}
          onChange={(event) => onRangeStartChange(event.target.value)}
          disabled={disabled || scopeType !== "date_range"}
        />
      </label>
      <label className="space-y-1">
        <span className="block font-medium">To</span>
        <input
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          type="date"
          value={rangeEnd}
          onChange={(event) => onRangeEndChange(event.target.value)}
          disabled={disabled || scopeType !== "date_range"}
        />
      </label>
    </div>
  );
}

export function ReportingControls({
  identity,
  preview,
  hasSubmittableUpload,
  disabled,
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
  preview: AnonymousReportingPayload | null;
  hasSubmittableUpload: boolean;
  disabled: boolean;
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
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button
        type="button"
        onClick={onCreateIdentity}
        disabled={controlDisabled(disabled, Boolean(identity))}
      >
        Create anonymous study ID
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onCopyStudyId}
        disabled={controlDisabled(disabled, !identity)}
      >
        Copy study ID
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onResetIdentity}
        disabled={controlDisabled(disabled, !identity)}
      >
        Reset study ID
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onSaveConsent}
        disabled={disabled}
      >
        Save reporting consent
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onBuildPayload}
        disabled={controlDisabled(disabled, !identity)}
      >
        Build reporting payload
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onQueueUpload}
        disabled={controlDisabled(disabled, !preview)}
      >
        Queue reporting upload
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onSubmitUpload}
        disabled={controlDisabled(disabled, !hasSubmittableUpload)}
      >
        Submit queued upload
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onPause}
        disabled={statusDisabled(disabled, identity, "active")}
      >
        Pause
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onResume}
        disabled={statusDisabled(disabled, identity, "paused")}
      >
        Resume
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onStop}
        disabled={stopDisabled(disabled, identity)}
      >
        Stop future sharing
      </Button>
    </div>
  );
}

function controlDisabled(disabled: boolean, blocked: boolean) {
  return disabled || blocked;
}

function statusDisabled(
  disabled: boolean,
  identity: AnonymousIdentityRecord | null,
  status: AnonymousIdentityRecord["status"],
) {
  return controlDisabled(disabled, identity?.status !== status);
}

function stopDisabled(
  disabled: boolean,
  identity: AnonymousIdentityRecord | null,
) {
  return controlDisabled(disabled, !identity || identity.status === "stopped");
}
