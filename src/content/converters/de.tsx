import { LocalLink as Link } from "@/components/site/LocalLink";
import type { Faq } from "@/components/site/LandingPage";
import type { ConverterPage } from "./types";

const PRIVATE: Faq = {
  q: "Wird meine Datei hochgeladen?",
  a: "Nein. Die Konvertierung läuft in deinem Browser, im Editor von Picstea, der keinen Server hat, der Dateien empfangen könnte, und das Senden von Dateien blockiert. Auch im Browser wird nichts gespeichert.",
};

const MANY: Faq = {
  q: "Kann ich mehrere Dateien auf einmal konvertieren?",
  a: "Ja. Wähle bis zu 200 Dateien aus oder zieh sie hinein; eine einzelne Datei wird direkt gespeichert, mehrere zusammen in einer ZIP-Datei.",
};

const CONVERTERS: readonly ConverterPage[] = [
  {
    id: "webp-to-png",
    label: "WebP in PNG",
    title: "WebP online in PNG umwandeln",
    description:
      "Wandle WebP-Bilder im Browser in PNG-Dateien um – mit Transparenz und ohne Qualitätsverlust. Kostenlos, ohne Anmeldung, nichts wird hochgeladen.",
    lead: "Um WebP in PNG zu konvertieren, klick auf „WebP in PNG jetzt konvertieren“, zieh deine .webp-Dateien hinein und speichere die PNGs. Die Transparenz bleibt erhalten, PNG ist verlustfrei und die Konvertierung passiert auf deinem eigenen Gerät.",
    body: () => (
      <>
        <h2>Warum WebP in PNG umwandeln?</h2>
        <p>
          Websites liefern WebP aus, weil es klein ist, aber manche Apps, ältere Bildbetrachter und
          Upload-Formulare akzeptieren immer noch nur PNG oder JPEG. PNG lässt sich überall öffnen
          und behält transparente Hintergründe – damit ist es die sichere Wahl für Logos, Icons und
          Screenshots aus dem Web.
        </p>
        <h2>Was dich erwartet</h2>
        <ul>
          <li>Transparente Bereiche bleiben transparent.</li>
          <li>
            PNG ist verlustfrei, das Ergebnis sieht also genau wie das WebP aus – ist aber meist
            größer, bei Fotos oft um ein Vielfaches.
          </li>
          <li>Animierte WebP-Dateien werden als einzelnes Standbild konvertiert.</li>
        </ul>
        <p>
          Du brauchst lieber eine kleinere Datei?{" "}
          <Link href="/convert/webp-to-jpg">WebP in JPG umwandeln</Link>.
        </p>
      </>
    ),
    faqs: [
      {
        q: "Sieht das PNG schlechter aus als das WebP?",
        a: "Nein. PNG behält jedes Pixel exakt bei, das PNG sieht also genauso aus wie das WebP. Details, die ein verlustbehaftetes WebP schon verworfen hat, kann es aber nicht zurückholen.",
      },
      PRIVATE,
      MANY,
      {
        q: "Kann ich das Bild vor dem Konvertieren bearbeiten?",
        a: "Ja. Öffne es stattdessen im Editor (Datei → Bild öffnen…), nimm deine Änderungen vor, wähle dann Datei → Exportieren als… und entscheide dich für PNG.",
      },
    ],
  },
  {
    id: "webp-to-jpg",
    label: "WebP in JPG",
    title: "WebP online in JPG umwandeln",
    description:
      "Wandle WebP-Bilder im Browser in JPG um und wähle die Qualität. Kostenlos, privat, nichts wird hochgeladen – für einzelne Dateien oder viele auf einmal.",
    lead: "Um WebP in JPG zu konvertieren, klick auf „WebP in JPG jetzt konvertieren“, zieh deine .webp-Dateien hinein, stell die Qualität ein und speichere. Die JPGs öffnen sich in jeder App, und die Konvertierung passiert auf deinem Gerät.",
    body: () => (
      <>
        <h2>Warum WebP in JPG umwandeln?</h2>
        <p>
          JPG (JPEG) ist das Format, das jedes Handy, jede Kamera-App, jeder Druckdienst und jedes
          E-Mail-Programm versteht. Wenn du ein WebP-Foto in JPG umwandelst, bleibt die Datei klein
          und jeder kann sie öffnen.
        </p>
        <h2>Was dich erwartet</h2>
        <ul>
          <li>
            JPG kennt keine Transparenz: Transparente Bereiche werden weiß. Nutze{" "}
            <Link href="/convert/webp-to-png">WebP in PNG</Link>, um sie zu behalten.
          </li>
          <li>
            Mit Qualität 80–90 sehen Fotos bei kleiner Dateigröße gleich aus; 90 ist voreingestellt.
          </li>
          <li>Animierte WebP-Dateien werden als einzelnes Standbild konvertiert.</li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Ist JPG dasselbe wie JPEG?",
        a: "Ja, das sind zwei Namen für dasselbe Format. Picstea speichert konvertierte Dateien mit der Endung .jpg.",
      },
      {
        q: "Warum ist mein Hintergrund weiß?",
        a: "JPG kann keine Transparenz speichern, deshalb werden transparente Pixel mit Weiß gefüllt. Konvertiere in PNG oder behalte WebP, wenn du Transparenz brauchst.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "png-to-jpg",
    label: "PNG in JPG",
    title: "PNG online in JPG umwandeln",
    description:
      "Wandle PNG-Bilder im Browser in kleinere JPG-Dateien um und wähle die Qualität. Kostenlos, ohne Anmeldung, kein Upload; Transparenz wird zu Weiß.",
    lead: "Um PNG in JPG zu konvertieren, klick auf „PNG in JPG jetzt konvertieren“, zieh deine PNG-Dateien hinein, wähle eine Qualität und speichere. Fotos schrumpfen meist auf einen Bruchteil ihrer PNG-Größe, und nichts verlässt dein Gerät.",
    body: () => (
      <>
        <h2>Warum PNG in JPG umwandeln?</h2>
        <p>
          PNG ist verlustfrei, deshalb werden Fotos und Screenshots von Fotos sehr groß. JPG
          komprimiert Fotos viel besser – Konvertieren ist also der schnellste Weg, ein Bild klein
          genug für eine E-Mail, eine Website oder ein Upload-Formular mit Größenlimit zu bekommen.
        </p>
        <h2>Was dich erwartet</h2>
        <ul>
          <li>Transparente Bereiche werden weiß, weil JPG keine Transparenz kennt.</li>
          <li>
            Text, Logos und flächige Grafiken können in JPG weiche Kanten bekommen. Dafür ist{" "}
            <Link href="/convert/png-to-webp">PNG in WebP</Link> meist die bessere Wahl.
          </li>
          <li>
            Niedrigere Qualität bedeutet eine kleinere Datei; prüf das Ergebnis, bevor du es
            verwendest.
          </li>
        </ul>
        <p>
          Um die Datei noch kleiner zu machen, verkleinere das Bild vorher – siehe den Ratgeber zum{" "}
          <Link href="/image-compressor">Bildkomprimierer</Link>.
        </p>
      </>
    ),
    faqs: [
      {
        q: "Wie viel kleiner wird das JPG?",
        a: "Das hängt vom Bild ab. Ein als PNG gespeichertes Foto wird als JPG mit Qualität 80–90 oft um ein Vielfaches kleiner; flächige Grafiken schrumpfen weniger.",
      },
      {
        q: "Kann ich einen transparenten Hintergrund behalten?",
        a: "Nicht in JPG. Konvertiere stattdessen in WebP – das ist klein und behält die Transparenz.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "jpg-to-png",
    label: "JPG in PNG",
    title: "JPG online in PNG umwandeln",
    description:
      "Wandle JPG- oder JPEG-Fotos im Browser in verlustfreie PNG-Dateien um. Kostenlos, ohne Anmeldung, privat: Deine Fotos landen nie auf einem Server.",
    lead: "Um JPG in PNG zu konvertieren, klick auf „JPG in PNG jetzt konvertieren“, zieh deine JPG- oder JPEG-Dateien hinein und speichere die PNGs. Das PNG behält das Bild genau so, wie es ist, und die Konvertierung passiert auf deinem Gerät.",
    body: () => (
      <>
        <h2>Warum JPG in PNG umwandeln?</h2>
        <p>
          Manche Tools und Upload-Formulare verlangen PNG, und PNG ist der bessere Ausgangspunkt,
          wenn du ein Bild mehrfach bearbeiten willst: Es verliert beim erneuten Speichern nie an
          Qualität, während jedes neue Speichern als JPG das Bild noch einmal komprimiert.
        </p>
        <h2>Was dich erwartet</h2>
        <ul>
          <li>Das PNG sieht genau wie das JPG aus, inklusive aller Kompressionsartefakte.</li>
          <li>Die Datei wird größer, weil PNG verlustfrei ist.</li>
          <li>
            Durch das Konvertieren entsteht keine Transparenz. Um einen Hintergrund zu entfernen,
            öffne das Foto im Editor und nutze den Magischen Radiergummi oder den
            Hintergrund-Radiergummi, und exportiere dann ein PNG.
          </li>
          <li>
            Handyfotos werden richtig herum gedreht – anhand der Ausrichtung, die die Kamera
            gespeichert hat.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Verbessert das Konvertieren in PNG die Qualität?",
        a: "Nein. PNG bewahrt das Bild exakt, kann aber keine Details zurückholen, die die JPEG-Kompression entfernt hat. Es verhindert weiteren Verlust, wenn du erneut speicherst.",
      },
      {
        q: "Bleiben die Kamerainformationen erhalten?",
        a: "Nein. Angaben wie Datum, Kameramodell und Standort werden nicht ins PNG übernommen.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "png-to-webp",
    label: "PNG in WebP",
    title: "PNG online in WebP umwandeln",
    description:
      "Wandle PNG-Bilder in kleine WebP-Dateien fürs Web um – mit Transparenz und einstellbarer Qualität. Kostenlos, privat, nichts wird hochgeladen.",
    lead: "Um PNG in WebP zu konvertieren, klick auf „PNG in WebP jetzt konvertieren“, zieh deine PNG-Dateien hinein, wähle eine Qualität und speichere. WebP-Dateien behalten die Transparenz und sind meist deutlich kleiner, wodurch Webseiten schneller laden.",
    body: () => (
      <>
        <h2>Warum PNG in WebP umwandeln?</h2>
        <p>
          Bilder sind oft der schwerste Teil einer Webseite. WebP speichert dasselbe Bild in weniger
          Bytes als PNG oder JPEG und behält – anders als JPEG – transparente Hintergründe. Damit
          passt es gut für Produktfotos, Illustrationen und Logos auf einer Website.
        </p>
        <h2>Was dich erwartet</h2>
        <ul>
          <li>Die Transparenz bleibt erhalten.</li>
          <li>
            Der WebP-Export ist verlustbehaftet: Mit Qualität 80–90 sehen die meisten Bilder gleich
            aus. Nimm 100 für Screenshots mit kleiner Schrift.
          </li>
          <li>
            Jeder aktuelle Browser zeigt WebP an; manche älteren Desktop-Apps können es nicht
            öffnen. Wandle es bei Bedarf mit <Link href="/convert/webp-to-png">WebP in PNG</Link>{" "}
            zurück.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Zeigt meine Website WebP-Bilder an?",
        a: "Ja. Alle aktuellen Versionen von Chrome, Edge, Firefox und Safari zeigen WebP an.",
      },
      {
        q: "Kann ich ein verlustfreies WebP erstellen?",
        a: "Noch nicht. Der WebP-Export von Picstea ist verlustbehaftet; für eine exakte Kopie behalte das PNG.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "svg-to-png",
    label: "SVG in PNG",
    title: "SVG online in PNG umwandeln",
    description:
      "Wandle SVG-Vektorgrafiken im Browser in PNG-Bilder mit Transparenz um. Kostenlos, sicher – Skripte in SVGs laufen nie – und nichts wird hochgeladen.",
    lead: "Um SVG in PNG zu konvertieren, klick auf „SVG in PNG jetzt konvertieren“, zieh deine .svg-Dateien hinein und speichere. Jedes SVG wird in seiner eigenen Größe mit transparentem Hintergrund gezeichnet – komplett auf deinem Gerät.",
    body: () => (
      <>
        <h2>Warum SVG in PNG umwandeln?</h2>
        <p>
          SVG ist perfekt für Icons und Logos im Web, aber viele Orte – soziale Netzwerke,
          Präsentationen, Messenger, App-Stores – akzeptieren nur Pixelbilder. PNG behält die
          scharfen Kanten und den transparenten Hintergrund.
        </p>
        <h2>Was dich erwartet</h2>
        <ul>
          <li>
            Das PNG hat die Größe, die das SVG angibt (seine Breite und Höhe oder seine viewBox).
            Für ein größeres PNG öffne das SVG im Editor, nutze Bild → Bildgröße… und exportiere
            dann.
          </li>
          <li>Transparente Bereiche bleiben transparent.</li>
          <li>
            Das SVG wird vom Bilddecoder deines Browsers gezeichnet: Skripte darin laufen nie und
            verlinkte externe Dateien werden nicht geladen, diese Teile fehlen also.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Ist es sicher, ein SVG aus dem Internet zu konvertieren?",
        a: "Ja. Picstea zeichnet SVGs als Bilder – ein Modus, in dem Browser keine Skripte ausführen und keine anderen Dateien laden.",
      },
      {
        q: "Warum fehlt ein Teil meines SVGs?",
        a: "Schriften oder Bilder, die das SVG aus anderen Dateien oder von Websites lädt, können im Bildmodus nicht abgerufen werden. Bette sie ins SVG ein oder wandle Text vor dem Konvertieren in Pfade um.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "psd-to-png",
    label: "PSD in PNG",
    title: "PSD online in PNG umwandeln",
    description:
      "Wandle Photoshop-PSD-Dateien im Browser in PNG um – ganz ohne Photoshop. Kostenlos, ohne Anmeldung, und deine PSD landet nie auf einem Server.",
    lead: "Um eine PSD in PNG zu konvertieren, klick auf „PSD in PNG jetzt konvertieren“, zieh deine .psd-Dateien hinein und speichere. Picstea nutzt das in der PSD gespeicherte reduzierte Bild, sodass das PNG so aussieht wie die Datei in Photoshop.",
    body: () => (
      <>
        <h2>Warum PSD in PNG umwandeln?</h2>
        <p>
          PSD ist das Arbeitsformat von Photoshop: groß, mit Ebenen und für die meisten Apps nicht
          lesbar. Ein PNG des fertigen Bildes lässt sich teilen, in der Vorschau ansehen, hochladen
          oder in ein Dokument einfügen – mit Transparenz.
        </p>
        <h2>Was dich erwartet</h2>
        <ul>
          <li>
            Das PNG ist das reduzierte Bild, das Photoshop in der Datei speichert. PSDs, die mit
            deaktivierter Option „Kompatibilität maximieren“ gespeichert wurden, haben keins; öffne
            diese im <Link href="/psd-editor">PSD-Editor</Link> und exportiere von dort.
          </li>
          <li>
            8-Bit-RGB- und Graustufen-PSDs funktionieren. PSB-, 16/32-Bit- und CMYK-Dateien können
            noch nicht gelesen werden.
          </li>
          <li>Um vorher Ebenen oder Text zu ändern, öffne die PSD stattdessen im Editor.</li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Brauche ich Photoshop?",
        a: "Nein. Picstea liest die PSD in deinem Browser. Um Ebenen zu bearbeiten, öffne die Datei im Editor von Picstea.",
      },
      {
        q: "Warum heißt es, meine PSD hat kein reduziertes Bild?",
        a: "Photoshop speichert nur eins, wenn „Kompatibilität maximieren“ aktiviert ist. Öffne die PSD im Editor (Datei → Bild öffnen…) und exportiere von dort ein PNG.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "heic-to-jpg",
    label: "HEIC in JPG",
    title: "HEIC online in JPG umwandeln",
    description:
      "Wandle iPhone-HEIC-Fotos im Browser in JPG um, einzeln oder viele auf einmal. Kostenlos, ohne Anmeldung, und deine Fotos landen nie auf einem Server.",
    lead: "Um HEIC in JPG zu konvertieren, klick auf „HEIC in JPG jetzt konvertieren“, zieh deine .heic-Fotos hinein, wähle eine Qualität und speichere. Die JPGs öffnen sich unter Windows, Android und in jeder App, und deine Fotos verlassen nie dein Gerät.",
    body: () => (
      <>
        <h2>Warum HEIC in JPG umwandeln?</h2>
        <p>
          iPhones und iPads speichern Fotos als HEIC (High Efficiency Image File), um Platz zu
          sparen. Apple-Geräte öffnen sie, viele Windows-PCs, Android-Handys, Websites und
          Upload-Formulare aber nicht. JPG funktioniert überall.
        </p>
        <h2>Was dich erwartet</h2>
        <ul>
          <li>Fotos werden richtig herum gedreht, so wie es in der Datei gespeichert ist.</li>
          <li>Mit Qualität 85–90 sehen Fotos gleich aus; 90 ist voreingestellt.</li>
          <li>
            Die erste HEIC-Datei lädt einen 2 MB großen Decoder von der Website von Picstea selbst;
            danach ist er zwischengespeichert und funktioniert offline, sobald Picstea installiert
            ist.
          </li>
          <li>
            Nur das Hauptfoto wird konvertiert: Live-Photo-Videos, Tiefenkarten und Serienbilder
            werden weggelassen, und Kameradaten wie der Standort werden nicht übernommen.
          </li>
          <li>
            Du brauchst Transparenz oder willst bearbeiten? Öffne das HEIC im Editor (Datei → Bild
            öffnen…) oder nutze <Link href="/convert">einen anderen Konverter</Link>.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Werden meine iPhone-Fotos hochgeladen?",
        a: "Nein. Die HEIC-Datei wird in deinem Browser mit einem Open-Source-Decoder (libheif) dekodiert, den Picstea von der eigenen Website ausliefert. Deine Fotos verlassen nie dein Gerät.",
      },
      {
        q: "Kann ich HEIC stattdessen in PNG umwandeln?",
        a: "Ja. Wähle im Konverter unter „Konvertieren in“ PNG aus. PNG-Dateien sind größer, aber verlustfrei.",
      },
      {
        q: "Kann ich ein HEIC-Foto bearbeiten?",
        a: "Ja. Öffne es im Editor über Datei → Bild öffnen… wie jedes andere Foto und exportiere es dann als JPG, PNG oder WebP.",
      },
      MANY,
    ],
  },
];

export default CONVERTERS;
