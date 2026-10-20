import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Como adicionar texto a uma foto online",
  description:
    "Adicione texto editável a uma foto no navegador: escolha fonte, tamanho e cor, adicione sombra ou contorno e exporte. Grátis, sem marca d'água, nada enviado.",
  lead: "Para adicionar texto a uma foto no Picstea, abra a foto, escolha a ferramenta Texto (T), clique onde o texto deve ficar e digite. Mude a fonte, o tamanho e a cor na barra de opções e exporte. É grátis, não adiciona marca d'água e sua foto fica no seu dispositivo.",
  faqs: [
    {
      q: "Posso mudar o texto depois?",
      a: "Sim. O texto fica em uma camada própria e editável até você exportar. Salve o projeto (ou um PSD) para continuar editando outro dia.",
    },
    {
      q: "Quais fontes posso usar?",
      a: "Fontes comuns que todo computador tem: Arial, Helvetica, Verdana, Trebuchet MS, Georgia, Times New Roman, Courier New, Impact e a fonte do seu sistema. Ainda não é possível carregar suas próprias fontes.",
    },
    {
      q: "Como deixo o texto legível sobre uma foto carregada?",
      a: "Adicione uma sombra projetada ou um traçado na caixa de diálogo Estilo de camada, ou coloque uma forma atrás do texto e diminua a opacidade dela.",
    },
    {
      q: "Tem marca d'água?",
      a: "Não. O Picstea nunca adiciona marca d'água, e sua foto nunca é enviada.",
    },
  ],
  body: () => (
    <>
      <h2>Adicione texto em quatro passos</h2>
      <ol>
        <li>Abra o editor e solte sua foto na página.</li>
        <li>
          Pressione T (ou escolha a ferramenta Texto), clique na foto e digite. Pressione Enter para
          uma nova linha.
        </li>
        <li>
          Na barra de opções, escolha a fonte, o tamanho, negrito ou itálico, a cor, o alinhamento,
          a altura da linha e o espaçamento entre letras. Mova o texto com a ferramenta Mover (V).
        </li>
        <li>Escolha Arquivo → Exportar como… e salve um JPEG, PNG ou WebP.</li>
      </ol>
      <h2>Faça o texto se destacar</h2>
      <ul>
        <li>
          Clique duas vezes na camada de texto (ou em Camada → Opções de mesclagem…) para abrir o
          Estilo de camada: adicione uma <strong>sombra projetada</strong>, um{" "}
          <strong>traçado</strong> (contorno), um brilho externo ou uma sobreposição de gradiente.
        </li>
        <li>
          Desenhe um retângulo sob o texto com as ferramentas de forma e diminua a opacidade dele
          para criar uma faixa de legenda.
        </li>
        <li>
          Diminua a opacidade da camada de texto para criar uma marca d&apos;água discreta sua.
        </li>
        <li>
          Gire ou dimensione o texto com Transformação livre (Cmd/Ctrl+T); ele continua editável.
        </li>
      </ul>
      <h2>Bom saber</h2>
      <ul>
        <li>
          Precisa do mesmo texto em muitas fotos? O texto ainda não pode ser gravado em uma ação,
          então adicione-o em cada foto.
        </li>
        <li>
          O texto de um arquivo do Photoshop também abre como texto editável; veja o{" "}
          <Link href="/psd-editor">editor de PSD</Link>.
        </li>
      </ul>
      <h2>Limitações</h2>
      <p>
        O texto é de ponto: as linhas quebram onde você pressiona Enter, sem quebra automática
        dentro de uma caixa. Ainda não há texto em curva nem texto vertical, e só estão disponíveis
        as fontes comuns listadas nas perguntas abaixo.
      </p>
    </>
  ),
};

export default copy;
