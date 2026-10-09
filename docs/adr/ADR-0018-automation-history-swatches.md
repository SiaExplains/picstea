# ADR-0018 — Actions, batch processing, history panel, colour picker and swatches (Gate 9e)

- Status: Accepted
- Date: 2026-10-09

## Context

docs/05 Phase 11 lists a history panel, an actions/macros foundation, a colour picker and
swatches; Gate 9 lists automation, and docs/20 names action recording and batch processing.
Commands (ADR-0003) are closures over a document — good for undo, but not something that can be
stored, exported or replayed on another file.

## Decision

### Actions are data, not commands

- An action is `{ id, name, steps }`. A step (`src/editor/automation/steps.ts`) is a small,
  serializable description of one controller operation: filter (id + values), adjustment layer
  (settings), flip, align, select all/deselect/inverse, feather/expand/contract, fill (colour),
  clear, new layer, duplicate layer, new fill layer, crop to selection.
- Recording happens in the controller: each recordable operation appends its step after it
  succeeded (an operation that raised an error notice is not recorded). Adjustment steps remember
  the layer they created; when recording stops they take that layer's final settings, so tuning
  Levels during recording is captured.
- Playback calls the same controller operations in order, waiting for decoding and for worker
  filters. It stops at the first step that raises an error notice and names it. The history is
  sealed first and the run is folded into one entry ("Action: name", `collapseSince`).
- Not recordable (yet): brush strokes, pointer transforms, text and Properties-panel edits other
  than adjustment settings. They need parameterised steps that are robust across documents of
  different sizes.

### Untrusted action files

Actions are kept in local storage (`mylper.actions`) and exported/imported as
`{ format: "mylper-actions", version: 1, actions }`. Parsing reads own properties only, knows
only the listed step types, validates filter values and adjustments with the existing
validators (`parseFilterValues`, `parseAdjustment`), and enforces limits: 2 MB per file, 100
actions, 200 steps per action, names up to 100 characters. Imported actions get fresh ids.
Stored lists drop malformed entries instead of failing.

### Batch

File → Batch… opens each file through the normal import path as a *transient* document (never
autosaved or stored), plays the action, exports it with the normal exporter, closes it and
releases its assets before the next file. Results go into one ZIP (the existing writer; entries
stored, since PNG/JPEG/WebP are already compressed) with sanitised, de-duplicated names. Limits:
200 files and 1 GB of output per run (the ZIP is built in memory). Failing files are skipped and
listed; the run can be stopped between files.

### History panel

`jumpTo(history, pastLength)` moves entries between past and future in one step, so the panel can
go to any state; later steps stay as redo entries until the next change. The panel is a
keyboard-operable listbox.

### Colour picker and swatches

The toolbar colour chips open an HSB picker (saturation/brightness field operable with arrow
keys, hue slider, Hex/RGB/HSB fields), applied on OK. Swatches live in local storage
(`mylper.swatches`, at most 300, validated on load). Both storage keys are listed in the cookie
policy. Colour fields in the Properties panel keep the native picker.

## Consequences

- Repetitive work can be automated without a scripting surface or code execution.
- New recordable operations need one step type, a label, a validator case and one `runStep` case.
- A scripting API (docs/20) remains a separate decision.
