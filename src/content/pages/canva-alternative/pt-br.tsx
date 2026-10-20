import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea vs Canva: quando você precisa editar fotos",
  description:
    "O Canva serve para criar designs a partir de modelos; o Picstea, para editar fotos com camadas, máscaras e PSD, grátis e sem conta. Uma comparação honesta.",
  lead: "O Canva é uma plataforma de design para criar posts, apresentações e muito mais a partir de modelos. O Picstea é um editor de fotos: camadas, máscaras, camadas de ajuste, retoque e arquivos PSD, grátis no navegador, sem conta e sem nada enviado. Use o Canva para diagramar um design; use o Picstea quando a própria foto precisar de trabalho.",
  faqs: [
    {
      q: "O Picstea substitui o Canva?",
      a: "Não para tudo. O Canva é uma plataforma de design com modelos, apresentações, vídeo e colaboração em equipe. O Picstea é um editor de fotos: é a ferramenta melhor para retoque, edição com camadas e arquivos do Photoshop.",
    },
    {
      q: "Preciso de uma conta?",
      a: "Não para o Picstea. O Canva exige uma conta para criar e salvar designs, que ficam armazenados na nuvem do Canva.",
    },
    {
      q: "Posso usar os dois?",
      a: "Sim. Edite ou retoque uma foto no Picstea, exporte um PNG ou JPEG e envie-o ao Canva para a sua diagramação.",
    },
    {
      q: "Onde meus arquivos ficam armazenados?",
      a: "No Picstea, no seu próprio dispositivo: os projetos são salvos no navegador e as exportações vão para seus downloads. Nada é enviado.",
    },
  ],
  body: () => (
    <>
      <h2>Como eles diferem</h2>
      <ComparisonTable
        other="Canva"
        rows={[
          ["Feito para", "Editar fotos e imagens", "Criar designs a partir de modelos"],
          ["Conta", "Nenhuma", "Obrigatória"],
          [
            "Onde seu trabalho fica",
            "No seu dispositivo",
            "Na sua conta do Canva (5 GB no plano grátis)",
          ],
          ["Modelos", "Tamanhos de documento prontos", "Mais de um milhão de modelos"],
          [
            "Camadas e máscaras",
            "Fluxo completo com camadas, máscaras, modos de mesclagem",
            "Organizar elementos em uma página",
          ],
          [
            "Arquivos do Photoshop",
            "Abre e salva PSD com camadas",
            "Importa PSD no site para desktop; algumas partes viram imagens",
          ],
          ["Preço", "Grátis", "Plano grátis; planos pagos Pro, Business e Enterprise"],
        ]}
      />
      <h2>Quando o Picstea é a melhor opção</h2>
      <ul>
        <li>
          <strong>A foto precisa de edição:</strong> exposição, cor, curvas, retoque de
          imperfeições, nitidez, desfoque do fundo.
        </li>
        <li>
          <strong>Trabalho preciso:</strong> seleções, máscaras, modos de mesclagem e estilos de
          camada como no Photoshop.
        </li>
        <li>
          <strong>Privacidade:</strong> sem conta, e suas imagens nunca saem do seu dispositivo.
        </li>
        <li>
          <strong>Arquivos do Photoshop:</strong> abra um PSD com as camadas e o texto editável, e
          salve de novo um PSD com camadas.
        </li>
      </ul>
      <h2>Quando o Canva é a melhor opção</h2>
      <ul>
        <li>Posts, apresentações, panfletos e vídeos criados rapidamente a partir de modelos.</li>
        <li>Equipes trabalhando nos mesmos designs, com kits de marca e compartilhamento.</li>
        <li>Uma grande biblioteca de fotos de banco de imagens, gráficos e fontes.</li>
      </ul>
      <p>
        Muita gente usa os dois. Veja como{" "}
        <Link href="/add-text-to-photo">adicionar texto a uma foto</Link> ou{" "}
        <Link href="/blur-background">desfocar um fundo</Link> no Picstea.
      </p>
    </>
  ),
};

export default copy;
