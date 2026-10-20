import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Bild online schärfen",
  description:
    "Schärfe ein weiches Foto im Browser mit Unscharf maskieren, Selektiver Scharfzeichner oder Hochpass, mit Live-Vorschau. Kostenlos, ohne Anmeldung.",
  lead: "Um ein Bild in Picstea zu schärfen, öffne es und wähle Filter → Scharfzeichnen → Unscharf maskieren…. Erhöhe die Stärke, während du die Live-Vorschau beobachtest, halte den Radius klein und drück OK. Das ist kostenlos, läuft in deinem Browser, und nichts wird hochgeladen.",
  faqs: [
    {
      q: "Kann Schärfen ein verschwommenes Foto retten?",
      a: "Nur ein leicht weiches. Schärfen erhöht den Kontrast an Kanten; es kann keine Details zurückholen, die nie aufgenommen wurden, etwa bei einem stark unscharfen oder verwackelten Foto. Picstea hat kein KI-„Entschärfen“.",
    },
    {
      q: "Welchen Filter soll ich nehmen?",
      a: "Unscharf maskieren für die meisten Fotos, Selektiver Scharfzeichner, wenn die Unschärfe von Objektiv oder Bewegung kommt, und Hochpass, wenn du die Schärfung später über die Ebenendeckkraft anpassen willst.",
    },
    {
      q: "Warum sieht mein Foto nach dem Schärfen körnig aus?",
      a: "Schärfen schärft auch Rauschen. Verringere die Stärke, erhöhe den Schwellenwert von Unscharf maskieren oder nutze Rauschen reduzieren im Selektiven Scharfzeichner.",
    },
    {
      q: "Wird mein Bild hochgeladen?",
      a: "Nein. Das Schärfen läuft in deinem Browser. Picstea hat keinen Server, der Bilder empfängt.",
    },
  ],
  body: () => (
    <>
      <h2>Ein Foto in vier Schritten schärfen</h2>
      <ol>
        <li>Öffne den Editor und zieh dein Bild auf die Seite.</li>
        <li>Wähle Ansicht → 100%, damit du beim Schärfen echte Pixel siehst.</li>
        <li>
          Wähle Filter → Scharfzeichnen → Unscharf maskieren…: Starte mit Stärke 100 %, Radius 1–2
          px und Schwellenwert 0 und passe an, bis die Kanten knackig wirken, ohne helle Säume.
        </li>
        <li>Drück OK und exportiere dann mit Datei → Exportieren als….</li>
      </ol>
      <h2>Drei Wege zum Schärfen</h2>
      <ul>
        <li>
          <strong>Unscharf maskieren</strong> – Stärke, Radius (wie breit die Kante ist) und
          Schwellenwert (überspringt kleine Unterschiede und schützt so Haut und Himmel vor
          Körnung).
        </li>
        <li>
          <strong>Selektiver Scharfzeichner</strong> – wähle, was entfernt werden soll (Gaußsche,
          Objektiv- oder Bewegungsunschärfe, bei Bewegung mit Winkel), und reduziere gleichzeitig
          das Rauschen.
        </li>
        <li>
          <strong>Hochpass</strong> (Filter → Sonstige) auf einer duplizierten Ebene (Cmd/Ctrl+J),
          deren Füllmethode auf Ineinanderkopieren oder Weiches Licht steht. Verringere die
          Deckkraft der Ebene, um die Schärfung jederzeit fein abzustimmen.
        </li>
      </ul>
      <h2>Tipps</h2>
      <ul>
        <li>
          Schärfe zuletzt, nach dem Skalieren: Verkleinern macht ein Foto weicher, und Unscharf
          maskieren holt die Kanten zurück. Siehe die Anleitung zum{" "}
          <Link href="/image-resizer">Bildgröße ändern</Link>.
        </li>
        <li>Wähle zuerst einen Bereich aus, um nur die Augen oder das Motiv zu schärfen.</li>
        <li>
          Auf einem Smartobjekt wird der Filter zum Smartfilter, den du später ändern kannst – siehe
          den <Link href="/blog/smart-objects-explained">Leitfaden zu Smartobjekten</Link> (auf
          Englisch).
        </li>
      </ul>
      <h2>Einschränkungen</h2>
      <p>
        Schärfen kann fehlende Details nicht wiederherstellen, und es gibt kein KI-Hochskalieren
        oder -Entschärfen. Bilder dürfen bis zu 12.000 Pixel pro Seite haben (36 Megapixel).
      </p>
    </>
  ),
};

export default copy;
