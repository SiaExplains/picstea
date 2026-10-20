import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Editor de PNG online grátis com transparência",
  description:
    "Edite imagens PNG no navegador: camadas, fundos transparentes, texto e efeitos, e exporte um PNG sem perdas. Grátis, sem cadastro, nada é enviado.",
  lead: "O Picstea abre arquivos PNG no seu navegador, mantém a transparência e permite editá-los com camadas, texto, formas e efeitos antes de exportar de novo um PNG sem perdas. É grátis, não exige conta e suas imagens nunca saem do seu dispositivo.",
  faqs: [
    {
      q: "O Picstea mantém a transparência do PNG?",
      a: "Sim. As áreas transparentes continuam transparentes durante a edição e quando você exporta como PNG ou WebP. O JPEG não tem transparência, então nele as áreas transparentes ficam brancas.",
    },
    {
      q: "A exportação PNG é sem perdas?",
      a: "Sim. A exportação PNG mantém cada pixel exatamente como aparece na tela. Não há ajuste de qualidade porque nada é descartado.",
    },
    {
      q: "Posso deixar o fundo de um PNG transparente?",
      a: "Sim, à mão: use a Borracha mágica para remover um fundo liso com um clique, a Borracha de plano de fundo para as bordas, ou uma seleção e Delete. Ainda não há remoção automática de fundo por IA.",
    },
    {
      q: "Meu PNG é enviado para algum lugar?",
      a: "Não. O arquivo é aberto, editado e exportado no seu dispositivo. O Picstea não tem servidor que receba imagens.",
    },
    {
      q: "Posso transformar um PNG em JPEG ou WebP?",
      a: "Sim. Abra o PNG e escolha JPEG ou WebP em Arquivo → Exportar como…. O WebP mantém a transparência e geralmente é bem menor.",
    },
  ],
  body: () => (
    <>
      <h2>Edite um PNG em quatro passos</h2>
      <ol>
        <li>Abra o editor e solte seu PNG na página, ou clique em Abrir imagem.</li>
        <li>
          Adicione o que precisar em novas camadas: texto com a ferramenta Texto, formas ou outra
          imagem com Arquivo → Inserir imagem como camada.
        </li>
        <li>
          Limpe o fundo com a Borracha mágica ou a Borracha de plano de fundo, ou selecione uma área
          e pressione Delete para deixá-la transparente.
        </li>
        <li>Escolha Arquivo → Exportar como…, selecione PNG e salve.</li>
      </ol>
      <h2>Por que PNG</h2>
      <p>
        O PNG é sem perdas e aceita transparência, o que o torna o formato certo para logotipos,
        ícones, capturas de tela, ilustrações e tudo o que tem bordas nítidas ou texto. Fotos
        costumam ficar bem menores em JPEG ou WebP; veja as páginas do{" "}
        <Link href="/jpeg-editor">editor de JPEG</Link> e do{" "}
        <Link href="/webp-editor">editor de WebP</Link>, e o guia{" "}
        <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> (em inglês). Para mudar o
        formato sem editar, use o conversor <Link href="/convert/png-to-jpg">PNG para JPG</Link> ou{" "}
        <Link href="/convert/png-to-webp">PNG para WebP</Link>.
      </p>
      <h2>O que você pode fazer com um PNG</h2>
      <ul>
        <li>
          Trabalhar com camadas, grupos, 16 modos de mesclagem, opacidade e máscaras de camada.
        </li>
        <li>Adicionar texto editável, formas e demarcadores com a ferramenta Caneta.</li>
        <li>
          Dar a textos ou logotipos sombras projetadas, brilhos, traçados e sobreposições de cor,
          gradiente ou padrão.
        </li>
        <li>Apagar fundos com a Borracha mágica e a Borracha de plano de fundo.</li>
        <li>Mudar as cores com Matiz/saturação, Equilíbrio de cores e outras camadas de ajuste.</li>
        <li>Redimensionar a imagem ou a tela, cortar, girar e virar.</li>
        <li>
          Salvar o trabalho com camadas como PSD ou projeto .picstea para editar de novo depois.
        </li>
      </ul>
      <h2>Limitações</h2>
      <p>
        As imagens podem ter até 12.000 pixels por lado (36 megapixels). O Picstea trabalha com
        cores de 8 bits, então PNGs de 16 bits são reduzidos para 8 bits. PNGs animados abrem como
        uma única imagem. Ainda não há remoção automática de fundo. Veja{" "}
        <Link href="/docs/file-formats">formatos de arquivo</Link> (em inglês) para os detalhes.
      </p>
    </>
  ),
};

export default copy;
