import { legalMetadata, LegalPageView } from "@/components/site/LegalPageView";
import { LEGAL } from "@/content/legal";

export const metadata = legalMetadata(LEGAL.privacy);

export default function Page() {
  return <LegalPageView page={LEGAL.privacy} />;
}
