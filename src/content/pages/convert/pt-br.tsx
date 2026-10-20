import { ConverterList } from "@/components/site/ConverterList";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Conversor de imagens grátis que nunca envia nada",
  description:
    "Converta imagens HEIC, WebP, PNG, JPG, SVG e PSD em PNG, JPG ou WebP no navegador. Grátis, sem cadastro, em lote; os arquivos nunca saem do seu dispositivo.",
  lead: "O Picstea converte imagens entre PNG, JPG e WebP — e transforma fotos HEIC do iPhone, SVG e arquivos PSD do Photoshop em JPG ou PNG — direto no seu navegador. Escolha um conversor abaixo ou abra o conversor diretamente; seus arquivos nunca saem do seu dispositivo.",
  faqs: [
    {
      q: "Quais formatos posso converter?",
      a: "O Picstea lê arquivos PNG, JPEG, WebP, GIF (primeiro quadro), SVG, HEIC (fotos do iPhone) e PSD e os converte em PNG, JPG ou WebP.",
    },
    {
      q: "Meus arquivos são enviados?",
      a: "Não. A conversão acontece no seu navegador, no editor do Picstea, que não tem servidor que receba arquivos. Nada é salvo no navegador também.",
    },
    {
      q: "Quantos arquivos posso converter de uma vez?",
      a: "Até 200. Um arquivo é salvo diretamente; vários são salvos juntos em um único arquivo ZIP.",
    },
    {
      q: "Existe limite de tamanho?",
      a: "Os arquivos podem ter até 200 MB e as imagens até 12.000 pixels por lado (36 megapixels).",
    },
  ],
  body: () => (
    <>
      <h2>Conversores</h2>
      <ConverterList />
      <h2>Por que converter no navegador?</h2>
      <p>
        A maioria dos conversores online envia sua imagem para um servidor, converte lá e a manda de
        volta. O Picstea faz o trabalho no seu próprio computador ou celular, então fotos pessoais e
        arquivos de trabalho continuam privados, e ele continua funcionando offline depois de
        instalado como app.
      </p>
      <p>
        Precisa mudar a imagem também? Abra-a no editor, edite e use Arquivo → Exportar como…. No
        editor, Arquivo → Converter… abre o mesmo conversor.
      </p>
    </>
  ),
};

export default copy;
