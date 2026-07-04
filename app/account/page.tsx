import { AppSidebar } from "@/components/app-sidebar";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { AccountSyncPanel } from "@/components/account/account-sync-panel";
import { TrialContactPanel } from "@/components/account/trial-contact-panel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth/helpers";

export const metadata = { title: "Account — Senex" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: user.name, email: user.email, avatar: user.image ?? "" }}
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
                  <BreadcrumbPage>Account</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle as="h1">Account profile</CardTitle>
              <CardDescription>
                Manage your signed-in account separately from research consent
                and local-only history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountProfileForm
                user={{
                  name: user.name,
                  email: user.email,
                  image: user.image ?? null,
                  role: user.role,
                }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Trial contact</CardTitle>
              <CardDescription>
                Manage whether approved teams may contact you about relevant
                studies or trials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrialContactPanel />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Local history import</CardTitle>
              <CardDescription>
                Import local history into your signed-in account only when you
                choose to.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountSyncPanel accountId={user.id} />
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
