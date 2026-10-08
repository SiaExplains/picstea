"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./welcome.module.css";
import { OPEN_WELCOME_EVENT, WELCOME_SEEN_KEY } from "./welcome";

/* Only features that exist today are listed (docs/10_SEO_AEO.md: no filler, no overclaiming). */
const HIGHLIGHTS = [
  ["Private by design", "Editing happens in your browser. Your images are never uploaded."],
  ["Layers that stay editable", "Groups, masks, 16 blend modes, adjustment layers and effects."],
  ["Paint, shapes and text", "Brush and eraser, editable shapes, and text typed on the canvas."],
  ["Open and export", "Open PNG, JPEG or WebP and export to any of them. Work saves itself."],
] as const;

const FAQ = [
  ["Is MYLPER free?", "Yes. It runs in your browser with no account required."],
  [
    "Where is my work saved?",
    "In this browser's storage on your device. Browsers can clear it, so export important work.",
  ],
] as const;

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
 * Explains MYLPER on the first visit; reopened from the logo or Help menu. The content is part of
 * the server-rendered page, so it also describes the app to search engines and AI assistants.
 */
export function WelcomeDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const open = () => {
      if (!dialog.open) dialog.showModal();
    };
    if (!hasSeenWelcome()) open();
    window.addEventListener(OPEN_WELCOME_EVENT, open);
    return () => window.removeEventListener(OPEN_WELCOME_EVENT, open);
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="welcome-title"
      onClose={rememberWelcomeSeen}
    >
      <form method="dialog" className={styles.body}>
        <Image
          src="/brand/mylper-logo-on-dark.png"
          alt="MYLPER"
          width={133}
          height={36}
          className={styles.logo}
          unoptimized
        />
        <h1 id="welcome-title" className={styles.title}>
          A free image editor that keeps your images on your device
        </h1>
        <p className={styles.lead}>
          MYLPER is a layer-based image editor that runs entirely in your browser.
        </p>
        <ul className={styles.highlights}>
          {HIGHLIGHTS.map(([title, body]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{body}</span>
            </li>
          ))}
        </ul>
        <details className={styles.faq}>
          <summary>Questions</summary>
          <dl>
            {FAQ.map(([q, a]) => (
              <div key={q}>
                <dt>{q}</dt>
                <dd>{a}</dd>
              </div>
            ))}
          </dl>
        </details>
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} autoFocus>
            Start editing
          </button>
        </div>
      </form>
    </dialog>
  );
}
