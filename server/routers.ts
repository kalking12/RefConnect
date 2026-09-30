import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, LEGACY_COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { isAllowedSiteOrigin } from "./_core/origin";
import { adminProcedure, isAdmin, isOwner, ownerProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createReferral, listHospitalReadiness, listPatientProfiles, listVerifiedGoogleUsers, setGoogleUserAdmin, updateHospitalCapabilities, updateHospitalProfile } from "./db";

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user ? ({
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      pictureUrl: ctx.user.pictureUrl,
      role: isAdmin(ctx.user) ? "admin" as const : "user" as const,
      isOwner: isOwner(ctx.user),
    }) : null),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(LEGACY_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  showcase: router({
    hospitals: protectedProcedure.query(() => listHospitalReadiness()),
    profiles: protectedProcedure.query(({ ctx }) => listPatientProfiles(ctx.user.id)),
    createReferral: protectedProcedure.input(z.object({
      profileId: z.string().min(1), destinationHospitalId: z.string().min(1), surgeryTypeId: z.string().min(1),
      requestId: z.uuid(),
    })).mutation(({ ctx, input }) => createReferral(input.profileId, input.destinationHospitalId, input.surgeryTypeId, ctx.user.id, input.requestId)),
  }),
  admin: router({
    listUsers: ownerProcedure.query(() => listVerifiedGoogleUsers()),
    setUserAdmin: ownerProcedure.input(z.object({
      userId: z.number().int().positive(), isAdmin: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      if (!isAllowedSiteOrigin(ctx.req)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Administrator changes must be requested from this website" });
      }
      const result = await setGoogleUserAdmin(input.userId, input.isAdmin);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Verified Google account not found" });
      if ("error" in result) {
        if (result.error === "owner") throw new TRPCError({ code: "BAD_REQUEST", message: "The founding owner cannot be removed as an administrator" });
        throw new TRPCError({ code: "CONFLICT", message: "Administrator access changed concurrently. Refresh and try again." });
      }
      return result.account;
    }),
    updateCapabilities: adminProcedure.input(z.object({
      hospitalId: z.string().min(1),
      capabilities: z.record(z.string(), z.number().int().min(0).max(2)),
    })).mutation(({ input }) => updateHospitalCapabilities(input.hospitalId, input.capabilities)),
    updateHospitalProfile: adminProcedure.input(z.object({
      hospitalId: z.string().min(1), grade: z.number().int().min(1).max(5), facilityLevel: z.string().trim().min(2).max(128),
      ownership: z.string().trim().min(2).max(128), description: z.string().trim().min(10).max(2000),
    })).mutation(({ input }) => updateHospitalProfile(input.hospitalId, input)),
  }),
});

export type AppRouter = typeof appRouter;
