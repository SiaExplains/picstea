import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Cómo añadir texto a una foto online",
  description:
    "Añade texto editable a una foto en tu navegador: elige fuente, tamaño y color, añade sombra o contorno y exporta. Gratis, sin marca de agua y sin subir nada.",
  lead: "Para añadir texto a una foto en Picstea, abre la foto, elige la herramienta Texto (T), haz clic donde quieras el texto y escribe. Cambia la fuente, el tamaño y el color en la barra de opciones y luego exporta. Es gratis, no añade marca de agua y tu foto se queda en tu dispositivo.",
  faqs: [
    {
      q: "¿Puedo cambiar el texto más tarde?",
      a: "Sí. El texto se mantiene en su propia capa editable hasta que exportas. Guarda el proyecto (o un PSD) para seguir editándolo otro día.",
    },
    {
      q: "¿Qué fuentes puedo usar?",
      a: "Las fuentes habituales que tiene cualquier ordenador: Arial, Helvetica, Verdana, Trebuchet MS, Georgia, Times New Roman, Courier New, Impact y la fuente de tu sistema. Todavía no se pueden subir fuentes propias.",
    },
    {
      q: "¿Cómo hago que el texto se lea bien sobre una foto recargada?",
      a: "Añade una sombra paralela o un trazo en el cuadro de diálogo Estilo de capa, o pon una forma detrás del texto y baja su opacidad.",
    },
    {
      q: "¿Hay marca de agua?",
      a: "No. Picstea nunca añade marca de agua y tu foto nunca se sube.",
    },
  ],
  body: () => (
    <>
      <h2>Añade texto en cuatro pasos</h2>
      <ol>
        <li>Abre el editor y suelta tu foto en la página.</li>
        <li>
          Pulsa T (o elige la herramienta Texto), haz clic en la foto y escribe. Pulsa Intro para
          una línea nueva.
        </li>
        <li>
          En la barra de opciones, elige la fuente, el tamaño, negrita o cursiva, el color, la
          alineación, el interlineado y el espaciado entre letras. Mueve el texto con la herramienta
          Mover (V).
        </li>
        <li>Elige Archivo → Exportar como… y guarda un JPEG, PNG o WebP.</li>
      </ol>
      <h2>Haz que el texto destaque</h2>
      <ul>
        <li>
          Haz doble clic en la capa de texto (o Capa → Opciones de fusión…) para abrir Estilo de
          capa: añade una <strong>sombra paralela</strong>, un <strong>trazo</strong> (contorno), un
          resplandor exterior o una superposición de degradado.
        </li>
        <li>
          Dibuja un rectángulo bajo el texto con las herramientas de forma y baja su opacidad para
          crear una barra de pie de foto.
        </li>
        <li>Baja la opacidad de la capa de texto para crear tu propia marca de agua discreta.</li>
        <li>
          Rota o escala el texto con Transformación libre (Cmd/Ctrl+T); sigue siendo editable.
        </li>
      </ul>
      <h2>Conviene saber</h2>
      <ul>
        <li>
          ¿Necesitas el mismo texto en muchas fotos? El texto todavía no se puede grabar en una
          acción, así que añádelo a cada foto.
        </li>
        <li>
          El texto de un archivo de Photoshop también se abre como texto editable; consulta el{" "}
          <Link href="/psd-editor">editor de PSD</Link>.
        </li>
      </ul>
      <h2>Limitaciones</h2>
      <p>
        El texto es texto de punto: las líneas se cortan donde pulsas Intro, sin ajuste automático
        dentro de un cuadro. Todavía no hay texto en curva ni texto vertical, y solo están
        disponibles las fuentes habituales que se indican en las preguntas de abajo.
      </p>
    </>
  ),
};

export default copy;
