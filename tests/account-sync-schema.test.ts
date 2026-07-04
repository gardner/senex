import { describe, expect, it } from "vitest";

import {
  insertRelatedRecords,
  insertSession,
  readRelatedCounts,
  readSessionRows,
  requiredColumns,
  seedAccountSyncBatch,
  tableColumns,
} from "./account-sync-schema-fixtures";

const now = "2026-07-04T00:00:00.000Z";

describe("account sync D1 schema", () => {
  it("defines append-oriented account sync tables with local identity columns", async () => {
    for (const [table, columns] of Object.entries(requiredColumns)) {
      await expectColumns(table, columns);
    }
  });

  it("preserves local IDs and timestamps while allowing same-local-ID conflicts", async () => {
    await seedAccountSyncBatch();
    await insertSession("account_session_original", "hash_original", now);
    await insertSession(
      "account_session_conflict",
      "hash_conflict",
      "2026-07-04T01:00:00.000Z",
    );

    await expect(
      insertSession("account_session_duplicate", "hash_original", now),
    ).rejects.toThrow();

    await insertRelatedRecords();

    expect(await readSessionRows()).toEqual([
      {
        local_session_id: "local_session_1",
        record_hash: "hash_conflict",
        started_at: "2026-07-04T01:00:00.000Z",
      },
      {
        local_session_id: "local_session_1",
        record_hash: "hash_original",
        started_at: now,
      },
    ]);
    expect(await readRelatedCounts()).toEqual({
      task_run_count: 1,
      trial_event_count: 1,
      score_count: 1,
      consent_count: 1,
      pending_conflict_count: 1,
    });
  });
});

async function expectColumns(table: string, columns: string[]) {
  expect(await tableColumns(table)).toEqual(expect.arrayContaining(columns));
}
