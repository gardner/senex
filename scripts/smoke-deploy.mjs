#!/usr/bin/env node

const baseUrl = normalizeBaseUrl(
  process.env.SMOKE_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL,
);

const checks = [
  {
    name: "home page",
    path: "/",
    pattern: /Welcome to Senex/,
  },
  {
    name: "sign-in page",
    path: "/sign-in",
    pattern: /Sign in/,
  },
  {
    name: "sign-up page",
    path: "/sign-up",
    pattern: /Create an account/,
  },
  {
    name: "forgot-password page",
    path: "/forgot-password",
    pattern: /Forgot your password\?/,
  },
  {
    name: "reset-password missing-token page",
    path: "/reset-password",
    pattern: /This reset link isn't valid/,
  },
];

try {
  for (const check of checks) {
    await runCheck(check);
  }
  console.log(`Smoke checks passed for ${baseUrl.origin}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function normalizeBaseUrl(rawUrl) {
  if (!rawUrl) {
    throw new Error(
      "SMOKE_BASE_URL is required, for example: SMOKE_BASE_URL=http://localhost:3000 pnpm smoke:deploy",
    );
  }

  try {
    const url = new URL(rawUrl);
    url.pathname = url.pathname.endsWith("/")
      ? url.pathname
      : `${url.pathname}/`;
    return url;
  } catch {
    throw new Error(`SMOKE_BASE_URL is not a valid URL: ${rawUrl}`);
  }
}

async function runCheck({ name, path, pattern }) {
  const url = new URL(path, baseUrl);
  const response = await fetch(url, {
    headers: { accept: "text/html" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `${name} failed: ${url.href} returned ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.text();
  if (!pattern.test(body)) {
    throw new Error(`${name} failed: ${url.href} did not contain ${pattern}`);
  }

  console.log(`ok - ${name}`);
}
