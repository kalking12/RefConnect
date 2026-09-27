import GoogleLoginButton from "@/components/GoogleLoginButton";
import { Button } from "@/components/ui/button";
import { Building2, LoaderCircle, ShieldCheck } from "lucide-react";
import { BrandLockup } from "./BrandMark";

type SignInGateProps = {
  loading?: boolean;
  error?: boolean;
  offline?: boolean;
  onRetry?: () => void;
};

/** A visual-only preview. Authenticated pages and their data hooks are never mounted here. */
function PublicAppPreview() {
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
            Find a hospital by <em>procedure.</em>
          </h2>
          <p>Review recorded capabilities before preparing a referral.</p>
        </div>
      </div>

      <div className="auth-preview__workspace">
        <div className="auth-preview__finder">
          <div className="auth-preview__procedure-pane">
            <span className="auth-preview__section-label">
              Procedure finder
            </span>
            <h3>Choose a procedure</h3>
            <div className="auth-preview__procedure-group">
              <span>Cardiac &amp; Vascular</span>
              <p>Coronary Artery Bypass Grafting</p>
              <p>Aortic Valve Replacement</p>
            </div>
          </div>
          <div className="auth-preview__result-pane">
            <span className="auth-preview__section-label">
              Selected procedure
            </span>
            <h3>Coronary Artery Bypass Grafting</h3>
            <p>
              Compare active hospitals by recorded readiness and capabilities.
            </p>
            <div className="auth-preview__result-detail">
              <Building2 size={20} aria-hidden="true" />
              <span>Hospital results available after sign-in</span>
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
  return (
    <main className="investor-auth-shell auth-screen relative isolate min-h-screen overflow-hidden text-[#173d36]">
      <PublicAppPreview />
      <div className="auth-screen__veil" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:justify-end lg:pr-[min(9vw,9rem)]">
        <div className="auth-screen__dialog w-full max-w-[460px] rounded-[2rem] border border-[#d9e8e2] bg-white p-7 shadow-[0_36px_100px_-32px_rgba(13,60,51,.4)] sm:p-10">
          <BrandLockup className="h-16 w-[225px] max-w-full" />
          <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e1f1ea] text-[#0b746b]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-5 font-display text-[25px] leading-tight sm:text-[28px]">
            {offline ? "Reconnect to continue" : "Sign in or create an account"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#526e65]">
            {offline
              ? "We can’t check your session while offline. This page will continue automatically when you reconnect."
              : "Continue with Google. Your RefConnect account is created automatically on your first sign-in."}
          </p>
          <div className="mt-7" aria-live="polite">
            {offline ? (
              <p role="status" className="text-sm text-[#526e65]">
                Waiting for a connection…
              </p>
            ) : loading ? (
              <div className="flex items-center gap-3 text-sm text-[#51746a]">
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
                    className="min-h-11 rounded-full bg-[#0b746b] hover:bg-[#075d57]"
                  >
                    Try again
                  </Button>
                )}
              </div>
            ) : (
              <GoogleLoginButton />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
