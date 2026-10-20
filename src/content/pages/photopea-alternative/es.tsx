import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: una alternativa a Photopea",
  description:
    "¿Buscas una alternativa a Photopea? Picstea es un editor de fotos gratis en el navegador con capas y PSD, y sin código publicitario de terceros en el editor.",
  lead: "Photopea demostró que un editor de imágenes serio puede vivir en una pestaña del navegador. Picstea sigue la misma idea con su propio enfoque: un espacio de trabajo tranquilo, nada de código de terceros en el editor y una lista clara de lo que puede y no puede hacer.",
  faqs: [
    {
      q: "¿En qué se diferencia Picstea de Photopea?",
      a: "Ambos son editores gratuitos por capas que funcionan en el navegador y editan archivos en tu dispositivo. Picstea mantiene el código de terceros, incluidos los anuncios, totalmente fuera de la página del editor, y se centra en un espacio de trabajo limpio y enfocado. Photopea abre más tipos de archivo y tiene funciones que Picstea todavía no tiene.",
    },
    {
      q: "¿Picstea sube mis imágenes?",
      a: "No. Los archivos se abren, editan y guardan en tu navegador; la página del editor no puede enviar los datos del documento a ningún sitio.",
    },
    {
      q: "¿Puedo pasar mis archivos PSD de uno a otro?",
      a: "Sí. Ambos leen y escriben PSD, así que puedes abrir en Picstea un PSD guardado por otro editor y volver a exportar un PSD con capas.",
    },
  ],
  body: () => (
    <>
      <h2>Lo que hacen los dos</h2>
      <ul>
        <li>
          Funcionan gratis en el navegador, con capas, máscaras, capas de ajuste y modos de fusión.
        </li>
        <li>Abren y guardan archivos PSD con capas y exportan PNG, JPEG y WebP.</li>
        <li>
          Editan los archivos en local, con herramientas y atajos familiares al estilo de Photoshop.
        </li>
      </ul>
      <h2>Por qué la gente elige Picstea</h2>
      <ul>
        <li>
          <strong>Nada de terceros en el editor.</strong> La página del editor no ejecuta código
          publicitario ni de seguimiento; una Content-Security-Policy estricta permite al navegador
          bloquear cualquier intento de enviar los datos del documento a otro lugar. El espacio de
          patrocinio propio de Picstea junto al lienzo es una simple imagen con un enlace.
        </li>
        <li>
          <strong>Proyectos guardados por ti.</strong> El trabajo se guarda automáticamente en tu
          navegador y se puede descargar como archivo de proyecto <code>.picstea</code> portátil.
        </li>
        <li>
          <strong>Límites honestos.</strong> Cuando no se puede conservar una función de un PSD,
          Picstea indica exactamente qué ha cambiado en lugar de cambiarlo sin avisar.
        </li>
      </ul>
      <h2>Lo que Photopea tiene y Picstea (todavía) no</h2>
      <ul>
        <li>Abrir más formatos, como archivos AI, XD, Sketch, Figma, PDF y RAW de cámara.</li>
        <li>
          Herramientas generativas y de relleno según el contenido, selección de objetos y el lazo
          magnético.
        </li>
        <li>
          Abrir archivos directamente desde almacenamiento en la nube como Google Drive, Dropbox u
          OneDrive.
        </li>
      </ul>
      <p>
        Si necesitas eso, Photopea es una buena opción. Si quieres un editor enfocado que mantenga
        tu trabajo privado por diseño, <Link href="/docs/getting-started">empieza con Picstea</Link>{" "}
        (en inglés).
      </p>
    </>
  ),
};

export default copy;
