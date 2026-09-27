import { ADMIN_EMAIL, NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { logActivity } from "./activityLog";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

// Log only event names and roles; the activity sheet must not receive patient
// identifiers, mutation input, or account details.
const logMutations = t.middleware(async (opts) => {
  const result = await opts.next();
  if (opts.type === "mutation") {
    logActivity({
      event: opts.path,
      role: opts.ctx.user ? (isAdmin(opts.ctx.user) ? "admin" : "user") : null,
    });
  }
  return result;
});

export const publicProcedure = t.procedure.use(logMutations);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireUser);

function isVerifiedGoogleAccount(user: NonNullable<TrpcContext["user"]>): boolean {
  return user.loginMethod === "google" && Boolean(user.googleSub && user.email);
}

export function isOwner(user: NonNullable<TrpcContext["user"]>): boolean {
  return isVerifiedGoogleAccount(user) && user.email!.trim().toLowerCase() === ADMIN_EMAIL;
}

export function isAdmin(user: NonNullable<TrpcContext["user"]>): boolean {
  return isVerifiedGoogleAccount(user) &&
    (isOwner(user) || (user.role === "admin" && Boolean(user.adminApprovedAt)));
}

export const adminProcedure = publicProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !isAdmin(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Additional administrators may edit hospitals; only the founding owner may
// grant or remove administrator access.
export const ownerProcedure = publicProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || !isOwner(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
