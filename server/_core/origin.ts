import type { NextFunction, Request, Response } from "express";
import { ENV } from "./env";

export function isAllowedSiteOrigin(req: Request): boolean {
  const origin = req.get("origin");
  const host = req.get("host");
  if (!origin || !host) return false;

  try {
    const parsed = new URL(origin);
    if (origin !== parsed.origin) return false;
    if (ENV.appOrigin) return origin === new URL(ENV.appOrigin).origin;
    return parsed.host === host &&
      (parsed.protocol === "https:" ||
        (process.env.NODE_ENV !== "production" && parsed.protocol === "http:"));
  } catch {
    return false;
  }
}

// The session cookie uses SameSite=Lax. A same-site sibling domain can still
// submit requests with that cookie, so protect every state-changing API call
// using the site's exact browser origin.
export function requireSameOriginApiPost(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== "POST" || isAllowedSiteOrigin(req)) {
    next();
    return;
  }
  res.status(403).json({ error: "This request must come from this website" });
}
