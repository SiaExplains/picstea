"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ALL,
  CATEGORY_INFO,
  NONE,
  OPTIONAL_CATEGORIES,
  type ConsentChoices,
} from "@/lib/consent/consent";
import { consentRuntime, OPEN_PRIVACY_SETTINGS } from "@/lib/consent/runtime";
import styles from "./site.module.css";

/**
 * First-visit consent banner and the preferences dialog (docs/09). "Accept all" and "Reject
 * non-essential" have equal weight; nothing optional is pre-selected; the choice can be changed
 * at any time from "Privacy settings". Without optional vendors there is nothing to ask.
 */
export function ConsentManager() {
  const consent = useSyncExternalStore(consentRuntime.subscribe, consentRuntime.get, () => null);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    void consentRuntime.start();
    const open = () => setManaging(true);
    window.addEventListener(OPEN_PRIVACY_SETTINGS, open);
    return () => window.removeEventListener(OPEN_PRIVACY_SETTINGS, open);
  }, []);

  const showBanner = hydrated && consentRuntime.needsConsent && !consent && !managing;
  return (
    <>
      {showBanner && (
        <section className={styles.banner} aria-label="Privacy choices" role="region">
          <p>
            Picstea never uploads your images. On the website and blog we would like to show Google
            ads, which may use cookies. You choose — the editor works the same either way.{" "}
            <a href="/cookies">Cookie policy</a>
          </p>
          <div className={styles.bannerActions}>
            <button
              type="button"
              className={styles.choice}
              onClick={() => void consentRuntime.decide(NONE)}
            >
              Reject non-essential
            </button>
            <button type="button" className={styles.choice} onClick={() => setManaging(true)}>
              Manage preferences
            </button>
            <button
              type="button"
              className={styles.choice}
              onClick={() => void consentRuntime.decide(ALL)}
            >
              Accept all
            </button>
          </div>
        </section>
      )}
      {managing && (
        <Preferences
          initial={consent?.choices ?? NONE}
          onDone={(choices) => {
            setManaging(false);
            if (choices) void consentRuntime.decide(choices);
          }}
        />
      )}
    </>
  );
}

function Preferences({
  initial,
  onDone,
}: {
  initial: ConsentChoices;
  onDone: (choices: ConsentChoices | null) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [choices, setChoices] = useState<ConsentChoices>(initial);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.preferences}
      aria-labelledby="privacy-title"
      onCancel={(e) => {
        e.preventDefault();
        onDone(null);
      }}
    >
      <h2 id="privacy-title">Privacy settings</h2>
      <ul className={styles.categories}>
        <li>
          <label>
            <input type="checkbox" checked disabled /> {CATEGORY_INFO.necessary.title}
          </label>
          <p>{CATEGORY_INFO.necessary.description}</p>
        </li>
        {OPTIONAL_CATEGORIES.map((category) => (
          <li key={category}>
            <label>
              <input
                type="checkbox"
                checked={choices[category]}
                onChange={(e) => setChoices({ ...choices, [category]: e.target.checked })}
              />{" "}
              {CATEGORY_INFO[category].title}
            </label>
            <p>{CATEGORY_INFO[category].description}</p>
          </li>
        ))}
      </ul>
      <div className={styles.bannerActions}>
        <button type="button" className={styles.choice} onClick={() => onDone(NONE)}>
          Reject non-essential
        </button>
        <button type="button" className={styles.choice} onClick={() => onDone(choices)}>
          Save choices
        </button>
        <button type="button" className={styles.choice} onClick={() => onDone(ALL)}>
          Accept all
        </button>
      </div>
    </dialog>
  );
}
