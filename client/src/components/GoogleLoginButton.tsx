import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

type GoogleIdentityResponse = {
  credential: string;
};

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleIdentityResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme: "outline";
      size: "large";
      text: "signin_with";
      shape: "pill";
      width: number;
    }
  ) => void;
};

type GoogleAccounts = {
  id?: GoogleAccountsId;
};

type GoogleWindow = Window & {
  google?: {
    accounts?: GoogleAccounts;
  };
};

export default function GoogleLoginButton() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadTimeout: ReturnType<typeof setTimeout> | undefined;
    setError(null);
    setLoading(true);
    setGoogleReady(false);

    const renderGoogleButton = () => {
      if (cancelled || !buttonRef.current) {
        return;
      }

      if (!GOOGLE_CLIENT_ID) {
        setError(
          "Sign-in is temporarily unavailable. Please contact the site administrator."
        );
        setLoading(false);
        return;
      }

      const google = (window as GoogleWindow).google;
      const googleId = google?.accounts?.id;

      if (!googleId) {
        setError(
          "Google sign-in did not load. Check your connection and try again."
        );
        setLoading(false);
        return;
      }

      try {
        buttonRef.current.replaceChildren();

        googleId.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            setSubmitting(true);
            setError(null);
            const controller = new AbortController();
            const requestTimeout = window.setTimeout(
              () => controller.abort(),
              90000
            );
            try {
              const response = await fetch("/api/auth/google", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ credential }),
                signal: controller.signal,
              });

              const result = (await response.json().catch(() => null)) as {
                success?: boolean;
                error?: string;
              } | null;

              if (!response.ok || result?.success !== true) {
                throw new Error(
                  result?.error ??
                    "The sign-in server is unavailable. Please try again."
                );
              }

              // The session cookie is set by the response. A full reload makes
              // the first auth.me request use the newly issued cookie.
              window.location.reload();
            } catch (signInError) {
              setError(
                signInError instanceof DOMException &&
                  signInError.name === "AbortError"
                  ? "Sign-in took too long. Check your connection and try again."
                  : signInError instanceof TypeError
                    ? "Could not reach the sign-in server. Check your connection and try again."
                    : signInError instanceof Error
                      ? signInError.message
                      : "Google sign-in failed. Please try again."
              );
              setSubmitting(false);
            } finally {
              window.clearTimeout(requestTimeout);
            }
          },
        });

        googleId.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          width: Math.min(360, Math.max(120, buttonRef.current.clientWidth)),
        });
        setGoogleReady(true);
        setLoading(false);
      } catch (googleError) {
        console.error("Google Sign-In initialization error:", googleError);

        setError("Google sign-in could not be initialized. Please try again.");
        setLoading(false);
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    const script = existingScript ?? document.createElement("script");
    const handleScriptLoad = () => {
      clearTimeout(loadTimeout);
      renderGoogleButton();
    };
    const handleScriptError = () => {
      clearTimeout(loadTimeout);
      if (!cancelled) {
        setError(
          "Unable to load Google sign-in. Check your connection and try again."
        );
        setLoading(false);
      }
      script.remove();
    };

    if ((window as GoogleWindow).google?.accounts?.id) {
      renderGoogleButton();
    } else {
      script.addEventListener("load", handleScriptLoad);
      script.addEventListener("error", handleScriptError);
      loadTimeout = setTimeout(() => {
        if ((window as GoogleWindow).google?.accounts?.id) {
          renderGoogleButton();
        } else {
          handleScriptError();
        }
      }, 12000);

      if (!existingScript) {
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
      script.removeEventListener("load", handleScriptLoad);
      script.removeEventListener("error", handleScriptError);
    };
  }, [retryCount]);

  return (
    <div
      className="flex w-full flex-col items-start gap-2"
      aria-busy={loading || submitting}
    >
      <div
        ref={buttonRef}
        className={submitting ? "hidden" : "min-h-11 w-full"}
      />

      {(loading || submitting) && (
        <p role="status" className="text-sm leading-6 text-[#365e53]">
          {submitting
            ? "Signing in… This may take a minute. Please keep this page open."
            : "Loading Google sign-in…"}
        </p>
      )}

      {error && (
        <div className="space-y-2">
          <p role="alert" className="text-sm leading-5 text-rose-700">
            {error}
          </p>
          {GOOGLE_CLIENT_ID && !googleReady && (
            <button
              type="button"
              onClick={() => setRetryCount(count => count + 1)}
              className="min-h-11 rounded-full border border-[#b5d1c6] px-4 text-sm font-bold text-[#1a5d4e] hover:bg-[#edf7f2]"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
