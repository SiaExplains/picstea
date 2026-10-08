import { legalMetadata, LegalPageView } from "@/components/site/LegalPageView";
import { LEGAL } from "@/content/legal";

export const metadata = legalMetadata(LEGAL.imprint);

export default function Page() {
  return <LegalPageView page={LEGAL.imprint} />;
}
