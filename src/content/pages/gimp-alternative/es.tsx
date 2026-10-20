import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: una alternativa a GIMP en el navegador",
  description:
    "¿Buscas una alternativa a GIMP sin instalar nada? Picstea es un editor gratis en el navegador con capas al estilo Photoshop y soporte PSD. Comparación honesta.",
  lead: "GIMP es un editor de imágenes potente, gratuito y de código abierto que instalas en tu ordenador. Picstea es un editor gratuito que, en cambio, funciona en tu navegador, con capas, menús y atajos al estilo de Photoshop: útil cuando no puedes o no quieres instalar software.",
  faqs: [
    {
      q: "¿Picstea es mejor que GIMP?",
      a: "Depende del trabajo. Picstea no necesita instalación y funciona como Photoshop, así que se aprende rápido en cualquier navegador. GIMP es un programa de escritorio maduro con funciones más avanzadas, plugins y scripts.",
    },
    {
      q: "¿Los dos son gratis?",
      a: "Sí. GIMP es software libre y de código abierto; Picstea se usa gratis en el navegador, sin cuenta.",
    },
    {
      q: "¿Puedo abrir mis archivos de GIMP en Picstea?",
      a: "No los archivos .xcf propios de GIMP. Exporta desde GIMP como PSD para conservar las capas, o como PNG, y ábrelo en Picstea.",
    },
    {
      q: "¿Picstea funciona en un Chromebook?",
      a: "Sí. Funciona en cualquier navegador actual, también en Chromebooks y en ordenadores donde no puedes instalar software.",
    },
  ],
  body: () => (
    <>
      <h2>Lo que hacen los dos</h2>
      <ul>
        <li>
          Edición fotográfica gratuita por capas: capas, máscaras, modos de fusión, selecciones y
          filtros.
        </li>
        <li>Herramientas de retoque como el tampón de clonar y los pinceles correctores.</li>
        <li>
          Abrir y exportar archivos PSD, PNG, JPEG y WebP, con tus archivos guardados en tu
          dispositivo.
        </li>
        <li>
          Filtros que puedes cambiar después de aplicarlos (filtros inteligentes en Picstea, filtros
          no destructivos en GIMP 3).
        </li>
      </ul>
      <h2>En qué se diferencian</h2>
      <ComparisonTable
        other="GIMP"
        rows={[
          [
            "Dónde funciona",
            "Cualquier navegador actual",
            "App de escritorio para Windows, macOS y Linux",
          ],
          ["Instalación", "Nada que instalar", "Descargar e instalar"],
          ["Precio", "Gratis, sin cuenta", "Gratis, código abierto"],
          [
            "Flujo de trabajo",
            "Menús, paneles y atajos al estilo de Photoshop",
            "Interfaz y atajos propios de GIMP",
          ],
          ["Capas de ajuste", "Sí (Niveles, Curvas y 13 más)", "Filtros no destructivos en capas"],
          ["Formato de proyecto propio", ".picstea", ".xcf"],
          ["Plugins y scripts", "Solo acciones grabadas", "Plugins y scripts (Python, Scheme, C)"],
        ]}
      />
      <h2>Por qué la gente elige Picstea</h2>
      <ul>
        <li>
          <strong>Nada que instalar.</strong> Abre una pestaña y edita: en un portátil del trabajo,
          un Chromebook del colegio o el ordenador de otra persona. También funciona sin conexión
          una vez instalado como app.
        </li>
        <li>
          <strong>Se siente como Photoshop.</strong> Los menús, paneles, capas de ajuste, estilos de
          capa y atajos siguen a Photoshop, así que los tutoriales y las costumbres te sirven.
        </li>
        <li>
          <strong>Privado por diseño.</strong> Como en GIMP, tus imágenes se quedan en tu
          dispositivo: Picstea no tiene ningún servidor que las reciba.
        </li>
      </ul>
      <h2>Cuándo GIMP es mejor opción</h2>
      <ul>
        <li>
          Imágenes muy grandes y trabajo de impresión con gestión del color y opciones de
          exportación CMYK.
        </li>
        <li>Ampliar el editor con plugins y scripts, y procesar por lotes con scripts.</li>
        <li>Software totalmente de código abierto que puedes inspeccionar y modificar.</li>
        <li>
          Herramientas avanzadas que Picstea aún no tiene, como las transformaciones de deformación
          y los paneles de trazados.
        </li>
      </ul>
      <p>
        ¿Quieres probar la vía del navegador? Empieza por la{" "}
        <Link href="/docs/getting-started">guía de primeros pasos</Link> (en inglés).
      </p>
    </>
  ),
};

export default copy;
