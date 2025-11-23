'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/navigation';

import { Button } from '@/components/ui/button';

interface KioskLanguageSwitcherProps {
  className?: string;
}

export default function KioskLanguageSwitcher({ className }: KioskLanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('kiosk');

  const switchLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Button
      variant={'default'}
      onClick={() => switchLanguage(locale === 'en' ? 'ru' : 'en')}
      className={`font-bold ${className}`}
    >
      {locale === 'en' ? 'EN' : 'RU'}
    </Button>
  );
}