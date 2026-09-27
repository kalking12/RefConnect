import { COOKIE_NAME, SESSION_DURATION_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  name: string;
  googleSub: string;
  provider: "google";
  emailVerified: true;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

function getSessionSecret() {
  if (!isSessionSigningConfigured()) {
    throw new Error("JWT_SECRET must be a unique random value of at least 32 bytes");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function isSessionSigningConfigured(): boolean {
  return new TextEncoder().encode(ENV.cookieSecret).length >= 32 &&
    ENV.cookieSecret !== "replace-with-a-long-random-secret";
}

class SessionService {
  async createSessionToken(
    openId: string,
    options: { googleSub: string; name: string; expiresInMs?: number },
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        name: options.name,
        googleSub: options.googleSub,
        provider: "google",
        emailVerified: true,
      },
      options,
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {},
  ): Promise<string> {
    if (!isNonEmptyString(payload.openId) || !isNonEmptyString(payload.name) ||
        !isNonEmptyString(payload.googleSub) || payload.provider !== "google" ||
        payload.emailVerified !== true) {
      throw new Error("A verified Google identity is required for a session");
    }
    const expiresInMs = options.expiresInMs ?? SESSION_DURATION_MS;
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

    return new SignJWT({
      openId: payload.openId,
      name: payload.name,
      googleSub: payload.googleSub,
      provider: payload.provider,
      emailVerified: payload.emailVerified,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(getSessionSecret());
  }

  async verifySession(
    cookieValue: string | undefined | null,
  ): Promise<SessionPayload | null> {
    if (!cookieValue) return null;

    try {
      const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
        algorithms: ["HS256"],
      });
      const { openId, name, googleSub, provider, emailVerified } = payload as Record<string, unknown>;

      if (!isNonEmptyString(openId) || !isNonEmptyString(name) ||
          !isNonEmptyString(googleSub) || provider !== "google" ||
          emailVerified !== true) return null;

      return { openId, name, googleSub, provider, emailVerified };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const sessionToken = cookies[COOKIE_NAME];

    if (!sessionToken) {
      throw ForbiddenError("Invalid session cookie");
    }

    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const user = await db.getUserByOpenId(session.openId);
    if (!user || user.googleSub !== session.googleSub ||
        user.loginMethod !== "google" || !user.email) {
      throw ForbiddenError("Verified Google user not found");
    }

    return user;
  }
}

export const sdk = new SessionService();
