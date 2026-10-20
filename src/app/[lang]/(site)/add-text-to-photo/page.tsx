import { TranslatedLanding } from "@/components/site/TranslatedLanding";
import { copy } from "@/content/pages/add-text-to-photo";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";

const PATH = "/add-text-to-photo";

export const generateMetadata = () => translatedMetadata(PATH, copy);

export default function Page() {
  return <TranslatedLanding path={PATH} copy={copy} />;
}
