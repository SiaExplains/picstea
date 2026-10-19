import Image from "next/image";
import Link from "next/link";
import { EditorLink } from "@/components/site/EditorLink";
import { ConsentManager } from "@/components/site/ConsentManager";
import { PwaStart } from "@/components/pwa/PwaStart";
import { PrivacySettingsButton } from "@/components/site/PrivacySettingsButton";
import styles from "@/components/site/site.module.css";
import { rootMetadata, rootViewport } from "@/lib/seo/root-metadata";
import { SITE } from "@/lib/seo/site";
import "../globals.css";

export const metadata = rootMetadata;
export const viewport = rootViewport;

/**
 * Root layout of the public website. A separate root layout from the editor's, so links to the
 * editor are full page loads: the editor starts with its own strict security policy and without
 * any ad code from website pages (ADR-0013).
 * (docs, blog, guides, legal). Static server components; the only
 * client code is the consent manager and ad slots. The editor bundle is never loaded here.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <div className={styles.site}>
          <header className={styles.header}>
            <EditorLink className={styles.brand} aria-label={`${SITE.name} editor`}>
              {/* White wordmark on the brand teal: one image reads on light and dark pages. */}
              <Image
                src="/brand/picstea-logo.png"
                alt={SITE.name}
                width={83}
                height={28}
                className={styles.logo}
                priority
                unoptimized
              />
            </EditorLink>
            <nav aria-label="Main" className={styles.nav}>
              <Link href="/docs">Docs</Link>
              <Link href="/blog">Blog</Link>
              <EditorLink className={styles.cta}>Open editor</EditorLink>
            </nav>
          </header>
          <div className={styles.body}>{children}</div>
          <footer className={styles.footer}>
            <nav aria-label="Footer" className={styles.footerNav}>
              <Link href="/online-photo-editor">Online photo editor</Link>
              <Link href="/psd-editor">PSD editor</Link>
              <Link href="/photoshop-alternative">Photoshop alternative</Link>
              <Link href="/photopea-alternative">Photopea alternative</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/about">About</Link>
              <Link href="/docs">Documentation</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/cookies">Cookies</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/imprint">Imprint</Link>
              <Link href="/sponsorship">Advertising &amp; sponsorship</Link>
              <PrivacySettingsButton />
            </nav>
            <p>
              © {SITE.name} — {SITE.slogan} Images are edited on your device and never uploaded.
            </p>
          </footer>
          <ConsentManager />
          <PwaStart />
        </div>
      </body>
    </html>
  );
}
