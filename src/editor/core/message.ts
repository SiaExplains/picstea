/**
 * User-facing messages that contain values ("The file is larger than {mb} MB."). The engine stays
 * English and framework-free; the UI translates the template and fills in the values in the
 * user's language (ADR-0039). Plain strings stay plain strings: the UI looks them up as they are.
 */
export interface Msg {
  /** The English template, which is also the translation key. */
  readonly text: string;
  readonly params: Readonly<Record<string, string | number>>;
}

export type Message = string | Msg;

export const msg = (text: string, params: Msg["params"]): Msg => ({ text, params });

/** Fill `{name}` placeholders in English: numbers get grouped thousands ("12,000"). */
export function fillTemplate(text: string, params: Msg["params"]): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    if (value === undefined) return match;
    return typeof value === "number" ? value.toLocaleString("en-US") : value;
  });
}

/** The English text of a message. */
export const messageText = (m: Message): string =>
  typeof m === "string" ? m : fillTemplate(m.text, m.params);

/** The template, when the message has values to fill in. */
export const messageTemplate = (m: Message): Msg | undefined =>
  typeof m === "string" ? undefined : m;
