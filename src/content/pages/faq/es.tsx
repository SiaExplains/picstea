import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Preguntas frecuentes",
  description:
    "Respuestas sobre Picstea: si es gratis, si se suben las imágenes, qué archivos abre y guarda, dónde se guardan los proyectos y en qué dispositivos funciona.",
  lead: "Respuestas breves sobre Picstea, el editor de fotos online gratis que mantiene tus imágenes en tu dispositivo.",
  faqs: [
    {
      q: "¿Picstea es gratis?",
      a: "Sí. Picstea es gratis, sin cuenta, sin marca de agua y sin límite de exportaciones. Se financia con publicidad en la web y el blog, y con patrocinios claramente señalados junto al lienzo, nunca encima de tu trabajo y sin seguimiento.",
    },
    {
      q: "¿Se suben mis imágenes?",
      a: "No. Las imágenes se abren, editan, guardan y exportan en tu navegador. Picstea no tiene ningún servidor que las reciba, y la página del editor impide enviar los datos del documento a cualquier sitio.",
    },
    {
      q: "¿Dónde se guarda mi trabajo?",
      a: "Automáticamente en el almacenamiento de tu navegador, en este dispositivo. Para tener una copia en otro lugar, usa Archivo → Guardar proyecto como… para descargar un archivo .picstea, o exporta una imagen.",
    },
    {
      q: "¿Qué archivos puedo abrir?",
      a: "PNG, JPEG, WebP, GIF, SVG, HEIC (fotos de iPhone), PSD (RGB y escala de grises de 8 bits) y archivos de proyecto .picstea.",
    },
    {
      q: "¿En qué formatos puedo exportar?",
      a: "PNG, JPEG, WebP, SVG, PDF y PSD con capas.",
    },
    {
      q: "¿Puedo editar archivos PSD?",
      a: "Sí. Se conservan las capas, grupos, máscaras, modos de fusión, texto editable, capas de ajuste, formas, objetos inteligentes y los estilos de capa habituales, y puedes volver a guardar un PSD con capas.",
    },
    {
      q: "¿Tengo que instalar algo?",
      a: "No. Picstea funciona en las versiones actuales de Chrome, Edge, Firefox y Safari.",
    },
    {
      q: "¿Picstea funciona sin conexión? ¿Puedo instalarlo?",
      a: "Sí. Después de abrirlo una vez, el editor también se abre sin conexión a internet. En Chrome y Edge puedes instalarlo (Ayuda → Instalar Picstea…) para que se abra en su propia ventana como una app de escritorio; en Safari en un Mac, usa Archivo → Añadir al Dock.",
    },
    {
      q: "¿Funciona en un móvil o una tableta?",
      a: "El diseño se adapta a pantallas pequeñas, pero Picstea está pensado para ratón o trackpad y teclado, así que la mejor experiencia es en un ordenador.",
    },
    {
      q: "¿Picstea tiene herramientas de IA?",
      a: "Todavía no. No hay relleno generativo, selección de objetos ni relleno según el contenido; el pincel corrector y el pincel corrector puntual sirven para eliminar imperfecciones.",
    },
    {
      q: "¿Es una alternativa a Photoshop o Photopea?",
      a: "Cubre lo esencial de ese flujo de trabajo —capas, máscaras, ajustes, retoque y archivos PSD— gratis en el navegador. Consulta las páginas de comparación con Photoshop y Photopea para ver qué hace y qué no.",
    },
  ],
  body: () => (
    <>
      <p>
        ¿Quieres saber más? Lee la <Link href="/docs">documentación</Link> (en inglés), compara
        Picstea con <Link href="/photoshop-alternative">Photoshop</Link> y{" "}
        <Link href="/photopea-alternative">Photopea</Link>, o consulta las{" "}
        <Link href="/blog">guías</Link> (en inglés).
      </p>
    </>
  ),
};

export default copy;
