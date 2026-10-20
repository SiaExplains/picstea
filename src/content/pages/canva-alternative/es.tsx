import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea vs Canva: si necesitas editar fotos",
  description:
    "Canva sirve para diseñar con plantillas; Picstea, para editar fotos con capas, máscaras y archivos PSD, gratis y sin cuenta. Una comparación honesta.",
  lead: "Canva es una plataforma de diseño para crear publicaciones para redes sociales, presentaciones y más a partir de plantillas. Picstea es un editor de fotos: capas, máscaras, capas de ajuste, retoque y archivos PSD, gratis en tu navegador, sin cuenta y sin subir nada. Usa Canva para maquetar un diseño; usa Picstea cuando la propia foto necesite trabajo.",
  faqs: [
    {
      q: "¿Picstea sustituye a Canva?",
      a: "No para todo. Canva es una plataforma de diseño con plantillas, presentaciones, video y colaboración en equipo. Picstea es un editor de fotos: es la mejor herramienta para retocar, editar con capas y trabajar con archivos de Photoshop.",
    },
    {
      q: "¿Necesito una cuenta?",
      a: "Para Picstea, no. Canva necesita una cuenta para crear y guardar diseños, que se almacenan en la nube de Canva.",
    },
    {
      q: "¿Puedo usar los dos?",
      a: "Sí. Edita o retoca una foto en Picstea, exporta un PNG o JPEG y súbelo a Canva para tu diseño.",
    },
    {
      q: "¿Dónde se guardan mis archivos?",
      a: "En Picstea, en tu propio dispositivo: los proyectos se guardan en tu navegador y las exportaciones van a tus descargas. No se sube nada.",
    },
  ],
  body: () => (
    <>
      <h2>En qué se diferencian</h2>
      <ComparisonTable
        other="Canva"
        rows={[
          ["Pensado para", "Editar fotos e imágenes", "Diseñar con plantillas"],
          ["Cuenta", "Ninguna", "Obligatoria"],
          [
            "Dónde se guarda tu trabajo",
            "En tu dispositivo",
            "En tu cuenta de Canva (5 GB en el plan gratuito)",
          ],
          ["Plantillas", "Tamaños de documento predefinidos", "Más de un millón de plantillas"],
          [
            "Capas y máscaras",
            "Flujo de trabajo completo con capas, máscaras y modos de fusión",
            "Organizar elementos en una página",
          ],
          [
            "Archivos de Photoshop",
            "Abre y guarda PSD con capas",
            "Importa PSD en la web de escritorio; algunas partes se convierten en imágenes",
          ],
          ["Precio", "Gratis", "Plan gratuito; planes de pago Pro, Business y Enterprise"],
        ]}
      />
      <h2>Cuándo encaja mejor Picstea</h2>
      <ul>
        <li>
          <strong>La foto necesita edición:</strong> exposición, color, curvas, retoque de
          imperfecciones, enfoque, desenfoque del fondo.
        </li>
        <li>
          <strong>Trabajo preciso:</strong> selecciones, máscaras, modos de fusión y estilos de capa
          como en Photoshop.
        </li>
        <li>
          <strong>Privacidad:</strong> sin cuenta, y tus imágenes nunca salen de tu dispositivo.
        </li>
        <li>
          <strong>Archivos de Photoshop:</strong> abre un PSD con sus capas y su texto editable, y
          vuelve a guardarlo como PSD con capas.
        </li>
      </ul>
      <h2>Cuándo encaja mejor Canva</h2>
      <ul>
        <li>
          Publicaciones para redes sociales, presentaciones, folletos y videos creados rápidamente a
          partir de plantillas.
        </li>
        <li>Equipos que trabajan en los mismos diseños, con kits de marca y uso compartido.</li>
        <li>Una gran biblioteca de fotos de stock, gráficos y fuentes.</li>
      </ul>
      <p>
        Mucha gente usa los dos. Mira cómo{" "}
        <Link href="/add-text-to-photo">añadir texto a una foto</Link> o{" "}
        <Link href="/blur-background">desenfocar un fondo</Link> en Picstea.
      </p>
    </>
  ),
};

export default copy;
