import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Alternativa gratis a Photoshop en tu navegador",
  description:
    "Picstea es una alternativa gratis a Photoshop en tu navegador: capas, máscaras, capas de ajuste y archivos PSD, sin instalar nada, sin cuenta y sin subir nada.",
  lead: "Picstea te ofrece lo esencial de un flujo de trabajo al estilo de Photoshop —capas, máscaras, capas de ajuste, selecciones, retoque y archivos PSD— en una pestaña del navegador. Nada que instalar, ningún registro, y tus imágenes se quedan en tu dispositivo.",
  faqs: [
    {
      q: "¿Picstea sustituye a Photoshop?",
      a: "Para la edición fotográfica diaria, el retoque y el diseño con capas, a menudo sí. Para la producción de impresión en CMYK, imágenes de 16/32 bits, generación con IA o 3D y video avanzados, Photoshop sigue siendo la herramienta adecuada.",
    },
    {
      q: "¿Me sirven mis costumbres de Photoshop?",
      a: "En gran parte. Las herramientas, los paneles y los atajos siguen las mismas convenciones: V mover, M marco, L lazo, B pincel, J corrector, Ctrl/Cmd+J duplicar, Ctrl/Cmd+E combinar hacia abajo, X y D para los colores, y Mayús más la tecla de una herramienta para cambiar de herramienta dentro de un grupo.",
    },
    {
      q: "¿Puedo abrir mis archivos PSD?",
      a: "Sí, los PSD RGB y en escala de grises de 8 bits con sus capas, grupos, máscaras, texto editable, capas de ajuste, formas, objetos inteligentes y los estilos de capa habituales. Puedes volver a guardar PSD con capas.",
    },
    {
      q: "¿Cuesta algo?",
      a: "No. Picstea es gratis, no necesita cuenta y no añade marca de agua. Se financia con publicidad en la web y el blog y con patrocinios señalados junto al lienzo, nunca encima de tu trabajo.",
    },
  ],
  body: () => (
    <>
      <h2>Lo que te resultará familiar</h2>
      <ul>
        <li>
          Barra de menús, barra de herramientas con herramientas agrupadas, barra de opciones y
          paneles Propiedades, Historia y Capas.
        </li>
        <li>
          Capas de píxeles, de forma, de texto, de relleno y de ajuste; grupos, 16 modos de fusión,
          máscaras de capa, máscaras vectoriales y máscaras de recorte.
        </li>
        <li>
          El cuadro de diálogo Estilo de capa completo: los diez efectos con contornos, varias
          copias de un efecto y estilos guardados.
        </li>
        <li>
          Selecciones con marco, lazo, varita mágica y Gama de colores; pincel corrector, tampón de
          clonar, sobreexponer y subexponer.
        </li>
        <li>
          Herramienta Pluma y trazados, objetos inteligentes con filtros inteligentes, acciones y
          procesamiento por lotes.
        </li>
      </ul>
      <h2>En qué se diferencian</h2>
      <table>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">Picstea</th>
            <th scope="col">Adobe Photoshop</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Dónde funciona</th>
            <td>Cualquier navegador actual</td>
            <td>App de escritorio (instalada)</td>
          </tr>
          <tr>
            <th scope="row">Precio</th>
            <td>Gratis, sin cuenta</td>
            <td>Suscripción de pago</td>
          </tr>
          <tr>
            <th scope="row">Tus imágenes</th>
            <td>Se quedan en tu dispositivo</td>
            <td>En tu ordenador; documentos en la nube opcionales</td>
          </tr>
          <tr>
            <th scope="row">Archivos</th>
            <td>
              Abre PSD (8 bits), PNG, JPEG, WebP, GIF y SVG; exporta PSD, PNG, JPEG, WebP, SVG y PDF
            </td>
            <td>Muchos más formatos, incluidos CMYK y 16/32 bits</td>
          </tr>
          <tr>
            <th scope="row">Alcance</th>
            <td>Edición y retoque esenciales</td>
            <td>Muchas más funciones, incluidas herramientas de IA</td>
          </tr>
        </tbody>
      </table>
      <h2>Cuándo quedarse con Photoshop</h2>
      <p>
        Si preparas archivos para impresión comercial en CMYK, trabajas a diario con imágenes de 16
        o 32 bits o archivos RAW, o dependes de funciones de IA generativa, Photoshop sigue siendo
        la mejor herramienta. Picstea es honesto sobre sus límites: consulta qué{" "}
        <Link href="/docs/file-formats">abre y exporta</Link> (en inglés) y las{" "}
        <Link href="/faq">preguntas frecuentes</Link>.
      </p>
    </>
  ),
};

export default copy;
