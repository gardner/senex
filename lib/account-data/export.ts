import { readDeletionRequests } from "./deletion-requests";
import { readAccountRecords, readSyncBatches, readSyncState } from "./records";
import { readTrialContact } from "@/lib/trial-contact/server";

export type AccountExportUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
};

export async function buildAccountExport(
  user: AccountExportUser,
  generatedAt: string,
) {
  const [syncState, syncBatches, records, deletionRequests, trialContact] =
    await Promise.all([
      readSyncState(user.id),
      readSyncBatches(user.id),
      readAccountRecords(user.id),
      readDeletionRequests(user.id),
      readTrialContact(user.id),
    ]);

  return {
    exportVersion: "account-export-v1",
    generatedAt,
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role ?? "user",
    },
    trialContact,
    syncState,
    syncBatches,
    records,
    deletionRequests,
    retentionNotes: retentionNotes(),
  };
}

function retentionNotes() {
  return [
    {
      scope: "account",
      text: "Account-linked sync records and account profile data are included in this export and can be reviewed for deletion.",
    },
    {
      scope: "research",
      text: "Already shared research submissions are not automatically removed by account deletion; they require review or exclusion handling under the research data policy.",
    },
    {
      scope: "trial_contact",
      text: "Trial-contact preferences are exported separately from synced history and research records.",
    },
    {
      scope: "local",
      text: "Local browser history is not controlled by the account server export and must be deleted on the device.",
    },
  ];
}
