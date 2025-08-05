'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SIDEBAR_LINKS } from '@/components/building-blocks/sidebar-nav/sidebar-links';
import React from 'react';
import { Button } from '@/components/ui/button';

export default function SidebarNav() {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (prefersDark) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleSidebarClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on menu items or trigger button
    if (e.target instanceof Element) {
      const isMenuButton = e.target.closest('[data-sidebar="menu-button"]');
      const isTriggerButton = e.target.closest('button');

      if (isMenuButton || isTriggerButton) {
        return;
      }
    }

    toggleSidebar();
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarContent onClick={handleSidebarClick}>
        <SidebarMenu className="p-2">
          {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton asChild isActive={pathname === href}>
                    <Link href={href}>
                      {Icon && <Icon className="w-5 h-5" />} {label}
                    </Link>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" hidden={state !== 'collapsed'}>
                  {label}
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={toggleTheme}>
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
          <SidebarMenuItem className="hidden md:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" onClick={toggleSidebar}>
                  {state === 'expanded' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                {state === 'expanded' ? 'Collapse' : 'Expand'}
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
