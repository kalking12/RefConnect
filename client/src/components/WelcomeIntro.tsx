import { useEffect } from "react";

const INTRO_DURATION_MS = 1900;

type WelcomeIntroProps = {
  onComplete: () => void;
};

export default function WelcomeIntro({ onComplete }: WelcomeIntroProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onComplete, INTRO_DURATION_MS);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(timeout);
      document.body.style.overflow = previousOverflow;
    };
  }, [onComplete]);

  return (
    <div className="welcome-intro" aria-label="Welcome to RefConnect">
      <button className="welcome-intro__skip" type="button" onClick={onComplete}>
        Skip intro <span aria-hidden="true">↗</span>
      </button>

      <div className="welcome-intro__center">
        <div className="welcome-intro__halo" aria-hidden="true" />
        <svg className="welcome-intro__path" viewBox="0 0 560 180" fill="none" aria-hidden="true">
          <path className="welcome-intro__guide" d="M64 112 C161 112 171 54 280 54 C389 54 399 112 496 112" />
          <path className="welcome-intro__line" d="M64 112 C161 112 171 54 280 54 C389 54 399 112 496 112" />
          <circle className="welcome-intro__node welcome-intro__node--first" cx="64" cy="112" r="7" />
          <circle className="welcome-intro__node welcome-intro__node--center" cx="280" cy="54" r="9" />
          <circle className="welcome-intro__node welcome-intro__node--last" cx="496" cy="112" r="7" />
        </svg>
        <p className="welcome-intro__eyebrow">Welcome to</p>
        <h1 className="welcome-intro__brand">
          <img src="/brand/refconnect-logo.png" alt="RefConnect" fetchPriority="high" />
        </h1>
        <p className="welcome-intro__tagline">A clearer path to care.</p>
      </div>
    </div>
  );
}
