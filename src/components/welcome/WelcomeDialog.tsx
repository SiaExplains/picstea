"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import type { WelcomeText } from "@/content/pages/home/types";
import { SITE } from "@/lib/seo/site";
import styles from "./welcome.module.css";
import { initialConversion } from "@/components/editor/convert-link";
import { OPEN_WELCOME_EVENT, WELCOME_SEEN_KEY } from "./welcome";

function hasSeenWelcome(): boolean {
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberWelcomeSeen(): void {
  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    // Storage blocked (e.g. private window): the dialog simply shows again next time.
  }
}

/**
 * Explains Picstea on the first visit; reopened from the logo or Help menu. The content is part of
 * the server-rendered page, so it also describes the app to search engines and AI assistants.
 * `children` is the longer, server-only description (WelcomeAbout), shown under the highlights.
 */
export function WelcomeDialog({
  text,
  links,
  children,
}: {
  text: WelcomeText;
  /** text.links with each path already in the page's language. */
  links: readonly (readonly [href: string, label: string])[];
  children?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const open = () => {
      if (!dialog.open) dialog.showModal();
    };
    // Visitors sent from a converter page came to convert a file, not to read the introduction.
    if (!hasSeenWelcome() && !initialConversion()) open();
    window.addEventListener(OPEN_WELCOME_EVENT, open);
    return () => window.removeEventListener(OPEN_WELCOME_EVENT, open);
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="welcome-title"
      // The close event is queued asynchronously; remember right away on submit or Esc so a
      // reload straight after dismissing does not show the dialog again.
      onCancel={rememberWelcomeSeen}
      onClose={rememberWelcomeSeen}
    >
      <form method="dialog" className={styles.body} onSubmit={rememberWelcomeSeen}>
        <Image
          src="/brand/picstea-logo.png"
          alt="Picstea"
          width={107}
          height={36}
          className={styles.logo}
          unoptimized
        />
        <h1 id="welcome-title" className={styles.title}>
          {text.title}
        </h1>
        <p className={styles.lead}>
          {SITE.slogan} {text.lead}
        </p>
        <ul className={styles.highlights}>
          {text.highlights.map(([title, body]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{body}</span>
            </li>
          ))}
        </ul>
        {children}
        <p className={styles.lead}>
          {text.newHere.split("{link}")[0]}
          <a href="/docs/getting-started" target="_blank" rel="noopener">
            {text.gettingStarted}
          </a>
          {text.newHere.split("{link}")[1]}
        </p>
        {/* The home page is the editor; these links also let search engines find the website. */}
        <nav aria-label={text.learnMore} className={styles.links}>
          {links.map(([href, label]) => (
            <a key={href} href={href} target="_blank" rel="noopener">
              {label}
            </a>
          ))}
        </nav>
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} autoFocus>
            {text.start}
          </button>
        </div>
      </form>
    </dialog>
  );
}
