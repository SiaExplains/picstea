import { describe, expect, it } from "vitest";
import { pdfString, writePdf } from "./pdf-write";

const latin1 = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");

function checkStructure(text: string): void {
  const startxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(text)![1]);
  expect(text.slice(startxref, startxref + 4)).toBe("xref");
  const table = text.slice(startxref).split("\n");
  const count = Number(table[1].split(" ")[1]);
  for (let i = 1; i < count; i++) {
    const offset = Number(table[2 + i].slice(0, 10));
    expect(text.slice(offset, offset + `${i} 0 obj`.length)).toBe(`${i} 0 obj`);
  }
}

describe("PDF export", () => {
  it("writes a valid one-page PDF with a soft mask, sized by resolution", async () => {
    const bytes = await writePdf({
      width: 300,
      height: 150,
      ppi: 150,
      image: {
        kind: "lossless",
        rgb: new Uint8Array(300 * 150 * 3),
        alpha: new Uint8Array(300 * 150),
      },
      title: "Poster (draft)",
    });
    const text = latin1(bytes);
    expect(text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(text).toContain("/MediaBox [0 0 144 72]");
    expect(text).toContain("/SMask 6 0 R");
    expect(text).toContain("/Title (Poster \\(draft\\))");
    checkStructure(text);
  });

  it("embeds JPEG bytes unchanged", async () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
    const text = latin1(
      await writePdf({ width: 2, height: 2, ppi: 72, image: { kind: "jpeg", jpeg } }),
    );
    expect(text).toContain("/Filter /DCTDecode");
    expect(text).toContain("/Length 4 >>\nstream\n\xff\xd8\xff\xd9\nendstream");
    checkStructure(text);
  });

  it("escapes strings", () => {
    expect(pdfString("a(b)\\c é")).toBe("(a\\(b\\)\\\\c ?)");
  });
});
