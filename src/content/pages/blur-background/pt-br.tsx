import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Como desfocar o fundo de uma foto online",
  description:
    "Desfoque o fundo de uma foto no navegador: selecione o objeto e desfoque o resto com Desfoque de lente, ou use Tilt-Shift e Desfoque de íris. Grátis, sem envio.",
  lead: "Para desfocar o fundo de uma foto no Picstea, selecione o objeto principal, escolha Selecionar → Inverter para que o fundo fique selecionado e aplique Filtro → Desfoque → Desfoque de lente. Funciona no seu navegador, é grátis e sua foto nunca é enviada.",
  faqs: [
    {
      q: "O Picstea seleciona a pessoa automaticamente?",
      a: "Ainda não — não há seleção de objeto por IA. Selecione o objeto à mão com o laço, o laço poligonal ou a varinha mágica; o Intervalo de cores ajuda quando o fundo é de uma cor só.",
    },
    {
      q: "Qual desfoque parece mais com uma câmera de verdade?",
      a: "O Desfoque de lente: ele imita uma lente fora de foco e pode fazer pontos claros brilharem como bokeh. O Desfoque gaussiano é mais suave e uniforme.",
    },
    {
      q: "Posso mudar o desfoque depois?",
      a: "Sim, se você desfocar uma cópia: pressione Cmd/Ctrl+J para duplicar a camada antes, desfoque a cópia e depois oculte-a ou exclua-a para voltar. Cada filtro também é uma etapa de desfazer.",
    },
    {
      q: "Minha foto é enviada?",
      a: "Não. O desfoque é calculado no seu navegador. O Picstea não tem servidor que receba imagens.",
    },
  ],
  body: () => (
    <>
      <h2>Desfoque o fundo em cinco passos</h2>
      <ol>
        <li>Abra o editor e solte sua foto na página.</li>
        <li>
          Selecione o objeto principal: contorne-o com o Laço ou o Laço poligonal, ou clique no
          fundo com a Varinha mágica e use Selecionar → Inverter para trocar.
        </li>
        <li>
          Escolha Selecionar → Difusão… com alguns pixels, para que a borda entre a parte nítida e a
          desfocada fique suave.
        </li>
        <li>
          Com o fundo selecionado, escolha Filtro → Desfoque → Desfoque de lente… e aumente o Raio
          enquanto observa a foto. O Brilho especular faz os realces brilharem como bokeh.
        </li>
        <li>Pressione OK, cancele a seleção e exporte com Arquivo → Exportar como….</li>
      </ol>
      <h2>Sem seleção: Galeria de desfoque</h2>
      <p>
        Para um efeito rápido de profundidade de campo, Filtro → Galeria de desfoque mantém parte da
        foto nítida sem selecionar nada:
      </p>
      <ul>
        <li>
          O <strong>Tilt-Shift</strong> mantém uma faixa horizontal nítida e desfoca acima e abaixo
          — o visual de &quot;miniatura&quot; para paisagens e ruas.
        </li>
        <li>
          O <strong>Desfoque de íris</strong> mantém um oval nítido ao redor do objeto e desfoca o
          resto — bom para retratos.
        </li>
        <li>
          O <strong>Desfoque de campo</strong> desfoca a imagem inteira por igual.
        </li>
      </ul>
      <p>
        Onde o Photoshop usa pinos na tela, o Picstea define o centro e o tamanho com controles
        deslizantes.
      </p>
      <h2>Dicas</h2>
      <ul>
        <li>
          Cabelo e bordas difusas são a parte mais difícil. Aumente um pouco a difusão e aproxime o
          zoom para conferir a borda antes de desfocar.
        </li>
        <li>Para manter o original, duplique a camada (Cmd/Ctrl+J) e desfoque a cópia.</li>
        <li>
          Mais sobre seleção: <Link href="/docs/selections">guia de seleções</Link> (em inglês).
          Todos os desfoques estão no <Link href="/docs/filters">guia de filtros</Link> (em inglês).
        </li>
      </ul>
      <h2>Limitações</h2>
      <p>
        Ainda não há detecção automática do objeto nem modo retrato, e não há mapa de profundidade:
        o desfoque tem a mesma intensidade em toda a área onde é aplicado, em vez de aumentar com a
        distância.
      </p>
    </>
  ),
};

export default copy;
