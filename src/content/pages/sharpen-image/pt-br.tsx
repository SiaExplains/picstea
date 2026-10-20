import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Como deixar uma imagem mais nítida online",
  description:
    "Deixe uma foto suave mais nítida no navegador com Máscara de nitidez, Nitidez inteligente ou Passa-alta, com visualização ao vivo. Grátis e sem envio.",
  lead: "Para deixar uma imagem mais nítida no Picstea, abra-a e escolha Filtro → Tornar nítido → Máscara de nitidez…. Aumente a Quantidade enquanto observa a visualização ao vivo, mantenha o Raio pequeno e pressione OK. É grátis, funciona no seu navegador e nada é enviado.",
  faqs: [
    {
      q: "A nitidez conserta uma foto borrada?",
      a: "Só uma levemente suave. A nitidez aumenta o contraste ao longo das bordas; ela não recupera detalhes que nunca foram registrados, como em uma foto muito fora de foco ou tremida. O Picstea não tem 'desborrar' por IA.",
    },
    {
      q: "Qual filtro devo usar?",
      a: "Máscara de nitidez para a maioria das fotos, Nitidez inteligente quando a suavidade vem de desfoque de lente ou de movimento, e Passa-alta quando você quer ajustar a nitidez depois com a opacidade da camada.",
    },
    {
      q: "Por que minha foto fica granulada depois de aplicar nitidez?",
      a: "A nitidez também realça o ruído. Diminua a quantidade, aumente o Limiar da Máscara de nitidez ou use a opção Reduzir ruído da Nitidez inteligente.",
    },
    {
      q: "Minha imagem é enviada?",
      a: "Não. A nitidez é aplicada no seu navegador. O Picstea não tem servidor que receba imagens.",
    },
  ],
  body: () => (
    <>
      <h2>Deixe uma foto mais nítida em quatro passos</h2>
      <ol>
        <li>Abra o editor e solte sua imagem na página.</li>
        <li>Escolha Visualizar → 100% para ver os pixels reais enquanto aplica a nitidez.</li>
        <li>
          Escolha Filtro → Tornar nítido → Máscara de nitidez…: comece com Quantidade 100%, Raio 1–2
          px e Limiar 0, e ajuste até as bordas ficarem nítidas sem halos claros.
        </li>
        <li>Pressione OK e exporte com Arquivo → Exportar como….</li>
      </ol>
      <h2>Três formas de aplicar nitidez</h2>
      <ul>
        <li>
          <strong>Máscara de nitidez</strong> — Quantidade (intensidade), Raio (largura da borda) e
          Limiar (ignora pequenas diferenças, o que protege pele e céu da granulação).
        </li>
        <li>
          <strong>Nitidez inteligente</strong> — escolha o que remover (desfoque gaussiano, de lente
          ou de movimento, com um ângulo para o movimento) e reduza o ruído ao mesmo tempo.
        </li>
        <li>
          <strong>Passa-alta</strong> (Filtro → Outros) em uma camada duplicada (Cmd/Ctrl+J), com o
          modo de mesclagem da camada em Sobrepor ou Luz suave. Diminua a opacidade da camada para
          ajustar a nitidez a qualquer momento.
        </li>
      </ul>
      <h2>Dicas</h2>
      <ul>
        <li>
          Aplique a nitidez por último, depois de redimensionar: reduzir uma foto a deixa mais
          suave, e a Máscara de nitidez traz as bordas de volta. Veja o guia do{" "}
          <Link href="/image-resizer">redimensionador de imagens</Link>.
        </li>
        <li>Selecione uma área antes para aplicar nitidez só aos olhos ou ao objeto principal.</li>
        <li>
          Em um objeto inteligente, o filtro vira um filtro inteligente que você pode alterar depois
          — veja o <Link href="/blog/smart-objects-explained">guia de objetos inteligentes</Link>{" "}
          (em inglês).
        </li>
      </ul>
      <h2>Limitações</h2>
      <p>
        A nitidez não reconstrói detalhes ausentes, e não há ampliação nem remoção de desfoque por
        IA. As imagens podem ter até 12.000 pixels por lado (36 megapixels).
      </p>
    </>
  ),
};

export default copy;
