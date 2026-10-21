import { LocalLink as Link } from "@/components/site/LocalLink";
import pkg from "../../../../package.json";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Über Picstea",
  description:
    "Picstea ist ein kostenloser, ebenenbasierter Fotoeditor, der komplett im Browser läuft. Deine Bilder bleiben auf deinem Gerät: Nichts wird hochgeladen.",
  lead: "Ein kostenloser, ebenenbasierter Bildeditor im Browser, gebaut, damit deine Bilder nie dein Gerät verlassen.",
  faqs: [],
  body: () => (
    <>
      <h2>Was Picstea ist</h2>
      <p>
        Picstea ist ein Fotoeditor, der wie die Desktop-Programme funktioniert, die du vielleicht
        kennst: Ebenen und Gruppen, Masken, Füllmethoden, Einstellungsebenen, ein vollständiger
        Ebenenstil-Dialog, Auswahlen, Retusche-Pinsel, Text, Formen und Pfade, Smartobjekte und
        Filter. Er öffnet und speichert Photoshop-Dateien (PSD) mit ihren Ebenen und exportiert PNG,
        JPEG, WebP, SVG und PDF. Die <Link href="/docs">Dokumentation</Link> (auf Englisch)
        beschreibt jedes Werkzeug.
      </p>

      <h2>Deine Bilder bleiben auf deinem Gerät</h2>
      <p>
        Alles passiert in deinem Browser. Picstea hat keinen Server, der Bilder empfängt, und die
        Editor-Seite ist so eingerichtet, dass sie keine Dokumentdaten irgendwohin senden kann.
        Deine Arbeit wird automatisch im Speicher dieses Browsers gesichert; lade ein{" "}
        <code>.picstea</code>-Projekt herunter oder exportiere ein Bild, wann immer du eine Kopie an
        anderer Stelle möchtest. Nach dem ersten Besuch funktioniert der Editor auch offline, und in
        Chrome und Edge kannst du ihn als App installieren.
      </p>

      <h2>Kostenlos, ohne Konto</h2>
      <p>
        Es gibt keine Anmeldung, kein Wasserzeichen und kein Limit beim Exportieren. Picstea
        finanziert sich durch Werbung auf der Website und im Blog sowie durch klar gekennzeichnetes
        Sponsoring neben der Arbeitsfläche – nie über deiner Arbeit; die{" "}
        <Link href="/sponsorship">Sponsoring-Seite</Link> (auf Englisch) erklärt, wie das
        funktioniert. Die <Link href="/privacy">Datenschutzerklärung</Link> und die{" "}
        <Link href="/cookies">Cookie-Richtlinie</Link> (beide auf Englisch) führen genau auf, was
        gespeichert wird und warum.
      </p>

      <h2>Wer Picstea macht</h2>
      <p>
        Picstea wird von <Link href="/authors/siavash-ghanbari">Siavash Ghanbari</Link> entwickelt.
        Auf dem YouTube-Kanal SiaBarry erklärt Siavash auch Technik und Software. Jede Anleitung im{" "}
        <Link href="/blog">Blog</Link> (auf Englisch) wird am Editor selbst geschrieben und geprüft.
      </p>

      <h2>Wie es gebaut ist</h2>
      <p>
        Picstea ist in TypeScript mit React und Next.js geschrieben. Der Editor selbst – Dokumente,
        Rendering, Dateiformate und Werkzeuge – ist schlichter Code, der im Browser und in einem
        Hintergrund-Worker läuft, ohne Dienste von Drittanbietern. Änderungen werden Release für
        Release aufgelistet, und der <Link href="/blog">Blog</Link> (auf Englisch) erklärt neue
        Funktionen.
      </p>
      <p>
        <small>Version {pkg.version}</small>
      </p>

      <h2>Open-Source-Software</h2>
      <p>
        Um HEIC-Fotos zu öffnen, nutzt Picstea{" "}
        <a href="https://github.com/strukturag/libheif" rel="noopener">
          libheif
        </a>{" "}
        (GNU LGPL 3.0), kompiliert zu WebAssembly von{" "}
        <a href="https://github.com/catdad-experiments/libheif-js" rel="noopener">
          libheif-js
        </a>{" "}
        1.23.5. Die Bibliothek wird unverändert als eigene Datei ausgeliefert, nur geladen, wenn du
        ein HEIC-Foto öffnest, und läuft auf deinem Gerät. Lizenzen:{" "}
        <a href="/vendor/libheif/1.23.5/LICENSE-libheif.txt">libheif</a>,{" "}
        <a href="/vendor/libheif/1.23.5/LICENSE-libheif-js.txt">libheif-js</a>. Du kannst diese
        Datei durch deinen eigenen Build der Bibliothek ersetzen.
      </p>

      <h2>Sprachen</h2>
      <p>
        Picstea gibt es auf Englisch, Spanisch, Portugiesisch (Brasilien) und Deutsch. Die
        Übersetzungen des Editors und dieser Seiten wurden maschinell erstellt und noch nicht von
        Muttersprachlern geprüft; Korrekturen sind willkommen. Dokumentation, Blog und rechtliche
        Seiten sind auf Englisch.
      </p>

      <h2>Kontakt</h2>
      <p>
        Wer Picstea betreibt und wie du Kontakt aufnimmst, steht im{" "}
        <Link href="/imprint">Impressum</Link> (auf Englisch). Bei Fragen zur Nutzung des Editors
        fang am besten mit den <Link href="/faq">FAQ</Link> an.
      </p>
    </>
  ),
};

export default copy;
