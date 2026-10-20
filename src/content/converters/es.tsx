import { LocalLink as Link } from "@/components/site/LocalLink";
import type { Faq } from "@/components/site/LandingPage";
import type { ConverterPage } from "./types";

const PRIVATE: Faq = {
  q: "¿Se sube mi archivo?",
  a: "No. La conversión se hace en tu navegador, en el editor de Picstea, que no tiene ningún servidor que reciba archivos e impide enviarlos a cualquier sitio. Tampoco se guarda nada en el navegador.",
};

const MANY: Faq = {
  q: "¿Puedo convertir varios archivos a la vez?",
  a: "Sí. Elige o suelta hasta 200 archivos; un archivo se guarda directamente y varios se guardan juntos en un único archivo ZIP.",
};

const CONVERTERS: readonly ConverterPage[] = [
  {
    id: "webp-to-png",
    label: "WebP a PNG",
    title: "Convertir WebP a PNG online",
    description:
      "Convierte imágenes WebP en archivos PNG en tu navegador, conservando la transparencia y sin pérdida de calidad. Gratis, sin registro y sin subir tus imágenes.",
    lead: "Para convertir WebP a PNG, haz clic en Convertir ahora, suelta tus archivos .webp y guarda los PNG. La transparencia se conserva, el PNG es sin pérdida y la conversión se hace en tu propio dispositivo.",
    body: () => (
      <>
        <h2>¿Por qué convertir WebP a PNG?</h2>
        <p>
          Las webs usan WebP porque ocupa poco, pero algunas apps, visores de imágenes antiguos y
          formularios de subida todavía solo aceptan PNG o JPEG. PNG se abre en todas partes y
          conserva los fondos transparentes, así que es la opción segura para logotipos, iconos y
          capturas de pantalla guardados de la web.
        </p>
        <h2>Qué esperar</h2>
        <ul>
          <li>Las zonas transparentes siguen siendo transparentes.</li>
          <li>
            PNG es sin pérdida, así que el resultado se ve exactamente igual que el WebP, pero suele
            ocupar más, a menudo varias veces más en el caso de las fotos.
          </li>
          <li>Los archivos WebP animados se convierten en una sola imagen fija.</li>
        </ul>
        <p>
          ¿Necesitas un archivo más pequeño?{" "}
          <Link href="/convert/webp-to-jpg">Convierte WebP a JPG</Link>.
        </p>
      </>
    ),
    faqs: [
      {
        q: "¿El PNG se verá peor que el WebP?",
        a: "No. PNG conserva cada píxel exactamente, así que el PNG se ve igual que el WebP. No puede recuperar detalles que un WebP con pérdida ya descartó.",
      },
      PRIVATE,
      MANY,
      {
        q: "¿Puedo editar la imagen antes de convertirla?",
        a: "Sí. Ábrela en el editor (Archivo → Abrir), haz tus cambios y luego elige Archivo → Exportar como… y selecciona PNG.",
      },
    ],
  },
  {
    id: "webp-to-jpg",
    label: "WebP a JPG",
    title: "Convertir WebP a JPG online",
    description:
      "Convierte imágenes WebP a JPG en tu navegador y elige la calidad. Gratis, privado y sin subir nada; funciona con archivos sueltos o por lotes.",
    lead: "Para convertir WebP a JPG, haz clic en Convertir ahora, suelta tus archivos .webp, ajusta la calidad y guarda. Los JPG se abren en cualquier app, y la conversión se hace en tu dispositivo.",
    body: () => (
      <>
        <h2>¿Por qué convertir WebP a JPG?</h2>
        <p>
          JPG (JPEG) es el formato que entiende cualquier móvil, app de cámara, servicio de
          impresión y cliente de correo. Convertir una foto WebP a JPG mantiene el archivo pequeño y
          garantiza que cualquiera pueda abrirlo.
        </p>
        <h2>Qué esperar</h2>
        <ul>
          <li>
            JPG no admite transparencia: las zonas transparentes se vuelven blancas. Usa{" "}
            <Link href="/convert/webp-to-png">WebP a PNG</Link> para conservarlas.
          </li>
          <li>
            Una calidad de 80–90 mantiene el aspecto de las fotos con un tamaño pequeño; 90 es el
            valor por defecto.
          </li>
          <li>Los archivos WebP animados se convierten en una sola imagen fija.</li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "¿JPG es lo mismo que JPEG?",
        a: "Sí, son dos nombres para el mismo formato. Picstea guarda los archivos convertidos con la extensión .jpg.",
      },
      {
        q: "¿Por qué mi fondo es blanco?",
        a: "JPG no puede guardar transparencia, así que los píxeles transparentes se rellenan de blanco. Convierte a PNG o mantén WebP si necesitas transparencia.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "png-to-jpg",
    label: "PNG a JPG",
    title: "Convertir PNG a JPG online",
    description:
      "Convierte imágenes PNG en archivos JPG más pequeños en tu navegador y elige la calidad. Gratis, sin registro, sin subir nada; lo transparente se vuelve blanco.",
    lead: "Para convertir PNG a JPG, haz clic en Convertir ahora, suelta tus archivos PNG, elige una calidad y guarda. Las fotos suelen quedarse en una fracción de su tamaño en PNG, y nada sale de tu dispositivo.",
    body: () => (
      <>
        <h2>¿Por qué convertir PNG a JPG?</h2>
        <p>
          PNG es sin pérdida, lo que hace que las fotos y las capturas de fotos ocupen mucho. JPG
          comprime las fotos mucho mejor, así que convertir es la forma más rápida de que una imagen
          sea lo bastante pequeña para el correo, una web o un formulario de subida con límite de
          tamaño.
        </p>
        <h2>Qué esperar</h2>
        <ul>
          <li>Las zonas transparentes se vuelven blancas, porque JPG no admite transparencia.</li>
          <li>
            El texto, los logotipos y los gráficos planos pueden mostrar bordes suaves en JPG. Para
            ellos, <Link href="/convert/png-to-webp">PNG a WebP</Link> suele ser mejor opción.
          </li>
          <li>
            Menos calidad significa un archivo más pequeño; revisa el resultado antes de usarlo.
          </li>
        </ul>
        <p>
          Para que el archivo ocupe aún menos, redimensiónalo antes; consulta la guía para{" "}
          <Link href="/image-compressor">comprimir imágenes</Link>.
        </p>
      </>
    ),
    faqs: [
      {
        q: "¿Cuánto más pequeño será el JPG?",
        a: "Depende de la imagen. Una foto guardada como PNG suele quedarse varias veces más pequeña como JPG con calidad 80–90; los gráficos planos se reducen menos.",
      },
      {
        q: "¿Puedo conservar un fondo transparente?",
        a: "En JPG, no. Convierte a WebP, que ocupa poco y conserva la transparencia.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "jpg-to-png",
    label: "JPG a PNG",
    title: "Convertir JPG a PNG online",
    description:
      "Convierte fotos JPG o JPEG en archivos PNG sin pérdida en tu navegador. Gratis, sin registro y privado: tus fotos nunca se suben a un servidor.",
    lead: "Para convertir JPG a PNG, haz clic en Convertir ahora, suelta tus archivos JPG o JPEG y guarda los PNG. El PNG conserva la imagen exactamente como está, y la conversión se hace en tu dispositivo.",
    body: () => (
      <>
        <h2>¿Por qué convertir JPG a PNG?</h2>
        <p>
          Algunas herramientas y formularios de subida piden PNG, y PNG es mejor punto de partida
          cuando quieres editar una imagen varias veces: nunca pierde calidad al volver a guardarse,
          mientras que cada nuevo guardado en JPG vuelve a comprimir la imagen.
        </p>
        <h2>Qué esperar</h2>
        <ul>
          <li>
            El PNG se ve exactamente igual que el JPG, incluidos los artefactos de compresión.
          </li>
          <li>El archivo ocupa más, porque PNG es sin pérdida.</li>
          <li>
            Convertir no añade transparencia. Para quitar un fondo, abre la foto en el editor y usa
            el Borrador mágico o el Borrador de fondos, y luego exporta un PNG.
          </li>
          <li>
            Las fotos del móvil se colocan derechas, según la orientación que guardó la cámara.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "¿Convertir a PNG mejora la calidad?",
        a: "No. PNG conserva la imagen exactamente, pero no puede recuperar los detalles que eliminó la compresión JPEG. Evita más pérdidas al volver a guardar.",
      },
      {
        q: "¿Se conserva la información de la cámara?",
        a: "No. Los datos como la fecha, el modelo de cámara y la ubicación no se copian en el PNG.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "png-to-webp",
    label: "PNG a WebP",
    title: "Convertir PNG a WebP online",
    description:
      "Convierte imágenes PNG en archivos WebP ligeros para la web, conservando la transparencia y con calidad ajustable. Gratis, privado y sin subir nada.",
    lead: "Para convertir PNG a WebP, haz clic en Convertir ahora, suelta tus archivos PNG, elige una calidad y guarda. Los archivos WebP conservan la transparencia y suelen ocupar mucho menos, lo que hace que las páginas web carguen más rápido.",
    body: () => (
      <>
        <h2>¿Por qué convertir PNG a WebP?</h2>
        <p>
          Las imágenes suelen ser la parte más pesada de una página web. WebP guarda la misma imagen
          en menos bytes que PNG o JPEG y, a diferencia de JPEG, conserva los fondos transparentes,
          así que encaja bien con fotos de producto, ilustraciones y logotipos en una web.
        </p>
        <h2>Qué esperar</h2>
        <ul>
          <li>Se conserva la transparencia.</li>
          <li>
            La exportación a WebP es con pérdida: una calidad de 80–90 se ve igual en la mayoría de
            las imágenes. Usa 100 para capturas de pantalla con texto pequeño.
          </li>
          <li>
            Todos los navegadores actuales muestran WebP; algunas apps de escritorio antiguas no
            pueden abrirlo. Si hace falta, vuelve a convertir con{" "}
            <Link href="/convert/webp-to-png">WebP a PNG</Link>.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "¿Mi web mostrará imágenes WebP?",
        a: "Sí. Todas las versiones actuales de Chrome, Edge, Firefox y Safari muestran WebP.",
      },
      {
        q: "¿Puedo crear un WebP sin pérdida?",
        a: "Todavía no. La exportación a WebP de Picstea es con pérdida; para una copia exacta, conserva el PNG.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "svg-to-png",
    label: "SVG a PNG",
    title: "Convertir SVG a PNG online",
    description:
      "Convierte gráficos vectoriales SVG en imágenes PNG con transparencia en tu navegador. Gratis, seguro (los scripts del SVG nunca se ejecutan) y sin subir nada.",
    lead: "Para convertir SVG a PNG, haz clic en Convertir ahora, suelta tus archivos .svg y guarda. Cada SVG se dibuja a su propio tamaño con fondo transparente, íntegramente en tu dispositivo.",
    body: () => (
      <>
        <h2>¿Por qué convertir SVG a PNG?</h2>
        <p>
          SVG es perfecto para iconos y logotipos en la web, pero muchos sitios —redes sociales,
          presentaciones, apps de mensajería, tiendas de apps— solo aceptan imágenes de píxeles. PNG
          conserva los bordes nítidos y el fondo transparente.
        </p>
        <h2>Qué esperar</h2>
        <ul>
          <li>
            El PNG tiene el tamaño que declara el SVG (su anchura y altura, o su viewBox). Para un
            PNG más grande, abre el SVG en el editor, usa Imagen → Tamaño de imagen… y luego
            exporta.
          </li>
          <li>Las zonas transparentes siguen siendo transparentes.</li>
          <li>
            El SVG lo dibuja el decodificador de imágenes de tu navegador: sus scripts nunca se
            ejecutan y no se cargan los archivos externos a los que enlaza, así que esas partes se
            omiten.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "¿Es seguro convertir un SVG de internet?",
        a: "Sí. Picstea dibuja los SVG como imágenes, un modo en el que los navegadores no ejecutan scripts ni cargan otros archivos.",
      },
      {
        q: "¿Por qué falta parte de mi SVG?",
        a: "Las fuentes o imágenes que el SVG carga desde otros archivos o webs no se pueden obtener en modo imagen. Incrústalas en el SVG o convierte el texto en contornos antes de convertir.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "psd-to-png",
    label: "PSD a PNG",
    title: "Convertir PSD a PNG online",
    description:
      "Convierte archivos PSD de Photoshop a PNG en tu navegador sin Photoshop. Gratis, sin registro y tu PSD nunca se sube a un servidor.",
    lead: "Para convertir un PSD a PNG, haz clic en Convertir ahora, suelta tus archivos .psd y guarda. Picstea usa la imagen acoplada guardada dentro del PSD, así que el PNG se ve como se veía el archivo en Photoshop.",
    body: () => (
      <>
        <h2>¿Por qué convertir PSD a PNG?</h2>
        <p>
          PSD es el formato de trabajo de Photoshop: grande, con capas e ilegible para la mayoría de
          las apps. Un PNG de la imagen terminada se puede compartir, previsualizar, subir o colocar
          en un documento, conservando la transparencia.
        </p>
        <h2>Qué esperar</h2>
        <ul>
          <li>
            El PNG es la imagen acoplada que Photoshop guarda en el archivo. Los PSD guardados con
            &quot;Maximizar compatibilidad&quot; desactivado no la tienen; ábrelos en el{" "}
            <Link href="/psd-editor">editor de PSD</Link> y exporta desde allí.
          </li>
          <li>
            Funcionan los PSD RGB y en escala de grises de 8 bits. Los archivos PSB, de 16/32 bits y
            CMYK todavía no se pueden leer.
          </li>
          <li>Para cambiar antes capas o texto, abre el PSD en el editor.</li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "¿Necesito Photoshop?",
        a: "No. Picstea lee el PSD en tu navegador. Para editar las capas, abre el archivo en el editor de Picstea.",
      },
      {
        q: "¿Por qué dice que mi PSD no tiene imagen acoplada?",
        a: "Photoshop solo la guarda cuando Maximizar compatibilidad está activado. Abre el PSD en el editor (Archivo → Abrir) y exporta un PNG desde allí.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "heic-to-jpg",
    label: "HEIC a JPG",
    title: "Convertir HEIC a JPG online",
    description:
      "Convierte fotos HEIC de iPhone a JPG en tu navegador, de una en una o por lotes. Gratis, sin registro y tus fotos nunca se suben a un servidor.",
    lead: "Para convertir HEIC a JPG, haz clic en Convertir ahora, suelta tus fotos .heic, elige una calidad y guarda. Los JPG se abren en Windows, Android y cualquier app, y tus fotos nunca salen de tu dispositivo.",
    body: () => (
      <>
        <h2>¿Por qué convertir HEIC a JPG?</h2>
        <p>
          Los iPhone y iPad guardan las fotos como HEIC (High Efficiency Image File) para ahorrar
          espacio. Los dispositivos de Apple las abren, pero muchos PC con Windows, móviles Android,
          webs y formularios de subida no. JPG funciona en todas partes.
        </p>
        <h2>Qué esperar</h2>
        <ul>
          <li>Las fotos se colocan derechas, según lo guardado en el archivo.</li>
          <li>
            Una calidad de 85–90 mantiene el aspecto de las fotos; 90 es el valor por defecto.
          </li>
          <li>
            El primer archivo HEIC carga un decodificador de 2 MB desde el propio sitio de Picstea;
            después queda en caché y funciona sin conexión una vez instalado Picstea.
          </li>
          <li>
            Solo se convierte la foto principal: los videos de Live Photo, los mapas de profundidad
            y las ráfagas se omiten, y los datos de la cámara, como la ubicación, no se copian.
          </li>
          <li>
            ¿Necesitas transparencia o editar? Abre el HEIC en el editor (Archivo → Abrir) o usa{" "}
            <Link href="/convert">otro conversor</Link>.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "¿Se suben mis fotos del iPhone?",
        a: "No. El archivo HEIC se decodifica en tu navegador con un decodificador de código abierto (libheif) que Picstea sirve desde su propio sitio. Tus fotos nunca salen de tu dispositivo.",
      },
      {
        q: "¿Puedo convertir HEIC a PNG?",
        a: "Sí. En el conversor, elige PNG en Convertir a. Los archivos PNG ocupan más, pero son sin pérdida.",
      },
      {
        q: "¿Puedo editar una foto HEIC?",
        a: "Sí. Ábrela con Archivo → Abrir en el editor como cualquier otra foto y luego expórtala como JPG, PNG o WebP.",
      },
      MANY,
    ],
  },
];

export default CONVERTERS;
