"use client";

import { lazy, Suspense, type ComponentProps } from "react";
import styles from "./editor.module.css";

const FontPicker = lazy(() => import("./FontPicker").then((m) => ({ default: m.FontPicker })));

/** The font picker, loaded the first time a text option is shown (keeps the editor light). */
export function LazyFontPicker(props: ComponentProps<typeof FontPicker>) {
  return (
    <Suspense
      fallback={
        <button type="button" className={styles.fontPickerButton} disabled>
          {props.value === "system-ui" ? "System" : props.value}
        </button>
      }
    >
      <FontPicker {...props} />
    </Suspense>
  );
}
