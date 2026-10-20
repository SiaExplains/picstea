import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Comprimir uma imagem online sem enviá-la",
  description:
    "Deixe imagens menores no navegador redimensionando-as e exportando JPEG ou WebP com qualidade menor. Grátis, privado, e nada é enviado a um servidor.",
  lead: "O Picstea deixa imagens menores no seu navegador: redimensione-as para o tamanho de que você precisa e exporte-as como JPEG ou WebP com qualidade menor. Ao contrário da maioria dos compressores online, sua imagem nunca é enviada a um servidor.",
  faqs: [
    {
      q: "Qual qualidade devo escolher?",
      a: "Para fotos na web, 70–85 geralmente parece igual ao original com uma fração do tamanho. Vá abaixo disso só para miniaturas; confira o resultado antes de usar.",
    },
    {
      q: "O WebP é menor que o JPEG?",
      a: "Geralmente, sim: com a mesma qualidade visual, um arquivo WebP costuma ser bem menor que um JPEG, e pode manter a transparência.",
    },
    {
      q: "Posso comprimir um PNG?",
      a: "A exportação PNG é sempre sem perdas, então não tem ajuste de qualidade. Para deixar um PNG menor, redimensione-o ou exporte-o como WebP (que mantém a transparência) ou JPEG.",
    },
    {
      q: "Posso comprimir para um tamanho exato, como menos de 100 KB?",
      a: "Não automaticamente. O Picstea não tem ajuste de tamanho-alvo e não mostra o tamanho do arquivo antes de salvar; diminua a qualidade ou as dimensões e exporte de novo até caber.",
    },
    {
      q: "É privado?",
      a: "Sim. A compressão acontece no seu navegador. Ao contrário da maioria dos compressores online, o Picstea nunca envia sua imagem a um servidor.",
    },
  ],
  body: () => (
    <>
      <h2>Comprima uma imagem em quatro passos</h2>
      <ol>
        <li>Abra o editor e solte sua imagem na página.</li>
        <li>
          Se ela for maior do que você precisa, escolha Imagem → Tamanho da imagem… e reduza a
          largura. Reduzir a largura pela metade reduz o número de pixels a um quarto, que é a maior
          economia.
        </li>
        <li>
          Escolha Arquivo → Exportar como… e selecione JPEG (fotos) ou WebP (fotos e gráficos).
        </li>
        <li>Diminua o controle de qualidade, por exemplo para 80, e salve.</li>
      </ol>
      <h2>O que deixa um arquivo de imagem menor</h2>
      <ul>
        <li>
          <strong>Menos pixels.</strong> Uma foto de celular com 4.000 pixels de largura exibida com
          1.200 pixels de largura em um site desperdiça a maior parte dos bytes.
        </li>
        <li>
          <strong>Formatos com perdas.</strong> JPEG e WebP descartam detalhes que o olho mal
          percebe. O ajuste de qualidade (1–100, padrão 90) controla o quanto.
        </li>
        <li>
          <strong>O formato certo.</strong> Fotos como JPEG ou WebP; logotipos e capturas de tela
          como PNG ou WebP. Uma foto salva como PNG costuma ser várias vezes maior que a mesma foto
          como JPEG.
        </li>
      </ul>
      <h2>Por que comprimir no navegador</h2>
      <p>
        A maioria dos compressores de imagem envia seu arquivo para o servidor deles, processa lá e
        manda de volta. O Picstea faz o trabalho no seu próprio dispositivo, então fotos pessoais,
        documentos e capturas de tela continuam privados, e ele funciona offline depois que o app é
        instalado.
      </p>
      <h2>Limitações</h2>
      <p>
        O Picstea é um editor de imagens, não um otimizador dedicado: não tem otimizador de PNG sem
        perdas, nem tamanho de arquivo alvo, nem prévia do tamanho do arquivo antes de salvar. Para
        comprimir muitas imagens de uma vez, grave uma ação e use Arquivo → Automatizar → Lote… para
        exportá-las como JPEG ou WebP em um único arquivo ZIP (o processamento em lote ainda não
        redimensiona). Saiba mais sobre <Link href="/docs/file-formats">formatos de arquivo</Link>{" "}
        (em inglês).
      </p>
    </>
  ),
};

export default copy;
