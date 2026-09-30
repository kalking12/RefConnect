import GoogleLoginButton from "@/components/GoogleLoginButton";
import { Button } from "@/components/ui/button";
import { SURGERY_TYPES } from "@shared/readiness";
import { Building2, LoaderCircle, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { BrandLockup } from "./BrandMark";

type SignInGateProps = {
  loading?: boolean;
  error?: boolean;
  offline?: boolean;
  onRetry?: () => void;
};

/** A visual-only preview. Protected data hooks are never mounted here. */
function PublicAppPreview({
  isAdmin,
  procedure,
}: {
  isAdmin: boolean;
  procedure: (typeof SURGERY_TYPES)[number] | null;
}) {
  return (
    <div className="auth-preview" inert aria-hidden="true">
      <div className="auth-preview__nav">
        <div className="auth-preview__brand">
          <BrandLockup className="h-12 w-[180px]" />
        </div>
      </div>

      <div className="auth-preview__hero">
        <picture>
          <source srcSet="/preview/hero-clinicians.webp" type="image/webp" />
          <img
            src="/preview/hero-clinicians.png"
            alt=""
            width="1254"
            height="1254"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        </picture>
        <div className="auth-preview__hero-content">
          <span className="auth-preview__eyebrow">
            <ShieldCheck size={15} /> Capability-led referral decisions
          </span>
          <h2>
            {isAdmin ? (
              <>
                Manage hospital <em>readiness.</em>
              </>
            ) : (
              <>
                Find a hospital by <em>procedure.</em>
              </>
            )}
          </h2>
          <p>
            {isAdmin
              ? "Update capabilities and manage access after administrator sign-in."
              : "Review recorded capabilities before preparing a referral."}
          </p>
        </div>
      </div>

      <div className="auth-preview__workspace">
        <div className="auth-preview__finder">
          <div className="auth-preview__procedure-pane">
            <span className="auth-preview__section-label">
              {isAdmin ? "Administrator workspace" : "Procedure finder"}
            </span>
            <h3>
              {isAdmin ? "Hospital capabilities" : "Your selected procedure"}
            </h3>
            <div className="auth-preview__procedure-group">
              <span>{isAdmin ? "Access controlled" : procedure?.specialty ?? "Procedure not chosen"}</span>
              <p>
                {isAdmin
                  ? "Administrator access is granted by an existing administrator."
                  : procedure?.name ?? "Choose a procedure to see ranked hospitals."}
              </p>
            </div>
          </div>
          <div className="auth-preview__result-pane">
            <span className="auth-preview__section-label">
              {isAdmin ? "Role management" : "Hospital readiness"}
            </span>
            <h3>{isAdmin ? "Authorized changes" : procedure?.name ?? "Find hospital readiness"}</h3>
            <p>
              {isAdmin
                ? "Edit hospital information and administrator roles after your access is verified."
                : "Compare active hospitals by recorded readiness and capabilities."}
            </p>
            <div className="auth-preview__result-detail">
              <Building2 size={20} aria-hidden="true" />
              <span>
                {isAdmin
                  ? "Admin workspace available after sign-in"
                  : "Hospital results available after sign-in"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInGate({
  loading = false,
  error = false,
  offline = false,
  onRetry,
}: SignInGateProps) {
  const [location] = useLocation();
  const isAdmin = location === "/admin";
  const requestedProcedure = new URLSearchParams(window.location.search).get(
    "procedure"
  );
  const procedure =
    SURGERY_TYPES.find(item => item.id === requestedProcedure) ?? null;

  return (
    <main className="investor-auth-shell auth-screen relative isolate min-h-screen overflow-hidden text-[#193449]">
      <PublicAppPreview isAdmin={isAdmin} procedure={procedure} />
      <div className="auth-screen__veil" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:justify-end lg:pr-[min(9vw,9rem)]">
        <div className="auth-screen__dialog w-full max-w-[460px] rounded-[2rem] border border-[#d4e3ed] bg-white p-7 sm:p-10">
          <BrandLockup className="h-16 w-[225px] max-w-full" />
          <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5f4fd] text-[#086aa9]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-5 font-display text-[25px] leading-tight sm:text-[28px]">
            {offline
              ? "Reconnect to continue"
              : isAdmin
                ? "Sign in to manage RefConnect"
                : "Sign in to view hospital readiness"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#526b7c]">
            {offline
              ? "We can’t check your session while offline. This page will continue automatically when you reconnect."
              : isAdmin
                ? "Continue with a verified Google account. An existing administrator must grant you administrator access before you can make changes."
                : procedure
                  ? `Continue with Google to compare hospitals for ${procedure.name}. Your account is created on your first sign-in, and this procedure stays selected.`
                  : "Continue with Google to choose a procedure and compare hospital readiness. Your account is created on your first sign-in."}
          </p>
          <div className="mt-7" aria-live="polite">
            {offline ? (
              <p role="status" className="text-sm text-[#526b7c]">
                Waiting for a connection…
              </p>
            ) : loading ? (
              <div className="flex items-center gap-3 text-sm text-[#526b7c]">
                <LoaderCircle
                  className="h-5 w-5 animate-spin"
                  aria-hidden="true"
                />
                Checking your session…
              </div>
            ) : error ? (
              <div className="space-y-3">
                <p role="alert" className="text-sm text-rose-700">
                  We could not check your session. Please try again.
                </p>
                {onRetry && (
                  <Button
                    type="button"
                    onClick={onRetry}
                    className="min-h-11 rounded-full bg-[#086aa9] text-white hover:bg-[#075684]"
                  >
                    Try again
                  </Button>
                )}
              </div>
            ) : (
              <GoogleLoginButton />
            )}
          </div>
          <Link
            href={isAdmin ? "/" : "/#find"}
            className="mt-7 inline-flex min-h-11 items-center text-sm font-semibold text-[#086aa9] hover:underline"
          >
            {isAdmin ? "Back to RefConnect" : "Back to surgery finder"}
          </Link>
        </div>
      </div>
    </main>
  );
}
