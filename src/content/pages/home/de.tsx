import { LatestPosts, WelcomeLinks } from "@/components/welcome/WelcomeLinks";
import type { HomeCopy } from "./types";

const FAQ = [
  [
    "Ist Picstea kostenlos?",
    "Ja. Es läuft in deinem Browser, ohne Konto, ohne Wasserzeichen und ohne Testphase.",
  ],
  [
    "Werden meine Bilder hochgeladen?",
    "Nein. Bilder werden auf deinem Gerät geöffnet, bearbeitet und exportiert. Picstea hat keinen Server, der sie empfängt.",
  ],
  [
    "Wo wird meine Arbeit gespeichert?",
    "Automatisch im Speicher dieses Browsers auf deinem Gerät. Mit Datei → Projekt speichern unter sicherst du eine .picstea-Kopie, oder du exportierst eine PSD.",
  ],
  [
    "Kann ich Photoshop-Dateien öffnen?",
    "Ja. PSD-Dateien in 8-Bit-RGB und Graustufen öffnen sich mit Ebenen, Gruppen, Masken, bearbeitbarem Text, Einstellungsebenen und gängigen Ebenenstilen.",
  ],
  [
    "Funktioniert es offline?",
    "Ja. Nach dem ersten Besuch kannst du Picstea als App installieren und ohne Verbindung weiterarbeiten.",
  ],
  [
    "Funktioniert es auf dem Handy?",
    "Das Layout passt sich kleinen Bildschirmen an, aber Picstea funktioniert am besten mit Maus oder Trackpad und Tastatur.",
  ],
  [
    "Ist es ein Ersatz für Photoshop oder Photopea?",
    "Für die meisten ebenenbasierten Fotobearbeitungs- und Designaufgaben: ja. Bei KI-Werkzeugen, CMYK-Druckvorstufe und 16-Bit-Bearbeitung liegt Photoshop weiterhin vorn.",
  ],
] as const;

const LINKS = [
  ["/online-photo-editor", "Kostenloser Online-Fotoeditor mit Ebenen"],
  ["/psd-editor", "PSD-Dateien online öffnen und bearbeiten"],
  ["/png-editor", "PNG-Editor"],
  ["/jpeg-editor", "JPEG-Editor"],
  ["/webp-editor", "WebP-Editor und -Konverter"],
  ["/image-resizer", "Bildgröße ändern"],
  ["/image-compressor", "Bild komprimieren"],
  ["/photo-filters", "Fotofilter"],
  ["/convert", "Bilder konvertieren (HEIC, WebP, PNG, JPG, SVG, PSD)"],
  ["/blur-background", "So zeichnest du den Hintergrund eines Fotos weich"],
  ["/make-background-transparent", "So machst du einen Hintergrund transparent"],
  ["/photoshop-alternative", "Eine kostenlose Photoshop-Alternative"],
  ["/photopea-alternative", "Picstea als Photopea-Alternative"],
  ["/gimp-alternative", "Picstea als GIMP-Alternative"],
  ["/docs", "Dokumentation"],
  ["/faq", "Häufig gestellte Fragen"],
  ["/about", "Über Picstea"],
] as const;

