import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!isLocal || request.headers.get("x-senex-test-helper") !== "admin-role") {
    return Response.json({ status: "not_found" }, { status: 404 });
  }

  const body = (await request.json()) as { email?: unknown };
  if (typeof body.email !== "string" || body.email.length === 0) {
    return Response.json(
      { status: "rejected", error: "email is required." },
      { status: 400 },
    );
  }

  await env.DB.prepare("UPDATE user SET role = 'admin' WHERE email = ?")
    .bind(body.email)
    .run();

  return Response.json({ status: "ok" });
}
