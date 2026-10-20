import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: uma alternativa ao Photoshop Express",
  description:
    "O Photoshop Express é um app de edição rápida; o Picstea, um editor grátis no navegador com camadas, máscaras e PSD em qualquer computador. Comparação honesta.",
  lead: "O Photoshop Express é o app grátis da Adobe para correções rápidas de fotos em dispositivos móveis e no Windows. Quando uma correção rápida não basta, o Picstea oferece um editor completo com camadas, como o Photoshop — grátis, em qualquer navegador, sem nada para instalar e sem nada enviado.",
  faqs: [
    {
      q: "Qual é a diferença entre o Photoshop Express e o Picstea?",
      a: "O Photoshop Express é o app da Adobe para edições rápidas de fotos, disponível para iOS, Android e Windows. O Picstea roda em qualquer navegador e funciona como o Photoshop completo, com camadas, camadas de ajuste, máscaras e arquivos PSD.",
    },
    {
      q: "O Picstea é grátis?",
      a: "Sim, totalmente: sem plano premium, sem conta e sem marca d'água. O Photoshop Express é grátis para baixar, com recursos premium para edições avançadas.",
    },
    {
      q: "O Picstea funciona em um Mac ou Chromebook?",
      a: "Sim. Ele roda em qualquer navegador atual no Windows, macOS, Linux e ChromeOS.",
    },
    {
      q: "O Picstea funciona no meu celular?",
      a: "Ele abre em celulares e o layout se adapta, mas foi pensado para mouse ou trackpad e teclado. Para edições rápidas no celular, o Photoshop Express é a melhor opção.",
    },
  ],
  body: () => (
    <>
      <h2>Como eles diferem</h2>
      <ComparisonTable
        other="Photoshop Express"
        rows={[
          ["Onde roda", "Qualquer navegador atual", "Apps para iOS, Android e Windows"],
          [
            "Feito para",
            "Edição detalhada com camadas",
            "Edições rápidas para fotografia no celular",
          ],
          [
            "Preço",
            "Grátis, nada para desbloquear",
            "Download grátis; recursos premium para edições avançadas",
          ],
          [
            "Estilo de edição",
            "Camadas completas, máscaras, camadas de ajuste, estilos de camada",
            "Correções inteligentes, mascaramento automático e ferramentas de um toque",
          ],
          ["Fotos de", "Seu dispositivo", "Seu dispositivo, Google Fotos, Dropbox e Facebook"],
        ]}
      />
      <h2>Quando o Picstea é a melhor opção</h2>
      <ul>
        <li>Você quer trabalhar com camadas, máscaras, seleções e camadas de ajuste.</li>
        <li>Você precisa abrir ou entregar um arquivo do Photoshop com camadas.</li>
        <li>Você usa Mac, um computador Linux ou um Chromebook, ou não pode instalar apps.</li>
        <li>Você quer tudo grátis, sem recursos premium nem conta.</li>
      </ul>
      <h2>Quando o Photoshop Express é a melhor opção</h2>
      <ul>
        <li>Correções e visuais rápidos no celular, logo depois de tirar a foto.</li>
        <li>Correções inteligentes de um toque e mascaramento automático.</li>
        <li>Puxar fotos direto do Google Fotos, Dropbox ou Facebook.</li>
      </ul>
      <p>
        Indo além das edições rápidas? Compare o Picstea com o{" "}
        <Link href="/photoshop-alternative">Photoshop completo</Link> ou comece pelo{" "}
        <Link href="/docs/getting-started">guia de primeiros passos</Link> (em inglês).
      </p>
    </>
  ),
};

export default copy;
