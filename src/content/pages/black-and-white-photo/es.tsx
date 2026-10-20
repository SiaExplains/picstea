import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Cómo pasar una foto a blanco y negro online",
  description:
    "Pasa una foto en color a blanco y negro en tu navegador con una capa de ajuste reversible, más Mezclador de canales, duotonos y contraste. Gratis y privado.",
  lead: "Para pasar una foto a blanco y negro en Picstea, ábrela y elige Capa → Nueva capa de ajuste → Blanco y negro. Los colores se vuelven grises en una capa propia, así que puedes deshacerlo cuando quieras. Es gratis y tu foto nunca sale de tu dispositivo.",
  faqs: [
    {
      q: "¿Puedo recuperar los colores?",
      a: "Sí. El aspecto en blanco y negro es una capa de ajuste; ocúltala o elimínala y vuelven los colores originales. La foto de debajo nunca cambia.",
    },
    {
      q: "¿Cómo oscurezco el cielo, como con un filtro rojo?",
      a: "Usa una capa de ajuste Mezclador de canales con Monocromo marcado, y toma más del canal rojo y menos del azul. Blanco y negro en sí no tiene reguladores de color.",
    },
    {
      q: "¿Puedo conservar un color y poner el resto en gris?",
      a: "Sí. Pinta de negro en la máscara de la capa de ajuste sobre la parte que debe seguir en color.",
    },
    {
      q: "¿Se sube mi foto?",
      a: "No. Todo funciona en tu navegador. Picstea no tiene ningún servidor que reciba imágenes.",
    },
  ],
  body: () => (
    <>
      <h2>Pasa una foto a blanco y negro en tres pasos</h2>
      <ol>
        <li>Abre el editor y suelta tu foto en la página.</li>
        <li>Elige Capa → Nueva capa de ajuste → Blanco y negro.</li>
        <li>Elige Archivo → Exportar como… y guarda el resultado.</li>
      </ol>
      <h2>Controla los tonos</h2>
      <ul>
        <li>
          <strong>Mezclador de canales</strong> con <strong>Monocromo</strong> marcado te permite
          decidir cuánto aporta cada color: más rojo aclara la piel y oscurece un cielo azul, y más
          verde va bien para paisajes.
        </li>
        <li>
          <strong>Curvas</strong> o <strong>Niveles</strong> encima de la capa de blanco y negro
          añaden contraste; consulta{" "}
          <Link href="/blog/levels-and-curves-explained">niveles y curvas explicados</Link> (en
          inglés).
        </li>
        <li>
          <strong>Mapa de degradado</strong> asigna los grises a dos colores para un duotono o un
          aspecto sepia.
        </li>
        <li>
          <strong>Tono/saturación</strong> con la saturación a −100 es otra forma rápida de quitar
          el color.
        </li>
      </ul>
      <h2>Conserva un color</h2>
      <p>
        Cada capa de ajuste tiene una máscara. Selecciona el Pincel, pinta de negro en la máscara
        sobre la parte que debe conservar su color —un abrigo rojo, una flor— y pinta de blanco para
        recuperar el gris.
      </p>
      <h2>Limitaciones</h2>
      <p>
        El ajuste Blanco y negro convierte los colores con pesos fijos y no tiene reguladores; usa
        Mezclador de canales cuando quieras controlarlos. Picstea trabaja en RGB de 8 bits, así que
        no hay edición a 16 bits ni en modo escala de grises.
      </p>
    </>
  ),
};

export default copy;
