import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: uma alternativa ao GIMP no navegador",
  description:
    "Procurando uma alternativa ao GIMP sem instalar nada? O Picstea é um editor grátis no navegador, com camadas como no Photoshop e PSD. Uma comparação honesta.",
  lead: "O GIMP é um editor de imagens poderoso, grátis e de código aberto que você instala no computador. O Picstea é um editor grátis que roda no navegador, com camadas, menus e atalhos no estilo do Photoshop — útil quando você não pode ou não quer instalar software.",
  faqs: [
    {
      q: "O Picstea é melhor que o GIMP?",
      a: "Depende do trabalho. O Picstea não precisa de instalação e funciona como o Photoshop, então é fácil de começar a usar em qualquer navegador. O GIMP é um programa de desktop maduro, com recursos mais avançados, plugins e scripts.",
    },
    {
      q: "Os dois são grátis?",
      a: "Sim. O GIMP é software livre e de código aberto; o Picstea é gratuito no navegador, sem conta.",
    },
    {
      q: "Posso abrir meus arquivos do GIMP no Picstea?",
      a: "Não os arquivos .xcf do próprio GIMP. Exporte do GIMP como PSD para manter as camadas, ou como PNG, e abra esse arquivo no Picstea.",
    },
    {
      q: "O Picstea funciona em um Chromebook?",
      a: "Sim. Ele roda em qualquer navegador atual, inclusive em Chromebooks e em computadores onde você não pode instalar software.",
    },
  ],
  body: () => (
    <>
      <h2>O que os dois fazem</h2>
      <ul>
        <li>
          Edição de fotos grátis com camadas: camadas, máscaras, modos de mesclagem, seleções e
          filtros.
        </li>
        <li>Ferramentas de retoque, como carimbo e pincéis de recuperação.</li>
        <li>
          Abrir e exportar arquivos PSD, PNG, JPEG e WebP, com seus arquivos mantidos no seu
          dispositivo.
        </li>
        <li>
          Filtros que você pode alterar depois de aplicar (filtros inteligentes no Picstea, filtros
          não destrutivos no GIMP 3).
        </li>
      </ul>
      <h2>Como eles diferem</h2>
      <ComparisonTable
        other="GIMP"
        rows={[
          ["Onde roda", "Qualquer navegador atual", "App de desktop para Windows, macOS e Linux"],
          ["Instalação", "Nada para instalar", "Baixar e instalar"],
          ["Preço", "Grátis, sem conta", "Grátis, código aberto"],
          [
            "Fluxo de trabalho",
            "Menus, painéis e atalhos no estilo do Photoshop",
            "Interface e atalhos próprios do GIMP",
          ],
          [
            "Camadas de ajuste",
            "Sim (Níveis, Curvas e mais 13)",
            "Filtros não destrutivos em camadas",
          ],
          ["Formato de projeto próprio", ".picstea", ".xcf"],
          ["Plugins e scripts", "Apenas ações gravadas", "Plugins e scripts (Python, Scheme, C)"],
        ]}
      />
      <h2>Por que as pessoas escolhem o Picstea</h2>
      <ul>
        <li>
          <strong>Nada para instalar.</strong> Abra uma aba e edite — em um notebook do trabalho, um
          Chromebook da escola ou no computador de outra pessoa. Ele também funciona offline depois
          de instalado como app.
        </li>
        <li>
          <strong>Parece o Photoshop.</strong> Menus, painéis, camadas de ajuste, estilos de camada
          e atalhos seguem o Photoshop, então tutoriais e hábitos continuam valendo.
        </li>
        <li>
          <strong>Privado por padrão.</strong> Como no GIMP, suas imagens ficam no seu dispositivo:
          o Picstea não tem servidor que as receba.
        </li>
      </ul>
      <h2>Quando o GIMP é a melhor escolha</h2>
      <ul>
        <li>
          Imagens muito grandes e trabalhos de impressão com gerenciamento de cores e opções de
          exportação CMYK.
        </li>
        <li>Ampliar o editor com plugins e scripts, e trabalho em lote com scripts.</li>
        <li>Software totalmente de código aberto que você pode inspecionar e modificar.</li>
        <li>
          Ferramentas avançadas que o Picstea ainda não tem, como transformações de deformação e
          painéis de demarcadores.
        </li>
      </ul>
      <p>
        Quer experimentar o caminho do navegador? Comece pelo{" "}
        <Link href="/docs/getting-started">guia de primeiros passos</Link> (em inglês).
      </p>
    </>
  ),
};

export default copy;
