import { ConverterList } from "@/components/site/ConverterList";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Conversor de imágenes gratis que no sube archivos",
  description:
    "Convierte imágenes HEIC, WebP, PNG, JPG, SVG y PSD a PNG, JPG o WebP en tu navegador. Gratis, sin registro y por lotes; tus archivos no salen de tu equipo.",
  lead: "Picstea convierte imágenes entre PNG, JPG y WebP —y pasa fotos HEIC de iPhone, SVG y archivos PSD de Photoshop a JPG o PNG— directamente en tu navegador. Elige un conversor abajo o abre el conversor directamente; tus archivos nunca salen de tu dispositivo.",
  faqs: [
    {
      q: "¿Qué formatos puedo convertir?",
      a: "Picstea lee archivos PNG, JPEG, WebP, GIF (primer fotograma), SVG, HEIC (fotos de iPhone) y PSD y los convierte a PNG, JPG o WebP.",
    },
    {
      q: "¿Se suben mis archivos?",
      a: "No. La conversión se hace en tu navegador, en el editor de Picstea, que no tiene ningún servidor que reciba archivos. Tampoco se guarda nada en el navegador.",
    },
    {
      q: "¿Cuántos archivos puedo convertir a la vez?",
      a: "Hasta 200. Un archivo se guarda directamente; varios se guardan juntos en un único archivo ZIP.",
    },
    {
      q: "¿Hay un límite de tamaño?",
      a: "Los archivos pueden ocupar hasta 200 MB y las imágenes tener hasta 12.000 píxeles por lado (36 megapíxeles).",
    },
  ],
  body: () => (
    <>
      <h2>Conversores</h2>
      <ConverterList />
      <h2>¿Por qué convertir en el navegador?</h2>
      <p>
        La mayoría de los conversores online suben tu imagen a un servidor, la convierten allí y te
        la devuelven. Picstea hace el trabajo en tu propio ordenador o móvil, así que las fotos
        privadas y los archivos de trabajo siguen siendo privados, y sigue funcionando sin conexión
        una vez instalado como app.
      </p>
      <p>
        ¿También necesitas cambiar la imagen? Ábrela en el editor, edítala y luego usa Archivo →
        Exportar como…. En el editor, Archivo → Convertir… abre el mismo conversor.
      </p>
    </>
  ),
};

export default copy;
