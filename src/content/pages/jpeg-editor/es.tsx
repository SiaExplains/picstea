import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Editor de JPEG online gratis",
  description:
    "Edita fotos JPG y JPEG en tu navegador con capas, ajustes, retoque y filtros, y exporta un JPEG con la calidad que elijas. Gratis y sin subir nada.",
  lead: "Picstea es un editor de JPEG gratuito que funciona en tu navegador. Abre una foto JPG, corrige su luz y su color con capas de ajuste, retócala y exporta un nuevo JPEG con la calidad que elijas. Tus fotos nunca salen de tu dispositivo.",
  faqs: [
    {
      q: "¿JPG es lo mismo que JPEG?",
      a: "Sí. JPG y JPEG son dos nombres para el mismo formato. Picstea abre ambos y guarda las exportaciones con la extensión .jpg.",
    },
    {
      q: "¿Editar hará que mi JPEG pierda calidad?",
      a: "No mientras editas: Picstea trabaja con los píxeles decodificados, y las capas de ajuste nunca cambian el original. La calidad solo se reduce una vez, al exportar un JPEG. Elige una calidad alta (90 es el valor por defecto) para mantenerlo nítido.",
    },
    {
      q: "¿Se suben mis fotos?",
      a: "No. Las fotos se abren, editan y exportan en tu dispositivo. Picstea no tiene ningún servidor que reciba tus imágenes.",
    },
    {
      q: "¿La foto aparece con la orientación correcta?",
      a: "Sí. Picstea respeta la orientación que la cámara guardó en el archivo, así que las fotos de móvil se abren derechas.",
    },
    {
      q: "¿Un JPEG puede tener fondo transparente?",
      a: "No, el formato no admite transparencia, así que las zonas transparentes se vuelven blancas al exportar. Exporta como PNG o WebP para conservar la transparencia.",
    },
  ],
  body: () => (
    <>
      <h2>Edita un JPEG en cuatro pasos</h2>
      <ol>
        <li>Abre el editor y suelta tu foto JPG o JPEG en la página.</li>
        <li>
          Corrige la exposición y el color con Capa → Nueva capa de ajuste: Niveles, Curvas,
          Brillo/contraste, Tono/saturación, Intensidad o Equilibrio de color. O usa Filtro → Camera
          Raw para todo en un solo cuadro de diálogo.
        </li>
        <li>
          Elimina manchas con el Pincel corrector puntual o el Tampón de clonar, y recorta o
          endereza con la herramienta Recortar.
        </li>
        <li>Elige Archivo → Exportar como…, selecciona JPEG, ajusta la calidad y guarda.</li>
      </ol>
      <h2>Qué puedes hacer con un JPEG</h2>
      <ul>
        <li>
          Corregir la luz y el color con capas de ajuste que puedes cambiar en cualquier momento.
        </li>
        <li>
          Retocar con el Pincel corrector, el Pincel corrector puntual, el Tampón de clonar, Pupilas
          rojas, Sobreexponer, Subexponer y Esponja.
        </li>
        <li>Enfocar, reducir ruido o desenfocar el fondo con el menú Filtro.</li>
        <li>Añadir texto, formas, logotipos y marcas de agua en sus propias capas.</li>
        <li>
          Cambiar el tamaño de la foto con Imagen → Tamaño de imagen… o añadir un borde con Tamaño
          de lienzo….
        </li>
        <li>
          Aplicar las mismas ediciones a muchas fotos: graba una acción y luego usa Archivo →
          Automatizar → Lote… para obtener los resultados en un único archivo ZIP.
        </li>
      </ul>
      <h2>Cuándo usar JPEG</h2>
      <p>
        JPEG es el formato estándar para fotos: los archivos son pequeños y cualquier dispositivo
        puede abrirlos. Para gráficos, texto o transparencia usa <Link href="/png-editor">PNG</Link>
        ; para los archivos más pequeños en una web, prueba <Link href="/webp-editor">WebP</Link>.
        Para que un JPEG ocupe menos, consulta la guía para{" "}
        <Link href="/image-compressor">comprimir imágenes</Link>, y para comparar los formatos, lee{" "}
        <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> (en inglés). Para pasar un
        JPG a PNG sin editarlo, usa el conversor <Link href="/convert/jpg-to-png">JPG a PNG</Link>.
      </p>
      <h2>Limitaciones</h2>
      <p>
        Las imágenes pueden tener hasta 12.000 píxeles por lado (36 megapíxeles). Todavía no se
        pueden abrir archivos RAW de cámara, y los datos de la cámara, como la fecha y la ubicación,
        no se copian en los archivos exportados.
      </p>
    </>
  ),
};

export default copy;
