import { LatestPosts, WelcomeLinks } from "@/components/welcome/WelcomeLinks";
import type { HomeCopy } from "./types";

const FAQ = [
  [
    "O Picstea é grátis?",
    "Sim. Ele roda no seu navegador sem conta, sem marca d'água e sem período de teste.",
  ],
  [
    "Minhas imagens são enviadas?",
    "Não. As imagens são abertas, editadas e exportadas no seu dispositivo. O Picstea não tem servidor que as receba.",
  ],
  [
    "Onde meu trabalho fica salvo?",
    "No armazenamento deste navegador, no seu dispositivo, automaticamente. Use Arquivo → Salvar projeto como para guardar uma cópia .picstea, ou exporte um PSD.",
  ],
  [
    "Posso abrir arquivos do Photoshop?",
    "Sim. Arquivos PSD RGB e em tons de cinza de 8 bits abrem com camadas, grupos, máscaras, texto editável, camadas de ajuste e os estilos de camada mais comuns.",
  ],
  [
    "Funciona offline?",
    "Sim. Depois da primeira visita, você pode instalar o Picstea como app e continuar editando sem conexão.",
  ],
  [
    "Funciona no celular?",
    "O layout se adapta a telas pequenas, mas o Picstea funciona melhor com mouse ou trackpad e teclado.",
  ],
  [
    "Ele substitui o Photoshop ou o Photopea?",
    "Para a maior parte da edição de fotos e do design com camadas, sim. O Photoshop ainda leva vantagem em ferramentas de IA, impressão CMYK e edição em 16 bits.",
  ],
] as const;

const LINKS = [
  ["/online-photo-editor", "Editor de fotos online grátis com camadas"],
  ["/psd-editor", "Abrir e editar arquivos PSD online"],
  ["/png-editor", "Editor de PNG"],
  ["/jpeg-editor", "Editor de JPEG"],
  ["/webp-editor", "Editor e conversor de WebP"],
  ["/image-resizer", "Redimensionar uma imagem"],
  ["/image-compressor", "Comprimir uma imagem"],
  ["/photo-filters", "Filtros de foto"],
  ["/convert", "Converter imagens (HEIC, WebP, PNG, JPG, SVG, PSD)"],
  ["/blur-background", "Como desfocar o fundo de uma foto"],
  ["/make-background-transparent", "Como deixar um fundo transparente"],
  ["/photoshop-alternative", "Uma alternativa grátis ao Photoshop"],
  ["/photopea-alternative", "O Picstea como alternativa ao Photopea"],
  ["/gimp-alternative", "O Picstea como alternativa ao GIMP"],
  ["/docs", "Documentação (em inglês)"],
  ["/faq", "Perguntas frequentes"],
  ["/about", "Sobre o Picstea"],
] as const;

