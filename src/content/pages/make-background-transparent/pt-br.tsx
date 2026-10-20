import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Como deixar um fundo transparente online",
  description:
    "Remova um fundo liso à mão com a Borracha mágica ou a Borracha de plano de fundo e salve um PNG ou WebP transparente. Grátis, no navegador, nada é enviado.",
  lead: "O Picstea deixa um fundo transparente à mão, não com IA: clique em um fundo liso com a Borracha mágica, limpe as bordas com a Borracha de plano de fundo e exporte um PNG. É grátis, funciona no seu navegador e nada é enviado.",
  faqs: [
    {
      q: "O Picstea remove fundos automaticamente?",
      a: "Não, ainda não. Não há remoção de fundo por IA; você remove o fundo com as borrachas ou com uma seleção. Isso funciona melhor em fundos lisos e de cor uniforme, como fotos de produtos e logotipos.",
    },
    {
      q: "Qual formato mantém a transparência?",
      a: "PNG (sem perdas) ou WebP (menor). O JPEG não tem transparência, então nele as áreas transparentes ficam brancas.",
    },
    {
      q: "Como sei que o fundo saiu de verdade?",
      a: "As áreas transparentes mostram um quadriculado cinza e branco na tela. Tudo o que ainda aparece sobre o quadriculado estará na imagem exportada.",
    },
    {
      q: "Minha imagem é enviada?",
      a: "Não. Tudo acontece no seu navegador. O Picstea não tem servidor que receba imagens.",
    },
  ],
  body: () => (
    <>
      <h2>Remova um fundo liso em quatro passos</h2>
      <ol>
        <li>Abra o editor e solte sua imagem na página.</li>
        <li>
          Escolha a Borracha mágica (no grupo de borrachas da barra de ferramentas) e clique no
          fundo. Todo pixel conectado de cor semelhante fica transparente; aumente a tolerância na
          barra de opções se sobrar alguma parte.
        </li>
        <li>
          Limpe o que restar nas bordas com a Borracha de plano de fundo, que apaga cores próximas
          da que está sob o centro do pincel e mantém o resto.
        </li>
        <li>Escolha Arquivo → Exportar como…, selecione PNG ou WebP e salve.</li>
      </ol>
      <h2>Para fundos carregados: selecione o objeto principal</h2>
      <ol>
        <li>
          Contorne o objeto com o Laço ou o Laço poligonal (ou selecione o fundo com a Varinha
          mágica ou o Intervalo de cores e escolha Selecionar → Inverter).
        </li>
        <li>
          Escolha Selecionar → Inverter para que o fundo fique selecionado e pressione Delete.
        </li>
        <li>
          Prefere guardar o fundo para depois? Use uma máscara de camada em vez de excluir: tudo o
          que a máscara oculta fica transparente na exportação, e você pode pintá-la de novo a
          qualquer momento.
        </li>
      </ol>
      <h2>Dicas</h2>
      <ul>
        <li>
          Aproxime o zoom nas bordas; uma Difusão de 1–2 pixels evita contornos duros e serrilhados.
        </li>
        <li>
          Logotipos sobre branco: Filtro → Outros → Cor para alfa transforma o branco em
          transparência, mantendo as bordas suaves.
        </li>
        <li>
          As máscaras de camada são explicadas em{" "}
          <Link href="/blog/layers-and-masks-explained">camadas e máscaras explicadas</Link> (em
          inglês).
        </li>
      </ul>
      <h2>Limitações</h2>
      <p>
        Sem IA, cabelo, pelos e fundos que compartilham cores com o objeto exigem paciência. Ainda
        não há ferramenta de refinar borda nem de &quot;selecionar objeto&quot;.
      </p>
    </>
  ),
};

export default copy;
