'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { unitsApi } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import { Loader2 } from 'lucide-react';
import ProtectedSidebarLayout from '@/components/ProtectedSidebarLayout';

export default function SupervisorSelectionPage() {
    const { user, isLoading: authLoading } = useAuthContext();
    const [userUnits, setUserUnits] = useState<any[]>([]);
    const [unitsLoading, setUnitsLoading] = useState(false);
    const t = useTranslations('supervisor');
    const router = useRouter();

    // Load detailed unit info
    useEffect(() => {
        const loadUnits = async () => {
            setUnitsLoading(true);
            try {
                if (user?.units && user.units.length > 0) {
                    const data = await Promise.all(user.units.map((u: any) => unitsApi.getById(u.unitId)));
                    const normalized = data.map((u: any) => ({ unitId: u.id, unit: u }));
                    setUserUnits(normalized);
                } else {
                    setUserUnits([]);
                }
            } catch (err) {
                console.error('Failed to load user units:', err);
                setUserUnits([]);
            } finally {
                setUnitsLoading(false);
            }
        };
        loadUnits();
    }, [user?.units]);

    // Auto-redirect if only one unit
    useEffect(() => {
        if (!authLoading && !unitsLoading && userUnits.length === 1) {
            router.push(`/supervisor/${userUnits[0].unitId}`);
        }
    }, [userUnits, authLoading, unitsLoading, router]);

    if (authLoading || unitsLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return (
        <ProtectedSidebarLayout allowedRoles={['admin', 'supervisor']} requiredPermission="ACCESS_SUPERVISOR_PANEL">
            <div className="container mx-auto p-4 max-w-4xl">
                <h1 className="text-3xl font-bold mb-8 text-center">{t('title')}</h1>

                {/* Unit Selection */}
                {userUnits.length > 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('selectUnit')}</CardTitle>
                            <CardDescription>{t('selectUnitDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {userUnits.map((uu: any) => (
                                <Button
                                    key={uu.unitId}
                                    onClick={() => router.push(`/supervisor/${uu.unitId}`)}
                                    className="h-24 text-lg"
                                    variant="outline"
                                >
                                    {uu.unit?.name || uu.unitId}
                                </Button>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {userUnits.length === 0 && (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            {t('noUnitsAssigned')}
                        </CardContent>
                    </Card>
                )}
            </div>
        </ProtectedSidebarLayout>
    );
}
