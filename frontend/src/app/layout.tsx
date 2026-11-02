import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {
  title: {
    default: "VozBrasil — O futuro começa com a sua voz",
    template: "%s | VozBrasil",
  },
  description:
    "Participe de pesquisas públicas, proponha melhorias e explore opiniões registradas no Brasil. Participação anônima e voluntária.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
