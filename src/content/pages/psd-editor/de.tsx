import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Online-PSD-Editor: Photoshop-Dateien öffnen",
  description:
    "Öffne und bearbeite PSD-Dateien online mit Ebenen, Gruppen und Masken und speichere sie wieder als PSD. Die Datei bleibt auf deinem Computer.",
  lead: "Picstea öffnet Photoshop-Dateien (PSD) direkt in deinem Browser, behält ihre Ebenen bei und lässt dich sie wieder als PSD speichern – ohne die Datei irgendwohin hochzuladen.",
  faqs: [
    {
      q: "Kann ich eine PSD ohne Photoshop öffnen?",
      a: "Ja. Picstea öffnet PSD-Dateien in 8-Bit-RGB und Graustufen im Browser, mit Ebenen, Gruppen, Masken, Füllmethoden, bearbeitbarem Text, Einstellungsebenen, Formebenen, Smartobjekten und gängigen Ebenenstilen.",
    },
    {
      q: "Wird meine PSD auf einen Server hochgeladen?",
      a: "Nein. Die Datei wird in deinem Browser gelesen und verlässt nie dein Gerät.",
    },
    {
      q: "Kann ich wieder als PSD speichern?",
      a: "Ja. Datei → Exportieren als… → PSD schreibt eine PSD mit Ebenen, Gruppen, Masken, Vektormasken, Schnittmasken, Einstellungsebenen, Deckkraft und Füllmethoden.",
    },
    {
      q: "Was wird nicht übernommen?",
      a: "Für einige Photoshop-Funktionen gibt es in Picstea noch kein Gegenstück: Korrekturen wie Selektive Farbkorrektur oder Color Lookup, verkrümmter Text und Smartfilter behalten ihr Aussehen als Pixel oder fallen weg, und Photoshop-Musterbilder werden durch eingebaute Muster ersetzt. Bei Text solltest du eventuell die Schrift prüfen. Picstea zeigt beim Öffnen der Datei an, was sich geändert hat.",
    },
  ],
  body: () => (
    <>
      <h2>So bearbeitest du eine PSD online</h2>
      <ol>
        <li>Öffne den Editor und wähle „Bild öffnen“ oder zieh die .psd-Datei auf die Seite.</li>
        <li>Deine Ebenen erscheinen im Ebenen-Bedienfeld, samt Gruppen und Masken.</li>
        <li>
          Bearbeiten: Ebenen verschieben und transformieren, malen, maskieren, Einstellungsebenen
          hinzufügen.
        </li>
        <li>
          Speichere mit Datei → Exportieren als… → PSD oder exportiere PNG, JPEG, WebP oder PDF.
        </li>
      </ol>
      <h2>Unterstützt</h2>
      <ul>
        <li>PSD-Dateien in 8-Bit-RGB und Graustufen bis 12.000 Pixel pro Seite.</li>
        <li>Pixelebenen, Gruppen, Ebenennamen, Deckkraft, Sichtbarkeit und Füllmethoden.</li>
        <li>Ebenenmasken, auch auf Gruppen; Vektormasken und Schnittmasken.</li>
        <li>
          Bearbeitbare Textebenen (erster Stil jeder Ebene; Schriften werden gängigen Schriften
          zugeordnet).
        </li>
        <li>
          Einstellungsebenen: Tonwertkorrektur, Gradationskurven, Helligkeit/Kontrast,
          Farbton/Sättigung, Dynamik, Farbbalance, Fotofilter, Kanalmixer, Verlaufsumsetzung,
          Belichtung, Umkehren, Tontrennung, Schwellenwert, Schwarzweiß.
        </li>
        <li>Form- und Volltonfarben-Füllebenen, eingebettete Smartobjekte.</li>
        <li>
          Ebenenstile: alle zehn Photoshop-Effekte mit ihren Einstellungen, mehrere Kopien von
          Schatten, Konturen und Überlagerungen, Flächendeckkraft und globaler Lichteinfall.
        </li>
      </ul>
      <h2>Noch nicht unterstützt</h2>
      <ul>
        <li>PSB-Dateien (große Dokumente), 16/32-Bit-Farbe und CMYK.</li>
        <li>
          Die Korrekturen Selektive Farbkorrektur und Color Lookup; eigene Musterbilder (das
          ähnlichste eingebaute Muster wird verwendet); verkrümmter Text; Photoshop-Smartfilter und
          verknüpfte Smartobjekte.
        </li>
        <li>
          Beim Speichern als PSD behalten Text, Formen, Smartobjekte und Stile ihr Aussehen als
          Pixel.
        </li>
      </ul>
      <p>
        Mehr Details unter <Link href="/docs/file-formats">Dateiformate</Link> (auf Englisch).
      </p>
    </>
  ),
};

export default copy;
