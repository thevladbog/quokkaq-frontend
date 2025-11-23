'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Ticket, ticketsApi, unitsApi, Unit } from '@/lib/api';
import { useUnit } from '@/lib/hooks';
import { socketClient } from '@/lib/socket';
import { AdsPanel } from '@/components/screen/ads-panel';
import { AdPlayer } from '@/components/screen/ad-player';
import { CalledTicketsTable } from '@/components/screen/called-tickets-table';
import { QueueTicker } from '@/components/screen/queue-ticker';
import { CallNotification } from '@/components/screen/call-notification';
import { Spinner } from '@/components/ui/spinner';

interface ScreenUnitClientProps {
    unitId: string;
}

export function ScreenUnitClient({ unitId }: ScreenUnitClientProps) {
    const t = useTranslations('screen');

    // const [unit, setUnit] = useState<Unit | null>(null); // Removed in favor of useUnit hook
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [materials, setMaterials] = useState<any[]>([]);

    // State for call notification
    const [lastCalledTicket, setLastCalledTicket] = useState<Ticket | null>(null);
    const [showingNotification, setShowingNotification] = useState<Ticket | null>(null);

    // Use useUnit hook with polling
    const { data: unit, isLoading: isUnitLoading } = useUnit(unitId, { refetchInterval: 120000 });

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // WebSocket Connection
    useEffect(() => {
        if (!unitId) return;

        // Initial fetch
        const fetchTickets = async () => {
            try {
                const data = await ticketsApi.getByUnitId(unitId);
                setTickets(data);
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to fetch tickets:', error);
            }
        };
        fetchTickets();

        socketClient.connect(unitId);

        const handleTicketUpdate = (data: any) => {
            // For simplicity, we can just re-fetch tickets on any update
            // Or we could optimistically update the state if the payload contains the ticket
            // Given the logic below relies on sorting and filtering, re-fetching is safer and easier
            // unless performance becomes an issue.
            // However, to be truly "real-time" and avoid race conditions with fetch, 
            // let's try to use the data if available, or just fetch.
            // The previous implementation just re-fetched. Let's stick to that for consistency with Staff Panel.
            fetchTickets();

            // If it's a "called" event, we might want to trigger the notification immediately
            // The existing logic inside fetchTickets handles this by comparing with lastCalledTicket
            // So re-fetching is fine.
        };

        socketClient.onTicketCreated(handleTicketUpdate);
        socketClient.onTicketUpdated(handleTicketUpdate);
        socketClient.onTicketCalled(handleTicketUpdate);
        // socketClient.onQueueSnapshot(handleQueueSnapshot); // If backend sends snapshots

        return () => {
            socketClient.off('ticket.created', handleTicketUpdate);
            socketClient.off('ticket.updated', handleTicketUpdate);
            socketClient.off('ticket.called', handleTicketUpdate);
            socketClient.disconnect();
        };
    }, [unitId]);

    // Fetch materials
    useEffect(() => {
        let isMounted = true;

        const fetchMaterials = async () => {
            try {
                const allMaterials = await unitsApi.getMaterials(unitId);
                if (isMounted && unit) {
                    const adConfig = (unit.config as any)?.adScreen;
                    const activeIds = adConfig?.activeMaterialIds || [];

                    // Filter materials if activeIds is defined and not empty
                    // If activeIds is empty/undefined, maybe show none? Or all?
                    // Usually "active" implies selection. If none selected, show none.
                    // But let's check if activeIds exists.

                    const filtered = allMaterials.filter((m: any) => activeIds.includes(m.id));
                    setMaterials(filtered);
                }
            } catch (error) {
                console.error('Failed to fetch materials:', error);
            }
        };

        if (unit) {
            fetchMaterials();
        }

        // Poll materials every minute to keep in sync with active/inactive changes if needed, 
        // or just rely on unit config changes triggering re-fetch if we add unit to dependency.
        // But unit config change comes from useUnit polling.
        // If unit changes, we should re-filter.
        // If materials change (uploaded/deleted), we might need to poll materials too.
        const interval = setInterval(fetchMaterials, 60000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [unitId, unit]);

    // Callback for notification completion
    const handleNotificationComplete = useCallback(() => {
        setShowingNotification(null);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <Spinner className="w-12 h-12" />
            </div>
        );
    }

    if (isUnitLoading || !unit) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                {isUnitLoading ? <Spinner className="w-12 h-12" /> : <h1 className="text-2xl">{t('unitNotFound')}</h1>}
            </div>
        );
    }

    const calledTicketsRaw = tickets
        .filter(t => t.status === 'called' || t.status === 'in_service' || t.status === 'served')
        .sort((a, b) => new Date(b.calledAt || 0).getTime() - new Date(a.calledAt || 0).getTime());

    // Filter to keep only the latest ticket per counter
    const uniqueCounterTickets = new Map<string, string>(); // counterId -> ticketId
    const calledTickets = calledTicketsRaw.filter(t => {
        if (!t.counter?.id) return false;
        if (uniqueCounterTickets.has(t.counter.id)) return false;
        uniqueCounterTickets.set(t.counter.id, t.id);
        return true;
    });

    const waitingTickets = tickets
        .filter(t => t.status === 'waiting')
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    const adConfig = (unit.config as any)?.adScreen;
    const showAds = adConfig && adConfig.width > 0 && materials.length > 0;
    const adWidth = adConfig?.width || 0;
    const tableWidth = 100 - adWidth;

    // Custom colors
    const isCustomColorsEnabled = adConfig?.isCustomColorsEnabled || false;
    const headerColor = isCustomColorsEnabled ? (adConfig?.headerColor || '') : '';
    const bodyColor = isCustomColorsEnabled ? (adConfig?.bodyColor || '') : '';

    return (
        <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden" style={{ backgroundColor: bodyColor || undefined }}>
            {/* Top Bar: Unit Name + Date/Time */}
            <div className="flex-none h-20 bg-card border-b flex items-center justify-between px-8 shadow-sm z-10" style={{ backgroundColor: headerColor || undefined }}>
                <div className="flex items-center gap-4">
                    {((unit.config as any)?.adScreen?.logoUrl || (unit.config as any)?.logoUrl) && (
                        <div className="relative h-12 md:h-16 w-auto">
                            <img
                                src={(unit.config as any)?.adScreen?.logoUrl || (unit.config as any)?.logoUrl}
                                alt="Logo"
                                className="h-full w-auto object-contain"
                            />
                        </div>
                    )}
                    <h1 className="text-4xl font-bold text-primary">{unit.name}</h1>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-mono font-bold">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-lg text-muted-foreground">
                        {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Main Content: Dynamic Layout */}
            <div
                className="flex-1 flex flex-col landscape:flex-row overflow-hidden"
                style={{
                    '--ad-size': `${adWidth}%`
                } as React.CSSProperties}
            >
                {/* Ad Container */}
                {showAds && (
                    <div
                        className="bg-muted/10 order-2 landscape:order-1 border-t landscape:border-t-0 landscape:border-r p-4 w-full h-[var(--ad-size)] landscape:w-[var(--ad-size)] landscape:h-full"
                    >
                        <div className="w-full h-full relative">
                            <AdPlayer
                                materials={materials}
                                duration={adConfig.duration || 5}
                            />
                        </div>
                    </div>
                )}

                {/* Tickets Container */}
                <div className={`bg-background order-1 landscape:order-2 p-0 ${showAds ? 'w-full h-[calc(100%-var(--ad-size))] landscape:w-[calc(100%-var(--ad-size))] landscape:h-full' : 'w-full h-full'}`}>
                    <CalledTicketsTable tickets={calledTickets} backgroundColor={bodyColor} />
                </div>
            </div>

            {/* Bottom: Ticker */}
            <div className="flex-none z-20">
                <QueueTicker tickets={waitingTickets} />
            </div>

            {/* Notification Overlay */}
            <CallNotification
                ticket={showingNotification}
                onComplete={handleNotificationComplete}
            />
        </div>
    );
}
