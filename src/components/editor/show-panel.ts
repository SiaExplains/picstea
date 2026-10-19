/**
 * Window menu (ADR-0032): bring a panel into view and move keyboard focus to it. The History,
 * Swatches and Actions panels share a tab strip, so they are asked to switch tab first.
 */

export type PanelTab = "history" | "swatches" | "actions";
export type PanelName = "layers" | "properties" | PanelTab;

const tabListeners = new Set<(tab: PanelTab) => void>();

/** PanelTabs listens here to switch tab. */
export function onShowTab(listener: (tab: PanelTab) => void): () => void {
  tabListeners.add(listener);
  return () => tabListeners.delete(listener);
}

export function showPanel(name: PanelName): void {
  if (name === "layers" || name === "properties") {
    const panel = document.querySelector<HTMLElement>(`[data-panel="${name}"]`);
    if (!panel) return;
    panel.scrollIntoView({ block: "nearest" });
    const target =
      panel.querySelector<HTMLElement>(
        '[aria-current="true"], button:not(:disabled), input:not(:disabled), select',
      ) ?? panel;
    target.focus();
    return;
  }
  tabListeners.forEach((listener) => listener(name));
}
