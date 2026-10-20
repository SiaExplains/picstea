import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Redimensionar uma imagem online",
  description:
    "Redimensione imagens para dimensões exatas em pixels no navegador, mantenha as proporções, mude a tela ou corte. Grátis, sem cadastro, e nada é enviado.",
  lead: "Para redimensionar uma imagem online com o Picstea, abra-a no editor, escolha Imagem → Tamanho da imagem…, digite a nova largura ou altura em pixels e exporte. As proporções ficam corretas, é grátis e a imagem nunca sai do seu dispositivo.",
  faqs: [
    {
      q: "Como redimensiono uma imagem sem esticá-la?",
      a: "Em Imagem → Tamanho da imagem…, deixe Restringir proporções marcado e digite só a largura ou a altura; o outro valor acompanha.",
    },
    {
      q: "Qual é a diferença entre Tamanho da imagem e Tamanho da tela?",
      a: "O Tamanho da imagem dimensiona a imagem inteira. O Tamanho da tela mantém a imagem como está e adiciona ou remove espaço ao redor dela, por exemplo para adicionar uma borda ou deixá-la quadrada.",
    },
    {
      q: "Posso diminuir uma imagem e depois aumentá-la de novo sem perder qualidade?",
      a: "Sim, dentro do Picstea: as camadas de pixels guardam os pixels originais e só são desenhadas no novo tamanho, então aumentar de novo recupera os detalhes. O arquivo exportado tem o tamanho que você escolheu.",
    },
    {
      q: "Posso redimensionar muitas imagens de uma vez?",
      a: "Ainda não. O Tamanho da imagem não pode ser gravado em uma ação, então o processamento em lote não redimensiona. Por enquanto, redimensione as imagens uma de cada vez.",
    },
    {
      q: "Minhas imagens são enviadas?",
      a: "Não. O redimensionamento e a exportação acontecem no seu dispositivo. O Picstea não tem servidor que receba imagens.",
    },
  ],
  body: () => (
    <>
      <h2>Redimensione uma imagem em quatro passos</h2>
      <ol>
        <li>Abra o editor e solte sua imagem (PNG, JPEG, WebP, GIF ou PSD) na página.</li>
        <li>Escolha Imagem → Tamanho da imagem….</li>
        <li>
          Com Restringir proporções marcado, digite a nova largura ou altura em pixels. Você também
          pode definir a resolução (ppi) para impressão.
        </li>
        <li>Escolha Arquivo → Exportar como…, selecione um formato e salve.</li>
      </ol>
      <h2>Outras formas de mudar o tamanho</h2>
      <ul>
        <li>
          <strong>Tamanho da tela…</strong> (menu Imagem) adiciona ou remove espaço ao redor da
          imagem. Escolha uma das nove âncoras para dizer qual lado cresce, ou marque Relativo para
          adicionar uma quantidade fixa, por exemplo 20 pixels em cada lado.
        </li>
        <li>
          A <strong>ferramenta Cortar</strong> recorta a imagem na área que você arrasta. O corte é
          não destrutivo, então você pode alterá-lo depois.
        </li>
        <li>
          <strong>Aparar…</strong> remove automaticamente bordas transparentes ou de uma só cor.
        </li>
        <li>
          <strong>Predefinições de novo documento</strong> — cerca de 80 tamanhos prontos para
          posts, impressão, fotos, telas e ícones, em pixels, polegadas, centímetros ou milímetros.
          Insira sua imagem em um deles com Arquivo → Inserir imagem como camada e dimensione-a para
          caber.
        </li>
      </ul>
      <h2>Dicas para bons resultados</h2>
      <ul>
        <li>
          Diminua as imagens em vez de aumentá-las: ampliar não acrescenta detalhes que não existem.
        </li>
        <li>
          Depois de reduzir uma foto, Filtro → Tornar nítido → Máscara de nitidez recupera bordas
          nítidas.
        </li>
        <li>
          Para a web, exporte como WebP ou JPEG para manter o arquivo pequeno; veja o guia do{" "}
          <Link href="/image-compressor">compressor de imagens</Link>.
        </li>
      </ul>
      <h2>Limitações</h2>
      <p>
        As imagens podem ter até 12.000 pixels por lado (36 megapixels). O redimensionamento em lote
        ainda não está disponível, e não há ampliação por IA.
      </p>
    </>
  ),
};

export default copy;
