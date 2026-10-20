import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Editor de PSD online: abra arquivos do Photoshop",
  description:
    "Abra e edite arquivos PSD online com camadas, grupos e máscaras, e salve-os de volta como PSD. O arquivo fica no seu computador — nada é enviado.",
  lead: "O Picstea abre arquivos do Photoshop (PSD) direto no seu navegador, mantém as camadas e permite salvá-los de volta como PSD — sem enviar o arquivo para lugar nenhum.",
  faqs: [
    {
      q: "Posso abrir um PSD sem o Photoshop?",
      a: "Sim. O Picstea abre arquivos PSD RGB e em tons de cinza de 8 bits no navegador, com camadas, grupos, máscaras, modos de mesclagem, texto editável, camadas de ajuste, camadas de forma, objetos inteligentes e os estilos de camada mais comuns.",
    },
    {
      q: "Meu PSD é enviado para um servidor?",
      a: "Não. O arquivo é lido dentro do seu navegador e nunca sai do seu dispositivo.",
    },
    {
      q: "Posso salvar como PSD de novo?",
      a: "Sim. Arquivo → Exportar como… → PSD grava um PSD com camadas, com grupos, máscaras, máscaras vetoriais, máscaras de corte, camadas de ajuste, opacidade e modos de mesclagem.",
    },
    {
      q: "O que não é mantido?",
      a: "Alguns recursos do Photoshop ainda não têm equivalente no Picstea: ajustes como Cor seletiva ou Pesquisa de cores, texto deformado e filtros inteligentes mantêm a aparência como pixels ou ficam de fora, e as imagens de padrão do Photoshop são substituídas por padrões integrados. O texto pode precisar de uma verificação de fonte. O Picstea lista o que mudou quando o arquivo abre.",
    },
  ],
  body: () => (
    <>
      <h2>Como editar um PSD online</h2>
      <ol>
        <li>Abra o editor e escolha Abrir imagem, ou solte o arquivo .psd na página.</li>
        <li>Suas camadas aparecem no painel Camadas, incluindo grupos e máscaras.</li>
        <li>Edite: mova e transforme camadas, pinte, crie máscaras, adicione camadas de ajuste.</li>
        <li>Salve com Arquivo → Exportar como… → PSD, ou exporte PNG, JPEG, WebP ou PDF.</li>
      </ol>
      <h2>Compatível</h2>
      <ul>
        <li>Arquivos PSD RGB e em tons de cinza de 8 bits com até 12.000 pixels por lado.</li>
        <li>
          Camadas de pixels, grupos, nomes de camadas, opacidade, visibilidade e modos de mesclagem.
        </li>
        <li>
          Máscaras de camada, incluindo máscaras em grupos; máscaras vetoriais e máscaras de corte.
        </li>
        <li>
          Camadas de texto editáveis (primeiro estilo de cada camada; fontes mapeadas para fontes
          comuns).
        </li>
        <li>
          Camadas de ajuste: Níveis, Curvas, Brilho/contraste, Matiz/saturação, Vibratilidade,
          Equilíbrio de cores, Filtro de fotos, Misturador de canais, Mapa de gradiente, Exposição,
          Inverter, Posterizar, Limiar, Preto e branco.
        </li>
        <li>
          Camadas de forma e de preenchimento de cor sólida, objetos inteligentes incorporados.
        </li>
        <li>
          Estilos de camada: todos os dez efeitos do Photoshop com as configurações, várias cópias
          de sombras, traçados e sobreposições, opacidade do preenchimento e a luz global.
        </li>
      </ul>
      <h2>Ainda não compatível</h2>
      <ul>
        <li>Arquivos PSB (documento grande), cores de 16/32 bits e CMYK.</li>
        <li>
          Ajustes Cor seletiva e Pesquisa de cores; imagens de padrão personalizadas (é usado o
          padrão integrado mais próximo); texto deformado; filtros inteligentes do Photoshop e
          objetos inteligentes vinculados.
        </li>
        <li>
          Ao salvar de volta em PSD, texto, formas, objetos inteligentes e estilos mantêm a
          aparência como pixels.
        </li>
      </ul>
      <p>
        Mais detalhes em <Link href="/docs/file-formats">formatos de arquivo</Link> (em inglês).
      </p>
    </>
  ),
};

export default copy;
