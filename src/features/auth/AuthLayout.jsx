import { CheckCircle2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";
import BorderGlow from "../../components/BorderGlow/BorderGlow";
import BrandLogo from "../../components/BrandLogo";

/** Shared two-column frame for every auth screen. */
export default function AuthLayout({ kicker = "Welcome to TASKR", title, subtitle, children }) {
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <div className="auth-page-glow auth-page-glow-one" />
      <div className="auth-page-glow auth-page-glow-two" />
      <div className="auth-shell">
        <div className="auth-topbar">
          <button type="button" className="auth-brand" onClick={() => navigate("/")} aria-label="Back to TASKR landing page">
            <BrandLogo className="auth-wordmark" tone="light" />
          </button>
          <button type="button" className="auth-back" onClick={() => navigate("/")}>Back to site <ChevronLeft className="h-4 w-4" /></button>
        </div>
        <div className="auth-layout">
          <div className="auth-pitch">
            <span className="landing-section-label">The work starts here</span>
            <h1>Bring the scattered pieces <em>into focus.</em></h1>
            <p>Sign in to continue your workspace, or create a calm place for the next idea, task, diagram, and decision.</p>
            <div className="auth-pitch-list">
              <span><CheckCircle2 className="h-4 w-4" /> Pick up where you left off</span>
              <span><CheckCircle2 className="h-4 w-4" /> Keep every kind of work close</span>
              <span><CheckCircle2 className="h-4 w-4" /> Move from thought to finished</span>
            </div>
          </div>
          <div className="auth-card-wrap">
            <BorderGlow borderRadius={26} glowColor="37 99 235" backgroundColor="#ffffff" className="auth-card-glow">
              <div className="auth-card">
                <div className="auth-card-heading">
                  <span className="auth-card-kicker">{kicker}</span>
                  <h2>{title}</h2>
                  {subtitle && <p>{subtitle}</p>}
                </div>
                {children}
              </div>
            </BorderGlow>
          </div>
        </div>
      </div>
    </div>
  );
}
