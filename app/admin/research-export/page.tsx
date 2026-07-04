import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { listResearchExports } from "@/lib/admin/research-export";
import { requireAdmin } from "@/lib/auth/helpers";

import { ResearchExportView } from "./view";

export const metadata = { title: "Research Export - Senex" };

export default async function AdminResearchExportPage() {
  const user = await requireAdmin();
  const exports = await listResearchExports();

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          avatar: user.image ?? "",
          role: user.role,
        }}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Research export</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <section className="space-y-1">
            <h1 className="text-2xl font-medium tracking-normal">
              Research export
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Create approved anonymous research datasets with stored manifests.
              Exports apply consent, date, study, and withdrawal filters before
              records are returned.
            </p>
          </section>
          <ResearchExportView initialExports={exports} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
