import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Comprimir una imagen online sin subirla",
  description:
    "Reduce el peso de tus imágenes en el navegador cambiando su tamaño y exportando JPEG o WebP con menos calidad. Gratis, privado y sin subir nada a un servidor.",
  lead: "Picstea reduce el peso de las imágenes en tu navegador: cámbiales el tamaño al que necesites y luego expórtalas como JPEG o WebP con una calidad más baja. A diferencia de la mayoría de los compresores online, tu imagen nunca se sube a un servidor.",
  faqs: [
    {
      q: "¿Qué calidad debo elegir?",
      a: "Para fotos en la web, entre 70 y 85 suele verse igual que el original con una fracción del tamaño. Baja más solo para miniaturas; revisa el resultado antes de usarlo.",
    },
    {
      q: "¿WebP ocupa menos que JPEG?",
      a: "Normalmente, sí: con la misma calidad visual, un archivo WebP suele ser bastante más pequeño que un JPEG, y puede conservar la transparencia.",
    },
    {
      q: "¿Puedo comprimir un PNG?",
      a: "La exportación a PNG es siempre sin pérdida, así que no tiene ajuste de calidad. Para que un PNG ocupe menos, cambia su tamaño o expórtalo como WebP (que conserva la transparencia) o JPEG.",
    },
    {
      q: "¿Puedo comprimir a un tamaño exacto, por ejemplo menos de 100 KB?",
      a: "No automáticamente. Picstea no tiene un ajuste de tamaño objetivo ni muestra el tamaño del archivo antes de guardar; baja la calidad o las dimensiones y vuelve a exportar hasta que encaje.",
    },
    {
      q: "¿Es privado?",
      a: "Sí. La compresión se hace en tu navegador. A diferencia de la mayoría de los compresores online, Picstea nunca sube tu imagen a un servidor.",
    },
  ],
  body: () => (
    <>
      <h2>Comprime una imagen en cuatro pasos</h2>
      <ol>
        <li>Abre el editor y suelta tu imagen en la página.</li>
        <li>
          Si es más grande de lo que necesitas, elige Imagen → Tamaño de imagen… y reduce la
          anchura. Reducir la anchura a la mitad deja el número de píxeles en una cuarta parte, que
          es el mayor ahorro.
        </li>
        <li>Elige Archivo → Exportar como… y selecciona JPEG (fotos) o WebP (fotos y gráficos).</li>
        <li>Baja el regulador de calidad, por ejemplo a 80, y guarda.</li>
      </ol>
      <h2>Qué hace que un archivo de imagen ocupe menos</h2>
      <ul>
        <li>
          <strong>Menos píxeles.</strong> Una foto de móvil de 4.000 píxeles de ancho que se muestra
          a 1.200 píxeles en una web desperdicia la mayor parte de sus bytes.
        </li>
        <li>
          <strong>Formatos con pérdida.</strong> JPEG y WebP descartan detalles que el ojo apenas
          nota. El ajuste de calidad (1–100, 90 por defecto) controla cuánto.
        </li>
        <li>
          <strong>El formato adecuado.</strong> Fotos en JPEG o WebP; logotipos y capturas de
          pantalla en PNG o WebP. Una foto guardada como PNG suele ocupar varias veces más que la
          misma foto en JPEG.
        </li>
      </ul>
      <h2>Por qué comprimir en el navegador</h2>
      <p>
        La mayoría de los compresores de imágenes suben tu archivo a su servidor, lo procesan allí y
        te lo devuelven. Picstea hace el trabajo en tu propio dispositivo, así que las fotos
        privadas, los documentos y las capturas de pantalla siguen siendo privados, y funciona sin
        conexión una vez instalada la app.
      </p>
      <h2>Limitaciones</h2>
      <p>
        Picstea es un editor de imágenes, no un optimizador específico: no tiene optimizador de PNG
        sin pérdida, ni tamaño de archivo objetivo, ni vista previa del tamaño del archivo antes de
        guardar. Para comprimir muchas imágenes a la vez, graba una acción y usa Archivo →
        Automatizar → Lote… para exportarlas como JPEG o WebP en un único archivo ZIP (el
        procesamiento por lotes todavía no puede cambiar el tamaño). Más información sobre los{" "}
        <Link href="/docs/file-formats">formatos de archivo</Link> (en inglés).
      </p>
    </>
  ),
};

export default copy;
