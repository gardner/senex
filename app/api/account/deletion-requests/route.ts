import {
  createAccountDeletionRequest,
  readOpenDeletionRequest,
} from "@/lib/account-data/deletion-requests";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return json({ status: "rejected", error: "Authentication required." }, 401);
  }

  const existing = await readOpenDeletionRequest(session.user.id);
  if (existing) {
    return json({ status: "existing", deletionRequest: existing });
  }

  return json(
    {
      status: "accepted",
      deletionRequest: await createAccountDeletionRequest(session.user.id),
    },
    201,
  );
}

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
