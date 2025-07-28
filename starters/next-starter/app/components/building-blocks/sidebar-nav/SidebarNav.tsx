'use client';

import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SIDEBAR_LINKS } from '@/components/building-blocks/sidebar-nav/sidebar-links';

export default function SidebarNav() {
  const pathname = usePathname();
  return (
    <Sidebar variant="sidebar">
      <SidebarContent>
        <SidebarMenu className="p-2">
          {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton asChild isActive={pathname === href}>
                <Link href={href}>
                  {Icon && <Icon className="w-5 h-5" />} {label}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
