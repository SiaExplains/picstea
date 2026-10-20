import { LatestPosts, WelcomeLinks } from "@/components/welcome/WelcomeLinks";
import type { HomeCopy } from "./types";

const FAQ = [
  [
    "¿Picstea es gratis?",
    "Sí. Funciona en tu navegador sin cuenta, sin marca de agua y sin periodo de prueba.",
  ],
  [
    "¿Se suben mis imágenes?",
    "No. Las imágenes se abren, editan y exportan en tu dispositivo. Picstea no tiene ningún servidor que las reciba.",
  ],
  [
    "¿Dónde se guarda mi trabajo?",
    "En el almacenamiento de este navegador, en tu dispositivo, de forma automática. Usa Archivo → Guardar proyecto como para conservar una copia .picstea o exporta un PSD.",
  ],
  [
    "¿Puedo abrir archivos de Photoshop?",
    "Sí. Los archivos PSD RGB y en escala de grises de 8 bits se abren con capas, grupos, máscaras, texto editable, capas de ajuste y los estilos de capa habituales.",
  ],
  [
    "¿Funciona sin conexión?",
    "Sí. Después de la primera visita puedes instalar Picstea como app y seguir editando sin conexión.",
  ],
  [
    "¿Funciona en el móvil?",
    "El diseño se adapta a pantallas pequeñas, pero Picstea funciona mejor con ratón o trackpad y teclado.",
  ],
  [
    "¿Sustituye a Photoshop o Photopea?",
    "Para la mayoría de trabajos de edición fotográfica y diseño con capas, sí. Photoshop sigue por delante en herramientas de IA, trabajo de impresión CMYK y edición a 16 bits.",
  ],
] as const;

const LINKS = [
  ["/online-photo-editor", "Editor de fotos online gratis con capas"],
  ["/psd-editor", "Abrir y editar archivos PSD online"],
  ["/png-editor", "Editor de PNG"],
  ["/jpeg-editor", "Editor de JPEG"],
  ["/webp-editor", "Editor y conversor de WebP"],
  ["/image-resizer", "Redimensionar una imagen"],
  ["/image-compressor", "Comprimir una imagen"],
  ["/photo-filters", "Filtros de fotos"],
  ["/convert", "Convertir imágenes (HEIC, WebP, PNG, JPG, SVG, PSD)"],
  ["/blur-background", "Cómo desenfocar el fondo de una foto"],
  ["/make-background-transparent", "Cómo hacer transparente un fondo"],
  ["/photoshop-alternative", "Una alternativa gratuita a Photoshop"],
  ["/photopea-alternative", "Picstea como alternativa a Photopea"],
  ["/gimp-alternative", "Picstea como alternativa a GIMP"],
  ["/docs", "Documentación (en inglés)"],
  ["/faq", "Preguntas frecuentes"],
  ["/about", "Acerca de Picstea"],
] as const;

