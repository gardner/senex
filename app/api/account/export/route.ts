import {
  buildAccountExport,
  recordAccountExportAudit,
} from "@/lib/account-data/export";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json(
      { status: "rejected", error: "Authentication required." },
      { status: 401 },
    );
  }

  const generatedAt = new Date().toISOString();
  const body = await buildAccountExport(session.user, generatedAt);
  await recordAccountExportAudit(session.user.id, body, generatedAt);
  return Response.json(body, {
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="senex-account-export-${generatedAt.slice(
        0,
        10,
      )}.json"`,
    },
  });
}
