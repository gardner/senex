import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Better Auth mounts all of its endpoints under /api/auth/*
// (sign-in, sign-up, sign-out, session, OAuth callbacks, ...).
export const { GET, POST } = toNextJsHandler(auth);
