import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Editor e conversor de WebP online grátis",
  description:
    "Abra, edite e exporte imagens WebP no navegador, ou converta WebP em PNG ou JPEG e vice-versa. Grátis, sem cadastro, e suas imagens nunca saem do dispositivo.",
  lead: "O Picstea abre imagens WebP no seu navegador, permite editá-las com camadas, texto e ajustes e exporta WebP, PNG ou JPEG. Use-o para converter arquivos WebP que você baixou ou para criar imagens WebP pequenas para o seu site. Nada é enviado.",
  faqs: [
    {
      q: "Como converto WebP em PNG ou JPEG?",
      a: "Abra o arquivo WebP no Picstea, escolha Arquivo → Exportar como… e selecione PNG ou JPEG. A conversão acontece no seu navegador.",
    },
    {
      q: "Como converto um PNG ou JPEG em WebP?",
      a: "Abra a imagem, escolha Arquivo → Exportar como…, selecione WebP e defina a qualidade. O WebP mantém a transparência, ao contrário do JPEG.",
    },
    {
      q: "Por que os arquivos WebP são menores?",
      a: "O WebP comprime imagens com mais eficiência que o JPEG e o PNG, então a mesma imagem geralmente precisa de menos bytes. Isso faz as páginas da web carregarem mais rápido.",
    },
    {
      q: "Minhas imagens são enviadas para serem convertidas?",
      a: "Não. Abrir, editar e converter acontece tudo no seu dispositivo. O Picstea não tem servidor que receba imagens.",
    },
    {
      q: "Posso editar arquivos WebP animados?",
      a: "Não. O Picstea abre uma imagem estática; arquivos WebP animados não são compatíveis como animações.",
    },
  ],
  body: () => (
    <>
      <h2>Converta ou edite uma imagem WebP</h2>
      <ol>
        <li>Abra o editor e solte o arquivo WebP na página.</li>
        <li>
          Edite-o se quiser: corte, redimensione, ajuste as cores, adicione texto ou remova manchas.
        </li>
        <li>
          Escolha Arquivo → Exportar como… e selecione o formato: WebP para imagens pequenas para a
          web, PNG para uma cópia sem perdas ou JPEG para a maior compatibilidade.
        </li>
        <li>Para WebP e JPEG, defina a qualidade e salve.</li>
      </ol>
      <h2>WebP, PNG ou JPEG?</h2>
      <ul>
        <li>
          <strong>WebP</strong> — arquivos pequenos com transparência. Compatível com todos os
          navegadores atuais; alguns apps mais antigos não conseguem abri-lo.
        </li>
        <li>
          <strong>PNG</strong> — sem perdas e com transparência, mas maior. Melhor para logotipos,
          ícones e capturas de tela.
        </li>
        <li>
          <strong>JPEG</strong> — fotos pequenas que abrem em qualquer lugar, sem transparência.
        </li>
      </ul>
      <p>
        O guia <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> (em inglês) compara
        os formatos em mais detalhes. Só precisa mudar o formato? Use o conversor{" "}
        <Link href="/convert/webp-to-png">WebP para PNG</Link> ou{" "}
        <Link href="/convert/png-to-webp">PNG para WebP</Link>.
      </p>
      <h2>O que você pode fazer com uma imagem WebP</h2>
      <ul>
        <li>
          Tudo o que o Picstea faz com qualquer imagem: camadas, máscaras, camadas de ajuste e
          filtros.
        </li>
        <li>Adicionar texto, formas e efeitos como sombras projetadas e traçados.</li>
        <li>
          Redimensionar com Imagem → Tamanho da imagem… antes de exportar um arquivo mais leve.
        </li>
        <li>
          Processar muitas imagens de uma vez: grave uma ação (por exemplo, Máscara de nitidez) e
          Arquivo → Automatizar → Lote… a executa nos arquivos que você escolher e os exporta como
          WebP em um único arquivo ZIP.
        </li>
      </ul>
      <h2>Limitações</h2>
      <p>
        As imagens podem ter até 12.000 pixels por lado (36 megapixels), e WebP animado não é
        compatível. Para reduzir ainda mais os arquivos, veja o guia do{" "}
        <Link href="/image-compressor">compressor de imagens</Link>.
      </p>
    </>
  ),
};

export default copy;
