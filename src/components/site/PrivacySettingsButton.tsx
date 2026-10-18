"use client";

import { useRouter } from "next/navigation";
import { openPrivacySettings } from "@/lib/consent/runtime";
import styles from "./site.module.css";

export function PrivacySettingsButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={styles.linkButton}
      // If Google's consent message can't be shown (e.g. blocked), the cookie policy explains it.
      onClick={() => openPrivacySettings() || router.push("/cookies")}
    >
      Privacy settings
    </button>
  );
}
