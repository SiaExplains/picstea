import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Cómo enfocar una imagen online",
  description:
    "Enfoca una foto suave en tu navegador con Máscara de enfoque, Enfoque suavizado o Paso alto, con vista previa en directo. Gratis, sin registro y sin subir nada.",
  lead: "Para enfocar una imagen en Picstea, ábrela y elige Filtro → Enfocar → Máscara de enfoque…. Sube la Cantidad mientras miras la vista previa en directo, mantén el Radio bajo y pulsa OK. Es gratis, funciona en tu navegador y no se sube nada.",
  faqs: [
    {
      q: "¿El enfoque puede arreglar una foto borrosa?",
      a: "Solo una ligeramente suave. El enfoque aumenta el contraste en los bordes; no puede recuperar detalles que nunca se captaron, como en una foto muy desenfocada o movida. Picstea no tiene una función de 'desenfoque inverso' con IA.",
    },
    {
      q: "¿Qué filtro debo usar?",
      a: "Máscara de enfoque para la mayoría de las fotos, Enfoque suavizado cuando la falta de nitidez viene del objetivo o del movimiento, y Paso alto cuando quieres ajustar el enfoque más tarde con la opacidad de la capa.",
    },
    {
      q: "¿Por qué mi foto se ve granulada después de enfocarla?",
      a: "El enfoque también enfoca el ruido. Baja la cantidad, sube el Umbral de Máscara de enfoque o usa Reducir ruido de Enfoque suavizado.",
    },
    {
      q: "¿Se sube mi imagen?",
      a: "No. El enfoque funciona en tu navegador. Picstea no tiene ningún servidor que reciba imágenes.",
    },
  ],
  body: () => (
    <>
      <h2>Enfoca una foto en cuatro pasos</h2>
      <ol>
        <li>Abre el editor y suelta tu imagen en la página.</li>
        <li>Elige Vista → 100% para ver los píxeles reales mientras enfocas.</li>
        <li>
          Elige Filtro → Enfocar → Máscara de enfoque…: empieza con Cantidad 100 %, Radio 1–2 px y
          Umbral 0, y ajusta hasta que los bordes se vean nítidos sin halos brillantes.
        </li>
        <li>Pulsa OK y luego exporta con Archivo → Exportar como….</li>
      </ol>
      <h2>Tres formas de enfocar</h2>
      <ul>
        <li>
          <strong>Máscara de enfoque</strong>: Cantidad (intensidad), Radio (anchura del borde) y
          Umbral (ignora diferencias pequeñas, lo que protege la piel y el cielo del grano).
        </li>
        <li>
          <strong>Enfoque suavizado</strong>: elige qué quitar (desenfoque gaussiano, de lente o de
          movimiento, con un ángulo para el movimiento) y reduce el ruido a la vez.
        </li>
        <li>
          <strong>Paso alto</strong> (Filtro → Otro) en una capa duplicada (Cmd/Ctrl+J), con el modo
          de fusión de la capa en Superponer o Luz suave. Baja la opacidad de la capa para ajustar
          el enfoque en cualquier momento.
        </li>
      </ul>
      <h2>Consejos</h2>
      <ul>
        <li>
          Enfoca al final, después de redimensionar: reducir una foto la suaviza, y Máscara de
          enfoque recupera los bordes. Consulta la guía para{" "}
          <Link href="/image-resizer">redimensionar imágenes</Link>.
        </li>
        <li>Selecciona antes una zona para enfocar solo los ojos o el sujeto.</li>
        <li>
          En un objeto inteligente, el filtro se convierte en un filtro inteligente que puedes
          cambiar más tarde; consulta la{" "}
          <Link href="/blog/smart-objects-explained">guía de objetos inteligentes</Link> (en
          inglés).
        </li>
      </ul>
      <h2>Limitaciones</h2>
      <p>
        El enfoque no puede reconstruir detalles que faltan, y no hay ampliación ni eliminación de
        desenfoque con IA. Las imágenes pueden tener hasta 12.000 píxeles por lado (36 megapíxeles).
      </p>
    </>
  ),
};

export default copy;
