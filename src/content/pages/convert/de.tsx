import { ConverterList } from "@/components/site/ConverterList";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Kostenloser Bildkonverter ganz ohne Upload",
  description:
    "Wandle HEIC-, WebP-, PNG-, JPG-, SVG- und PSD-Bilder im Browser in PNG, JPG oder WebP um. Kostenlos, ohne Anmeldung, mit Stapelverarbeitung, ohne Upload.",
  lead: "Picstea wandelt Bilder zwischen PNG, JPG und WebP um – und macht aus iPhone-HEIC-Fotos, SVG- und Photoshop-PSD-Dateien JPG oder PNG – direkt in deinem Browser. Wähle unten einen Konverter oder öffne den Konverter direkt; deine Dateien verlassen nie dein Gerät.",
  faqs: [
    {
      q: "Welche Formate kann ich konvertieren?",
      a: "Picstea liest PNG-, JPEG-, WebP-, GIF- (erstes Frame), SVG-, HEIC- (iPhone-Fotos) und PSD-Dateien und wandelt sie in PNG, JPG oder WebP um.",
    },
    {
      q: "Werden meine Dateien hochgeladen?",
      a: "Nein. Das Konvertieren passiert in deinem Browser, im Editor von Picstea, der keinen Server hat, der Dateien empfängt. Auch im Browser wird nichts gespeichert.",
    },
    {
      q: "Wie viele Dateien kann ich auf einmal konvertieren?",
      a: "Bis zu 200. Eine einzelne Datei wird direkt gespeichert; mehrere werden zusammen in einer ZIP-Datei gespeichert.",
    },
    {
      q: "Gibt es ein Größenlimit?",
      a: "Dateien dürfen bis zu 200 MB groß sein und Bilder bis zu 12.000 Pixel pro Seite haben (36 Megapixel).",
    },
  ],
  body: () => (
    <>
      <h2>Konverter</h2>
      <ConverterList />
      <h2>Warum im Browser konvertieren?</h2>
      <p>
        Die meisten Online-Konverter laden dein Bild auf einen Server hoch, wandeln es dort um und
        schicken es zurück. Picstea erledigt die Arbeit auf deinem eigenen Computer oder Handy –
        private Fotos und Arbeitsdateien bleiben also privat, und als App installiert funktioniert
        es auch offline.
      </p>
      <p>
        Du willst auch das Bild selbst ändern? Öffne es im Editor, bearbeite es und nutze dann Datei
        → Exportieren als…. Im Editor öffnet Datei → Konvertieren… denselben Konverter.
      </p>
    </>
  ),
};

export default copy;
