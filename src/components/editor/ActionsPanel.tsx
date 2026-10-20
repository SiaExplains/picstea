"use client";

import { useRef, useState, type FormEvent } from "react";
import { MAX_ACTION_NAME_LENGTH, serializeActions } from "@/editor/automation/actions";
import { stepLabel } from "@/editor/automation/steps";
import { useActiveSession, useController, useObservable } from "./editor-context";
import styles from "./editor.module.css";
import { ChevronIcon } from "./icons";
import { saveFile } from "./save-file";
import { useModal } from "./SelectionDialogs";
import { useT } from "./i18n";

/**
 * Actions: record a sequence of edits once, then play it on any document (or a batch of files).
 * Stored in this browser; export/import as a JSON file to move them elsewhere.
 */
export function ActionsPanel() {
  const controller = useController();
  const actions = useObservable(controller.actions);
  const recording = useObservable(controller.recording);
  const playing = useObservable(controller.playing);
  const session = useActiveSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [naming, setNaming] = useState<{ mode: "new" } | { mode: "rename"; id: string } | null>(
    null,
  );
  const importRef = useRef<HTMLInputElement>(null);
  const t = useT();

  const selected = actions.find((a) => a.id === selectedId) ?? actions[0];
  const busy = playing !== null;

  const toggle = (id: string) =>
    setExpanded((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportAll = async () => {
    const blob = new Blob([serializeActions(actions)], { type: "application/json" });
    const saved = await saveFile(
      blob,
      "picstea-actions.json",
      "application/json",
      t("Picstea actions"),
    );
    if (saved === "failed") controller.notify("error", t("The actions file could not be saved."));
  };

  return (
    <div className={styles.actionsPanel}>
      {recording && (
        <p className={styles.recordingBanner} role="status">
          <span className={styles.recordingDot} aria-hidden="true" />{" "}
          {t("Recording “{name}”", {
            name: actions.find((a) => a.id === recording)?.name ?? "",
          })}
        </p>
      )}
      {actions.length === 0 ? (
        <p className={styles.muted}>
          {t(
            "No actions yet. Choose New, then edit as usual: filters, adjustments, selections, fills, new layers, flips, alignment and crop are recorded.",
          )}
        </p>
      ) : (
        <ul className={styles.actionList} aria-label={t("Actions")}>
          {actions.map((action) => {
            const open = expanded.has(action.id);
            const isSelected = action.id === selected?.id;
            return (
              <li key={action.id}>
                <div className={`${styles.actionRow} ${isSelected ? styles.actionSelected : ""}`}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-expanded={open}
                    aria-label={
                      open
                        ? t("Hide steps of {name}", { name: action.name })
                        : t("Show steps of {name}", { name: action.name })
                    }
                    onClick={() => toggle(action.id)}
                  >
                    <ChevronIcon open={open} size={12} />
                  </button>
                  <button
                    type="button"
                    className={styles.actionName}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(action.id)}
                    onDoubleClick={() => setNaming({ mode: "rename", id: action.id })}
                  >
                    {action.name}
                    <span className={styles.muted}> · {action.steps.length}</span>
                  </button>
                </div>
                {open && (
                  <ol
                    className={styles.stepList}
                    aria-label={t("Steps of {name}", { name: action.name })}
                  >
                    {action.steps.length === 0 && (
                      <li className={styles.muted}>{t("No steps yet")}</li>
                    )}
                    {action.steps.map((step, i) => (
                      <li key={i} className={styles.stepRow}>
                        <span>{t(stepLabel(step))}</span>
                        <button
                          type="button"
                          className={styles.iconButton}
                          aria-label={t("Delete step {number} ({label})", {
                            number: i + 1,
                            label: t(stepLabel(step)),
                          })}
                          disabled={recording === action.id}
                          onClick={() => controller.deleteActionStep(action.id, i)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.panelActions}>
        {recording ? (
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            onClick={() => controller.stopRecording()}
          >
            {t("Stop")}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={styles.button}
              disabled={!selected || !session || busy}
              onClick={() => selected && void controller.playAction(selected.id)}
            >
              {t("Play")}
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={!selected || busy}
              onClick={() => selected && controller.startRecording(selected.id)}
            >
              {t("Record")}
            </button>
          </>
        )}
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          onClick={() => setNaming({ mode: "new" })}
        >
          {t("New…")}
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={!selected || busy}
          onClick={() => selected && setNaming({ mode: "rename", id: selected.id })}
        >
          {t("Rename…")}
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={!selected || busy}
          onClick={() => selected && controller.deleteAction(selected.id)}
        >
          {t("Delete")}
        </button>
        <button type="button" className={styles.button} onClick={() => importRef.current?.click()}>
          {t("Import…")}
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={actions.length === 0}
          onClick={() => void exportAll()}
        >
          {t("Export…")}
        </button>
      </div>
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        hidden
        data-testid="actions-import"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const result = controller.importActions(await file.text());
          if (result.ok)
            controller.notify("info", t("Imported {count} action(s).", { count: result.count }));
        }}
      />
      {naming && (
        <ActionNameDialog
          initial={
            naming.mode === "rename" ? (actions.find((a) => a.id === naming.id)?.name ?? "") : ""
          }
          title={naming.mode === "new" ? t("New Action") : t("Rename Action")}
          submitLabel={naming.mode === "rename" ? t("Rename") : session ? t("Record") : t("Create")}
          onSubmit={(name) => {
            if (naming.mode === "rename") {
              controller.renameAction(naming.id, name);
              return true;
            }
            const id = controller.createAction(name);
            if (!id) return false;
            setSelectedId(id);
            // A new action starts recording straight away, as in other editors.
            if (session) controller.startRecording(id);
            return true;
          }}
          onClose={() => setNaming(null)}
        />
      )}
    </div>
  );
}

function ActionNameDialog({
  initial,
  title,
  submitLabel,
  onSubmit,
  onClose,
}: {
  initial: string;
  title: string;
  submitLabel: string;
  onSubmit: (name: string) => boolean;
  onClose: () => void;
}) {
  const ref = useModal(true);
  const t = useT();
  const [name, setName] = useState(initial || t("Action"));
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("Enter a name."));
      return;
    }
    if (onSubmit(name)) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="action-name-title"
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
    >
      <form className={styles.dialogForm} onSubmit={submit} noValidate>
        <h2 id="action-name-title" className={styles.dialogTitle}>
          {title}
        </h2>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="action-name">
            {t("Name")}
          </label>
          <input
            id="action-name"
            className={styles.input}
            value={name}
            maxLength={MAX_ACTION_NAME_LENGTH}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.button} onClick={onClose}>
            {t("Cancel")}
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`}>
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
