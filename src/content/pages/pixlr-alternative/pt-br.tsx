import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: alternativa ao Pixlr sem limites",
  description:
    "Alternativa ao Pixlr? O Picstea é um editor de fotos grátis no navegador com camadas e PSD, sem conta, sem limite de salvamento e sem anúncios no editor.",
  lead: "O Pixlr é um editor de fotos popular no navegador, com uma versão grátis e planos pagos que adicionam ferramentas de IA. O Picstea é um editor grátis no navegador com camadas no estilo do Photoshop e suporte a PSD — sem limite para salvar, sem conta e sem anúncios dentro do editor.",
  faqs: [
    {
      q: "Em que o Picstea é diferente do Pixlr?",
      a: "Os dois são editores de fotos no navegador com camadas. O Pixlr tem uma versão grátis com anúncios e salvamentos limitados, e planos pagos com ferramentas de IA. O Picstea é grátis, sem limites nem anúncios no editor, mas não tem ferramentas de IA.",
    },
    {
      q: "O Picstea limita quantas imagens posso salvar?",
      a: "Não. Não há limite para salvar ou exportar, nem marca d'água, nem conta.",
    },
    {
      q: "O Picstea tem remoção de fundo por IA como o Pixlr?",
      a: "Ainda não. O Picstea remove fundos à mão com a Borracha mágica, a Borracha de plano de fundo ou uma seleção. As ferramentas de IA do Pixlr são a melhor escolha se você precisa disso.",
    },
    {
      q: "Minhas fotos são enviadas?",
      a: "Não com o Picstea: o editor não tem servidor que receba imagens, e a política de segurança dele bloqueia o envio dos dados do documento para qualquer lugar.",
    },
  ],
  body: () => (
    <>
      <h2>O que os dois fazem</h2>
      <ul>
        <li>Editam fotos no navegador com camadas, máscaras, modos de mesclagem e ajustes.</li>
        <li>Abrem e salvam arquivos PSD e exportam PNG, JPEG e WebP.</li>
        <li>Retocam, adicionam texto, cortam, redimensionam e aplicam filtros.</li>
      </ul>
      <h2>Como eles diferem</h2>
      <ComparisonTable
        other="Pixlr"
        rows={[
          ["Preço", "Grátis", "Versão grátis; planos pagos (Plus, Premium, Ultra)"],
          ["Anúncios", "Nenhum no editor", "Na versão grátis; os planos pagos não têm anúncios"],
          [
            "Salvar",
            "Ilimitado, sem conta",
            "Limitado na versão grátis; ilimitado nos planos pagos",
          ],
          [
            "Ferramentas de IA",
            "Nenhuma",
            "Ferramentas de IA com créditos mensais nos planos pagos",
          ],
          [
            "Fluxo de trabalho",
            "Camadas, camadas de ajuste e estilos de camada no estilo do Photoshop",
            "Editores próprios do Pixlr",
          ],
          ["Plataformas", "Qualquer navegador atual", "Navegador, apps de desktop e apps móveis"],
        ]}
      />
      <h2>Por que as pessoas escolhem o Picstea</h2>
      <ul>
        <li>
          <strong>Nenhum limite para contornar.</strong> Salve e exporte quantas vezes quiser, em
          tamanho total, sem marca d&apos;água e sem cadastro.
        </li>
        <li>
          <strong>Nenhum anúncio onde você trabalha.</strong> A página do editor não executa nenhum
          código de terceiros; os patrocínios do próprio Picstea ficam ao lado da tela como uma
          simples imagem com link.
        </li>
        <li>
          <strong>Fluxo de trabalho profissional com camadas.</strong> Camadas de ajuste, objetos
          inteligentes com filtros inteligentes, Mesclar se e todos os dez estilos de camada do
          Photoshop.
        </li>
      </ul>
      <h2>Quando o Pixlr é a melhor escolha</h2>
      <ul>
        <li>Ferramentas de IA, como geração de imagens por IA e recortes automáticos.</li>
        <li>Apps móveis para iPhone e Android.</li>
      </ul>
      <p>
        Se você edita à mão e não quer limites,{" "}
        <Link href="/docs/getting-started">comece a usar o Picstea</Link> (guia em inglês). Como
        remover um fundo à mão é explicado em{" "}
        <Link href="/make-background-transparent">deixar um fundo transparente</Link>.
      </p>
    </>
  ),
};

export default copy;
