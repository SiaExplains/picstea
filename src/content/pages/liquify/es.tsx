import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Licuar una foto online",
  description:
    "Usa Licuar en el navegador para empujar, girar, desinflar e inflar zonas de una foto con un pincel, y Reconstruir para deshacer por partes. Gratis y privado.",
  lead: "Licuar de Picstea te permite remodelar una foto con un pincel, como en Photoshop: abre la foto, elige Filtro → Licuar…, elige una herramienta y pinta. Empuja píxeles, gíralos, encoge o agranda zonas y deshaz cualquier punto con Reconstruir. Es gratis y funciona íntegramente en tu navegador.",
  faqs: [
    {
      q: "¿Es igual que Licuar de Photoshop?",
      a: "Funciona igual en las herramientas principales: Deformar hacia delante (empujar), Molinete a la derecha y a la izquierda, Desinflar, Inflar, Reconstruir y Suavizar, con un pincel cuyo tamaño cambias con [ y ]. Los reguladores con reconocimiento facial y las máscaras de congelación de Photoshop no están disponibles.",
    },
    {
      q: "¿Puedo cambiar el licuado más tarde?",
      a: "No después de pulsar OK: Licuar cambia los píxeles y no puede ser un filtro inteligente. Duplica antes la capa (Cmd/Ctrl+J) para conservar el original, o deshaz.",
    },
    {
      q: "¿Funciona con texto o formas?",
      a: "Licuar funciona en capas de píxeles. Primero rasteriza la capa de texto o de forma (clic derecho en la capa, en el panel Capas).",
    },
    {
      q: "¿Se sube mi foto?",
      a: "No. Licuar funciona en tu navegador. Picstea no tiene ningún servidor que reciba imágenes.",
    },
  ],
  body: () => (
    <>
      <h2>Licua una foto en cuatro pasos</h2>
      <ol>
        <li>
          Abre el editor y suelta tu foto en la página; duplica la capa (Cmd/Ctrl+J) para conservar
          el original.
        </li>
        <li>Elige Filtro → Licuar…. La foto se abre en la vista previa propia de Licuar.</li>
        <li>
          Elige una herramienta, ajusta el tamaño del pincel con [ y ] y pinta. Observa la vista
          previa mientras trabajas.
        </li>
        <li>Pulsa OK para aplicar y luego exporta con Archivo → Exportar como….</li>
      </ol>
      <h2>Las herramientas</h2>
      <ul>
        <li>
          <strong>Deformar hacia delante</strong>: empuja los píxeles en la dirección en que
          arrastras: suaviza una línea, levanta una esquina, retoca una curva.
        </li>
        <li>
          <strong>Molinete a la derecha</strong> y <strong>Molinete a la izquierda</strong>: giran
          los píxeles bajo el pincel, para remolinos y efectos creativos.
        </li>
        <li>
          <strong>Desinflar</strong>: atrae los píxeles hacia el centro del pincel y hace más
          pequeña una zona.
        </li>
        <li>
          <strong>Inflar</strong>: aleja los píxeles del centro y hace más grande una zona.
        </li>
        <li>
          <strong>Reconstruir</strong>: vuelve a pintar el original poco a poco.{" "}
          <strong>Suavizar</strong> iguala las distorsiones irregulares.
        </li>
      </ul>
      <h2>Consejos</h2>
      <ul>
        <li>
          Usa un pincel grande y suave y varios trazos ligeros; los pinceles pequeños crean ondas.
        </li>
        <li>
          Licuar solo afecta a la capa activa. Para una zona más pequeña, selecciónala antes para
          que el resto de la foto no se mueva.
        </li>
        <li>
          Todos los demás filtros están en la <Link href="/docs/filters">guía de filtros</Link> (en
          inglés) y en la página de <Link href="/photo-filters">filtros de fotos</Link>.
        </li>
      </ul>
      <h2>Limitaciones</h2>
      <p>
        No hay Licuar con reconocimiento facial ni máscaras para congelar o descongelar. Licuar
        cambia los píxeles directamente, así que no se puede usar como filtro inteligente. Las
        imágenes pueden tener hasta 36 megapíxeles.
      </p>
    </>
  ),
};

export default copy;
