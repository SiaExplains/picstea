/** Shared between the welcome dialog and the editor chrome that reopens it. */
export const OPEN_WELCOME_EVENT = "mylper:open-welcome";
export const WELCOME_SEEN_KEY = "mylper.welcomeSeen";

export function openWelcome(): void {
  window.dispatchEvent(new Event(OPEN_WELCOME_EVENT));
}