const copy: HomeCopy = {
  tagline: "Editor de fotos online grátis",
  description:
    "O Picstea é um editor de fotos online grátis com camadas, máscaras e camadas de ajuste. Edite e exporte imagens no navegador — elas nunca saem do aparelho.",
  welcome: {
    title: "Um editor de imagens grátis que mantém suas imagens no seu dispositivo",
    lead: "O Picstea é um editor de imagens com camadas que roda inteiramente no seu navegador.",
    highlights: [
      [
        "Privado por padrão",
        "A edição acontece no seu navegador. Suas imagens nunca são enviadas.",
      ],
      [
        "Camadas que continuam editáveis",
        "Grupos, máscaras, 16 modos de mesclagem, camadas de ajuste e efeitos.",
      ],
      [
        "Selecione, pinte e escreva",
        "Letreiro, laço e varinha mágica, pincéis, gradientes, formas e texto na tela.",
      ],
      [
        "Abra e exporte",
        "Entrada: PNG, JPEG, WebP, GIF, SVG, HEIC e PSD com camadas; saída: PSD, SVG, PDF e imagens.",
      ],
    ],
    newHere: "Primeira vez aqui? Leia o {link}.",
    gettingStarted: "guia de primeiros passos (em inglês)",
    learnMore: "Saiba mais",
    links: [
      ["/docs", "Documentação (em inglês)"],
      ["/blog", "Guias (em inglês)"],
      ["/faq", "Perguntas frequentes"],
      ["/photoshop-alternative", "Alternativa ao Photoshop"],
      ["/psd-editor", "Editor de PSD"],
    ],
    start: "Começar a editar",
  },
  about: {
    summary: "Sobre o Picstea: recursos, privacidade, formatos de arquivo e perguntas frequentes",
    body: () => (
      <>
        <h2>O que é o Picstea?</h2>
        <p>
          O Picstea é um editor de imagens online grátis que funciona como o Photoshop e o Photopea:
          camadas, máscaras, camadas de ajuste, seleções, estilos de camada e filtros, com barra de
          menus, barra de ferramentas e painéis conhecidos. Ele roda inteiramente no seu navegador
          no Windows, macOS, Linux e ChromeOS, sem nada para instalar e sem cadastro.
        </p>

        <h2>O que você pode fazer com ele</h2>
        <ul>
          <li>
            <strong>Camadas:</strong> camadas de pixels, forma, texto, preenchimento e ajuste,
            grupos, 16 modos de mesclagem, opacidade, máscaras de camada, máscaras vetoriais e
            máscaras de corte.
          </li>
          <li>
            <strong>Ajustes:</strong> Níveis, Curvas, Brilho/contraste, Matiz/saturação, Exposição,
            Vibratilidade, Equilíbrio de cores, Filtro de fotos, Misturador de canais, Mapa de
            gradiente, Preto e branco e outros, como camadas de ajuste que você pode alterar depois.
          </li>
          <li>
            <strong>Estilos de camada:</strong> sombra projetada, sombra interna, brilhos, chanfro e
            entalhe, acetinado, sobreposições de cor, gradiente e padrão e traçado, com Mesclar se e
            estilos salvos.
          </li>
          <li>
            <strong>Seleções:</strong> letreiro, laço, laço poligonal, varinha mágica e Intervalo de
            cores, com difusão, expandir, contrair e transformar.
          </li>
          <li>
            <strong>Pintura e retoque:</strong> pincel, lápis, borrachas, gradiente, lata de tinta,
            carimbo, pincel de recuperação e pincel de recuperação para manchas, subexposição,
            superexposição, esponja, desfoque, nitidez e borrar.
          </li>
          <li>
            <strong>Filtros:</strong> o menu Filtro completo com visualização ao vivo, incluindo
            desfoques, distorções, ruído, nitidez, Camera Raw, Liquidificar e Ponto de fuga, também
            como filtros inteligentes não destrutivos em objetos inteligentes.
          </li>
          <li>
            <strong>Texto e vetores:</strong> texto editável, a ferramenta Caneta e formas.
          </li>
          <li>
            <strong>Automação:</strong> grave ações e processe muitas imagens em lote em um arquivo
            ZIP.
          </li>
        </ul>

        <h2>Por que suas imagens ficam no seu dispositivo</h2>
        <p>
          O Picstea é local em primeiro lugar. Suas imagens são abertas, editadas, salvas e
          exportadas no seu navegador; não há etapa de envio nem servidor que as receba. A página do
          editor não executa código de terceiros, e a política de segurança dela impede o envio dos
          dados do documento para qualquer lugar. Os projetos são salvos automaticamente no seu
          navegador e, depois da primeira visita, o Picstea pode ser instalado como app e usado
          offline.
        </p>

        <h2>Formatos de arquivo</h2>
        <p>
          O Picstea abre PNG, JPEG, WebP, GIF, SVG, HEIC (fotos do iPhone), PSD do Photoshop (RGB e
          tons de cinza de 8 bits) e os próprios projetos .picstea. Ele exporta PNG, JPEG, WebP,
          SVG, PDF e PSD com camadas. Ainda não abre arquivos PSB, PSD de 16/32 bits ou CMYK, TIFF,
          PDF nem RAW de câmera.
        </p>

        <h2>Perguntas frequentes</h2>
        <dl>
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>

        <h2>Saiba mais</h2>
        <WelcomeLinks links={LINKS} />
        <LatestPosts />
      </>
    ),
  },
};

export default copy;
