import type { ExportableLocalRecords } from "@/lib/local/export-schema";

type AccountSyncRecordCounts = {
  sessions: number;
  taskRuns: number;
  trialEvents: number;
  scores: number;
  consentEvents: number;
};

export function AccountSyncRecordCounts({
  counts,
}: {
  counts: AccountSyncRecordCounts;
}) {
  return (
    <div className="border-input grid gap-3 rounded-md border p-4 md:grid-cols-5">
      <HistoryCount label="local session" count={counts.sessions} />
      <HistoryCount label="task run" count={counts.taskRuns} />
      <HistoryCount label="trial event" count={counts.trialEvents} />
      <HistoryCount label="score" count={counts.scores} />
      <HistoryCount label="consent event" count={counts.consentEvents} />
    </div>
  );
}

export function countAccountSyncRecords(
  records: ExportableLocalRecords | null,
): AccountSyncRecordCounts {
  return {
    sessions: records?.sessions.length ?? 0,
    taskRuns: records?.taskRuns.length ?? 0,
    trialEvents: records?.trialEvents.length ?? 0,
    scores: records?.scores.length ?? 0,
    consentEvents: records?.consentRecords.length ?? 0,
  };
}

function HistoryCount({ count, label }: { count: number; label: string }) {
  const plural = count === 1 ? label : `${label}s`;
  return (
    <div>
      <p className="text-2xl font-semibold">{count}</p>
      <p className="text-muted-foreground text-sm">
        {count} {plural}
      </p>
    </div>
  );
}
