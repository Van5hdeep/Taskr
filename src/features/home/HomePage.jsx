import { useNavigate } from "react-router";
import { useAuth } from "../../lib/auth/AuthProvider";
import ClickSpark from "../../components/ui/ClickSpark";
import DashboardHome from "../../components/dashboard/DashboardHome";
import { useSavedWorkspaces } from "./useSavedWorkspaces";

export default function HomePage({ t, dark }) {
  const navigate = useNavigate();
  const { displayName } = useAuth();
  const { savedWorkspaces } = useSavedWorkspaces();

  return (
    <ClickSpark sparkColor="#2563eb" sparkCount={10} duration={400}>
      <DashboardHome
        username={displayName}
        savedWorkspaces={savedWorkspaces}
        onNavigate={(id) => navigate(`/${id}`)}
        t={t}
        dark={dark}
      />
    </ClickSpark>
  );
}
