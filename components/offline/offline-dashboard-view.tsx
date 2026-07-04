import { Button } from "@/components/ui/button";
import type {
  DomainCardSummary,
  OfflineDashboardSummary,
} from "@/lib/offline-dashboard";

export function OfflineDashboardView({
  summary,
  disabled,
  onRefresh,
}: {
  summary: OfflineDashboardSummary;
  disabled: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Offline dashboard</h3>
          <p className="text-muted-foreground">
            Personal trend states stay local and conservative.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={disabled}
        >
          Refresh offline dashboard
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <StatusBlock label="Today" value={statusLabel(summary.todayStatus)} />
        <StatusBlock
          label="Baseline"
          value={stateLabel(summary.baseline.state)}
        />
        <StatusBlock
          label="Last 7 days"
          value={`${summary.completion.sevenDay.completedDays} completed days`}
        />
      </div>
      <p className="text-muted-foreground">
        Last 30 days: {summary.completion.thirtyDay.completedDays} completed
        days
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {summary.domainCards.map((card) => (
          <DomainCard key={card.domain} card={card} />
        ))}
      </div>
    </section>
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

function DomainCard({ card }: { card: DomainCardSummary }) {
  return (
    <div className="border-input rounded-md border px-3 py-2">
      <h4 className="font-medium">{card.label}</h4>
      <p className="text-muted-foreground">{card.description}</p>
      <p>{card.status}</p>
      <p>{card.trend}</p>
      <p className="text-muted-foreground">{card.confidenceLabel}</p>
      {card.lastTestedAt && (
        <p className="text-muted-foreground">
          Last tested:{" "}
          <time dateTime={card.lastTestedAt}>
            {new Date(card.lastTestedAt).toLocaleDateString()}
          </time>
        </p>
      )}
      <p className="text-muted-foreground">{card.detail}</p>
    </div>
  );
}

function statusLabel(status: OfflineDashboardSummary["todayStatus"]) {
  return status.replaceAll("_", " ");
}

function stateLabel(state: OfflineDashboardSummary["baseline"]["state"]) {
  return state.replaceAll("_", " ");
}
