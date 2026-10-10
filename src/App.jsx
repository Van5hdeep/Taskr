import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./lib/auth/AuthProvider";
import { ProfileProvider } from "./lib/profile";
import { RedirectIfAuthed, RequireAuth } from "./lib/auth/RequireAuth";
import { ThemeProvider } from "./lib/theme";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
import AppShell from "./app/AppShell";
import RouteError from "./app/RouteError";
import LandingPage from "./components/landing/LandingPage";
import AuthPage from "./features/auth/AuthPage";
import AuthCallbackPage from "./features/auth/AuthCallbackPage";
import ResetPasswordPage from "./features/auth/ResetPasswordPage";

// Each tool is its own chunk, so the landing and auth pages stay light.
const HomeRoute = lazy(() => import("./features/home/HomeRoute"));
const StickerRoute = lazy(() => import("./features/sticker/StickerRoute"));
const FinancePage = lazy(() => import("./features/finance/FinancePage"));
const DocumentsList = lazy(() => import("./features/workspace/DocumentsList"));
const DocumentPage = lazy(() => import("./features/workspace/DocumentPage"));
const FlowPage = lazy(() => import("./features/flow/FlowPage"));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage"));
const DevPlayground = import.meta.env.DEV ? lazy(() => import("./features/workspace/DevPlayground")) : null;

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm font-semibold text-blue-500">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading…
    </div>
  );
}

const withSuspense = (Component) => (
  <Suspense fallback={<RouteFallback />}>
    <Component />
  </Suspense>
);

function LandingRoute() {
  const navigate = useNavigate();
  return (
    <RedirectIfAuthed>
      <LandingPage onOpenAuth={(mode) => navigate(mode === "signup" ? "/auth/sign-up" : "/auth/sign-in")} />
    </RedirectIfAuthed>
  );
}

const router = createBrowserRouter([
  { path: "/", element: <LandingRoute />, errorElement: <RouteError /> },
  {
    path: "/auth",
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="sign-in" replace /> },
      { path: "sign-in", element: <RedirectIfAuthed><AuthPage mode="signin" /></RedirectIfAuthed> },
      { path: "sign-up", element: <RedirectIfAuthed><AuthPage mode="signup" /></RedirectIfAuthed> },
      { path: "forgot", element: <RedirectIfAuthed><AuthPage mode="forgot" /></RedirectIfAuthed> },
      { path: "reset", element: <ResetPasswordPage /> },
      { path: "callback", element: <AuthCallbackPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/home", element: withSuspense(HomeRoute), errorElement: <RouteError /> },
          { path: "/sticker", element: withSuspense(StickerRoute), errorElement: <RouteError /> },
          { path: "/finance/:tab?", element: withSuspense(FinancePage), errorElement: <RouteError /> },
          { path: "/workspace", element: withSuspense(DocumentsList), errorElement: <RouteError /> },
          { path: "/workspace/:docId", element: withSuspense(DocumentPage), errorElement: <RouteError /> },
          { path: "/flow", element: withSuspense(FlowPage), errorElement: <RouteError /> },
          { path: "/settings", element: withSuspense(SettingsPage), errorElement: <RouteError /> },
        ],
      },
    ],
  },
  // Development only: editor without sign-in for layout/input checks.
  ...(DevPlayground ? [{ path: "/dev/workspace", element: withSuspense(DevPlayground) }] : []),
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
