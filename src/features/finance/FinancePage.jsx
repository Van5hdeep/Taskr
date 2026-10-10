import { usePageContext } from "../../app/usePageContext";
import { useAuth } from "../../lib/auth/AuthProvider";
import FinanceWorkspace from "../../components/finance/FinanceWorkspace";
import { useSavedWorkspaces } from "../home/useSavedWorkspaces";

export default function FinancePage() {
  const { t, dark } = usePageContext();
  const { userId } = useAuth();
  const { saveWorkspace } = useSavedWorkspaces();
  return <FinanceWorkspace key={userId} t={t} dark={dark} userId={userId} onSave={(name) => saveWorkspace("finance", name, "Finance Workspace")} />;
}
