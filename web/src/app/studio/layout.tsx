import { Header } from "@/components/site/Header";

export default function StudioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div data-surface="studio">
      <Header variant="studio" />
      <main id="main">{children}</main>
    </div>
  );
}
