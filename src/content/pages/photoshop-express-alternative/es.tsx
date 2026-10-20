import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: una alternativa a Photoshop Express",
  description:
    "Photoshop Express es una app de edición rápida; Picstea, un editor gratis en el navegador con capas, máscaras y PSD en cualquier ordenador. Comparación honesta.",
  lead: "Photoshop Express es la app gratuita de Adobe para retoques rápidos de fotos en dispositivos móviles y Windows. Cuando un retoque rápido no basta, Picstea te ofrece un editor completo por capas como Photoshop: gratis, en cualquier navegador, sin nada que instalar y sin subir nada.",
  faqs: [
    {
      q: "¿Qué diferencia hay entre Photoshop Express y Picstea?",
      a: "Photoshop Express es la app de Adobe para ediciones rápidas de fotos, disponible para iOS, Android y Windows. Picstea funciona en cualquier navegador y trabaja como el Photoshop completo, con capas, capas de ajuste, máscaras y archivos PSD.",
    },
    {
      q: "¿Picstea es gratis?",
      a: "Sí, totalmente: sin nivel premium, sin cuenta y sin marca de agua. Photoshop Express se descarga gratis, con funciones premium para ediciones avanzadas.",
    },
    {
      q: "¿Picstea funciona en un Mac o un Chromebook?",
      a: "Sí. Funciona en cualquier navegador actual en Windows, macOS, Linux y ChromeOS.",
    },
    {
      q: "¿Picstea funciona en mi móvil?",
      a: "Se abre en móviles y el diseño se adapta, pero está pensado para ratón o trackpad y teclado. Para ediciones rápidas en el móvil, Photoshop Express encaja mejor.",
    },
  ],
  body: () => (
    <>
      <h2>En qué se diferencian</h2>
      <ComparisonTable
        other="Photoshop Express"
        rows={[
          ["Dónde funciona", "Cualquier navegador actual", "Apps para iOS, Android y Windows"],
          [
            "Pensado para",
            "Edición detallada por capas",
            "Ediciones rápidas para fotografía móvil",
          ],
          [
            "Precio",
            "Gratis, nada que desbloquear",
            "Descarga gratuita; funciones premium para ediciones avanzadas",
          ],
          [
            "Estilo de edición",
            "Capas completas, máscaras, capas de ajuste, estilos de capa",
            "Correcciones inteligentes, enmascarado automático y herramientas de un toque",
          ],
          ["Fotos desde", "Tu dispositivo", "Tu dispositivo, Google Fotos, Dropbox y Facebook"],
        ]}
      />
      <h2>Cuándo encaja mejor Picstea</h2>
      <ul>
        <li>Quieres trabajar con capas, máscaras, selecciones y capas de ajuste.</li>
        <li>Necesitas abrir o entregar un archivo de Photoshop con capas.</li>
        <li>Usas un Mac, un ordenador con Linux o un Chromebook, o no puedes instalar apps.</li>
        <li>Lo quieres todo gratis, sin funciones premium ni cuenta.</li>
      </ul>
      <h2>Cuándo encaja mejor Photoshop Express</h2>
      <ul>
        <li>Retoques y estilos rápidos en el móvil, justo después de hacer la foto.</li>
        <li>Correcciones inteligentes de un toque y enmascarado automático.</li>
        <li>Traer fotos directamente desde Google Fotos, Dropbox o Facebook.</li>
      </ul>
      <p>
        ¿Vas más allá de las ediciones rápidas? Compara Picstea con el{" "}
        <Link href="/photoshop-alternative">Photoshop completo</Link>, o empieza por la{" "}
        <Link href="/docs/getting-started">guía de primeros pasos</Link> (en inglés).
      </p>
    </>
  ),
};

export default copy;
