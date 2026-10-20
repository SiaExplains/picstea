import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Filtros y efectos de fotos online gratis",
  description:
    "Más de 60 filtros de fotos en el navegador con vista previa: desenfoque, enfoque, ruido, óleo, semitono, Camera Raw, Licuar y más. Gratis y sin subir nada.",
  lead: "Picstea tiene más de 60 filtros de fotos, organizados como el menú Filtro de Photoshop, cada uno con vista previa en directo sobre tu foto: desenfoques, enfoque, reducción de ruido, distorsiones, efectos artísticos, Camera Raw y Licuar. Son gratis y funcionan en tu navegador, así que tus fotos nunca se suben.",
  faqs: [
    {
      q: "¿Puedo cambiar un filtro después de aplicarlo?",
      a: "Sí, si lo aplicas como filtro inteligente: convierte la capa con Capa → Objeto inteligente → Convertir en objeto inteligente y luego aplica el filtro. Puedes cambiarlo o quitarlo en cualquier momento.",
    },
    {
      q: "¿Puedo aplicar un filtro a una parte de la foto?",
      a: "Sí. Selecciona antes una zona; solo cambia la selección, y los bordes calados se funden con suavidad.",
    },
    {
      q: "¿Son los mismos filtros que en Photoshop?",
      a: "El menú Filtro sigue a Photoshop y Photopea, así que los filtros están donde esperas. Son implementaciones propias de Picstea, así que los resultados pueden variar ligeramente.",
    },
    {
      q: "¿Hay ajustes preestablecidos de un clic al estilo de Instagram?",
      a: "No como lista de ajustes preestablecidos. Para un aspecto rápido, usa Camera Raw, capas de ajuste Filtro de fotografía o Mapa de degradado, o los efectos artísticos de la Galería de filtros.",
    },
    {
      q: "¿Se suben mis fotos?",
      a: "No. Todos los filtros funcionan en tu navegador. Picstea no tiene ningún servidor que reciba imágenes.",
    },
  ],
  body: () => (
    <>
      <h2>Aplica un filtro en cuatro pasos</h2>
      <ol>
        <li>Abre el editor y suelta tu foto en la página.</li>
        <li>
          Opcional: haz clic derecho en la capa y conviértela en objeto inteligente, para que el
          filtro siga siendo editable.
        </li>
        <li>Elige un filtro del menú Filtro y ajústalo mientras miras el lienzo.</li>
        <li>Pulsa OK y luego Archivo → Exportar como… para guardar el resultado.</li>
      </ol>
      <h2>Filtros populares</h2>
      <ul>
        <li>
          <strong>Camera Raw</strong>: balance de blancos, exposición, contraste, iluminaciones,
          sombras, claridad, neblina, intensidad y saturación en un solo cuadro de diálogo.
        </li>
        <li>
          <strong>Desenfocar</strong>: gaussiano, de movimiento, radial, de lente (bokeh) y de
          superficie, además de Inclinación-desplazamiento, Desenfoque de iris y Desenfoque de campo
          de la Galería de desenfoque para una profundidad de campo reducida.
        </li>
        <li>
          <strong>Enfocar</strong>: Máscara de enfoque y Enfoque suavizado para un detalle nítido.
        </li>
        <li>
          <strong>Ruido</strong>: Reducir ruido y Polvo y rascaduras para fotos nocturnas y
          escaneados antiguos, o Añadir ruido para grano de película.
        </li>
        <li>
          <strong>Galería de filtros</strong>: aspectos artísticos como Acuarela, Pincel seco,
          Cuarteado, Bordes añadidos y Grano de película.
        </li>
        <li>
          <strong>Estilizar y Pixelizar</strong>: Pintura al óleo, Relieve, Hallar bordes, Semitono
          de color, Mosaico y Cristalizar.
        </li>
        <li>
          <strong>Distorsionar</strong>: Molinete, Esferizar, Rizo, Onda y Coordenadas polares.
        </li>
        <li>
          <strong>Licuar</strong>: empuja, gira, desinfla e infla píxeles con un pincel.
        </li>
        <li>
          <strong>Corrección de lente</strong>: corrige la distorsión de barril, los halos de color
          y el viñeteado.
        </li>
      </ul>
      <p>
        La <Link href="/docs/filters">guía de filtros</Link> (en inglés) enumera todos los filtros
        del menú.
      </p>
      <h2>Aspectos de color con capas de ajuste</h2>
      <p>
        Para etalonar el color en lugar de aplicar efectos, usa capas de ajuste: Filtro de
        fotografía para tonos cálidos o fríos, Mapa de degradado para duotonos, Blanco y negro,
        Tono/saturación y Curvas. Están en su propia capa, así que la foto de debajo nunca cambia.
      </p>
      <h2>Limitaciones</h2>
      <p>
        Los filtros funcionan en capas de píxeles y objetos inteligentes. Las imágenes pueden tener
        hasta 12.000 píxeles por lado (36 megapíxeles), y no hay filtros de IA como la sustitución
        del cielo o la transferencia de estilo.
      </p>
    </>
  ),
};

export default copy;
