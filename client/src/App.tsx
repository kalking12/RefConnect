import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import SignInGate from "./components/SignInGate";
import WelcomeIntro from "./components/WelcomeIntro";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));

const WELCOME_SEEN_KEY = "refconnect-welcome-seen";

function shouldShowWelcome() {
  try {
    return (
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      window.sessionStorage.getItem(WELCOME_SEEN_KEY) !== "1"
    );
  } catch {
    return false;
  }
}

function Router() {
  const { user, loading, sessionPaused, error, refresh } = useAuth();
  const [showWelcome, setShowWelcome] = useState(shouldShowWelcome);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const contentRef = useRef<HTMLDivElement>(null);
  const moveFocusAfterWelcome = useRef(false);
  const completeWelcome = useCallback(() => {
    moveFocusAfterWelcome.current = Boolean(
      document.activeElement?.closest(".welcome-intro")
    );
    try {
      window.sessionStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {
      // Storage can be disabled; the current visit can still continue.
    }
    setShowWelcome(false);
  }, []);

  useEffect(() => {
    const updateConnection = () => setOffline(!navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    if (!showWelcome && moveFocusAfterWelcome.current) {
      moveFocusAfterWelcome.current = false;
      const heading = contentRef.current?.querySelector<HTMLElement>("h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      } else {
        contentRef.current?.focus();
      }
    }
  }, [showWelcome]);

  const content = (sessionPaused || offline) && !user ? (
    <SignInGate offline />
  ) : loading ? (
    <SignInGate loading />
  ) : error && !user ? (
    <SignInGate error onRetry={() => void refresh()} />
  ) : !user ? (
    <SignInGate />
  ) : (
    <Suspense
      fallback={
        <main
          className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground"
          role="status"
        >
          Loading RefConnect…
        </main>
      }
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={AdminPortal} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );

  return (
    <>
      <div
        ref={contentRef}
        tabIndex={-1}
        inert={showWelcome}
        aria-hidden={showWelcome}
      >
        {offline && user && (
          <div
            role="status"
            className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950"
          >
            You’re offline. Reconnect to load current hospital data or save changes.
          </div>
        )}
        {content}
      </div>
      {showWelcome && <WelcomeIntro onComplete={completeWelcome} />}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
