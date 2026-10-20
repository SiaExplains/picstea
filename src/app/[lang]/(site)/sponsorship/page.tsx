import { legalMetadata, LegalPageView } from "@/components/site/LegalPageView";
import { LEGAL } from "@/content/legal";

export const metadata = legalMetadata(LEGAL.sponsorship);

export default function Page() {
  return <LegalPageView page={LEGAL.sponsorship} />;
}
