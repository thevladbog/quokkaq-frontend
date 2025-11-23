'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnits } from '@/lib/hooks';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import { useLocale } from 'next-intl';
import KioskLanguageSwitcher from '@/components/KioskLanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';

export default function KioskPage() {
  const { data: units = [], isLoading: unitsLoading, error: unitsError } = useUnits();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('kiosk');

  if (unitsLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm mt-1">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          <div className="flex space-x-2">
            <KioskLanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (unitsError) {
    return (
      <div className="min-h-screen flex flex-col bg-background p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm mt-1">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          <div className="flex space-x-2">
            <KioskLanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">{t('errorLoadingUnits', { defaultValue: 'Error Loading Units' })}</h2>
            <p className="text-muted-foreground mb-4">{(unitsError as Error).message}</p>
            <Button onClick={() => router.refresh()}>
              {t('retry', { defaultValue: 'Retry' })}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleUnitSelect = (unitId: string) => {
    router.push(`/kiosk/${unitId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-sm mt-1">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        <div className="flex space-x-2">
          <KioskLanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <div className="flex-1">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">{t('kioskTitle', { defaultValue: 'Kiosk' })}</h1>
          <p className="text-muted-foreground">{t('selectUnit', { defaultValue: 'Please select a unit' })}</p>
        </div>

        {units.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">{t('noUnitsAvailable', { defaultValue: 'No Units Available' })}</h2>
              <p className="text-muted-foreground">{t('noUnitsMessage', { defaultValue: 'There are no units available at this location.' })}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {units.map((unit) => (
              <Card
                key={unit.id}
                className="cursor-pointer transition-all hover:shadow-lg h-32 flex flex-col"
                onClick={() => handleUnitSelect(unit.id)}
              >
                <CardHeader className="flex-1 flex items-center justify-center">
                  <CardTitle className="text-xl text-center">{unit.name}</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 text-center">
                  <Button variant="outline" className="w-full">
                    {t('selectUnitButton', { defaultValue: 'Select Unit' })}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}