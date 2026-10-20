import { home } from "@/content/pages/home";
import { currentLocale } from "@/i18n/server";
import styles from "./welcome.module.css";

/*
 * The longer description of Picstea inside the welcome dialog, in the page's language. A server
 * component passed to the client dialog as children, so the text is in the home page's HTML for
 * search engines and AI assistants but adds nothing to the editor's JavaScript. Every claim must
 * match the facts and limits in src/lib/seo/llms.ts (docs/10: no overclaiming).
 */
export async function WelcomeAbout() {
  const { about } = home[await currentLocale()];
  return (
    <details className={styles.about}>
      <summary>{about.summary}</summary>
      {about.body()}
    </details>
  );
}
