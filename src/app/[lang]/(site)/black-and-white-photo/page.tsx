import { TranslatedLanding } from "@/components/site/TranslatedLanding";
import { copy } from "@/content/pages/black-and-white-photo";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";

const PATH = "/black-and-white-photo";

export const generateMetadata = () => translatedMetadata(PATH, copy);

export default function Page() {
  return <TranslatedLanding path={PATH} copy={copy} />;
}
