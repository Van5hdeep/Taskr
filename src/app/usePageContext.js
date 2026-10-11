import { useOutletContext } from "react-router";

/** Theme tokens provided by AppShell to every routed page. */
export function usePageContext() {
  return useOutletContext();
}
