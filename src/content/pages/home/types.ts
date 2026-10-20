import type { ReactNode } from "react";

/**
 * The editor home page in one language (ADR-0039): metadata, the welcome dialog's text (plain
 * strings, because the dialog is a client component) and the longer "About Picstea" section
 * (server-rendered, for search engines and AI assistants; every claim must match llms.ts).
 */
export interface HomeCopy {
  /** "Free Online Photo Editor" — the title is "Picstea — {tagline}". */
  readonly tagline: string;
  readonly description: string;
  readonly welcome: WelcomeText;
  readonly about: { readonly summary: string; readonly body: () => ReactNode };
}

export interface WelcomeText {
  readonly title: string;
  /** Follows the slogan: "Edit Boldly. Create Freely. {lead}" */
  readonly lead: string;
  readonly highlights: readonly (readonly [title: string, body: string])[];
  /** "New here? Read the {link}." */
  readonly newHere: string;
  readonly gettingStarted: string;
  readonly learnMore: string;
  /** English paths; the page localizes the translated ones. */
  readonly links: readonly (readonly [path: string, label: string])[];
  readonly start: string;
}
