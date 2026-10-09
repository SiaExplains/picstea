import { DEFAULT_KEYMAP, formatBinding, type ActionId } from "@/editor/core/shortcuts/shortcuts";
import styles from "./site.module.css";

/** Names for every shortcut action. A Record, so a new shortcut without a name fails to compile. */
const LABELS: Record<ActionId, string> = {
  "file.new": "New document",
  "file.open": "Open file",
  "file.save": "Save to browser",
  "file.saveProject": "Save project as .mylper",
  "file.export": "Export",
  "edit.undo": "Undo",
  "edit.redo": "Redo",
  "edit.cut": "Cut selected pixels",
  "edit.copy": "Copy selected pixels",
  "edit.fill": "Fill selection with the foreground colour",
  "select.all": "Select all",
  "select.deselect": "Deselect",
  "select.reselect": "Reselect",
  "select.inverse": "Invert selection",
  "select.allLayers": "Select all layers",
  "select.feather": "Feather selection",
  "layer.new": "New pixel layer",
  "layer.duplicate": "Duplicate layer (Layer via Copy with a selection)",
  "layer.delete": "Delete layer (clear pixels with a selection)",
  "layer.group": "Group layer",
  "layer.ungroup": "Ungroup",
  "layer.selectAbove": "Select the layer above",
  "layer.selectBelow": "Select the layer below",
  "view.zoomIn": "Zoom in",
  "view.zoomOut": "Zoom out",
  "view.fit": "Fit on screen",
  "view.actualPixels": "Zoom to 100%",
  "view.rulers": "Show or hide rulers",
  "view.guides": "Show or hide guides",
  "view.grid": "Show or hide the grid",
  "view.snap": "Turn snapping on or off",
  "filter.last": "Repeat the last filter",
  "tool.move": "Move tool",
  "tool.transform": "Free transform",
  "tool.marquee": "Marquee tool",
  "tool.lasso": "Lasso tool",
  "tool.wand": "Magic wand",
  "tool.crop": "Crop tool",
  "tool.eyedropper": "Eyedropper",
  "tool.brush": "Brush",
  "tool.pencil": "Pencil",
  "tool.eraser": "Eraser",
  "tool.clone": "Clone stamp (Alt-click sets the source)",
  "tool.heal": "Healing brush (Alt-click sets the source)",
  "tool.tone": "Dodge, burn and sponge",
  "tool.focus": "Blur, sharpen and smudge",
  "tool.bucket": "Paint bucket",
  "tool.gradient": "Gradient",
  "tool.shape": "Shape tool",
  "tool.pen": "Pen tool",
  "tool.pathSelect": "Direct Selection (edit path points)",
  "path.makeSelection": "Make a selection from the work path",
  "layer.clip": "Create or release a clipping mask",
  "tool.text": "Text tool",
  "tool.hand": "Hand tool",
  "tool.zoom": "Zoom tool",
  "colors.swap": "Swap foreground and background colours",
  "colors.reset": "Reset colours to black and white",
};

export function ShortcutTable() {
  const rows = (Object.keys(LABELS) as ActionId[]).filter((id) => DEFAULT_KEYMAP[id].length > 0);
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Action</th>
          <th scope="col">macOS</th>
          <th scope="col">Windows / Linux</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((id) => (
          <tr key={id}>
            <td>{LABELS[id]}</td>
            <td>
              <kbd>{DEFAULT_KEYMAP[id].map((b) => formatBinding(b, true)).join("  ")}</kbd>
            </td>
            <td>
              <kbd>{DEFAULT_KEYMAP[id].map((b) => formatBinding(b, false)).join(" or ")}</kbd>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