const copy: HomeCopy = {
  tagline: "Editor de fotos online gratis",
  description:
    "Picstea es un editor de fotos online gratis con capas, máscaras y capas de ajuste. Edita y exporta imágenes en tu navegador: nunca salen de tu dispositivo.",
  welcome: {
    title: "Un editor de imágenes gratis que mantiene tus imágenes en tu dispositivo",
    lead: "Picstea es un editor de imágenes por capas que funciona íntegramente en tu navegador.",
    highlights: [
      ["Privado por diseño", "La edición se hace en tu navegador. Tus imágenes nunca se suben."],
      [
        "Capas que siguen siendo editables",
        "Grupos, máscaras, 16 modos de fusión, capas de ajuste y efectos.",
      ],
      [
        "Selecciona, pinta y escribe",
        "Marco, lazo y varita mágica, pinceles, degradados, formas y texto en el lienzo.",
      ],
      [
        "Abre y exporta",
        "Abre PNG, JPEG, WebP, GIF, SVG, HEIC y PSD con capas; exporta PSD, SVG, PDF e imágenes.",
      ],
    ],
    newHere: "¿Eres nuevo? Lee la {link}.",
    gettingStarted: "guía de primeros pasos (en inglés)",
    learnMore: "Más información",
    links: [
      ["/docs", "Documentación (en inglés)"],
      ["/blog", "Guías (en inglés)"],
      ["/faq", "Preguntas frecuentes"],
      ["/photoshop-alternative", "Alternativa a Photoshop"],
      ["/psd-editor", "Editor de PSD"],
    ],
    start: "Empezar a editar",
  },
  about: {
    summary: "Acerca de Picstea: funciones, privacidad, formatos de archivo y preguntas frecuentes",
    body: () => (
      <>
        <h2>¿Qué es Picstea?</h2>
        <p>
          Picstea es un editor de imágenes online gratis que funciona como Photoshop y Photopea:
          capas, máscaras, capas de ajuste, selecciones, estilos de capa y filtros, con una barra de
          menús, una barra de herramientas y unos paneles que te resultarán familiares. Funciona
          íntegramente en tu navegador web en Windows, macOS, Linux y ChromeOS, sin nada que
          instalar y sin registro.
        </p>

        <h2>Qué puedes hacer con él</h2>
        <ul>
          <li>
            <strong>Capas:</strong> capas de píxeles, de forma, de texto, de relleno y de ajuste,
            grupos, 16 modos de fusión, opacidad, máscaras de capa, máscaras vectoriales y máscaras
            de recorte.
          </li>
          <li>
            <strong>Ajustes:</strong> Niveles, Curvas, Brillo/contraste, Tono/saturación,
            Exposición, Intensidad, Equilibrio de color, Filtro de fotografía, Mezclador de canales,
            Mapa de degradado, Blanco y negro y más, como capas de ajuste que puedes cambiar
            después.
          </li>
          <li>
            <strong>Estilos de capa:</strong> sombra paralela, sombra interior, resplandores, bisel
            y relieve, satinado, superposiciones de colores, de degradado y de motivo y trazo, con
            Fusionar si y estilos guardados.
          </li>
          <li>
            <strong>Selecciones:</strong> marco, lazo, lazo poligonal, varita mágica y Gama de
            colores, con calar, expandir, contraer y transformar.
          </li>
          <li>
            <strong>Pintura y retoque:</strong> pincel, lápiz, borradores, degradado, bote de
            pintura, tampón de clonar, pincel corrector y pincel corrector puntual, sobreexponer,
            subexponer, esponja, desenfocar, enfocar y dedo.
          </li>
          <li>
            <strong>Filtros:</strong> el menú Filtro completo con vista previa en directo, incluidos
            desenfoques, distorsiones, ruido, enfoque, Camera Raw, Licuar y Punto de fuga, también
            como filtros inteligentes no destructivos en objetos inteligentes.
          </li>
          <li>
            <strong>Texto y vectores:</strong> texto editable, la herramienta Pluma y formas.
          </li>
          <li>
            <strong>Automatización:</strong> graba acciones y procesa por lotes muchas imágenes en
            un archivo ZIP.
          </li>
        </ul>

        <h2>Por qué tus imágenes se quedan en tu dispositivo</h2>
        <p>
          Picstea funciona en local. Tus imágenes se abren, editan, guardan y exportan en tu
          navegador; no hay ningún paso de subida ni ningún servidor que las reciba. La página del
          editor no ejecuta código de terceros, y su política de seguridad impide enviar los datos
          del documento a cualquier sitio. Los proyectos se guardan automáticamente en tu navegador
          y, después de la primera visita, Picstea se puede instalar como app y usar sin conexión.
        </p>

        <h2>Formatos de archivo</h2>
        <p>
          Picstea abre PNG, JPEG, WebP, GIF, SVG, HEIC (fotos de iPhone), PSD de Photoshop (RGB y
          escala de grises de 8 bits) y sus propios proyectos .picstea. Exporta PNG, JPEG, WebP,
          SVG, PDF y PSD con capas. Todavía no puede abrir archivos PSB, PSD de 16/32 bits o CMYK,
          TIFF, PDF ni RAW de cámara.
        </p>

        <h2>Preguntas frecuentes</h2>
        <dl>
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>

        <h2>Más información</h2>
        <WelcomeLinks links={LINKS} />
        <LatestPosts />
      </>
    ),
  },
};

export default copy;
