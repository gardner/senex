import { env } from "cloudflare:workers";

import { AppSidebar } from "@/components/app-sidebar";
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

export const metadata = { title: "Dashboard — Senex" };

export default async function DashboardPage() {
  // Redirects to /sign-in when there is no session.
  const user = await requireUser();
  const appEnv = env.APP_ENV || "production";

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
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Signed in as</CardTitle>
                <CardDescription>Your account</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">{user.name}</p>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-muted-foreground mt-1">
                  role: {user.role ?? "user"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Environment</CardTitle>
                <CardDescription>Where this app is running</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-mono">{appEnv}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Deployment</CardTitle>
                <CardDescription>Current version</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                {/* AIDEV-TODO: surface the real deployment version once
                    GitHub → Cloudflare Workers Builds is connected. */}
                <p className="font-mono">v0.1.0 (placeholder)</p>
              </CardContent>
            </Card>
          </div>
          <div className="bg-muted/50 min-h-[40vh] flex-1 rounded-xl p-6 text-sm">
            <p className="font-medium">This dashboard is a starting point.</p>
            <p className="text-muted-foreground mt-2 max-w-prose">
              It proves that sign-in works and that the app can read who you are
              on the server. Build real features here, one small pull request at
              a time.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
