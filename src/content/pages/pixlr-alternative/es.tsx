import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: alternativa a Pixlr sin límite al guardar",
  description:
    "¿Una alternativa a Pixlr? Picstea es un editor de fotos gratis en el navegador con capas y PSD, sin cuenta, sin límite de guardado y sin anuncios en el editor.",
  lead: "Pixlr es un editor de fotos popular en el navegador, con una versión gratuita y planes de pago que añaden herramientas de IA. Picstea es un editor gratuito en el navegador con capas al estilo de Photoshop y soporte PSD, sin límites de guardado, sin cuenta y sin anuncios dentro del editor.",
  faqs: [
    {
      q: "¿En qué se diferencia Picstea de Pixlr?",
      a: "Ambos son editores de fotos en el navegador con capas. Pixlr tiene una versión gratuita con anuncios y guardados limitados, y planes de pago con herramientas de IA. Picstea es gratis, sin límites ni anuncios en el editor, pero no tiene herramientas de IA.",
    },
    {
      q: "¿Picstea limita cuántas imágenes puedo guardar?",
      a: "No. No hay límite de guardado ni de exportación, ni marca de agua, ni cuenta.",
    },
    {
      q: "¿Picstea quita fondos con IA como Pixlr?",
      a: "Todavía no. Picstea quita los fondos a mano con el Borrador mágico, el Borrador de fondos o una selección. Si necesitas eso, las herramientas de IA de Pixlr son mejor opción.",
    },
    {
      q: "¿Se suben mis fotos?",
      a: "Con Picstea, no: el editor no tiene ningún servidor que reciba imágenes, y su política de seguridad impide enviar los datos del documento a cualquier sitio.",
    },
  ],
  body: () => (
    <>
      <h2>Lo que hacen los dos</h2>
      <ul>
        <li>Editar fotos en el navegador con capas, máscaras, modos de fusión y ajustes.</li>
        <li>Abrir y guardar archivos PSD y exportar PNG, JPEG y WebP.</li>
        <li>Retocar, añadir texto, recortar, redimensionar y aplicar filtros.</li>
      </ul>
      <h2>En qué se diferencian</h2>
      <ComparisonTable
        other="Pixlr"
        rows={[
          ["Precio", "Gratis", "Versión gratuita; planes de pago (Plus, Premium, Ultra)"],
          [
            "Anuncios",
            "Ninguno en el editor",
            "En la versión gratuita; los planes de pago no tienen anuncios",
          ],
          [
            "Guardado",
            "Ilimitado, sin cuenta",
            "Limitado en la versión gratuita; ilimitado en los planes de pago",
          ],
          [
            "Herramientas de IA",
            "Ninguna",
            "Herramientas de IA con créditos mensuales en los planes de pago",
          ],
          [
            "Flujo de trabajo",
            "Capas al estilo de Photoshop, capas de ajuste, estilos de capa",
            "Editores propios de Pixlr",
          ],
          [
            "Plataformas",
            "Cualquier navegador actual",
            "Navegador, apps de escritorio y apps móviles",
          ],
        ]}
      />
      <h2>Por qué la gente elige Picstea</h2>
      <ul>
        <li>
          <strong>Sin límites que sortear.</strong> Guarda y exporta tantas veces como quieras, a
          tamaño completo, sin marca de agua y sin registro.
        </li>
        <li>
          <strong>Sin anuncios donde trabajas.</strong> La página del editor no ejecuta nada de
          código de terceros; los patrocinios propios de Picstea están junto al lienzo como una
          simple imagen con un enlace.
        </li>
        <li>
          <strong>Flujo de trabajo profesional con capas.</strong> Capas de ajuste, objetos
          inteligentes con filtros inteligentes, Fusionar si y los diez estilos de capa de
          Photoshop.
        </li>
      </ul>
      <h2>Cuándo Pixlr es mejor opción</h2>
      <ul>
        <li>
          Herramientas de IA, como la generación de imágenes con IA y los recortes automáticos.
        </li>
        <li>Apps móviles para iPhone y Android.</li>
      </ul>
      <p>
        Si editas a mano y no quieres límites,{" "}
        <Link href="/docs/getting-started">empieza con Picstea</Link> (en inglés). Cómo quitar un
        fondo a mano se explica en{" "}
        <Link href="/make-background-transparent">hacer transparente un fondo</Link>.
      </p>
    </>
  ),
};

export default copy;
