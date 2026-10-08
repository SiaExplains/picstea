import type { Metadata } from "next";
import { EditorRoot } from "@/components/editor/EditorRoot";

export const metadata: Metadata = {
  title: "Editor",
  description: "Edit images in your browser. Your files never leave your device.",
  // Editor sessions are private and local; nothing here is useful to index.
  robots: { index: false, follow: false },
  alternates: { canonical: "/editor" },
};

export default function EditorPage() {
  return <EditorRoot />;
}
