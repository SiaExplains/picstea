import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Cómo desenfocar el fondo de una foto online",
  description:
    "Desenfoca el fondo en el navegador: selecciona el sujeto y aplica Desenfoque de lente, o usa Inclinación-desplazamiento o Desenfoque de iris. Gratis.",
  lead: "Para desenfocar el fondo de una foto en Picstea, selecciona el sujeto, elige Selección → Invertir para que quede seleccionado el fondo y aplica Filtro → Desenfocar → Desenfoque de lente. Funciona en tu navegador, es gratis y tu foto nunca se sube.",
  faqs: [
    {
      q: "¿Picstea puede seleccionar a la persona automáticamente?",
      a: "Todavía no: no hay selección de sujeto con IA. Selecciona el sujeto a mano con el lazo, el lazo poligonal o la varita mágica; Gama de colores ayuda cuando el fondo es de un solo color.",
    },
    {
      q: "¿Qué desenfoque se parece más al de una cámara real?",
      a: "Desenfoque de lente: imita un objetivo desenfocado y puede hacer que los puntos brillantes resplandezcan como un bokeh. Desenfoque gaussiano es más suave y uniforme.",
    },
    {
      q: "¿Puedo cambiar el desenfoque más tarde?",
      a: "Sí, si desenfocas una copia: pulsa Cmd/Ctrl+J para duplicar antes la capa, desenfoca la copia y luego ocúltala o elimínala para volver atrás. Además, cada filtro es un paso que se puede deshacer.",
    },
    {
      q: "¿Se sube mi foto?",
      a: "No. El desenfoque se calcula en tu navegador. Picstea no tiene ningún servidor que reciba imágenes.",
    },
  ],
  body: () => (
    <>
      <h2>Desenfoca el fondo en cinco pasos</h2>
      <ol>
        <li>Abre el editor y suelta tu foto en la página.</li>
        <li>
          Selecciona el sujeto: repásalo con el Lazo o el Lazo poligonal, o haz clic en el fondo con
          la Varita mágica y usa Selección → Invertir para cambiarla.
        </li>
        <li>
          Elige Selección → Calar… con unos pocos píxeles, para que el borde entre lo nítido y lo
          desenfocado sea suave.
        </li>
        <li>
          Con el fondo seleccionado, elige Filtro → Desenfocar → Desenfoque de lente… y sube el
          Radio mientras miras la foto. Brillo especular hace que las luces resplandezcan como un
          bokeh.
        </li>
        <li>Pulsa OK, deselecciona y exporta con Archivo → Exportar como….</li>
      </ol>
      <h2>Sin selección: Galería de desenfoque</h2>
      <p>
        Para conseguir rápido un efecto de profundidad de campo, Filtro → Galería de desenfoque
        mantiene nítida parte de la foto sin seleccionar nada:
      </p>
      <ul>
        <li>
          <strong>Inclinación-desplazamiento</strong> mantiene nítida una franja horizontal y
          desenfoca por encima y por debajo: el aspecto de &quot;miniatura&quot; para paisajes y
          calles.
        </li>
        <li>
          <strong>Desenfoque de iris</strong> mantiene nítido un óvalo alrededor del sujeto y
          desenfoca el resto: ideal para retratos.
        </li>
        <li>
          <strong>Desenfoque de campo</strong> desenfoca toda la imagen por igual.
        </li>
      </ul>
      <p>
        Donde Photoshop usa chinchetas en el lienzo, Picstea define el centro y el tamaño con
        reguladores.
      </p>
      <h2>Consejos</h2>
      <ul>
        <li>
          El pelo y los bordes difusos son lo más difícil. Cala un poco más y acerca el zoom para
          revisar el borde antes de desenfocar.
        </li>
        <li>Para conservar el original, duplica la capa (Cmd/Ctrl+J) y desenfoca la copia.</li>
        <li>
          Más sobre selecciones: <Link href="/docs/selections">guía de selecciones</Link> (en
          inglés). Todos los desenfoques están en la{" "}
          <Link href="/docs/filters">guía de filtros</Link> (en inglés).
        </li>
      </ul>
      <h2>Limitaciones</h2>
      <p>
        Todavía no hay detección automática del sujeto ni modo retrato, ni mapa de profundidad: el
        desenfoque tiene la misma intensidad en toda la zona donde se aplica, en lugar de aumentar
        con la distancia.
      </p>
    </>
  ),
};

export default copy;
