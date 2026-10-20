import type { ReactNode } from "react";
import type { Faq } from "@/components/site/LandingPage";

/**
 * One converter page (`/convert/<id>`), per language (ADR-0039). The "Convert now" button opens
 * the editor at `/?convert=<id>`, where the file is converted under the editor's strict security
 * policy, never on a page that may run ad code (ADR-0013). Every claim must hold for
 * `convertFile` in src/editor/formats/convert.ts.
 */
export interface ConverterPage {
  /** Matches an id in CONVERSIONS. */
  readonly id: string;
  /** "WebP to PNG", in this language. */
  readonly label: string;
  readonly title: string;
  /** 50–160 characters (site audit). */
  readonly description: string;
  readonly lead: string;
  readonly body: () => ReactNode;
  readonly faqs: readonly Faq[];
}
