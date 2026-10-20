import { CONVERTERS } from "@/content/converters";
import { currentLocale } from "@/i18n/server";
import { LocalLink } from "./LocalLink";

/** Every converter page with its description, in the route's language (the /convert hub). */
export async function ConverterList({ except }: { except?: string }) {
  const converters = CONVERTERS[await currentLocale()];
  return (
    <ul>
      {converters
        .filter((c) => c.id !== except)
        .map((c) => (
          <li key={c.id}>
            <LocalLink href={`/convert/${c.id}`}>{c.label}</LocalLink>
            {except === undefined && <> — {c.description}</>}
          </li>
        ))}
    </ul>
  );
}
