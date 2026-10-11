import { usePageContext } from "../../app/usePageContext";
import StickerPage from "./StickerPage";

export default function StickerRoute() {
  const { t, dark } = usePageContext();
  return <StickerPage t={t} dark={dark} />;
}
