import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Kostenloser Online-Fotoeditor mit Ebenen",
  description:
    "Bearbeite Fotos im Browser mit Ebenen, Masken, Einstellungsebenen, Auswahlen und Effekten. Kostenlos, ohne Anmeldung – deine Fotos werden nie hochgeladen.",
  lead: "Picstea ist ein kostenloser Fotoeditor, der in deinem Browser läuft. Er hat Ebenen, Masken, Einstellungsebenen und Auswahlen wie ein Desktop-Editor – und deine Fotos verlassen nie dein Gerät.",
  faqs: [
    {
      q: "Ist Picstea kostenlos?",
      a: "Ja. Der Editor ist kostenlos in deinem Browser nutzbar, ohne Konto und ohne Wasserzeichen.",
    },
    {
      q: "Werden meine Fotos hochgeladen?",
      a: "Nein. Fotos werden auf deinem Gerät geöffnet, bearbeitet und exportiert. Picstea hat keinen Server, der deine Bilder empfängt.",
    },
    {
      q: "In welche Formate kann ich exportieren?",
      a: "PNG, JPEG, WebP, SVG, PDF und PSD mit Ebenen.",
    },
    {
      q: "Kann ich Hautunreinheiten oder störende Objekte entfernen?",
      a: "Ja. Mit dem Reparatur-Pinsel entfernst du Flecken und Unreinheiten (er passt Farbe und Helligkeit an die Umgebung an), mit dem Kopierstempel kopierst du einen Bereich über einen anderen. Beides läuft in deinem Browser; nichts wird hochgeladen.",
    },
    {
      q: "Kann ich viele Fotos auf einmal bearbeiten?",
      a: "Ja. Zeichne eine Aktion auf (zum Beispiel eine Korrektur und einen Filter) und wende sie dann mit Datei → Automatisieren → Stapelverarbeitung… auf viele Fotos an. Die Ergebnisse werden als eine ZIP-Datei gespeichert, die auf deinem Gerät erstellt wird.",
    },
    {
      q: "Funktioniert es offline?",
      a: "Ja. Nach dem ersten Besuch kannst du Picstea als App installieren und ohne Verbindung weiterarbeiten.",
    },
  ],
  body: () => (
    <>
      <h2>Ein Foto in vier Schritten bearbeiten</h2>
      <ol>
        <li>Öffne den Editor und klicke auf „Bild öffnen“ (oder zieh ein Foto auf die Seite).</li>
        <li>
          Korrigiere es nicht-destruktiv: Ebene → Neue Einstellungsebene → Helligkeit/Kontrast,
          Farbton/Sättigung oder Belichtung.
        </li>
        <li>
          Wähle einen Bereich mit Auswahlrechteck, Lasso oder Zauberstab aus, um nur diesen Teil zu
          bearbeiten.
        </li>
        <li>Datei → Exportieren als… und wähle JPEG, PNG oder WebP.</li>
      </ol>
      <h2>Was du machen kannst</h2>
      <ul>
        <li>
          Fertige Formate für Social-Media-Posts, Druck (A4, Letter, Visitenkarten), Fotos,
          Bildschirme, Handys, Anzeigen und Icons, in Pixeln, Zoll, Zentimetern oder Millimetern.
        </li>
        <li>Ebenen mit 16 Füllmethoden, Deckkraft, Gruppen und Ebenenmasken.</li>
        <li>
          Mehrere Ebenen auswählen, um sie gemeinsam zu verschieben, zu skalieren, zu drehen,
          auszurichten und zu verteilen.
        </li>
        <li>
          Einstellungsebenen – darunter Tonwertkorrektur und Gradationskurven –, die die
          Original-Pixel nie verändern.
        </li>
        <li>
          Das komplette Filter-Menü von Photoshop, darunter Camera Raw, Verflüssigen und
          Fluchtpunkt; Smartobjekte und Smartfilter.
        </li>
        <li>
          Auswahlen mit Auswahlrechteck, Lasso und Zauberstab; weiche Kante, Erweitern, Verkleinern,
          Transformieren.
        </li>
        <li>Pinsel, Buntstift, Radiergummi, Füllwerkzeug, Verlauf, Formen und Text.</li>
        <li>
          Retusche: Kopierstempel, Reparatur-Pinsel, Abwedler, Nachbelichter, Schwamm,
          Weichzeichner, Scharfzeichner und Wischfinger.
        </li>
        <li>Korrekturen mit Dynamik, Farbbalance, Kanalmixer, Verlaufsumsetzung und Fotofilter.</li>
        <li>
          Schlagschatten, Schein, Glanz, abgeflachte Kanten, Konturen sowie Farb-, Verlaufs- oder
          Musterüberlagerungen, mit mehreren Kopien und gespeicherten Stilen.
        </li>
        <li>
          PSD-Dateien mit Ebenen öffnen und speichern; PNG, JPEG, WebP, SVG und PDF exportieren.
        </li>
        <li>
          Aktionen aufzeichnen und abspielen oder viele Fotos per Stapelverarbeitung in einen
          einzigen ZIP-Download verarbeiten.
        </li>
        <li>Ein Farbwähler mit Hex-, RGB- und HSB-Werten sowie eigenen Farbfeldern.</li>
        <li>
          Projekte werden automatisch in deinem Browser gespeichert; mit dem Protokoll-Bedienfeld
          gehst du beliebig viele Schritte zurück.
        </li>
      </ul>
      <h2>Einschränkungen</h2>
      <p>
        Bilder können bis zu 12.000 Pixel pro Seite groß sein (36 Megapixel). Es gibt keine
        KI-Werkzeuge wie automatisches Entfernen des Hintergrunds oder inhaltsbasiertes Füllen.
        Alles, was verfügbar ist, findest du in der <Link href="/docs">Dokumentation</Link> (auf
        Englisch).
      </p>
    </>
  ),
};

export default copy;
