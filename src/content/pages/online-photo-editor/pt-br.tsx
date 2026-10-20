import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Editor de fotos online grátis com camadas",
  description:
    "Edite fotos no navegador com camadas, máscaras, camadas de ajuste, seleções e efeitos. Grátis, sem cadastro, e suas fotos nunca são enviadas.",
  lead: "O Picstea é um editor de fotos grátis que roda no seu navegador. Ele tem camadas, máscaras, camadas de ajuste e seleções como um editor de desktop — e suas fotos nunca saem do seu dispositivo.",
  faqs: [
    {
      q: "O Picstea é grátis?",
      a: "Sim. O editor é gratuito no seu navegador, sem conta e sem marca d'água.",
    },
    {
      q: "Minhas fotos são enviadas?",
      a: "Não. As fotos são abertas, editadas e exportadas no seu dispositivo. O Picstea não tem servidor que receba suas imagens.",
    },
    {
      q: "Para quais formatos posso exportar?",
      a: "PNG, JPEG, WebP, SVG, PDF e PSD com camadas.",
    },
    {
      q: "Posso remover imperfeições ou objetos indesejados?",
      a: "Sim. Use o Pincel de recuperação para remover manchas e imperfeições (ele acompanha a cor e o brilho ao redor), ou o Carimbo para copiar uma área sobre outra. Os dois funcionam no seu navegador; nada é enviado.",
    },
    {
      q: "Posso editar muitas fotos de uma vez?",
      a: "Sim. Grave uma ação (por exemplo, um ajuste e um filtro) e use Arquivo → Automatizar → Lote… para aplicá-la a muitas fotos. Os resultados são salvos em um único arquivo ZIP, montado no seu dispositivo.",
    },
    {
      q: "Funciona offline?",
      a: "Sim. Depois da primeira visita, você pode instalar o Picstea como app e continuar editando sem conexão.",
    },
  ],
  body: () => (
    <>
      <h2>Edite uma foto em quatro passos</h2>
      <ol>
        <li>Abra o editor e clique em Abrir imagem (ou solte uma foto na página).</li>
        <li>
          Ajuste-a de forma não destrutiva: Camada → Nova camada de ajuste → Brilho/contraste,
          Matiz/saturação ou Exposição.
        </li>
        <li>
          Selecione uma área com o letreiro, o laço ou a varinha mágica para editar só essa parte.
        </li>
        <li>Arquivo → Exportar como… e escolha JPEG, PNG ou WebP.</li>
      </ol>
      <h2>O que você pode fazer</h2>
      <ul>
        <li>
          Tamanhos prontos para posts, impressão (A4, Carta, cartões de visita), fotos, telas,
          celulares, anúncios e ícones, em pixels, polegadas, centímetros ou milímetros.
        </li>
        <li>Camadas com 16 modos de mesclagem, opacidade, grupos e máscaras de camada.</li>
        <li>
          Selecione várias camadas para movê-las, dimensioná-las, girá-las, alinhá-las e
          distribuí-las juntas.
        </li>
        <li>
          Camadas de ajuste — incluindo Níveis e Curvas — que nunca alteram os pixels originais.
        </li>
        <li>
          O menu Filtro completo do Photoshop, incluindo Camera Raw, Liquidificar e Ponto de fuga;
          objetos inteligentes e filtros inteligentes.
        </li>
        <li>
          Seleções com letreiro, laço e varinha mágica; difusão, expandir, contrair, transformar.
        </li>
        <li>Pincel, lápis, borracha, lata de tinta, gradiente, formas e texto.</li>
        <li>
          Retoque: Carimbo, Pincel de recuperação, Subexposição, Superexposição, Esponja, Desfoque,
          Nitidez e Borrar.
        </li>
        <li>
          Ajustes de Vibratilidade, Equilíbrio de cores, Misturador de canais, Mapa de gradiente e
          Filtro de fotos.
        </li>
        <li>
          Sombras projetadas, brilhos, acetinado, chanfros, traçados e sobreposições de cor,
          gradiente ou padrão, com várias cópias e estilos salvos.
        </li>
        <li>Abra e salve arquivos PSD com camadas; exporte PNG, JPEG, WebP, SVG e PDF.</li>
        <li>
          Grave ações e reproduza-as, ou processe muitas fotos em lote em um único download ZIP.
        </li>
        <li>Um seletor de cores com valores Hex, RGB e HSB, e suas próprias amostras.</li>
        <li>
          Os projetos são salvos automaticamente no navegador; um painel Histórico para voltar
          qualquer etapa.
        </li>
      </ul>
      <h2>Limitações</h2>
      <p>
        As imagens podem ter até 12.000 pixels por lado (36 megapixels). Não há ferramentas de IA,
        como remoção automática de fundo ou preenchimento sensível ao conteúdo. Veja a{" "}
        <Link href="/docs">documentação</Link> (em inglês) para tudo o que está disponível.
      </p>
    </>
  ),
};

export default copy;
