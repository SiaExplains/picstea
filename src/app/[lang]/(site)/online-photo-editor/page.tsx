import { TranslatedLanding } from "@/components/site/TranslatedLanding";
import { copy } from "@/content/pages/online-photo-editor";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";

const PATH = "/online-photo-editor";

export const generateMetadata = () => translatedMetadata(PATH, copy);

export default function Page() {
  return <TranslatedLanding path={PATH} copy={copy} />;
}
