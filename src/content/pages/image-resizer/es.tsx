import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Redimensionar una imagen online",
  description:
    "Cambia el tamaño de imágenes a píxeles exactos en tu navegador, mantén las proporciones, cambia el lienzo o recorta. Gratis, sin registro y sin subir nada.",
  lead: "Para redimensionar una imagen online con Picstea, ábrela en el editor, elige Imagen → Tamaño de imagen…, escribe la nueva anchura o altura en píxeles y exporta. Las proporciones se mantienen, es gratis y la imagen nunca sale de tu dispositivo.",
  faqs: [
    {
      q: "¿Cómo cambio el tamaño de una imagen sin deformarla?",
      a: "En Imagen → Tamaño de imagen…, deja marcada la opción Restringir proporciones y escribe solo la anchura o la altura; el otro valor se ajusta solo.",
    },
    {
      q: "¿Qué diferencia hay entre Tamaño de imagen y Tamaño de lienzo?",
      a: "Tamaño de imagen escala toda la imagen. Tamaño de lienzo deja la imagen como está y añade o quita espacio a su alrededor, por ejemplo para añadir un borde o hacerla cuadrada.",
    },
    {
      q: "¿Puedo hacer una imagen más pequeña y luego más grande otra vez sin perder calidad?",
      a: "Sí, dentro de Picstea: las capas de píxeles conservan sus píxeles originales y solo se dibujan al nuevo tamaño, así que al volver a ampliar se recupera el detalle. El archivo exportado tiene el tamaño que elegiste.",
    },
    {
      q: "¿Puedo redimensionar muchas imágenes a la vez?",
      a: "Todavía no. Tamaño de imagen no se puede grabar en una acción, así que el procesamiento por lotes no puede cambiar el tamaño. Por ahora, redimensiona las imágenes de una en una.",
    },
    {
      q: "¿Se suben mis imágenes?",
      a: "No. El cambio de tamaño y la exportación se hacen en tu dispositivo. Picstea no tiene ningún servidor que reciba imágenes.",
    },
  ],
  body: () => (
    <>
      <h2>Redimensiona una imagen en cuatro pasos</h2>
      <ol>
        <li>Abre el editor y suelta tu imagen (PNG, JPEG, WebP, GIF o PSD) en la página.</li>
        <li>Elige Imagen → Tamaño de imagen….</li>
        <li>
          Con Restringir proporciones marcado, escribe la nueva anchura o altura en píxeles. También
          puedes definir la resolución (ppp) para imprimir.
        </li>
        <li>Elige Archivo → Exportar como…, selecciona un formato y guarda.</li>
      </ol>
      <h2>Otras formas de cambiar el tamaño</h2>
      <ul>
        <li>
          <strong>Tamaño de lienzo…</strong> (menú Imagen) añade o quita espacio alrededor de la
          imagen. Elige uno de los nueve puntos de ancla para indicar qué lado crece, o marca
          Relativo para añadir una cantidad fija, por ejemplo 20 píxeles en cada lado.
        </li>
        <li>
          <strong>La herramienta Recortar</strong> corta la imagen a la zona que arrastres. El
          recorte no es destructivo, así que puedes cambiarlo después.
        </li>
        <li>
          <strong>Cortar…</strong> elimina automáticamente los bordes transparentes o de un solo
          color.
        </li>
        <li>
          <strong>Tamaños predefinidos de documento nuevo</strong>: unos 80 tamaños listos para
          redes sociales, impresión, fotos, pantallas e iconos, en píxeles, pulgadas, centímetros o
          milímetros. Coloca tu imagen en uno con Archivo → Colocar imagen como capa y escálala para
          que encaje.
        </li>
      </ul>
      <h2>Consejos para obtener buenos resultados</h2>
      <ul>
        <li>
          Reduce las imágenes en lugar de ampliarlas: ampliar no puede añadir detalles que no
          existen.
        </li>
        <li>
          Después de reducir una foto, Filtro → Enfocar → Máscara de enfoque recupera la nitidez de
          los bordes.
        </li>
        <li>
          Para la web, exporta como WebP o JPEG para que el archivo ocupe poco; consulta la guía
          para <Link href="/image-compressor">comprimir imágenes</Link>.
        </li>
      </ul>
      <h2>Limitaciones</h2>
      <p>
        Las imágenes pueden tener hasta 12.000 píxeles por lado (36 megapíxeles). El cambio de
        tamaño por lotes todavía no está disponible, y no hay ampliación con IA.
      </p>
    </>
  ),
};

export default copy;
