import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Perguntas frequentes",
  description:
    "Respostas sobre o Picstea: se é grátis, se as imagens são enviadas, quais arquivos abre e salva, onde ficam os projetos e em quais dispositivos funciona.",
  lead: "Respostas curtas sobre o Picstea, o editor de fotos online grátis que mantém suas imagens no seu dispositivo.",
  faqs: [
    {
      q: "O Picstea é grátis?",
      a: "Sim. O Picstea é gratuito, sem conta, sem marca d'água e sem limite de exportações. Ele é financiado por publicidade no site e no blog e por patrocínios claramente identificados ao lado da tela — nunca sobre o seu trabalho, e sem rastreamento.",
    },
    {
      q: "Minhas imagens são enviadas?",
      a: "Não. As imagens são abertas, editadas, salvas e exportadas no seu navegador. O Picstea não tem servidor que as receba, e a página do editor bloqueia o envio dos dados do documento para qualquer lugar.",
    },
    {
      q: "Onde meu trabalho fica salvo?",
      a: "Automaticamente no armazenamento do seu navegador, neste dispositivo. Para guardar uma cópia em outro lugar, use Arquivo → Salvar projeto como… para baixar um arquivo .picstea, ou exporte uma imagem.",
    },
    {
      q: "Quais arquivos posso abrir?",
      a: "PNG, JPEG, WebP, GIF, SVG, HEIC (fotos do iPhone), PSD (RGB e tons de cinza de 8 bits) e arquivos de projeto .picstea.",
    },
    {
      q: "Para quais formatos posso exportar?",
      a: "PNG, JPEG, WebP, SVG, PDF e PSD com camadas.",
    },
    {
      q: "Posso editar arquivos PSD?",
      a: "Sim. Camadas, grupos, máscaras, modos de mesclagem, texto editável, camadas de ajuste, formas, objetos inteligentes e os estilos de camada mais comuns são mantidos, e você pode salvar de volta um PSD com camadas.",
    },
    {
      q: "Preciso instalar alguma coisa?",
      a: "Não. O Picstea roda nas versões atuais do Chrome, Edge, Firefox e Safari.",
    },
    {
      q: "O Picstea funciona offline? Posso instalá-lo?",
      a: "Sim. Depois de abri-lo uma vez, o editor também abre sem conexão com a internet. No Chrome e no Edge você pode instalá-lo (Ajuda → Instalar o Picstea…) para que abra na própria janela, como um app de desktop; no Safari no Mac, use Arquivo → Adicionar ao Dock.",
    },
    {
      q: "Funciona no celular ou no tablet?",
      a: "O layout se adapta a telas pequenas, mas o Picstea foi pensado para mouse ou trackpad e teclado, então um computador oferece a melhor experiência.",
    },
    {
      q: "O Picstea tem ferramentas de IA?",
      a: "Ainda não. Não há preenchimento generativo, seleção de objeto nem preenchimento sensível ao conteúdo; o pincel de recuperação e o pincel de recuperação para manchas cobrem a remoção de imperfeições.",
    },
    {
      q: "É uma alternativa ao Photoshop ou ao Photopea?",
      a: "Ele cobre o essencial desse fluxo de trabalho — camadas, máscaras, ajustes, retoque e arquivos PSD — de graça no navegador. Veja as páginas de comparação com o Photoshop e o Photopea para saber o que ele faz e o que não faz.",
    },
  ],
  body: () => (
    <>
      <p>
        Ainda tem dúvidas? Leia a <Link href="/docs">documentação</Link> (em inglês), compare o
        Picstea com o <Link href="/photoshop-alternative">Photoshop</Link> e o{" "}
        <Link href="/photopea-alternative">Photopea</Link> ou veja os{" "}
        <Link href="/blog">guias</Link> (em inglês).
      </p>
    </>
  ),
};

export default copy;
