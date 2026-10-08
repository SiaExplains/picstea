import type { Metadata } from "next";
import type { LegalPage } from "@/content/legal";
import { ContentPage } from "./ContentPage";

export function legalMetadata(page: LegalPage): Metadata {
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    // Drafts with placeholders are not indexed until the operator has completed them.
    robots: page.finalized ? undefined : { index: false, follow: true },
  };
}

export function LegalPageView({ page }: { page: LegalPage }) {
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: page.title, path: page.path },
      ]}
      title={page.title}
      note={
        page.finalized
          ? undefined
          : "Draft — under legal review. Details marked “TO COMPLETE” are not final."
      }
      ad={null}
    >
      {page.body()}
    </ContentPage>
  );
}
