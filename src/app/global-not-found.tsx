import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found · MYLPER",
  robots: { index: false },
};

/** 404 for URLs that match no route (the editor and the website have separate root layouts). */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 560, margin: "15vh auto", padding: "0 16px" }}>
          <h1>Page not found</h1>
          <p>
            <Link href="/" prefetch={false}>
              Open the MYLPER editor
            </Link>{" "}
            or read the <Link href="/docs">documentation</Link>.
          </p>
        </main>
      </body>
    </html>
  );
}
