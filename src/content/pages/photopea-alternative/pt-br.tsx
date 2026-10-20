import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: uma alternativa ao Photopea",
  description:
    "Procurando uma alternativa ao Photopea? O Picstea é um editor de fotos grátis no navegador, com camadas e PSD, e sem código de anúncios de terceiros no editor.",
  lead: "O Photopea mostrou que um editor de imagens sério pode viver em uma aba do navegador. O Picstea segue a mesma ideia com um foco próprio: um espaço de trabalho tranquilo, nenhum código de terceiros no editor e uma lista clara do que ele faz e não faz.",
  faqs: [
    {
      q: "Em que o Picstea é diferente do Photopea?",
      a: "Os dois são editores grátis com camadas que rodam no navegador e editam arquivos no seu dispositivo. O Picstea mantém código de terceiros, incluindo anúncios, totalmente fora da página do editor e foca em um espaço de trabalho limpo e concentrado. O Photopea abre mais tipos de arquivo e tem recursos que o Picstea ainda não tem.",
    },
    {
      q: "O Picstea envia minhas imagens?",
      a: "Não. Os arquivos são abertos, editados e salvos no seu navegador; a página do editor não pode enviar os dados do documento para lugar nenhum.",
    },
    {
      q: "Posso levar meus arquivos PSD de um para o outro?",
      a: "Sim. Os dois leem e gravam PSD, então você pode abrir no Picstea um PSD salvo por outro editor e exportar de novo um PSD com camadas.",
    },
  ],
  body: () => (
    <>
      <h2>O que os dois fazem</h2>
      <ul>
        <li>
          Rodam no navegador de graça, com camadas, máscaras, camadas de ajuste e modos de
          mesclagem.
        </li>
        <li>Abrem e salvam arquivos PSD com camadas e exportam PNG, JPEG e WebP.</li>
        <li>
          Editam arquivos localmente, com ferramentas e atalhos conhecidos no estilo do Photoshop.
        </li>
      </ul>
      <h2>Por que as pessoas escolhem o Picstea</h2>
      <ul>
        <li>
          <strong>Nada de terceiros no editor.</strong> A página do editor não executa código de
          anúncios nem de rastreamento; uma Content-Security-Policy rígida permite que o navegador
          bloqueie qualquer tentativa de enviar os dados do documento para outro lugar. O espaço de
          patrocínio do próprio Picstea, ao lado da tela, é uma simples imagem com link.
        </li>
        <li>
          <strong>Projetos salvos para você.</strong> O trabalho é salvo automaticamente no seu
          navegador e pode ser baixado como um arquivo de projeto <code>.picstea</code> portátil.
        </li>
        <li>
          <strong>Limites honestos.</strong> Quando um recurso de PSD não pode ser mantido, o
          Picstea lista exatamente o que mudou em vez de mudar em silêncio.
        </li>
      </ul>
      <h2>O que o Photopea tem e o Picstea (ainda) não</h2>
      <ul>
        <li>
          Abertura de mais formatos, como AI, XD, Sketch, Figma, PDF e arquivos RAW de câmera.
        </li>
        <li>
          Ferramentas generativas e sensíveis ao conteúdo, seleção de objeto e laço magnético.
        </li>
        <li>
          Abertura de arquivos direto de armazenamento em nuvem, como Google Drive, Dropbox ou
          OneDrive.
        </li>
      </ul>
      <p>
        Se você precisa disso, o Photopea é uma boa escolha. Se quer um editor focado que mantém seu
        trabalho privado por padrão,{" "}
        <Link href="/docs/getting-started">comece a usar o Picstea</Link> (guia em inglês).
      </p>
    </>
  ),
};

export default copy;
