import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Liquidificar uma foto online",
  description:
    "Use o Liquidificar no navegador para empurrar, torcer, franzir e inflar partes de uma foto com um pincel, e Reconstruir para desfazer. Grátis, nada é enviado.",
  lead: "O Liquidificar do Picstea permite remodelar uma foto com um pincel, como no Photoshop: abra a foto, escolha Filtro → Liquidificar…, escolha uma ferramenta e pinte. Empurre pixels, torça-os, encolha ou aumente áreas e desfaça qualquer ponto com Reconstruir. É grátis e roda inteiramente no seu navegador.",
  faqs: [
    {
      q: "É igual ao Liquidificar do Photoshop?",
      a: "Funciona do mesmo jeito nas ferramentas principais: Dobra para frente (empurrar), Torcer em sentido horário e anti-horário, Franzir, Inflar, Reconstruir e Suavizar, com um pincel cujo tamanho você ajusta com [ e ]. Os controles com reconhecimento de rosto e as máscaras de congelamento do Photoshop não estão disponíveis.",
    },
    {
      q: "Posso alterar o Liquidificar depois?",
      a: "Não depois de pressionar OK — o Liquidificar altera os pixels e não pode ser um filtro inteligente. Duplique a camada antes (Cmd/Ctrl+J) para manter o original, ou desfaça.",
    },
    {
      q: "Funciona em texto ou formas?",
      a: "O Liquidificar funciona em camadas de pixels. Primeiro, rasterize uma camada de texto ou forma (clique com o botão direito na camada no painel Camadas).",
    },
    {
      q: "Minha foto é enviada?",
      a: "Não. O Liquidificar roda no seu navegador. O Picstea não tem servidor que receba imagens.",
    },
  ],
  body: () => (
    <>
      <h2>Liquidifique uma foto em quatro passos</h2>
      <ol>
        <li>
          Abra o editor e solte sua foto na página; duplique a camada (Cmd/Ctrl+J) para manter o
          original.
        </li>
        <li>
          Escolha Filtro → Liquidificar…. A foto abre na visualização própria do Liquidificar.
        </li>
        <li>
          Escolha uma ferramenta, defina o tamanho do pincel com [ e ] e pinte. Acompanhe a
          visualização enquanto trabalha.
        </li>
        <li>Pressione OK para aplicar e exporte com Arquivo → Exportar como….</li>
      </ol>
      <h2>As ferramentas</h2>
      <ul>
        <li>
          <strong>Dobra para frente</strong> — empurra os pixels na direção em que você arrasta:
          suavize uma linha, levante um canto, ajuste uma curva.
        </li>
        <li>
          <strong>Torcer em sentido horário</strong> e{" "}
          <strong>Torcer em sentido anti-horário</strong> — giram os pixels sob o pincel, para
          redemoinhos e efeitos criativos.
        </li>
        <li>
          <strong>Franzir</strong> — puxa os pixels em direção ao centro do pincel, deixando uma
          área menor.
        </li>
        <li>
          <strong>Inflar</strong> — empurra os pixels para longe do centro, deixando uma área maior.
        </li>
        <li>
          <strong>Reconstruir</strong> — pinta o original de volta, aos poucos.{" "}
          <strong>Suavizar</strong> uniformiza distorções irregulares.
        </li>
      </ul>
      <h2>Dicas</h2>
      <ul>
        <li>
          Use um pincel grande e suave e vários traços leves; pincéis pequenos criam ondulações.
        </li>
        <li>
          O Liquidificar afeta só a camada ativa. Para uma área menor, selecione-a antes, para que o
          resto da foto não se mova.
        </li>
        <li>
          Todos os outros filtros estão no <Link href="/docs/filters">guia de filtros</Link> (em
          inglês) e na página de <Link href="/photo-filters">filtros de foto</Link>.
        </li>
      </ul>
      <h2>Limitações</h2>
      <p>
        Não há Liquidificar com reconhecimento de rosto nem máscaras de congelar e descongelar. O
        Liquidificar altera os pixels diretamente, então não pode ser usado como filtro inteligente.
        As imagens podem ter até 36 megapixels.
      </p>
    </>
  ),
};

export default copy;
