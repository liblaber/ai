import { House, LucideProps } from 'lucide-react';
import * as react from 'react';

export type SidebarLink = {
  href: string;
  label: string;
  icon?: react.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & react.RefAttributes<SVGSVGElement>>;
};

export const SIDEBAR_LINKS: SidebarLink[] = [
  {
    href: '/',
    label: 'Home',
    icon: House,
  },
];
