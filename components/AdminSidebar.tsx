'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Building,
  Users,
  Settings,
  Grid3X3,
  Menu,
  Mail,
  MessageSquare
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/src/i18n/navigation';

interface AdminSidebarProps {
  className?: string;
}

export default function AdminSidebar({ className }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('admin');
  const pathname = usePathname();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const isActive = (path: string) => pathname.includes(path);

  const navItems = [
    {
      icon: LayoutDashboard,
      label: t('navigation.dashboard', { defaultValue: 'Dashboard' }),
      href: '/admin',
      active: isActive('/admin') && !isActive('/units') && !isActive('/grid-configuration')
    },
    {
      icon: Building,
      label: t('navigation.units', { defaultValue: 'Units' }),
      href: '/admin/units',
      active: isActive('/units')
    },
    {
      icon: Users,
      label: t('navigation.users', { defaultValue: 'Users' }),
      href: '/admin/users',
      active: isActive('/users')
    },
    {
      icon: Grid3X3,
      label: t('navigation.grid_configuration', { defaultValue: 'Grid Configuration' }),
      href: '/admin/grid-configuration',
      active: isActive('/grid-configuration')
    },
    {
      icon: Mail,
      label: t('navigation.invitations', { defaultValue: 'Invitations' }),
      href: '/admin/invitations',
      active: isActive('/invitations')
    },
    {
      icon: MessageSquare,
      label: t('navigation.templates', { defaultValue: 'Templates' }),
      href: '/admin/templates',
      active: isActive('/templates')
    },
    {
      icon: Settings,
      label: t('navigation.settings', { defaultValue: 'Settings' }),
      href: '/admin/settings',
      active: isActive('/settings')
    },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={toggleSidebar}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 transition-transform duration-300 ease-in-out ${className}`}
      >
        <div className="flex items-center justify-center h-16 border-b">
          <span className="text-xl font-semibold">Admin Panel</span>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={item.active ? "secondary" : "ghost"}
                  className={`w-full justify-start ${item.active ? 'bg-accent border-r-2 border-primary' : ''
                    }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}