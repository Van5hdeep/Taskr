import { useSyncExternalStore } from "react";

/**
 * While the sign-in page plays its "you're in" moment, the redirect guard
 * holds off sending the (now signed-in) visitor to the app.
 */
let celebrating = false;
const listeners = new Set();

export function setCelebrating(value) {
  celebrating = value;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useCelebrating() {
  return useSyncExternalStore(subscribe, () => celebrating, () => false);
}
