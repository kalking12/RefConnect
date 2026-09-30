import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Route, Switch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import SignInGate from "./components/SignInGate";
import WelcomeIntro from "./components/WelcomeIntro";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";

const Home = lazy(() => import("./pages/Home"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));

function shouldShowWelcome() {
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    // A missing media-query API must not silently suppress the introduction.
    return true;
  }
}

function ProtectedPage({ page }: { page: "search" | "admin" }) {
  const { user, loading, sessionPaused, error, refresh } = useAuth();
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const updateConnection = () => setOffline(!navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const content =
    (sessionPaused || offline) && !user ? (
      <SignInGate offline />
    ) : loading ? (
      <SignInGate loading />
    ) : error && !user ? (
      <SignInGate error onRetry={() => void refresh()} />
    ) : !user ? (
      <SignInGate />
    ) : page === "admin" ? (
      <AdminPortal />
    ) : (
      <Home />
    );

  return (
    <>
      {offline && user && (
        <div
          role="status"
          className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950"
        >
          You’re offline. Reconnect to load current hospital data or save
          changes.
        </div>
      )}
      <div className="protected-page">{content}</div>
    </>
  );
}

function Router() {
  // Every fresh document load gets the brief welcome, including direct links.
  // Client-side navigation does not restart it or discard a query string.
  const [showWelcome, setShowWelcome] = useState(shouldShowWelcome);
  const contentRef = useRef<HTMLDivElement>(null);
  const moveFocusAfterWelcome = useRef(false);
  const welcomeVisible = showWelcome;
  const completeWelcome = useCallback(() => {
    moveFocusAfterWelcome.current = Boolean(
      document.activeElement?.closest(".welcome-intro")
    );
    setShowWelcome(false);
  }, []);

  useEffect(() => {
    if (!welcomeVisible && moveFocusAfterWelcome.current) {
      moveFocusAfterWelcome.current = false;
      const heading = contentRef.current?.querySelector<HTMLElement>("h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      } else {
        contentRef.current?.focus({ preventScroll: true });
      }
    }
  }, [welcomeVisible]);

  return (
    <>
      <div
        ref={contentRef}
        tabIndex={-1}
        inert={welcomeVisible}
        aria-hidden={welcomeVisible}
      >
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
            <Route path="/" component={LandingPage} />
            <Route path="/search">
              <ProtectedPage page="search" />
            </Route>
            <Route path="/admin">
              <ProtectedPage page="admin" />
            </Route>
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>
      {welcomeVisible && <WelcomeIntro onComplete={completeWelcome} />}
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
