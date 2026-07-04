import { getAnonymousDataQualityDashboard } from "@/lib/admin/data-quality";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return json({ status: "rejected", error: "Authentication required." }, 401);
  }
  if (session.user.role !== "admin") {
    return json({ status: "rejected", error: "Admin role required." }, 403);
  }

  return Response.json(await getAnonymousDataQualityDashboard(), {
    headers: { "cache-control": "no-store" },
  });
}

function json(body: object, status = 200) {
  return Response.json(body, { status });
}
