import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Layout for the public pages (home, sign-in, sign-up). The dashboard has
// its own sidebar shell instead.
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
