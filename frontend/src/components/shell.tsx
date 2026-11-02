"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, AudioLines, Menu, Moon, Sun, X } from "lucide-react";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <AudioLines size={25} />
      </span>
      <span>
        voz<span className="brand-light">brasil</span>
        <span className="brand-dot">.</span>
      </span>
    </span>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const enabled = localStorage.getItem("vb-theme") === "dark";
    setDark(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);
  function toggle() {
    setDark(!dark);
    document.documentElement.classList.toggle("dark", !dark);
    localStorage.setItem("vb-theme", !dark ? "dark" : "light");
  }
  const links = [
    ["/pesquisas", "Pesquisas"],
    ["/dados", "Brasil em Dados"],
    ["/mapa", "Mapa do Brasil"],
    ["/ideias", "Ideias da comunidade"],
  ];
  return (
    <>
      <a href="#conteudo" className="skip">
        Pular para o conteúdo
      </a>
      <header className="header">
        <div className="nav-wrap">
          <Link href="/" aria-label="VozBrasil, início">
            <Brand />
          </Link>
          <nav
            aria-label="Menu principal"
            className={menu ? "nav open" : "nav"}
          >
            {links.map(([href, label]) => (
              <Link
                onClick={() => setMenu(false)}
                className={pathname.startsWith(href) ? "active" : ""}
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <button
              className="icon-button"
              onClick={toggle}
              aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link className="button primary nav-cta" href="/pesquisas">
              Quero participar <ArrowUpRight size={16} />
            </Link>
            <button
              className="icon-button menu-toggle"
              aria-label="Abrir menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="conteudo">{children}</main>
      <footer className="footer">
        <div className="container footer-top">
          <div>
            <Link href="/">
              <Brand />
            </Link>
            <p>O futuro do Brasil começa com a sua voz.</p>
            <span className="footer-note">
              Uma plataforma de escuta. Muitas possibilidades de mudança.
            </span>
          </div>
          <div>
            <strong>Explore</strong>
            <Link href="/pesquisas">Participar de pesquisas</Link>
            <Link href="/dados">Explorar resultados</Link>
            <Link href="/comparar">Comparar regiões</Link>
          </div>
          <div>
            <strong>Transparência</strong>
            <Link href="/sobre">Como funciona</Link>
            <Link href="/privacidade">Privacidade e metodologia</Link>
            <Link href="/admin">Área administrativa</Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>VozBrasil · Participação cidadã independente</span>
          <span>Escuta aberta. Dados com responsabilidade.</span>
        </div>
      </footer>
    </>
  );
}
