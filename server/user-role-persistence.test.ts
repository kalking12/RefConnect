import { describe, expect, it } from "vitest";
import { resolveGoogleUserRole } from "./db";

describe("Google account roles", () => {
  it("grants the sole administrator email its role regardless of letter case", () => {
    expect(resolveGoogleUserRole("Osinusikalid@GMAIL.COM")).toBe("admin");
  });

  it("assigns every other verified Google email a user role", () => {
    expect(resolveGoogleUserRole("other@gmail.com")).toBe("user");
    expect(resolveGoogleUserRole("osinusikalid@gmail.com.evil.example")).toBe("user");
  });

});
