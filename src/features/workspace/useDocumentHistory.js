import { useCallback, useReducer } from "react";

const LIMIT = 100;

function reducer(state, action) {
  switch (action.type) {
    case "commit": {
      const next = typeof action.update === "function" ? action.update(state.present) : action.update;
      if (next === state.present) return state;
      return { past: [...state.past, state.present].slice(-LIMIT), present: next, future: [] };
    }
    case "undo": {
      if (!state.past.length) return state;
      return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future].slice(0, LIMIT) };
    }
    case "redo": {
      if (!state.future.length) return state;
      return { past: [...state.past, state.present].slice(-LIMIT), present: state.future[0], future: state.future.slice(1) };
    }
    case "reset":
      return { past: [], present: action.content, future: [] };
    default:
      return state;
  }
}

/**
 * Undo/redo for one document's content. Changes are committed once per
 * finished action (drag end, text pause, insert, delete) — never per frame.
 */
export function useDocumentHistory(initial) {
  const [state, dispatch] = useReducer(reducer, { past: [], present: initial, future: [] });
  return {
    content: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit: useCallback((update) => dispatch({ type: "commit", update }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
    reset: useCallback((content) => dispatch({ type: "reset", content }), []),
  };
}
