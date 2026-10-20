import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Como deixar uma foto em preto e branco online",
  description:
    "Deixe uma foto colorida em preto e branco no navegador com uma camada de ajuste reversível, além de Misturador de canais, duotons e contraste. Grátis e privado.",
  lead: "Para deixar uma foto em preto e branco no Picstea, abra-a e escolha Camada → Nova camada de ajuste → Preto e branco. As cores viram cinza em uma camada própria, então você pode desfazer a qualquer momento. É grátis e sua foto nunca sai do seu dispositivo.",
  faqs: [
    {
      q: "Posso recuperar as cores?",
      a: "Sim. O visual preto e branco é uma camada de ajuste; oculte-a ou exclua-a e as cores originais voltam. A foto por baixo nunca muda.",
    },
    {
      q: "Como escureço o céu, como com um filtro vermelho?",
      a: "Use uma camada de ajuste Misturador de canais com Monocromático marcado, e pegue mais do canal vermelho e menos do azul. O Preto e branco em si não tem controles de cor.",
    },
    {
      q: "Posso manter uma cor e deixar o resto cinza?",
      a: "Sim. Pinte de preto na máscara da camada de ajuste sobre a parte que deve continuar colorida.",
    },
    {
      q: "Minha foto é enviada?",
      a: "Não. Tudo roda no seu navegador. O Picstea não tem servidor que receba imagens.",
    },
  ],
  body: () => (
    <>
      <h2>Deixe uma foto em preto e branco em três passos</h2>
      <ol>
        <li>Abra o editor e solte sua foto na página.</li>
        <li>Escolha Camada → Nova camada de ajuste → Preto e branco.</li>
        <li>Escolha Arquivo → Exportar como… e salve o resultado.</li>
      </ol>
      <h2>Controle os tons</h2>
      <ul>
        <li>
          O <strong>Misturador de canais</strong> com <strong>Monocromático</strong> marcado permite
          decidir quanto cada cor contribui: mais vermelho clareia a pele e escurece um céu azul,
          mais verde combina com paisagens.
        </li>
        <li>
          <strong>Curvas</strong> ou <strong>Níveis</strong> acima da camada preto e branco
          adicionam contraste — veja{" "}
          <Link href="/blog/levels-and-curves-explained">níveis e curvas explicados</Link> (em
          inglês).
        </li>
        <li>
          O <strong>Mapa de gradiente</strong> mapeia os cinzas para duas cores, para um duotom ou
          um visual sépia.
        </li>
        <li>
          <strong>Matiz/saturação</strong> com a saturação em −100 é outra forma rápida de remover a
          cor.
        </li>
      </ul>
      <h2>Mantenha uma cor</h2>
      <p>
        Toda camada de ajuste tem uma máscara. Selecione o Pincel, pinte de preto na máscara sobre a
        parte que deve manter a cor — um casaco vermelho, uma flor — e pinte de branco para trazer o
        cinza de volta.
      </p>
      <h2>Limitações</h2>
      <p>
        O ajuste Preto e branco converte as cores com pesos fixos e não tem controles deslizantes;
        use o Misturador de canais quando quiser controlá-los. O Picstea trabalha em RGB de 8 bits,
        então não há edição em 16 bits nem no modo tons de cinza.
      </p>
    </>
  ),
};

export default copy;
