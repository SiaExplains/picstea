"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { AppStatus, EditorController } from "@/editor/controller/editor-controller";
import type { DocumentSession, EditorState } from "@/editor/core/editor-store";
import type { Observable } from "@/editor/core/observable";

export const EditorContext = createContext<EditorController | null>(null);

export function useController(): EditorController {
  const controller = useContext(EditorContext);
  if (!controller) throw new Error("useController must be used inside <EditorRoot>.");
  return controller;
}

/**
 * Subscribe to a slice of editor state. The selector must return a value that is stable for
 * unchanged state (state is immutable, so returning sub-objects is fine; don't build new arrays).
 */
export function useEditorState<T>(selector: (state: EditorState) => T): T {
  const { store } = useController();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

export function useActiveSession(): DocumentSession | undefined {
  return useEditorState((s) => s.sessions.find((x) => x.document.id === s.activeDocumentId));
}

export function useAppStatus<T>(selector: (status: AppStatus) => T): T {
  const { status } = useController();
  return useSyncExternalStore(
    status.subscribe,
    () => selector(status.get()),
    () => selector(status.get()),
  );
}

/** Subscribe to one of the controller's observable values. */
export function useObservable<T>(observable: Observable<T>): T {
  return useSyncExternalStore(observable.subscribe, observable.get, observable.get);
}

const subscribeNoop = () => () => {};

/** True on Apple platforms, false during SSR and elsewhere. */
export function useIsMac(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}
