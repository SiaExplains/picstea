import { LocalLink as Link } from "@/components/site/LocalLink";
import pkg from "../../../../package.json";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Acerca de Picstea",
  description:
    "Picstea es un editor de fotos gratis por capas que funciona íntegramente en tu navegador. Tus imágenes se quedan en tu dispositivo: no se sube nada.",
  lead: "Un editor de imágenes gratis por capas en tu navegador, hecho para que tus fotos nunca salgan de tu dispositivo.",
  faqs: [],
  body: () => (
    <>
      <h2>Qué es Picstea</h2>
      <p>
        Picstea es un editor de fotos que funciona como las herramientas de escritorio que quizá
        conozcas: capas y grupos, máscaras, modos de fusión, capas de ajuste, un cuadro de diálogo
        Estilo de capa completo, selecciones, pinceles de retoque, texto, formas y trazados, objetos
        inteligentes y filtros. Abre y guarda archivos de Photoshop (PSD) con sus capas, y exporta
        PNG, JPEG, WebP, SVG y PDF. La <Link href="/docs">documentación</Link> (en inglés) explica
        todas las herramientas.
      </p>

      <h2>Tus imágenes se quedan en tu dispositivo</h2>
      <p>
        Todo ocurre en tu navegador. Picstea no tiene ningún servidor que reciba imágenes, y la
        página del editor está configurada para que no pueda enviar los datos del documento a ningún
        sitio. Tu trabajo se guarda automáticamente en el almacenamiento de este navegador; descarga
        un proyecto <code>.picstea</code> o exporta una imagen cuando quieras tener una copia en
        otro lugar. Después de la primera visita, el editor también funciona sin conexión, y en
        Chrome y Edge puedes instalarlo como app.
      </p>

      <h2>Gratis y sin cuenta</h2>
      <p>
        No hay registro, ni marca de agua, ni límite de exportaciones. Picstea se financia con
        publicidad en la web y el blog, y con patrocinios claramente señalados junto al lienzo —
        nunca encima de tu trabajo; la <Link href="/sponsorship">página de patrocinio</Link> (en
        inglés) explica cómo. La <Link href="/privacy">política de privacidad</Link> y la{" "}
        <Link href="/cookies">política de cookies</Link> (en inglés) indican exactamente qué se
        guarda y por qué.
      </p>

      <h2>Quién hace Picstea</h2>
      <p>
        Picstea lo desarrolla <Link href="/authors/siavash-ghanbari">Siavash Ghanbari</Link>, que
        también explica tecnología y software en el canal de YouTube SiaBarry. Cada guía del{" "}
        <Link href="/blog">blog</Link> (en inglés) está escrita y comprobada con el propio editor.
      </p>

      <h2>Cómo está hecho</h2>
      <p>
        Picstea está escrito en TypeScript con React y Next.js. El editor en sí —documentos,
        renderizado, formatos de archivo y herramientas— es código sencillo que se ejecuta en el
        navegador y en un worker en segundo plano, sin servicios de terceros. Los cambios se
        detallan versión a versión, y el <Link href="/blog">blog</Link> (en inglés) explica las
        novedades.
      </p>
      <p>
        <small>Versión {pkg.version}</small>
      </p>

      <h2>Software de código abierto</h2>
      <p>
        Para abrir fotos HEIC, Picstea usa{" "}
        <a href="https://github.com/strukturag/libheif" rel="noopener">
          libheif
        </a>{" "}
        (GNU LGPL 3.0), compilado a WebAssembly por{" "}
        <a href="https://github.com/catdad-experiments/libheif-js" rel="noopener">
          libheif-js
        </a>{" "}
        1.23.5. Se sirve sin modificar como archivo propio, solo se carga cuando abres una foto HEIC
        y se ejecuta en tu dispositivo. Licencias:{" "}
        <a href="/vendor/libheif/1.23.5/LICENSE-libheif.txt">libheif</a>,{" "}
        <a href="/vendor/libheif/1.23.5/LICENSE-libheif-js.txt">libheif-js</a>. Puedes sustituir ese
        archivo por tu propia compilación de la biblioteca.
      </p>

      <h2>Idiomas</h2>
      <p>
        Picstea está disponible en inglés, español, portugués (Brasil) y alemán. Las traducciones
        del editor y de estas páginas se han hecho con traducción automática y todavía no las han
        revisado hablantes nativos; las correcciones son bienvenidas. La documentación, el blog y
        las páginas legales están en inglés.
      </p>

      <h2>Contacto</h2>
      <p>
        Quién gestiona Picstea y cómo contactar está en el <Link href="/imprint">aviso legal</Link>{" "}
        (en inglés). Para preguntas sobre el uso del editor, empieza por las{" "}
        <Link href="/faq">preguntas frecuentes</Link>.
      </p>
    </>
  ),
};

export default copy;
