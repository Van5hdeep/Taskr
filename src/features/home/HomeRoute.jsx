import { usePageContext } from "../../app/usePageContext";
import HomePage from "./HomePage";

export default function HomeRoute() {
  const { t, dark } = usePageContext();
  return <HomePage t={t} dark={dark} />;
}
