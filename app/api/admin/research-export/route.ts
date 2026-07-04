import {
  createResearchExport,
  listResearchExports,
} from "@/lib/admin/research-export";
import { validateResearchExportInput } from "@/lib/admin/research-export-input";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  return Response.json(
    { status: "ok", exports: await listResearchExports() },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (session instanceof Response) return session;

  let input;
  try {
    input = validateResearchExportInput(await request.json());
  } catch (error) {
    return json(
      {
        status: "rejected",
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }

  const createdAt = new Date().toISOString();
  const body = await createResearchExport(session.user, input, createdAt);
  return Response.json(body, {
    status: 201,
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="senex-research-export-${createdAt.slice(
        0,
        10,
      )}.json"`,
    },
  });
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
