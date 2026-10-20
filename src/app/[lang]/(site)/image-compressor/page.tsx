import { TranslatedLanding } from "@/components/site/TranslatedLanding";
import { copy } from "@/content/pages/image-compressor";
import { translatedMetadata } from "@/lib/seo/i18n-metadata";

const PATH = "/image-compressor";

export const generateMetadata = () => translatedMetadata(PATH, copy);

export default function Page() {
  return <TranslatedLanding path={PATH} copy={copy} />;
}
