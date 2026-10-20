import { TranslatedLanding } from "@/components/site/TranslatedLanding";
import { copy } from "@/content/pages/photo-filters";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";

const PATH = "/photo-filters";

export const generateMetadata = () => translatedMetadata(PATH, copy);

export default function Page() {
  return <TranslatedLanding path={PATH} copy={copy} />;
}
