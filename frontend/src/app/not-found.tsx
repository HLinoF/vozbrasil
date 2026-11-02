import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container page empty">
      <span className="eyebrow">404</span>
      <h1>Esse caminho ainda não existe.</h1>
      <p>Volte para o início e encontre uma conversa para participar.</p>
      <Link className="button primary" href="/">
        Ir para o início
      </Link>
    </div>
  );
}
