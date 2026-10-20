import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Editor de fotos online gratis con capas",
  description:
    "Edita fotos en tu navegador con capas, máscaras, capas de ajuste, selecciones y efectos. Gratis, sin registro y tus fotos nunca se suben.",
  lead: "Picstea es un editor de fotos gratuito que funciona en tu navegador. Tiene capas, máscaras, capas de ajuste y selecciones como un editor de escritorio, y tus fotos nunca salen de tu dispositivo.",
  faqs: [
    {
      q: "¿Picstea es gratis?",
      a: "Sí. El editor se usa gratis en tu navegador, sin cuenta y sin marca de agua.",
    },
    {
      q: "¿Se suben mis fotos?",
      a: "No. Las fotos se abren, editan y exportan en tu dispositivo. Picstea no tiene ningún servidor que reciba tus imágenes.",
    },
    {
      q: "¿En qué formatos puedo exportar?",
      a: "PNG, JPEG, WebP, SVG, PDF y PSD con capas.",
    },
    {
      q: "¿Puedo eliminar imperfecciones u objetos no deseados?",
      a: "Sí. Usa el Pincel corrector para quitar manchas e imperfecciones (iguala el color y el brillo de alrededor), o el Tampón de clonar para copiar una zona sobre otra. Ambos funcionan en tu navegador; no se sube nada.",
    },
    {
      q: "¿Puedo editar muchas fotos a la vez?",
      a: "Sí. Graba una acción (por ejemplo, un ajuste y un filtro) y luego usa Archivo → Automatizar → Lote… para aplicarla a muchas fotos. Los resultados se guardan en un único archivo ZIP, creado en tu dispositivo.",
    },
    {
      q: "¿Funciona sin conexión?",
      a: "Sí. Después de la primera visita puedes instalar Picstea como app y seguir editando sin conexión.",
    },
  ],
  body: () => (
    <>
      <h2>Edita una foto en cuatro pasos</h2>
      <ol>
        <li>Abre el editor y haz clic en Abrir imagen (o suelta una foto en la página).</li>
        <li>
          Ajústala de forma no destructiva: Capa → Nueva capa de ajuste → Brillo/contraste,
          Tono/saturación o Exposición.
        </li>
        <li>
          Selecciona una zona con el marco, el lazo o la varita mágica para editar solo esa parte.
        </li>
        <li>Archivo → Exportar como… y elige JPEG, PNG o WebP.</li>
      </ol>
      <h2>Qué puedes hacer</h2>
      <ul>
        <li>
          Tamaños predefinidos para redes sociales, impresión (A4, Carta, tarjetas de visita),
          fotos, pantallas, móviles, anuncios e iconos, en píxeles, pulgadas, centímetros o
          milímetros.
        </li>
        <li>Capas con 16 modos de fusión, opacidad, grupos y máscaras de capa.</li>
        <li>
          Selecciona varias capas para moverlas, escalarlas, rotarlas, alinearlas y distribuirlas a
          la vez.
        </li>
        <li>
          Capas de ajuste —incluidos Niveles y Curvas— que nunca cambian los píxeles originales.
        </li>
        <li>
          El menú Filtro completo de Photoshop, incluidos Camera Raw, Licuar y Punto de fuga;
          objetos inteligentes y filtros inteligentes.
        </li>
        <li>
          Selecciones con marco, lazo y varita mágica; calar, expandir, contraer, transformar.
        </li>
        <li>Pincel, lápiz, borrador, bote de pintura, degradado, formas y texto.</li>
        <li>
          Retoque: Tampón de clonar, Pincel corrector, Sobreexponer, Subexponer, Esponja,
          Desenfocar, Enfocar y Dedo.
        </li>
        <li>
          Ajustes de Intensidad, Equilibrio de color, Mezclador de canales, Mapa de degradado y
          Filtro de fotografía.
        </li>
        <li>
          Sombras paralelas, resplandores, satinado, biseles, trazos y superposiciones de colores,
          de degradado o de motivo, con varias copias y estilos guardados.
        </li>
        <li>Abre y guarda archivos PSD con capas; exporta PNG, JPEG, WebP, SVG y PDF.</li>
        <li>
          Graba acciones y vuelve a ejecutarlas, o procesa por lotes muchas fotos en una única
          descarga ZIP.
        </li>
        <li>Un selector de color con valores Hex, RGB y HSB, y tus propias muestras.</li>
        <li>
          Los proyectos se guardan automáticamente en tu navegador; un panel Historia para volver a
          cualquier paso.
        </li>
      </ul>
      <h2>Limitaciones</h2>
      <p>
        Las imágenes pueden tener hasta 12.000 píxeles por lado (36 megapíxeles). No hay
        herramientas de IA como la eliminación automática de fondos o el relleno según el contenido.
        Consulta la <Link href="/docs">documentación</Link> (en inglés) para ver todo lo que está
        disponible.
      </p>
    </>
  ),
};

export default copy;