const copy: HomeCopy = {
  tagline: "Kostenloser Online-Fotoeditor",
  description:
    "Picstea ist ein kostenloser Online-Fotoeditor mit Ebenen, Masken und Einstellungsebenen. Bearbeite Bilder im Browser – sie verlassen nie dein Gerät.",
  welcome: {
    title: "Ein kostenloser Bildeditor, bei dem deine Bilder auf deinem Gerät bleiben",
    lead: "Picstea ist ein ebenenbasierter Bildeditor, der komplett in deinem Browser läuft.",
    highlights: [
      [
        "Privat von Grund auf",
        "Bearbeitet wird in deinem Browser. Deine Bilder werden nie hochgeladen.",
      ],
      [
        "Ebenen, die bearbeitbar bleiben",
        "Gruppen, Masken, 16 Füllmethoden, Einstellungsebenen und Effekte.",
      ],
      [
        "Auswählen, malen und schreiben",
        "Auswahlrechteck, Lasso und Zauberstab, Pinsel, Verläufe, Formen und Text direkt auf der Arbeitsfläche.",
      ],
      [
        "Öffnen und exportieren",
        "Rein kommen PNG, JPEG, WebP, GIF, SVG, HEIC und PSD mit Ebenen; raus gehen PSD, SVG, PDF und Bilder.",
      ],
    ],
    newHere: "Neu hier? Lies die {link}.",
    gettingStarted: "Einstiegsanleitung",
    learnMore: "Mehr erfahren",
    links: [
      ["/docs", "Dokumentation"],
      ["/blog", "Anleitungen"],
      ["/faq", "FAQ"],
      ["/photoshop-alternative", "Photoshop-Alternative"],
      ["/psd-editor", "PSD-Editor"],
    ],
    start: "Jetzt bearbeiten",
  },
  about: {
    summary: "Über Picstea: Funktionen, Datenschutz, Dateiformate und FAQ",
    body: () => (
      <>
        <h2>Was ist Picstea?</h2>
        <p>
          Picstea ist ein kostenloser Online-Bildeditor, der wie Photoshop und Photopea
          funktioniert: Ebenen, Masken, Einstellungsebenen, Auswahlen, Ebenenstile und Filter, mit
          vertrauter Menüleiste, Werkzeugleiste und Bedienfeldern. Er läuft komplett in deinem
          Webbrowser unter Windows, macOS, Linux und ChromeOS – ohne Installation und ohne
          Anmeldung.
        </p>

        <h2>Was du damit machen kannst</h2>
        <ul>
          <li>
            <strong>Ebenen:</strong> Pixel-, Form-, Text-, Füll- und Einstellungsebenen, Gruppen, 16
            Füllmethoden, Deckkraft, Ebenenmasken, Vektormasken und Schnittmasken.
          </li>
          <li>
            <strong>Korrekturen:</strong> Tonwertkorrektur, Gradationskurven, Helligkeit/Kontrast,
            Farbton/Sättigung, Belichtung, Dynamik, Farbbalance, Fotofilter, Kanalmixer,
            Verlaufsumsetzung, Schwarzweiß und mehr – als Einstellungsebenen, die du später noch
            ändern kannst.
          </li>
          <li>
            <strong>Ebenenstile:</strong> Schlagschatten, Schatten nach innen, Schein, Abgeflachte
            Kante und Relief, Glanz, Farb-, Verlaufs- und Musterüberlagerung sowie Kontur, mit
            Blend-If-Reglern und gespeicherten Stilen.
          </li>
          <li>
            <strong>Auswahlen:</strong> Auswahlrechteck, Lasso, Polygon-Lasso, Zauberstab und
            Farbbereich, mit weicher Kante, Erweitern, Verkleinern und Transformieren.
          </li>
          <li>
            <strong>Malen und Retuschieren:</strong> Pinsel, Buntstift, Radiergummis, Verlauf,
            Füllwerkzeug, Kopierstempel, Reparatur-Pinsel und Bereichsreparatur-Pinsel, Abwedler,
            Nachbelichter, Schwamm, Weichzeichner, Scharfzeichner und Wischfinger.
          </li>
          <li>
            <strong>Filter:</strong> das komplette Filter-Menü mit Live-Vorschau, darunter
            Weichzeichner, Verzerren, Rauschen, Scharfzeichnen, Camera Raw, Verflüssigen und
            Fluchtpunkt – auch als nicht-destruktive Smartfilter auf Smartobjekten.
          </li>
          <li>
            <strong>Text und Vektoren:</strong> bearbeitbarer Text, das Zeichenstift-Werkzeug und
            Formen.
          </li>
          <li>
            <strong>Automatisierung:</strong> Aktionen aufzeichnen und viele Bilder per
            Stapelverarbeitung in eine ZIP-Datei verarbeiten.
          </li>
        </ul>

        <h2>Warum deine Bilder auf deinem Gerät bleiben</h2>
        <p>
          Picstea arbeitet lokal. Deine Bilder werden in deinem Browser geöffnet, bearbeitet,
          gespeichert und exportiert; es gibt keinen Upload-Schritt und keinen Server, der sie
          empfängt. Die Editor-Seite führt keinen Code von Drittanbietern aus, und ihre
          Sicherheitsrichtlinie verhindert, dass Dokumentdaten irgendwohin gesendet werden. Projekte
          werden automatisch in deinem Browser gespeichert, und nach dem ersten Besuch lässt sich
          Picstea als App installieren und offline nutzen.
        </p>

        <h2>Dateiformate</h2>
        <p>
          Picstea öffnet PNG, JPEG, WebP, GIF, SVG, HEIC (iPhone-Fotos), Photoshop-PSD (8-Bit-RGB
          und Graustufen) und eigene .picstea-Projekte. Exportiert werden PNG, JPEG, WebP, SVG, PDF
          und PSD mit Ebenen. PSB, PSD in 16/32 Bit oder CMYK, TIFF, PDF und Kamera-RAW-Dateien
          lassen sich noch nicht öffnen.
        </p>

        <h2>Häufig gestellte Fragen</h2>
        <dl>
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>

        <h2>Mehr erfahren</h2>
        <WelcomeLinks links={LINKS} />
        <LatestPosts />
      </>
    ),
  },
};

export default copy;
