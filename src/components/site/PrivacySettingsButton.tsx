"use client";

import { openPrivacySettings } from "@/lib/consent/runtime";
import styles from "./site.module.css";

export function PrivacySettingsButton() {
  return (
    <button type="button" className={styles.linkButton} onClick={openPrivacySettings}>
      Privacy settings
    </button>
  );
}
