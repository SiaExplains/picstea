import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Cómo hacer transparente un fondo online",
  description:
    "Quita a mano un fondo liso con el Borrador mágico o el Borrador de fondos y guarda un PNG o WebP transparente. Gratis, en tu navegador y sin subir nada.",
  lead: "Picstea hace transparente un fondo a mano, no con IA: haz clic en un fondo liso con el Borrador mágico, limpia los bordes con el Borrador de fondos y exporta un PNG. Es gratis, funciona en tu navegador y no se sube nada.",
  faqs: [
    {
      q: "¿Picstea quita fondos automáticamente?",
      a: "No, todavía no. No hay eliminación de fondos con IA; quitas el fondo con los borradores o con una selección. Funciona mejor con fondos lisos y de color uniforme, como fotos de producto y logotipos.",
    },
    {
      q: "¿Qué formato conserva la transparencia?",
      a: "PNG (sin pérdida) o WebP (más pequeño). JPEG no admite transparencia, así que en él las zonas transparentes se vuelven blancas.",
    },
    {
      q: "¿Cómo sé que el fondo ha desaparecido de verdad?",
      a: "Las zonas transparentes muestran un tablero de ajedrez gris y blanco en el lienzo. Todo lo que siga visible sobre el tablero aparecerá en la imagen exportada.",
    },
    {
      q: "¿Se sube mi imagen?",
      a: "No. Todo ocurre en tu navegador. Picstea no tiene ningún servidor que reciba imágenes.",
    },
  ],
  body: () => (
    <>
      <h2>Quita un fondo liso en cuatro pasos</h2>
      <ol>
        <li>Abre el editor y suelta tu imagen en la página.</li>
        <li>
          Elige el Borrador mágico (en el grupo de borradores de la barra de herramientas) y haz
          clic en el fondo. Todos los píxeles conectados de un color similar se vuelven
          transparentes; sube la tolerancia en la barra de opciones si queda parte.
        </li>
        <li>
          Limpia lo que quede en los bordes con el Borrador de fondos, que borra los colores
          parecidos al que hay bajo el centro del pincel y conserva el resto.
        </li>
        <li>Elige Archivo → Exportar como…, selecciona PNG o WebP y guarda.</li>
      </ol>
      <h2>Para fondos recargados: selecciona el sujeto</h2>
      <ol>
        <li>
          Repasa el sujeto con el Lazo o el Lazo poligonal (o selecciona el fondo con la Varita
          mágica o Gama de colores y elige Selección → Invertir).
        </li>
        <li>Elige Selección → Invertir para que quede seleccionado el fondo y pulsa Supr.</li>
        <li>
          ¿Prefieres conservar el fondo para más adelante? Usa una máscara de capa en lugar de
          borrar: todo lo que oculta la máscara queda transparente en la exportación, y puedes
          volver a pintarla cuando quieras.
        </li>
      </ol>
      <h2>Consejos</h2>
      <ul>
        <li>
          Acerca el zoom en los bordes; un calado de 1–2 píxeles evita contornos duros y dentados.
        </li>
        <li>
          Logotipos sobre blanco: Filtro → Otro → Color a alfa convierte el blanco en transparencia
          y conserva los bordes suaves.
        </li>
        <li>
          Las máscaras de capa se explican en{" "}
          <Link href="/blog/layers-and-masks-explained">capas y máscaras explicadas</Link> (en
          inglés).
        </li>
      </ul>
      <h2>Limitaciones</h2>
      <p>
        Sin IA, el pelo, el pelaje y los fondos que comparten colores con el sujeto requieren
        paciencia. Todavía no hay herramienta para perfeccionar bordes ni para &quot;seleccionar
        sujeto&quot;.
      </p>
    </>
  ),
};

export default copy;
