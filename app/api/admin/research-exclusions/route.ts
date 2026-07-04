import {
  applyResearchExclusion,
  listResearchExclusionEvents,
  ResearchExclusionError,
  validateResearchExclusionInput,
} from "@/lib/admin/research-exclusions";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  return Response.json(
    { status: "ok", events: await listResearchExclusionEvents() },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  let input;
  try {
    input = validateResearchExclusionInput(await request.json());
  } catch (error) {
    return json(
      {
        status: "rejected",
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }

  try {
    return Response.json(
      await applyResearchExclusion(
        session.user,
        input,
        new Date().toISOString(),
      ),
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ResearchExclusionError) {
      return json({ status: "rejected", error: error.message }, error.status);
    }
    throw error;
  }
}

async function requireAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return json({ status: "rejected", error: "Authentication required." }, 401);
  }
  if (session.user.role !== "admin") {
    return json({ status: "rejected", error: "Admin role required." }, 403);
  }
  return session;
}

function json(body: object, status = 200) {
  return Response.json(body, { status });
}
