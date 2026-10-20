import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Editor de PNG online gratis con transparencia",
  description:
    "Edita imágenes PNG en tu navegador: capas, fondos transparentes, texto y efectos, y exporta un PNG sin pérdida. Gratis, sin registro y sin subir nada.",
  lead: "Picstea abre archivos PNG en tu navegador, conserva su transparencia y te permite editarlos con capas, texto, formas y efectos antes de volver a exportar un PNG sin pérdida. Es gratis, no necesita cuenta y tus imágenes nunca salen de tu dispositivo.",
  faqs: [
    {
      q: "¿Picstea conserva la transparencia del PNG?",
      a: "Sí. Las zonas transparentes siguen siendo transparentes mientras editas y al exportar como PNG o WebP. JPEG no admite transparencia, así que en él las zonas transparentes se vuelven blancas.",
    },
    {
      q: "¿La exportación a PNG es sin pérdida?",
      a: "Sí. La exportación a PNG conserva cada píxel exactamente como se ve en el lienzo. No hay ajuste de calidad porque no se descarta nada.",
    },
    {
      q: "¿Puedo hacer transparente el fondo de un PNG?",
      a: "Sí, a mano: usa el Borrador mágico para quitar un fondo liso con un clic, el Borrador de fondos para los bordes, o una selección y Supr. Todavía no hay eliminación automática de fondos con IA.",
    },
    {
      q: "¿Se sube mi PNG a algún sitio?",
      a: "No. El archivo se abre, edita y exporta en tu dispositivo. Picstea no tiene ningún servidor que reciba imágenes.",
    },
    {
      q: "¿Puedo convertir un PNG en JPEG o WebP?",
      a: "Sí. Abre el PNG y elige JPEG o WebP en Archivo → Exportar como…. WebP conserva la transparencia y suele ocupar mucho menos.",
    },
  ],
  body: () => (
    <>
      <h2>Edita un PNG en cuatro pasos</h2>
      <ol>
        <li>Abre el editor y suelta tu PNG en la página, o haz clic en Abrir imagen.</li>
        <li>
          Añade lo que necesites en capas nuevas: texto con la herramienta Texto, formas u otra
          imagen con Archivo → Colocar imagen como capa.
        </li>
        <li>
          Limpia el fondo con el Borrador mágico o el Borrador de fondos, o selecciona una zona y
          pulsa Supr para hacerla transparente.
        </li>
        <li>Elige Archivo → Exportar como…, selecciona PNG y guarda.</li>
      </ol>
      <h2>Por qué PNG</h2>
      <p>
        PNG es sin pérdida y admite transparencia, lo que lo convierte en el formato adecuado para
        logotipos, iconos, capturas de pantalla, ilustraciones y todo lo que tenga bordes nítidos o
        texto. Las fotos suelen ocupar mucho menos en JPEG o WebP; consulta las páginas del{" "}
        <Link href="/jpeg-editor">editor de JPEG</Link> y del{" "}
        <Link href="/webp-editor">editor de WebP</Link>, y la guía{" "}
        <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> (en inglés). Para cambiar
        el formato sin editar, usa el conversor <Link href="/convert/png-to-jpg">PNG a JPG</Link> o{" "}
        <Link href="/convert/png-to-webp">PNG a WebP</Link>.
      </p>
      <h2>Qué puedes hacer con un PNG</h2>
      <ul>
        <li>Trabajar con capas, grupos, 16 modos de fusión, opacidad y máscaras de capa.</li>
        <li>Añadir texto editable, formas y trazados con la herramienta Pluma.</li>
        <li>
          Dar a textos o logotipos sombras paralelas, resplandores, trazos y superposiciones de
          colores, de degradado o de motivo.
        </li>
        <li>Borrar fondos con el Borrador mágico y el Borrador de fondos.</li>
        <li>Cambiar colores con Tono/saturación, Equilibrio de color y otras capas de ajuste.</li>
        <li>Redimensionar la imagen o el lienzo, recortar, rotar y voltear.</li>
        <li>
          Guardar el trabajo con capas como PSD o proyecto .picstea para volver a editarlo más
          tarde.
        </li>
      </ul>
      <h2>Limitaciones</h2>
      <p>
        Las imágenes pueden tener hasta 12.000 píxeles por lado (36 megapíxeles). Picstea trabaja
        con color de 8 bits, así que los PNG de 16 bits se reducen a 8 bits. Los PNG animados se
        abren como una sola imagen. Todavía no hay eliminación automática de fondos. Consulta{" "}
        <Link href="/docs/file-formats">formatos de archivo</Link> (en inglés) para más detalles.
      </p>
    </>
  ),
};

export default copy;
