import { TranslatedLanding } from "@/components/site/TranslatedLanding";
import { copy } from "@/content/pages/convert";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";

const PATH = "/convert";

export const generateMetadata = () => translatedMetadata(PATH, copy);

export default function ConvertHub() {
  return (
    <TranslatedLanding
      path={PATH}
      copy={copy}
      cta={{ href: "/?convert=images", label: (t) => t.converter.hubCta }}
    />
  );
}
