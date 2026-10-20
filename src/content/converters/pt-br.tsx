import { LocalLink as Link } from "@/components/site/LocalLink";
import type { Faq } from "@/components/site/LandingPage";
import type { ConverterPage } from "./types";

const PRIVATE: Faq = {
  q: "Meu arquivo é enviado?",
  a: "Não. A conversão roda no seu navegador, no editor do Picstea, que não tem servidor para receber arquivos e bloqueia o envio deles para qualquer lugar. Nada é salvo no navegador também.",
};

const MANY: Faq = {
  q: "Posso converter vários arquivos de uma vez?",
  a: "Sim. Escolha ou solte até 200 arquivos; um arquivo é salvo diretamente, e vários são salvos juntos em um único arquivo ZIP.",
};

const CONVERTERS: readonly ConverterPage[] = [
  {
    id: "webp-to-png",
    label: "WebP para PNG",
    title: "Converter WebP em PNG online",
    description:
      "Transforme imagens WebP em arquivos PNG no navegador, com a transparência mantida e sem perder qualidade. Grátis, sem cadastro e sem enviar suas imagens.",
    lead: "Para converter WebP em PNG, clique em Converter agora, solte seus arquivos .webp e salve os PNGs. A transparência é mantida, o PNG é sem perdas e a conversão acontece no seu próprio dispositivo.",
    body: () => (
      <>
        <h2>Por que converter WebP em PNG?</h2>
        <p>
          Os sites usam WebP porque é pequeno, mas alguns apps, visualizadores de imagem antigos e
          formulários de envio ainda só aceitam PNG ou JPEG. O PNG abre em qualquer lugar e mantém
          fundos transparentes, então é a escolha segura para logotipos, ícones e capturas de tela
          salvos da web.
        </p>
        <h2>O que esperar</h2>
        <ul>
          <li>As áreas transparentes continuam transparentes.</li>
          <li>
            O PNG é sem perdas, então o resultado fica exatamente igual ao WebP — mas geralmente é
            maior, muitas vezes várias vezes maior no caso de fotos.
          </li>
          <li>Arquivos WebP animados são convertidos como uma única imagem estática.</li>
        </ul>
        <p>
          Precisa de um arquivo menor? <Link href="/convert/webp-to-jpg">Converta WebP em JPG</Link>
          .
        </p>
      </>
    ),
    faqs: [
      {
        q: "O PNG vai ficar pior que o WebP?",
        a: "Não. O PNG mantém cada pixel exatamente, então o PNG fica igual ao WebP. Ele não consegue recuperar detalhes que um WebP com perdas já descartou.",
      },
      PRIVATE,
      MANY,
      {
        q: "Posso editar a imagem antes de converter?",
        a: "Sim. Em vez disso, abra-a no editor (Arquivo → Abrir imagem), faça suas alterações e escolha Arquivo → Exportar como… e selecione PNG.",
      },
    ],
  },
  {
    id: "webp-to-jpg",
    label: "WebP para JPG",
    title: "Converter WebP em JPG online",
    description:
      "Converta imagens WebP em JPG no navegador e escolha a qualidade. Grátis, privado e nada é enviado — funciona para um arquivo ou para um lote.",
    lead: "Para converter WebP em JPG, clique em Converter agora, solte seus arquivos .webp, defina a qualidade e salve. Os JPGs abrem em qualquer app, e a conversão acontece no seu dispositivo.",
    body: () => (
      <>
        <h2>Por que converter WebP em JPG?</h2>
        <p>
          JPG (JPEG) é o formato que todo celular, app de câmera, serviço de impressão e programa de
          e-mail entende. Converter uma foto WebP em JPG mantém o arquivo pequeno e garante que
          qualquer pessoa consiga abri-lo.
        </p>
        <h2>O que esperar</h2>
        <ul>
          <li>
            O JPG não tem transparência: as áreas transparentes ficam brancas. Use{" "}
            <Link href="/convert/webp-to-png">WebP para PNG</Link> para mantê-las.
          </li>
          <li>
            Qualidade 80–90 mantém as fotos com a mesma aparência em tamanho pequeno; 90 é o padrão.
          </li>
          <li>Arquivos WebP animados são convertidos como uma única imagem estática.</li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "JPG é o mesmo que JPEG?",
        a: "Sim, são dois nomes para o mesmo formato. O Picstea salva os arquivos convertidos com a extensão .jpg.",
      },
      {
        q: "Por que meu fundo ficou branco?",
        a: "O JPG não consegue armazenar transparência, então os pixels transparentes são preenchidos com branco. Converta em PNG ou mantenha o WebP se precisar de transparência.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "png-to-jpg",
    label: "PNG para JPG",
    title: "Converter PNG em JPG online",
    description:
      "Converta imagens PNG em arquivos JPG menores no navegador e escolha a qualidade. Grátis, sem cadastro, nada é enviado; áreas transparentes ficam brancas.",
    lead: "Para converter PNG em JPG, clique em Converter agora, solte seus arquivos PNG, escolha uma qualidade e salve. As fotos geralmente encolhem para uma fração do tamanho em PNG, e nada sai do seu dispositivo.",
    body: () => (
      <>
        <h2>Por que converter PNG em JPG?</h2>
        <p>
          O PNG é sem perdas, o que deixa fotos e capturas de tela de fotos muito grandes. O JPG
          comprime fotos muito melhor, então converter é o jeito mais rápido de deixar uma imagem
          pequena o suficiente para e-mail, um site ou um formulário de envio com limite de tamanho.
        </p>
        <h2>O que esperar</h2>
        <ul>
          <li>As áreas transparentes ficam brancas, porque o JPG não tem transparência.</li>
          <li>
            Texto, logotipos e gráficos chapados podem ficar com bordas borradas em JPG. Para eles,{" "}
            <Link href="/convert/png-to-webp">PNG para WebP</Link> costuma ser a melhor escolha.
          </li>
          <li>Qualidade menor significa arquivo menor; confira o resultado antes de usá-lo.</li>
        </ul>
        <p>
          Para deixar o arquivo ainda menor, redimensione-o antes — veja o guia do{" "}
          <Link href="/image-compressor">compressor de imagens</Link>.
        </p>
      </>
    ),
    faqs: [
      {
        q: "Quanto menor o JPG vai ficar?",
        a: "Depende da imagem. Uma foto salva como PNG costuma ficar várias vezes menor como JPG com qualidade 80–90; gráficos chapados encolhem menos.",
      },
      {
        q: "Posso manter um fundo transparente?",
        a: "Não em JPG. Em vez disso, converta em WebP, que é pequeno e mantém a transparência.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "jpg-to-png",
    label: "JPG para PNG",
    title: "Converter JPG em PNG online",
    description:
      "Converta fotos JPG ou JPEG em arquivos PNG sem perdas no navegador. Grátis, sem cadastro, privado: suas fotos nunca são enviadas a um servidor.",
    lead: "Para converter JPG em PNG, clique em Converter agora, solte seus arquivos JPG ou JPEG e salve os PNGs. O PNG mantém a imagem exatamente como está, e a conversão acontece no seu dispositivo.",
    body: () => (
      <>
        <h2>Por que converter JPG em PNG?</h2>
        <p>
          Algumas ferramentas e formulários de envio pedem PNG, e o PNG é o melhor ponto de partida
          quando você quer editar uma imagem várias vezes: ele nunca perde qualidade ao ser salvo de
          novo, enquanto cada novo salvamento em JPG comprime a imagem mais uma vez.
        </p>
        <h2>O que esperar</h2>
        <ul>
          <li>O PNG fica exatamente igual ao JPG, incluindo eventuais artefatos de compressão.</li>
          <li>O arquivo fica maior, porque o PNG é sem perdas.</li>
          <li>
            Converter não adiciona transparência. Para remover um fundo, abra a foto no editor e use
            a Borracha mágica ou a Borracha de plano de fundo, e depois exporte um PNG.
          </li>
          <li>
            As fotos de celular são colocadas na posição certa, usando a orientação que a câmera
            gravou.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Converter em PNG melhora a qualidade?",
        a: "Não. O PNG preserva a imagem exatamente, mas não consegue trazer de volta detalhes que a compressão JPEG removeu. Ele evita novas perdas quando você salva de novo.",
      },
      {
        q: "As informações da câmera são mantidas?",
        a: "Não. Dados como a data, o modelo da câmera e o local não são copiados para o PNG.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "png-to-webp",
    label: "PNG para WebP",
    title: "Converter PNG em WebP online",
    description:
      "Converta imagens PNG em arquivos WebP pequenos para a web, mantendo a transparência e com qualidade ajustável. Grátis, privado, e nada é enviado.",
    lead: "Para converter PNG em WebP, clique em Converter agora, solte seus arquivos PNG, escolha uma qualidade e salve. Os arquivos WebP mantêm a transparência e geralmente são bem menores, o que faz as páginas da web carregarem mais rápido.",
    body: () => (
      <>
        <h2>Por que converter PNG em WebP?</h2>
        <p>
          As imagens costumam ser a parte mais pesada de uma página da web. O WebP armazena a mesma
          imagem em menos bytes que o PNG ou o JPEG e, ao contrário do JPEG, mantém fundos
          transparentes — por isso combina bem com fotos de produtos, ilustrações e logotipos em um
          site.
        </p>
        <h2>O que esperar</h2>
        <ul>
          <li>A transparência é mantida.</li>
          <li>
            A exportação WebP é com perdas: qualidade 80–90 fica igual para a maioria das imagens.
            Use 100 para capturas de tela com texto pequeno.
          </li>
          <li>
            Todos os navegadores atuais exibem WebP; alguns apps de desktop mais antigos não
            conseguem abri-lo. Converta de volta com{" "}
            <Link href="/convert/webp-to-png">WebP para PNG</Link> se precisar.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Meu site vai exibir imagens WebP?",
        a: "Sim. Todas as versões atuais do Chrome, Edge, Firefox e Safari exibem WebP.",
      },
      {
        q: "Posso criar um WebP sem perdas?",
        a: "Ainda não. A exportação WebP do Picstea é com perdas; para uma cópia exata, mantenha o PNG.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "svg-to-png",
    label: "SVG para PNG",
    title: "Converter SVG em PNG online",
    description:
      "Transforme gráficos vetoriais SVG em imagens PNG com transparência no navegador. Grátis, seguro — scripts em SVG nunca rodam — e nada é enviado.",
    lead: "Para converter SVG em PNG, clique em Converter agora, solte seus arquivos .svg e salve. Cada SVG é desenhado no próprio tamanho, com fundo transparente, inteiramente no seu dispositivo.",
    body: () => (
      <>
        <h2>Por que converter SVG em PNG?</h2>
        <p>
          O SVG é perfeito para ícones e logotipos na web, mas muitos lugares — redes sociais,
          apresentações, apps de mensagens, lojas de apps — só aceitam imagens de pixels. O PNG
          mantém as bordas nítidas e o fundo transparente.
        </p>
        <h2>O que esperar</h2>
        <ul>
          <li>
            O PNG tem o tamanho que o SVG declara (largura e altura, ou o viewBox). Para um PNG
            maior, abra o SVG no editor, use Imagem → Tamanho da imagem… e exporte.
          </li>
          <li>As áreas transparentes continuam transparentes.</li>
          <li>
            O SVG é desenhado pelo decodificador de imagens do seu navegador: os scripts dele nunca
            rodam e os arquivos externos aos quais ele se vincula não são carregados, então essas
            partes ficam de fora.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "É seguro converter um SVG da internet?",
        a: "Sim. O Picstea desenha SVGs como imagens, um modo em que os navegadores não executam scripts nem carregam outros arquivos.",
      },
      {
        q: "Por que falta uma parte do meu SVG?",
        a: "Fontes ou imagens que o SVG carrega de outros arquivos ou sites não podem ser buscadas no modo de imagem. Incorpore-as no SVG ou converta o texto em contornos antes de converter.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "psd-to-png",
    label: "PSD para PNG",
    title: "Converter PSD em PNG online",
    description:
      "Converta arquivos PSD do Photoshop em PNG no navegador, sem o Photoshop. Grátis, sem cadastro, e seu PSD nunca é enviado a um servidor.",
    lead: "Para converter um PSD em PNG, clique em Converter agora, solte seus arquivos .psd e salve. O Picstea usa a imagem achatada salva dentro do PSD, então o PNG fica como o arquivo aparecia no Photoshop.",
    body: () => (
      <>
        <h2>Por que converter PSD em PNG?</h2>
        <p>
          O PSD é o formato de trabalho do Photoshop: grande, com camadas e ilegível para a maioria
          dos apps. Um PNG da imagem final pode ser compartilhado, visualizado, enviado ou inserido
          em um documento, com a transparência mantida.
        </p>
        <h2>O que esperar</h2>
        <ul>
          <li>
            O PNG é a imagem achatada que o Photoshop guarda no arquivo. PSDs salvos com
            &quot;Maximizar compatibilidade&quot; desativado não têm essa imagem; abra-os no{" "}
            <Link href="/psd-editor">editor de PSD</Link> e exporte de lá.
          </li>
          <li>
            PSDs RGB e em tons de cinza de 8 bits funcionam. Arquivos PSB, de 16/32 bits e CMYK
            ainda não podem ser lidos.
          </li>
          <li>Para alterar camadas ou texto antes, abra o PSD no editor.</li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Preciso do Photoshop?",
        a: "Não. O Picstea lê o PSD no seu navegador. Para editar as camadas, abra o arquivo no editor do Picstea.",
      },
      {
        q: "Por que aparece que meu PSD não tem imagem achatada?",
        a: "O Photoshop só guarda essa imagem quando Maximizar compatibilidade está ativado. Abra o PSD no editor (Arquivo → Abrir imagem) e exporte um PNG de lá.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "heic-to-jpg",
    label: "HEIC para JPG",
    title: "Converter HEIC em JPG online",
    description:
      "Converta fotos HEIC do iPhone em JPG no navegador, uma de cada vez ou em lote. Grátis, sem cadastro, e suas fotos nunca são enviadas a um servidor.",
    lead: "Para converter HEIC em JPG, clique em Converter agora, solte suas fotos .heic, escolha uma qualidade e salve. Os JPGs abrem no Windows, no Android e em qualquer app, e suas fotos nunca saem do seu dispositivo.",
    body: () => (
      <>
        <h2>Por que converter HEIC em JPG?</h2>
        <p>
          iPhones e iPads salvam fotos em HEIC (High Efficiency Image File) para economizar espaço.
          Os dispositivos da Apple abrem esses arquivos, mas muitos PCs com Windows, celulares
          Android, sites e formulários de envio não. O JPG funciona em qualquer lugar.
        </p>
        <h2>O que esperar</h2>
        <ul>
          <li>As fotos são colocadas na posição certa, conforme gravado no arquivo.</li>
          <li>Qualidade 85–90 mantém as fotos com a mesma aparência; 90 é o padrão.</li>
          <li>
            O primeiro arquivo HEIC carrega um decodificador de 2 MB do próprio site do Picstea;
            depois disso ele fica em cache e funciona offline quando o Picstea está instalado.
          </li>
          <li>
            Só a foto principal é convertida: vídeos de Live Photos, mapas de profundidade e fotos
            em sequência ficam de fora, e dados da câmera como o local não são copiados.
          </li>
          <li>
            Precisa de transparência ou edição? Abra o HEIC no editor (Arquivo → Abrir imagem) ou
            use <Link href="/convert">outro conversor</Link>.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Minhas fotos do iPhone são enviadas?",
        a: "Não. O arquivo HEIC é decodificado no seu navegador com um decodificador de código aberto (libheif) que o Picstea serve do próprio site. Suas fotos nunca saem do seu dispositivo.",
      },
      {
        q: "Posso converter HEIC em PNG?",
        a: "Sim. No conversor, escolha PNG em Converter para. Os arquivos PNG são maiores, mas sem perdas.",
      },
      {
        q: "Posso editar uma foto HEIC?",
        a: "Sim. Abra-a com Arquivo → Abrir imagem no editor, como qualquer outra foto, e exporte-a como JPG, PNG ou WebP.",
      },
      MANY,
    ],
  },
];

export default CONVERTERS;
