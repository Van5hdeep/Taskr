import { usePageContext } from "../../app/usePageContext";
import { useAuth } from "../../lib/auth/AuthProvider";
import TableWorkspace from "../../components/table/TableWorkspace";
import { useSavedWorkspaces } from "../home/useSavedWorkspaces";

export default function WorkspacePage() {
  const { t, dark } = usePageContext();
  const { userId } = useAuth();
  const { saveWorkspace } = useSavedWorkspaces();
  return <TableWorkspace key={userId} t={t} dark={dark} userId={userId} onSave={(name) => saveWorkspace("workspace", name, "Workspace Document")} />;
}
