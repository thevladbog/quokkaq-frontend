'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../src/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import {
  LayoutDashboard,
  Users,
  Monitor,
  MonitorSpeaker,
  Loader2,
  ClipboardList
} from 'lucide-react';
import Image from 'next/image';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const t = useTranslations('home');
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Don't render anything while redirecting
  }

  // Helper to check if user has specific permission in ANY unit
  const hasPermissionInAnyUnit = (permission: string) => {
    if (!user?.permissions) return false;
    return Object.values(user.permissions).some((perms: any) => perms.includes(permission));
  };

  const hasRole = (role: string) => user?.roles?.includes(role);
  const isAdmin = hasRole('admin');

  const menuItems = [
    {
      href: "/admin",
      title: t('admin'),
      description: t('admin_description', { defaultValue: 'Manage system settings and services' }),
      icon: LayoutDashboard,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      disabled: !isAdmin
    },
    {
      href: "/staff",
      title: t('staff'),
      description: t('staff_description', { defaultValue: 'Access staff panel and controls' }),
      icon: Users,
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      disabled: !isAdmin && !hasRole('staff') && !hasPermissionInAnyUnit('ACCESS_STAFF_PANEL')
    },
    {
      href: "/supervisor",
      title: t('supervisor', { defaultValue: 'Supervisor' }),
      description: t('supervisor_description', { defaultValue: 'Monitor unit performance and queues' }),
      icon: ClipboardList,
      color: "bg-indigo-500",
      hoverColor: "hover:bg-indigo-600",
      disabled: !isAdmin && !hasRole('supervisor') && !hasPermissionInAnyUnit('ACCESS_SUPERVISOR_PANEL')
    },
    {
      href: "/kiosk",
      title: t('kiosk'),
      description: t('kiosk_description', { defaultValue: 'Customer kiosk and ticketing' }),
      icon: Monitor,
      color: "bg-orange-500",
      hoverColor: "hover:bg-orange-600",
      disabled: !isAdmin && !hasPermissionInAnyUnit('ACCESS_KIOSK')
    },
    {
      href: "/screen",
      title: t('screen'),
      description: t('screen_description', { defaultValue: 'Public queue display screen' }),
      icon: MonitorSpeaker,
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      disabled: !isAdmin && !hasPermissionInAnyUnit('ACCESS_TICKET_SCREEN')
    },
  ];

  return (
    <div className="flex flex-col bg-background" style={{ height: '100%' }}>
      <div className="flex flex-col items-center justify-center flex-shrink-0 py-3">
        <div className="text-center mb-3">
          <div className="relative w-64 h-20 mb-4">
            <Image
              src="/logo-text.svg"
              alt={t('title')}
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-sm md:text-base text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center px-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-5xl">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const CardComponent = (
              <Card className={`h-48 sm:h-48 flex flex-col items-center justify-center p-4 transition-all duration-200 transform ${item.disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : `cursor-pointer hover:scale-[1.02] hover:shadow-lg ${item.hoverColor}`} touch-manipulation`}>
                <CardContent className="flex flex-col items-center justify-center text-center w-full h-full p-4 py-6">
                  <div className={`${item.disabled ? 'bg-gray-400' : item.color} rounded-full p-4 mb-2`}>
                    <Icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-center text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            );

            return item.disabled ? (
              <div key={index} className="block">
                {CardComponent}
              </div>
            ) : (
              <Link key={index} href={item.href} className="block">
                {CardComponent}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
