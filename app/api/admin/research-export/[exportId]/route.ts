import { getResearchExportManifest } from "@/lib/admin/research-export";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  context: { params: Promise<{ exportId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return json({ status: "rejected", error: "Authentication required." }, 401);
  }
  if (session.user.role !== "admin") {
    return json({ status: "rejected", error: "Admin role required." }, 403);
  }

  const { exportId } = await context.params;
  const manifest = await getResearchExportManifest(exportId);
  if (!manifest) {
    return json({ status: "rejected", error: "Export not found." }, 404);
  }
  return Response.json(
    { status: "ok", manifest },
    { headers: { "cache-control": "no-store" } },
  );
}

function json(body: object, status = 200) {
  return Response.json(body, { status });
}
