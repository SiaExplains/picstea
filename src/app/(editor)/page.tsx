import type { Metadata } from "next";
import { EditorRoot } from "@/components/editor/EditorRoot";
import { JsonLd } from "@/components/marketing/JsonLd";
import { WelcomeDialog } from "@/components/welcome/WelcomeDialog";
import { SITE } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — ${SITE.tagline}` },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

/** The home page is the editor itself; a welcome dialog explains it on the first visit. */
export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${SITE.url}/#website`,
              name: SITE.name,
              url: SITE.url,
            },
            {
              "@type": "Organization",
              "@id": `${SITE.url}/#organization`,
              name: SITE.name,
              url: SITE.url,
              logo: `${SITE.url}/android-chrome-512x512.png`,
            },
            {
              "@type": "SoftwareApplication",
              name: SITE.name,
              url: SITE.url,
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Any (web browser)",
              description: SITE.description,
              offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
              publisher: { "@id": `${SITE.url}/#organization` },
            },
          ],
        }}
      />
      <EditorRoot />
      <WelcomeDialog />
    </>
  );
}
