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
import { listResearchExclusionEvents } from "@/lib/admin/research-exclusions";
import { requireAdmin } from "@/lib/auth/helpers";

import { ResearchExclusionsView } from "./view";

export const metadata = { title: "Research Exclusions - Senex" };

export default async function AdminResearchExclusionsPage() {
  const user = await requireAdmin();
  const events = await listResearchExclusionEvents();

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
                  <BreadcrumbPage>Research exclusions</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <section className="space-y-1">
            <h1 className="text-2xl font-medium tracking-normal">
              Research exclusions
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Mark anonymous submissions out of future research datasets while
              preserving an audit trail for the change.
            </p>
          </section>
          <ResearchExclusionsView initialEvents={events} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
