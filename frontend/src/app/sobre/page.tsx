import Link from "next/link";
import { PageHead, Notice } from "@/components/shared";
export default function About() {
  return (
    <div className="container page prose-page">
      <PageHead
        eyebrow="CONSTRUIR COMEÇA POR OUVIR"
        title="Um espaço para a sua voz."
        description="A VozBrasil reúne opiniões voluntárias sobre serviços públicos, prioridades e propostas para melhorar o país."
      />
      <article className="card">
        <h2>Como funciona</h2>
        <p>
          Escolha uma pesquisa nacional, estadual, municipal ou temática.
          Informe sua localidade manualmente se ela for necessária para a
          pesquisa. Responda uma pergunta por vez, revise e confirme sua
          participação.
        </p>
        <h2>O que acontece com as respostas</h2>
        <p>
          As respostas são persistidas no banco e consolidadas em distribuições,
          médias de escalas e séries mensais. Textos livres ficam restritos à
          base e não são exibidos no painel público nem no CSV. Grupos pequenos
          são protegidos.
        </p>
        <h2>Ideias com responsabilidade</h2>
        <p>
          Propostas aguardam moderação humana. O administrador deve remover
          dados pessoais, spam, ofensas, discurso de ódio e conteúdo inadequado
          antes de aprovar. Conteúdos já publicados podem ser denunciados e
          ocultados.
        </p>
        <h2>Uma escuta aberta, com limites claros</h2>
        <p>
          Esta plataforma não realiza pesquisas eleitorais científicas. A
          participação é espontânea e as amostras não representam a população.
          Os resultados descrevem as respostas registradas nos filtros exibidos.
        </p>
        <Link className="button primary" href="/pesquisas">
          Encontrar uma pesquisa →
        </Link>
      </article>
      <Notice />
    </div>
  );
}
