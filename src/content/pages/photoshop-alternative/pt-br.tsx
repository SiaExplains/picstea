import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Alternativa grátis ao Photoshop no navegador",
  description:
    "O Picstea é uma alternativa grátis ao Photoshop que roda no navegador: camadas, máscaras, camadas de ajuste e PSD, sem instalar, sem conta e sem envio.",
  lead: "O Picstea oferece o essencial de um fluxo de trabalho no estilo do Photoshop — camadas, máscaras, camadas de ajuste, seleções, retoque e arquivos PSD — em uma aba do navegador. Nada para instalar, nenhum cadastro, e suas imagens ficam no seu dispositivo.",
  faqs: [
    {
      q: "O Picstea substitui o Photoshop?",
      a: "Para edição de fotos do dia a dia, retoque e design com camadas, muitas vezes sim. Para produção de impressão em CMYK, imagens de 16/32 bits, geração por IA ou 3D e vídeo avançados, o Photoshop ainda é a ferramenta certa.",
    },
    {
      q: "Meus hábitos do Photoshop vão funcionar?",
      a: "Na maior parte. As ferramentas, os painéis e os atalhos seguem as mesmas convenções: V mover, M letreiro, L laço, B pincel, J recuperação, Ctrl/Cmd+J duplicar, Ctrl/Cmd+E mesclar para baixo, X e D para as cores, Shift mais a tecla de uma ferramenta para alternar as ferramentas de um grupo.",
    },
    {
      q: "Posso abrir meus arquivos PSD?",
      a: "Sim, PSDs RGB e em tons de cinza de 8 bits com camadas, grupos, máscaras, texto editável, camadas de ajuste, formas, objetos inteligentes e os estilos de camada mais comuns. Você pode salvar de volta PSDs com camadas.",
    },
    {
      q: "Custa alguma coisa?",
      a: "Não. O Picstea é grátis, não exige conta e não adiciona marca d'água. Ele é financiado por publicidade no site e no blog e por patrocínios identificados ao lado da tela — nunca sobre o seu trabalho.",
    },
  ],
  body: () => (
    <>
      <h2>O que parece familiar</h2>
      <ul>
        <li>
          Barra de menus, barra de ferramentas com ferramentas agrupadas, barra de opções e os
          painéis Propriedades, Histórico e Camadas.
        </li>
        <li>
          Camadas de pixels, forma, texto, preenchimento e ajuste; grupos, 16 modos de mesclagem,
          máscaras de camada, máscaras vetoriais e máscaras de corte.
        </li>
        <li>
          A caixa de diálogo Estilo de camada completa: todos os dez efeitos com contornos, várias
          cópias de um efeito e estilos salvos.
        </li>
        <li>
          Seleções com letreiro, laço, varinha mágica e Intervalo de cores; recuperação, carimbo,
          subexposição e superexposição.
        </li>
        <li>
          Ferramenta Caneta e demarcadores, objetos inteligentes com filtros inteligentes, ações e
          processamento em lote.
        </li>
      </ul>
      <h2>Como eles diferem</h2>
      <table>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">Picstea</th>
            <th scope="col">Adobe Photoshop</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Onde roda</th>
            <td>Qualquer navegador atual</td>
            <td>App de desktop (instalado)</td>
          </tr>
          <tr>
            <th scope="row">Preço</th>
            <td>Grátis, sem conta</td>
            <td>Assinatura paga</td>
          </tr>
          <tr>
            <th scope="row">Suas imagens</th>
            <td>Ficam no seu dispositivo</td>
            <td>No seu computador; documentos na nuvem opcionais</td>
          </tr>
          <tr>
            <th scope="row">Arquivos</th>
            <td>
              Entrada: PSD (8 bits), PNG, JPEG, WebP, GIF, SVG; saída: PSD, PNG, JPEG, WebP, SVG,
              PDF
            </td>
            <td>Muitos outros formatos, incluindo CMYK e 16/32 bits</td>
          </tr>
          <tr>
            <th scope="row">Profundidade</th>
            <td>Edição e retoque essenciais</td>
            <td>Muito mais recursos, incluindo ferramentas de IA</td>
          </tr>
        </tbody>
      </table>
      <h2>Quando continuar com o Photoshop</h2>
      <p>
        Se você prepara arquivos para impressão comercial em CMYK, trabalha todo dia com imagens de
        16 ou 32 bits ou arquivos RAW, ou depende de recursos de IA generativa, o Photoshop continua
        sendo a melhor ferramenta. O Picstea é honesto sobre seus limites: veja o que ele{" "}
        <Link href="/docs/file-formats">abre e exporta</Link> (em inglês) e as{" "}
        <Link href="/faq">perguntas frequentes</Link>.
      </p>
    </>
  ),
};

export default copy;
