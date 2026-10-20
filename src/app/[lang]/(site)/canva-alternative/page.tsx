import { TranslatedLanding } from "@/components/site/TranslatedLanding";
import { copy } from "@/content/pages/canva-alternative";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";

const PATH = "/canva-alternative";

export const generateMetadata = () => translatedMetadata(PATH, copy);

export default function Page() {
  return <TranslatedLanding path={PATH} copy={copy} />;
}
