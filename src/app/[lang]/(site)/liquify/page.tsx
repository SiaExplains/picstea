import { TranslatedLanding } from "@/components/site/TranslatedLanding";
import { copy } from "@/content/pages/liquify";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";

const PATH = "/liquify";

export const generateMetadata = () => translatedMetadata(PATH, copy);

export default function Page() {
  return <TranslatedLanding path={PATH} copy={copy} />;
}
