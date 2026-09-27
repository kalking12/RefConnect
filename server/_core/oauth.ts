import { COOKIE_NAME, LEGACY_COOKIE_NAME, SESSION_DURATION_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { isSessionSigningConfigured, sdk } from "./sdk";
import { OAuth2Client } from "google-auth-library";
import { ENV } from "./env";
import { logActivity } from "./activityLog";
import { isAllowedSiteOrigin } from "./origin";

const googleClient = new OAuth2Client(ENV.googleClientId || undefined);

export function registerOAuthRoutes(app: Express) {
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    res.set("Cache-Control", "private, no-store");
    if (!isAllowedSiteOrigin(req)) {
      res.status(403).json({ error: "Sign-in must be requested from this website" });
      return;
    }

    if (!req.is("application/json")) {
      res.status(415).json({ error: "Sign-in requires JSON" });
      return;
    }

    const credential =
      typeof req.body?.credential === "string" ? req.body.credential : undefined;

    if (!credential || credential.length > 10000) {
      res.status(400).json({ error: "Google credential is required" });
      return;
    }

    if (!ENV.googleClientId) {
      res.status(503).json({ error: "Google sign-in is not configured on the server" });
      return;
    }

    if (!isSessionSigningConfigured()) {
      res.status(503).json({ error: "Server session signing is not configured" });
      return;
    }

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: ENV.googleClientId,
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        res.status(401).json({ error: "Google account email must be verified" });
        return;
      }

      let user: Awaited<ReturnType<typeof db.upsertGoogleUser>>;
      try {
        user = await db.upsertGoogleUser({
          googleSub: payload.sub,
          name: payload.name ?? payload.email,
          email: payload.email,
          pictureUrl: payload.picture ?? null,
        });
      } catch (error) {
        console.error("[Google OAuth] Could not save verified account:", error);
        res.status(503).json({ error: "Sign-in is temporarily unavailable. Please try again later." });
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name,
        googleSub: payload.sub,
        expiresInMs: SESSION_DURATION_MS,
      });

      res.clearCookie(LEGACY_COOKIE_NAME, getSessionCookieOptions(req));
      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_DURATION_MS,
      });

      logActivity({
        event: "auth.google.login",
        role: user.role,
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Google OAuth] Sign-in failed:", error);
      res.status(401).json({ error: "Google sign-in could not be verified" });
    }
  });
}
