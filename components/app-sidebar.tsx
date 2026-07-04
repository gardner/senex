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
import { GalleryVerticalEndIcon, HomeIcon, BookOpenIcon } from "lucide-react";

// AIDEV-NOTE: The nav below is intentionally minimal placeholder content for
// the bootstrap app — replace it as real features appear. The signed-in user
// comes in as a prop from the server component (app/dashboard/page.tsx).
const data = {
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

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar: string };
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
