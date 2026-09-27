import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request): boolean {
  return process.env.NODE_ENV === "production" || req.secure === true || req.protocol === "https";
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
  };
}
