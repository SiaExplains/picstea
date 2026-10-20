import { LocalLink as Link } from "@/components/site/LocalLink";
import pkg from "../../../../package.json";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Sobre o Picstea",
  description:
    "O Picstea é um editor de fotos grátis, com camadas, que roda inteiramente no navegador. Suas imagens ficam no seu dispositivo: nada é enviado.",
  lead: "Um editor de imagens grátis, com camadas, no seu navegador, feito para que suas fotos nunca saiam do seu dispositivo.",
  faqs: [],
  body: () => (
    <>
      <h2>O que é o Picstea</h2>
      <p>
        O Picstea é um editor de fotos que funciona como as ferramentas de desktop que você talvez
        conheça: camadas e grupos, máscaras, modos de mesclagem, camadas de ajuste, uma caixa de
        diálogo Estilo de camada completa, seleções, pincéis de retoque, texto, formas e
        demarcadores, objetos inteligentes e filtros. Ele abre e salva arquivos do Photoshop (PSD)
        com as camadas e exporta PNG, JPEG, WebP, SVG e PDF. A{" "}
        <Link href="/docs">documentação</Link> (em inglês) cobre todas as ferramentas.
      </p>

      <h2>Suas imagens ficam no seu dispositivo</h2>
      <p>
        Tudo acontece no seu navegador. O Picstea não tem servidor que receba imagens, e a página do
        editor é configurada para não poder enviar os dados do documento para lugar nenhum. Seu
        trabalho é salvo automaticamente no armazenamento deste navegador; baixe um projeto{" "}
        <code>.picstea</code> ou exporte uma imagem sempre que quiser uma cópia em outro lugar.
        Depois da primeira visita, o editor também funciona offline e, no Chrome e no Edge, você
        pode instalá-lo como app.
      </p>

      <h2>Grátis e sem conta</h2>
      <p>
        Não há cadastro, marca d&apos;água nem limite de exportações. O Picstea é pago pela
        publicidade no site e no blog e por patrocínios claramente identificados ao lado da tela —
        nunca sobre o seu trabalho; a <Link href="/sponsorship">página de patrocínio</Link> (em
        inglês) explica como. A <Link href="/privacy">política de privacidade</Link> e a{" "}
        <Link href="/cookies">política de cookies</Link> (em inglês) listam exatamente o que é
        armazenado e por quê.
      </p>

      <h2>Como ele é feito</h2>
      <p>
        O Picstea é escrito em TypeScript com React e Next.js. O editor em si — documentos,
        renderização, formatos de arquivo e ferramentas — é código simples que roda no navegador e
        em um worker em segundo plano, sem serviços de terceiros. As mudanças são listadas versão a
        versão, e o <Link href="/blog">blog</Link> (em inglês) explica os novos recursos.
      </p>
      <p>
        <small>Versão {pkg.version}</small>
      </p>

      <h2>Software de código aberto</h2>
      <p>
        Para abrir fotos HEIC, o Picstea usa a{" "}
        <a href="https://github.com/strukturag/libheif" rel="noopener">
          libheif
        </a>{" "}
        (GNU LGPL 3.0), compilada para WebAssembly pela{" "}
        <a href="https://github.com/catdad-experiments/libheif-js" rel="noopener">
          libheif-js
        </a>{" "}
        1.23.5. Ela é servida sem modificações como um arquivo próprio, carregada só quando você
        abre uma foto HEIC, e roda no seu dispositivo. Licenças:{" "}
        <a href="/vendor/libheif/1.23.5/LICENSE-libheif.txt">libheif</a>,{" "}
        <a href="/vendor/libheif/1.23.5/LICENSE-libheif-js.txt">libheif-js</a>. Você pode substituir
        esse arquivo por uma compilação própria da biblioteca.
      </p>

      <h2>Idiomas</h2>
      <p>
        O Picstea está disponível em inglês, espanhol, português (Brasil) e alemão. As traduções do
        editor e destas páginas foram feitas com tradução automática e ainda não foram revisadas por
        falantes nativos; correções são bem-vindas. A documentação, o blog e as páginas jurídicas
        estão em inglês.
      </p>

      <h2>Contato</h2>
      <p>
        Quem mantém o Picstea e como entrar em contato estão nas{" "}
        <Link href="/imprint">informações legais</Link> (em inglês). Para dúvidas sobre o uso do
        editor, comece pelas <Link href="/faq">perguntas frequentes</Link>.
      </p>
    </>
  ),
};

export default copy;
