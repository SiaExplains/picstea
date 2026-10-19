"use client";

import { useEffect, useSyncExternalStore } from "react";
import { installStore, startPwa, type InstallState } from "@/lib/pwa/pwa";

/** Mounted once in each root layout: registers the service worker and listens for installs. */
export function PwaStart() {
  useEffect(() => startPwa(), []);
  return null;
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(installStore.subscribe, installStore.get, installStore.server);
}
