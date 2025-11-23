'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { unitsApi, Unit } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';

export default function ScreenPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('screen');
  const router = useRouter();

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const data = await unitsApi.getAll();
        setUnits(data);
      } catch (error) {
        console.error('Failed to fetch units:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnits();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">{t('selectUnit')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.map((unit) => (
            <Card
              key={unit.id}
              className="cursor-pointer hover:shadow-lg transition-shadow border-primary/20 hover:border-primary"
              onClick={() => router.push(`/screen/${unit.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-xl text-center">{unit.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground">
                  {unit.code}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {units.length === 0 && (
          <div className="text-center text-muted-foreground mt-12">
            {t('noUnitsFound')}
          </div>
        )}
      </div>
    </div>
  );
}