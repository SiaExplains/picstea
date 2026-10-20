import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Editor de JPEG online grátis",
  description:
    "Edite fotos JPG e JPEG no navegador com camadas, ajustes, retoque e filtros, e exporte um JPEG na qualidade que você escolher. Grátis, nada é enviado.",
  lead: "O Picstea é um editor de JPEG grátis que roda no seu navegador. Abra uma foto JPG, corrija a luz e a cor com camadas de ajuste, retoque-a e exporte um novo JPEG na qualidade que você escolher. Suas fotos nunca saem do seu dispositivo.",
  faqs: [
    {
      q: "JPG é o mesmo que JPEG?",
      a: "Sim. JPG e JPEG são dois nomes para o mesmo formato. O Picstea abre os dois e salva as exportações com a extensão .jpg.",
    },
    {
      q: "Editar faz meu JPEG perder qualidade?",
      a: "Não enquanto você edita: o Picstea trabalha com os pixels decodificados, e as camadas de ajuste nunca alteram o original. A qualidade só é reduzida uma vez, quando você exporta um JPEG. Escolha uma qualidade alta (90 é o padrão) para mantê-lo nítido.",
    },
    {
      q: "Minhas fotos são enviadas?",
      a: "Não. As fotos são abertas, editadas e exportadas no seu dispositivo. O Picstea não tem servidor que receba suas imagens.",
    },
    {
      q: "A foto abre na posição certa?",
      a: "Sim. O Picstea segue a orientação que a câmera gravou no arquivo, então as fotos de celular abrem em pé.",
    },
    {
      q: "Um JPEG pode ter fundo transparente?",
      a: "Não, o formato não tem transparência, então as áreas transparentes ficam brancas na exportação. Exporte como PNG ou WebP para manter a transparência.",
    },
  ],
  body: () => (
    <>
      <h2>Edite um JPEG em quatro passos</h2>
      <ol>
        <li>Abra o editor e solte sua foto JPG ou JPEG na página.</li>
        <li>
          Corrija a exposição e a cor com Camada → Nova camada de ajuste: Níveis, Curvas,
          Brilho/contraste, Matiz/saturação, Vibratilidade ou Equilíbrio de cores. Ou use Filtro →
          Camera Raw para tudo em uma só caixa de diálogo.
        </li>
        <li>
          Remova manchas com o Pincel de recuperação para manchas ou o Carimbo, e corte ou endireite
          com a ferramenta Cortar.
        </li>
        <li>Escolha Arquivo → Exportar como…, selecione JPEG, defina a qualidade e salve.</li>
      </ol>
      <h2>O que você pode fazer com um JPEG</h2>
      <ul>
        <li>
          Corrigir a luz e a cor com camadas de ajuste que você pode alterar a qualquer momento.
        </li>
        <li>
          Retocar com o Pincel de recuperação, o Pincel de recuperação para manchas, o Carimbo,
          Olhos vermelhos, Subexposição, Superexposição e Esponja.
        </li>
        <li>Aumentar a nitidez, reduzir o ruído ou desfocar o fundo com o menu Filtro.</li>
        <li>Adicionar texto, formas, logotipos e marcas d&apos;água em camadas próprias.</li>
        <li>
          Redimensionar a foto com Imagem → Tamanho da imagem… ou adicionar uma borda com Tamanho da
          tela….
        </li>
        <li>
          Aplicar as mesmas edições a muitas fotos: grave uma ação e use Arquivo → Automatizar →
          Lote… para obter os resultados em um único arquivo ZIP.
        </li>
      </ul>
      <h2>Quando usar JPEG</h2>
      <p>
        O JPEG é o formato padrão para fotos: os arquivos são pequenos e qualquer dispositivo os
        abre. Para gráficos, texto ou transparência, use <Link href="/png-editor">PNG</Link>; para
        os menores arquivos em um site, experimente <Link href="/webp-editor">WebP</Link>. Para
        deixar um JPEG menor, veja o guia do{" "}
        <Link href="/image-compressor">compressor de imagens</Link> e, para comparar os formatos,
        leia <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> (em inglês). Para
        transformar um JPG em PNG sem editá-lo, use o conversor{" "}
        <Link href="/convert/jpg-to-png">JPG para PNG</Link>.
      </p>
      <h2>Limitações</h2>
      <p>
        As imagens podem ter até 12.000 pixels por lado (36 megapixels). Arquivos RAW de câmera
        ainda não podem ser abertos, e dados da câmera como a data e o local não são copiados para
        os arquivos exportados.
      </p>
    </>
  ),
};

export default copy;
