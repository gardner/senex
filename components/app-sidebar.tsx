"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  BookOpenIcon,
  GalleryVerticalEndIcon,
  HomeIcon,
  ShieldCheckIcon,
} from "lucide-react";

// AIDEV-NOTE: The nav below is intentionally minimal placeholder content for
// the bootstrap app — replace it as real features appear. The signed-in user
// comes in as a prop from the server component (app/dashboard/page.tsx).
const baseData = {
  teams: [
    {
      name: "Senex",
      logo: <GalleryVerticalEndIcon />,
      plan: "Starter",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: <HomeIcon />,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
        },
        {
          title: "Account",
          url: "/account",
        },
      ],
    },
    {
      title: "Documentation",
      url: "/",
      icon: <BookOpenIcon />,
      items: [
        {
          title: "Getting started",
          url: "/",
        },
        {
          title: "Common commands",
          url: "/",
        },
      ],
    },
  ],
};

const adminNav = {
  title: "Admin",
  url: "/admin/ingestion/status",
  icon: <ShieldCheckIcon />,
  items: [
    {
      title: "Ingestion status",
      url: "/admin/ingestion/status",
    },
    {
      title: "Data quality",
      url: "/admin/data-quality",
    },
    {
      title: "Research export",
      url: "/admin/research-export",
    },
    {
      title: "Research exclusions",
      url: "/admin/research-exclusions",
    },
  ],
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar: string; role?: string | null };
}) {
  const navMain =
    user.role === "admin" ? [...baseData.navMain, adminNav] : baseData.navMain;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={baseData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
