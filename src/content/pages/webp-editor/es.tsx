import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Editor y conversor de WebP online gratis",
  description:
    "Abre, edita y exporta imágenes WebP en tu navegador, o convierte WebP a PNG o JPEG y viceversa. Gratis, sin registro y tus imágenes no salen de tu dispositivo.",
  lead: "Picstea abre imágenes WebP en tu navegador, te permite editarlas con capas, texto y ajustes, y exporta WebP, PNG o JPEG. Úsalo para convertir archivos WebP que has descargado o para crear imágenes WebP ligeras para tu web. No se sube nada.",
  faqs: [
    {
      q: "¿Cómo convierto WebP a PNG o JPEG?",
      a: "Abre el archivo WebP en Picstea, elige Archivo → Exportar como… y selecciona PNG o JPEG. La conversión se hace en tu navegador.",
    },
    {
      q: "¿Cómo convierto un PNG o JPEG a WebP?",
      a: "Abre la imagen, elige Archivo → Exportar como…, selecciona WebP y ajusta la calidad. WebP conserva la transparencia, a diferencia de JPEG.",
    },
    {
      q: "¿Por qué los archivos WebP ocupan menos?",
      a: "WebP comprime las imágenes de forma más eficiente que JPEG y PNG, así que la misma imagen suele necesitar menos bytes. Eso hace que las páginas web carguen más rápido.",
    },
    {
      q: "¿Se suben mis imágenes para convertirlas?",
      a: "No. Abrir, editar y convertir ocurre en tu dispositivo. Picstea no tiene ningún servidor que reciba imágenes.",
    },
    {
      q: "¿Puedo editar archivos WebP animados?",
      a: "No. Picstea abre una imagen fija; los archivos WebP animados no son compatibles como animaciones.",
    },
  ],
  body: () => (
    <>
      <h2>Convierte o edita una imagen WebP</h2>
      <ol>
        <li>Abre el editor y suelta el archivo WebP en la página.</li>
        <li>
          Edítalo si quieres: recorta, redimensiona, ajusta colores, añade texto o elimina manchas.
        </li>
        <li>
          Elige Archivo → Exportar como… y selecciona el formato: WebP para imágenes web ligeras,
          PNG para una copia sin pérdida o JPEG para la máxima compatibilidad.
        </li>
        <li>Para WebP y JPEG, ajusta la calidad y guarda.</li>
      </ol>
      <h2>¿WebP, PNG o JPEG?</h2>
      <ul>
        <li>
          <strong>WebP</strong>: archivos pequeños con transparencia. Compatible con todos los
          navegadores actuales; algunas apps antiguas no pueden abrirlo.
        </li>
        <li>
          <strong>PNG</strong>: sin pérdida y con transparencia, pero más grande. Ideal para
          logotipos, iconos y capturas de pantalla.
        </li>
        <li>
          <strong>JPEG</strong>: fotos pequeñas que se abren en cualquier sitio, sin transparencia.
        </li>
      </ul>
      <p>
        La guía <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> (en inglés) los
        compara con más detalle. ¿Solo necesitas cambiar el formato? Usa el conversor{" "}
        <Link href="/convert/webp-to-png">WebP a PNG</Link> o{" "}
        <Link href="/convert/png-to-webp">PNG a WebP</Link>.
      </p>
      <h2>Qué puedes hacer con una imagen WebP</h2>
      <ul>
        <li>
          Todo lo que Picstea hace con cualquier imagen: capas, máscaras, capas de ajuste y filtros.
        </li>
        <li>Añadir texto, formas y efectos como sombras paralelas y trazos.</li>
        <li>
          Redimensionar con Imagen → Tamaño de imagen… antes de exportar un archivo más ligero.
        </li>
        <li>
          Procesar muchas imágenes a la vez: graba una acción (por ejemplo, Máscara de enfoque) y
          luego Archivo → Automatizar → Lote… la ejecuta en los archivos que elijas y los exporta
          como WebP en un único archivo ZIP.
        </li>
      </ul>
      <h2>Limitaciones</h2>
      <p>
        Las imágenes pueden tener hasta 12.000 píxeles por lado (36 megapíxeles), y WebP animado no
        es compatible. Para reducir aún más los archivos, consulta la guía para{" "}
        <Link href="/image-compressor">comprimir imágenes</Link>.
      </p>
    </>
  ),
};

export default copy;
