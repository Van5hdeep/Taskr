import { usePageContext } from "../../app/usePageContext";
import { useAuth } from "../../lib/auth/AuthProvider";
import FlowWorkspace from "../../components/flow/FlowWorkspace";

export default function FlowPage() {
  const { dark } = usePageContext();
  const { userId } = useAuth();
  return <FlowWorkspace key={userId} dark={dark} userId={userId} />;
}
