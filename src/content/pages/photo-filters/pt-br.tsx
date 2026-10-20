import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Filtros e efeitos de foto online grátis",
  description:
    "Aplique mais de 60 filtros de foto no navegador com visualização ao vivo: desfoque, nitidez, ruído, pintura a óleo, Camera Raw, Liquidificar e mais. Grátis.",
  lead: "O Picstea tem mais de 60 filtros de foto, organizados como no menu Filtro do Photoshop, cada um com visualização ao vivo na sua foto: desfoques, nitidez, redução de ruído, distorções, efeitos artísticos, Camera Raw e Liquidificar. Eles são grátis e rodam no seu navegador, então suas fotos nunca são enviadas.",
  faqs: [
    {
      q: "Posso alterar um filtro depois de aplicá-lo?",
      a: "Sim, se você aplicá-lo como filtro inteligente: converta a camada com Camada → Objeto inteligente → Converter em objeto inteligente e depois aplique o filtro. Você pode alterá-lo ou removê-lo a qualquer momento.",
    },
    {
      q: "Posso aplicar um filtro a parte de uma foto?",
      a: "Sim. Selecione uma área antes; só a seleção muda, e bordas com difusão se mesclam suavemente.",
    },
    {
      q: "São os mesmos filtros do Photoshop?",
      a: "O menu Filtro segue o Photoshop e o Photopea, então os filtros estão onde você espera. Eles são implementações próprias do Picstea, então os resultados podem variar um pouco.",
    },
    {
      q: "Existem predefinições de um clique, como no Instagram?",
      a: "Não como lista de predefinições. Para um visual rápido, use o Camera Raw, camadas de ajuste Filtro de fotos ou Mapa de gradiente, ou os efeitos artísticos da Galeria de filtros.",
    },
    {
      q: "Minhas fotos são enviadas?",
      a: "Não. Todos os filtros rodam no seu navegador. O Picstea não tem servidor que receba imagens.",
    },
  ],
  body: () => (
    <>
      <h2>Aplique um filtro em quatro passos</h2>
      <ol>
        <li>Abra o editor e solte sua foto na página.</li>
        <li>
          Opcional: clique com o botão direito na camada e converta-a em objeto inteligente, para
          que o filtro continue editável.
        </li>
        <li>Escolha um filtro no menu Filtro e ajuste-o enquanto observa a tela.</li>
        <li>Pressione OK e use Arquivo → Exportar como… para salvar o resultado.</li>
      </ol>
      <h2>Filtros populares</h2>
      <ul>
        <li>
          <strong>Camera Raw</strong> — equilíbrio de branco, exposição, contraste, realces,
          sombras, claridade, remoção de névoa, vibratilidade e saturação em uma só caixa de
          diálogo.
        </li>
        <li>
          <strong>Desfoque</strong> — gaussiano, de movimento, radial, de lente (bokeh) e de
          superfície, além dos desfoques Tilt-Shift, de íris e de campo da Galeria de desfoque para
          uma profundidade de campo rasa.
        </li>
        <li>
          <strong>Tornar nítido</strong> — Máscara de nitidez e Nitidez inteligente para detalhes
          nítidos.
        </li>
        <li>
          <strong>Ruído</strong> — Reduzir ruído e Poeira e arranhões para fotos noturnas e
          digitalizações antigas, ou Adicionar ruído para granulação de filme.
        </li>
        <li>
          <strong>Galeria de filtros</strong> — visuais artísticos como Aquarela, Pincel seco,
          Recorte, Bordas posterizadas e Granulação de filme.
        </li>
        <li>
          <strong>Estilizar e Pixelizar</strong> — Pintura a óleo, Entalhe, Localizar arestas,
          Meio-tom em cores, Mosaico e Cristalizar.
        </li>
        <li>
          <strong>Distorcer</strong> — Torcer, Esfera, Ondulação, Onda e Coordenadas polares.
        </li>
        <li>
          <strong>Liquidificar</strong> — empurre, torça, franza e infle pixels com um pincel.
        </li>
        <li>
          <strong>Correção de lente</strong> — corrija distorção de barril, franjas de cor e
          vinheta.
        </li>
      </ul>
      <p>
        O <Link href="/docs/filters">guia de filtros</Link> (em inglês) lista todos os filtros do
        menu.
      </p>
      <h2>Visuais de cor com camadas de ajuste</h2>
      <p>
        Para correção de cor em vez de efeitos, use camadas de ajuste: Filtro de fotos para tons
        quentes ou frios, Mapa de gradiente para duotons, Preto e branco, Matiz/saturação e Curvas.
        Elas ficam em uma camada própria, então a foto por baixo nunca muda.
      </p>
      <h2>Limitações</h2>
      <p>
        Os filtros funcionam em camadas de pixels e objetos inteligentes. As imagens podem ter até
        12.000 pixels por lado (36 megapixels), e não há filtros de IA, como substituição do céu ou
        transferência de estilo.
      </p>
    </>
  ),
};

export default copy;
