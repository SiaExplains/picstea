import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Editor de PSD online: abre archivos de Photoshop",
  description:
    "Abre y edita archivos PSD online con sus capas, grupos y máscaras, y vuelve a guardarlos como PSD. El archivo se queda en tu ordenador: no se sube nada.",
  lead: "Picstea abre archivos de Photoshop (PSD) directamente en tu navegador, conserva sus capas y te permite volver a guardarlos como PSD, sin subir el archivo a ningún sitio.",
  faqs: [
    {
      q: "¿Puedo abrir un PSD sin Photoshop?",
      a: "Sí. Picstea abre archivos PSD RGB y en escala de grises de 8 bits en el navegador, con sus capas, grupos, máscaras, modos de fusión, texto editable, capas de ajuste, capas de forma, objetos inteligentes y los estilos de capa habituales.",
    },
    {
      q: "¿Mi PSD se sube a un servidor?",
      a: "No. El archivo se lee dentro de tu navegador y nunca sale de tu dispositivo.",
    },
    {
      q: "¿Puedo volver a guardar como PSD?",
      a: "Sí. Archivo → Exportar como… → PSD escribe un PSD con capas, con grupos, máscaras, máscaras vectoriales, máscaras de recorte, capas de ajuste, opacidad y modos de fusión.",
    },
    {
      q: "¿Qué no se conserva?",
      a: "Algunas funciones de Photoshop todavía no tienen equivalente en Picstea: ajustes como Corrección selectiva o Consulta de colores, el texto deformado y los filtros inteligentes conservan su aspecto como píxeles o se omiten, y las imágenes de motivo de Photoshop se sustituyen por motivos integrados. Puede que haya que revisar las fuentes del texto. Picstea indica qué ha cambiado al abrir el archivo.",
    },
  ],
  body: () => (
    <>
      <h2>Cómo editar un PSD online</h2>
      <ol>
        <li>Abre el editor y elige Abrir imagen, o suelta el archivo .psd en la página.</li>
        <li>Tus capas aparecen en el panel Capas, incluidos los grupos y las máscaras.</li>
        <li>Edita: mueve y transforma capas, pinta, crea máscaras, añade capas de ajuste.</li>
        <li>Guarda con Archivo → Exportar como… → PSD, o exporta PNG, JPEG, WebP o PDF.</li>
      </ol>
      <h2>Compatible</h2>
      <ul>
        <li>Archivos PSD RGB y en escala de grises de 8 bits de hasta 12.000 píxeles por lado.</li>
        <li>Capas de píxeles, grupos, nombres de capa, opacidad, visibilidad y modos de fusión.</li>
        <li>
          Máscaras de capa, incluidas las máscaras en grupos; máscaras vectoriales y máscaras de
          recorte.
        </li>
        <li>
          Capas de texto editables (el primer estilo de cada capa; las fuentes se asignan a fuentes
          habituales).
        </li>
        <li>
          Capas de ajuste: Niveles, Curvas, Brillo/contraste, Tono/saturación, Intensidad,
          Equilibrio de color, Filtro de fotografía, Mezclador de canales, Mapa de degradado,
          Exposición, Invertir, Posterizar, Umbral, Blanco y negro.
        </li>
        <li>Capas de forma y de relleno de color sólido, objetos inteligentes incrustados.</li>
        <li>
          Estilos de capa: los diez efectos de Photoshop con sus ajustes, varias copias de sombras,
          trazos y superposiciones, la opacidad de relleno y la luz global.
        </li>
      </ul>
      <h2>Todavía no compatible</h2>
      <ul>
        <li>Archivos PSB (documento grande), color de 16/32 bits y CMYK.</li>
        <li>
          Ajustes Corrección selectiva y Consulta de colores; imágenes de motivo personalizadas (se
          usa el motivo integrado más parecido); texto deformado; filtros inteligentes de Photoshop
          y objetos inteligentes vinculados.
        </li>
        <li>
          Al volver a guardar texto, formas, objetos inteligentes y estilos en PSD, se conserva su
          aspecto como píxeles.
        </li>
      </ul>
      <p>
        Más detalles en <Link href="/docs/file-formats">formatos de archivo</Link> (en inglés).
      </p>
    </>
  ),
};

export default copy;
