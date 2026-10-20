import { TranslatedLanding } from "@/components/site/TranslatedLanding";
import { copy } from "@/content/pages/make-background-transparent";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";

const PATH = "/make-background-transparent";

export const generateMetadata = () => translatedMetadata(PATH, copy);

export default function Page() {
  return <TranslatedLanding path={PATH} copy={copy} />;
}
