import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";
import { isAllowedSiteOrigin } from "./_core/origin";
import type { Request } from "express";

afterEach(() => vi.unstubAllEnvs());

describe("session cookie configuration", () => {
  it("uses Lax cookies for local HTTP development", () => {
    const req = { protocol: "http", headers: {} } as any;
    expect(getSessionCookieOptions(req)).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });

  it("uses Secure/Lax cookies behind HTTPS", () => {
    const req = {
      protocol: "https",
      headers: {},
    } as any;
    expect(getSessionCookieOptions(req)).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("requires Secure cookies in production even behind a TLS terminator", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = { protocol: "http", secure: false } as Request;
    expect(getSessionCookieOptions(req)).toMatchObject({ secure: true, sameSite: "lax" });
  });
});

describe("Google sign-in origin", () => {
  const request = (origin?: string, host = "refconnect.example") => ({
    get: (header: string) => header.toLowerCase() === "origin" ? origin : host,
  }) as Request;

  it("accepts a matching same-origin browser POST", () => {
    expect(isAllowedSiteOrigin(request("https://refconnect.example"))).toBe(true);
  });

  it("rejects cross-origin, missing-origin, and deceptive host submissions", () => {
    expect(isAllowedSiteOrigin(request("https://attacker.example"))).toBe(false);
    expect(isAllowedSiteOrigin(request())).toBe(false);
    expect(isAllowedSiteOrigin(request("https://refconnect.example.attacker.test"))).toBe(false);
  });
});
