import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Kostenloser Online-JPEG-Editor",
  description:
    "Bearbeite JPG- und JPEG-Fotos im Browser mit Ebenen, Korrekturen, Retusche und Filtern und exportiere ein JPEG in deiner Qualität. Kostenlos, ohne Upload.",
  lead: "Picstea ist ein kostenloser JPEG-Editor, der in deinem Browser läuft. Öffne ein JPG-Foto, korrigiere Licht und Farbe mit Einstellungsebenen, retuschiere es und exportiere ein neues JPEG in der Qualität, die du wählst. Deine Fotos verlassen nie dein Gerät.",
  faqs: [
    {
      q: "Ist JPG dasselbe wie JPEG?",
      a: "Ja. JPG und JPEG sind zwei Namen für dasselbe Format. Picstea öffnet beide und speichert Exporte mit der Endung .jpg.",
    },
    {
      q: "Verliert mein JPEG durch die Bearbeitung an Qualität?",
      a: "Nicht während du bearbeitest: Picstea arbeitet mit den dekodierten Pixeln, und Einstellungsebenen verändern das Original nie. Die Qualität sinkt nur einmal, beim Export als JPEG. Wähl eine hohe Qualität (Standard ist 90), damit es scharf bleibt.",
    },
    {
      q: "Werden meine Fotos hochgeladen?",
      a: "Nein. Fotos werden auf deinem Gerät geöffnet, bearbeitet und exportiert. Picstea hat keinen Server, der deine Bilder empfängt.",
    },
    {
      q: "Steht das Foto richtig herum?",
      a: "Ja. Picstea folgt der Ausrichtung, die die Kamera in der Datei gespeichert hat, sodass Fotos vom Handy aufrecht geöffnet werden.",
    },
    {
      q: "Kann ein JPEG einen transparenten Hintergrund haben?",
      a: "Nein, das Format kennt keine Transparenz, daher werden transparente Bereiche beim Export weiß. Exportiere als PNG oder WebP, um die Transparenz zu behalten.",
    },
  ],
  body: () => (
    <>
      <h2>Ein JPEG in vier Schritten bearbeiten</h2>
      <ol>
        <li>Öffne den Editor und zieh dein JPG- oder JPEG-Foto auf die Seite.</li>
        <li>
          Korrigiere Belichtung und Farbe mit Ebene → Neue Einstellungsebene: Tonwertkorrektur,
          Gradationskurven, Helligkeit/Kontrast, Farbton/Sättigung, Dynamik oder Farbbalance. Oder
          nutze Filter → Camera Raw für alles in einem Dialog.
        </li>
        <li>
          Entferne Flecken mit dem Bereichsreparatur-Pinsel oder dem Kopierstempel und stelle mit
          dem Freistellungswerkzeug frei oder richte das Bild gerade aus.
        </li>
        <li>Wähle Datei → Exportieren als…, nimm JPEG, stell die Qualität ein und speichere.</li>
      </ol>
      <h2>Was du mit einem JPEG machen kannst</h2>
      <ul>
        <li>Licht und Farbe mit Einstellungsebenen korrigieren, die du jederzeit ändern kannst.</li>
        <li>
          Retuschieren mit Reparatur-Pinsel, Bereichsreparatur-Pinsel, Kopierstempel, Rote Augen,
          Abwedler, Nachbelichter und Schwamm.
        </li>
        <li>
          Über das Menü Filter scharfzeichnen, Rauschen reduzieren oder den Hintergrund
          weichzeichnen.
        </li>
        <li>Text, Formen, Logos und Wasserzeichen auf eigenen Ebenen hinzufügen.</li>
        <li>
          Die Größe mit Bild → Bildgröße… ändern oder mit Arbeitsfläche… einen Rahmen hinzufügen.
        </li>
        <li>
          Dieselben Änderungen auf viele Fotos anwenden: Zeichne eine Aktion auf und nutze dann
          Datei → Automatisieren → Stapelverarbeitung…, um die Ergebnisse als eine ZIP-Datei zu
          erhalten.
        </li>
      </ul>
      <h2>Wann JPEG die richtige Wahl ist</h2>
      <p>
        JPEG ist das Standardformat für Fotos: Die Dateien sind klein und jedes Gerät kann sie
        öffnen. Für Grafiken, Text oder Transparenz nimm <Link href="/png-editor">PNG</Link>; für
        möglichst kleine Dateien auf einer Website probier <Link href="/webp-editor">WebP</Link>.
        Wie du ein JPEG kleiner machst, steht in der Anleitung zum{" "}
        <Link href="/image-compressor">Bildkompressor</Link>, und einen Vergleich der Formate
        findest du in <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> (auf
        Englisch). Um ein JPG ohne Bearbeitung in ein PNG umzuwandeln, nutze den{" "}
        <Link href="/convert/jpg-to-png">JPG in PNG</Link>-Konverter.
      </p>
      <h2>Einschränkungen</h2>
      <p>
        Bilder können bis zu 12.000 Pixel pro Seite (36 Megapixel) groß sein. Kamera-RAW-Dateien
        lassen sich noch nicht öffnen, und Kameradaten wie Datum und Aufnahmeort werden nicht in
        exportierte Dateien übernommen.
      </p>
    </>
  ),
};

export default copy;
