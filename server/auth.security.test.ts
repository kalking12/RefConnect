import express, { type Request } from "express";
import { OAuth2Client } from "google-auth-library";
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { COOKIE_NAME, LEGACY_COOKIE_NAME } from "../shared/const";
import type { User } from "../drizzle/schema";

const dbMocks = vi.hoisted(() => ({
  getUserByOpenId: vi.fn(),
  upsertGoogleUser: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { ENV } from "./_core/env";
import { registerOAuthRoutes } from "./_core/oauth";
import { requireSameOriginApiPost } from "./_core/origin";
import { sdk } from "./_core/sdk";

const originalEnv = { ...ENV };
const secret = "test-only-random-secret-at-least-32-bytes-long";
const user = {
  id: 1,
  openId: "google:sub-1",
  googleSub: "sub-1",
  name: "Verified Person",
  email: "person@example.com",
  pictureUrl: null,
  loginMethod: "google",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} satisfies User;

function cookieRequest(token: string): Request {
  return { headers: { cookie: `${COOKIE_NAME}=${token}` } } as Request;
}

async function startApp(register: (app: express.Express) => void) {
  const app = express();
  app.use(express.json());
  register(app);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test server address");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

beforeEach(() => {
  ENV.cookieSecret = secret;
  ENV.googleClientId = "test-google-client-id";
  ENV.appOrigin = "";
  ENV.sheetWebhookUrl = "";
  dbMocks.getUserByOpenId.mockReset();
  dbMocks.upsertGoogleUser.mockReset();
});

afterEach(() => {
  Object.assign(ENV, originalEnv);
  vi.restoreAllMocks();
});

describe("verified Google session", () => {
  it("rejects legacy signed sessions without the verified Google claim", async () => {
    const token = await new SignJWT({ openId: user.openId, name: user.name })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(secret));

    expect(await sdk.verifySession(token)).toBeNull();
    await expect(sdk.authenticateRequest(cookieRequest(token))).rejects.toThrow();
    expect(dbMocks.getUserByOpenId).not.toHaveBeenCalled();
  });

  it("requires the signed Google sub to match the persisted Google identity", async () => {
    const token = await sdk.createSessionToken(user.openId, { name: user.name!, googleSub: user.googleSub! });
    dbMocks.getUserByOpenId.mockResolvedValue({ ...user, googleSub: "different-sub" });
    await expect(sdk.authenticateRequest(cookieRequest(token))).rejects.toThrow();

    dbMocks.getUserByOpenId.mockResolvedValue({ ...user, loginMethod: "legacy" });
    await expect(sdk.authenticateRequest(cookieRequest(token))).rejects.toThrow();

    dbMocks.getUserByOpenId.mockResolvedValue(user);
    await expect(sdk.authenticateRequest(cookieRequest(token))).resolves.toEqual(user);
  });

  it("rejects the example JWT secret instead of issuing a predictable session", async () => {
    ENV.cookieSecret = "replace-with-a-long-random-secret";
    await expect(sdk.createSessionToken(user.openId, { name: user.name!, googleSub: user.googleSub! })).rejects.toThrow("JWT_SECRET");
  });
});

describe("Google sign-in endpoint", () => {
  it("rejects a POST without Origin before verifying the credential", async () => {
    const verify = vi.spyOn(OAuth2Client.prototype, "verifyIdToken");
    const { server, origin } = await startApp(registerOAuthRoutes);
    try {
      const response = await fetch(`${origin}/api/auth/google`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential: "sample" }),
      });
      expect(response.status).toBe(403);
      expect(verify).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });

  it("rejects a form-encoded credential even when its Origin matches", async () => {
    const verify = vi.spyOn(OAuth2Client.prototype, "verifyIdToken");
    const { server, origin } = await startApp(registerOAuthRoutes);
    try {
      const response = await fetch(`${origin}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: origin },
        body: "credential=sample",
      });
      expect(response.status).toBe(415);
      expect(verify).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
    }
  });

  it("rejects an unverified Google email and signs in a verified one", async () => {
    const verify = vi.spyOn(OAuth2Client.prototype, "verifyIdToken");
    verify.mockResolvedValueOnce({ getPayload: () => ({ sub: "sub-1", email: user.email, email_verified: false }) } as any);
    verify.mockResolvedValueOnce({ getPayload: () => ({ sub: "sub-1", email: user.email, email_verified: true, name: user.name }) } as any);
    dbMocks.upsertGoogleUser.mockResolvedValue({ openId: user.openId, name: user.name, role: "user" });
    const { server, origin } = await startApp(registerOAuthRoutes);
    try {
      const post = () => fetch(`${origin}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({ credential: "sample" }),
      });
      const rejected = await post();
      expect(rejected.status).toBe(401);
      expect(dbMocks.upsertGoogleUser).not.toHaveBeenCalled();

      const accepted = await post();
      expect(accepted.status).toBe(200);
      expect(dbMocks.upsertGoogleUser).toHaveBeenCalledOnce();
      const cookies = accepted.headers.get("set-cookie") ?? "";
      expect(cookies).toContain(COOKIE_NAME);
      expect(cookies).toContain(LEGACY_COOKIE_NAME);
      expect(accepted.headers.get("cache-control")).toContain("no-store");
    } finally {
      await closeServer(server);
    }
  });

  it("reports persistence failures separately from Google verification failures", async () => {
    vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({
      getPayload: () => ({ sub: "sub-1", email: user.email, email_verified: true, name: user.name }),
    } as any);
    dbMocks.upsertGoogleUser.mockRejectedValue(new Error("Database unavailable"));
    const { server, origin } = await startApp(registerOAuthRoutes);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = await fetch(`${origin}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({ credential: "sample" }),
      });
      expect(response.status).toBe(503);
      expect(response.headers.get("set-cookie")).toBeNull();
    } finally {
      consoleError.mockRestore();
      await closeServer(server);
    }
  });
});

describe("state-changing API request origin", () => {
  it("blocks missing or foreign Origin before a mutation reaches its route", async () => {
    const mutation = vi.fn();
    const { server, origin } = await startApp((app) => {
      app.use("/api/trpc", requireSameOriginApiPost, (_req, res) => {
        mutation();
        res.json({ success: true });
      });
    });
    try {
      for (const requestOrigin of [undefined, "https://foreign.example"]) {
        const response = await fetch(`${origin}/api/trpc/admin.updateCapabilities`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(requestOrigin ? { Origin: requestOrigin } : {}) },
          body: JSON.stringify({}),
        });
        expect(response.status).toBe(403);
      }
      expect(mutation).not.toHaveBeenCalled();

      const accepted = await fetch(`${origin}/api/trpc/admin.updateCapabilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({}),
      });
      expect(accepted.status).toBe(200);
      expect(mutation).toHaveBeenCalledOnce();
    } finally {
      await closeServer(server);
    }
  });
});
