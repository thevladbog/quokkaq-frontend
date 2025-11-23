'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    useTickets,
    useCompleteTicket,
    useNoShowTicket,
    useRecallTicket,
    useCallNextTicket,
    useTransferTicket,
    useCounters,
    usePickTicket,
    useConfirmArrivalTicket,
    useUnitServices,
} from '@/lib/hooks';
import { countersApi, unitsApi, servicesApi } from '@/lib/api';
import { socketClient } from '@/lib/socket';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, ArrowRightLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useTicketTimer } from '@/lib/ticket-timer';

interface StaffWorkspacePageProps {
    params: Promise<{
        unitId: string;
        counterId: string;
        locale: string;
    }>;
}

export default function StaffWorkspacePage({ params }: StaffWorkspacePageProps) {
    const { unitId, counterId } = use(params);
    const t = useTranslations('staff');
    const router = useRouter();
    const [inProgressTicketId, setInProgressTicketId] = useState<string | null>(null);

    // Fetch Unit Info for display
    const { data: unit } = useQuery({
        queryKey: ['unit', unitId],
        queryFn: () => unitsApi.getById(unitId),
    });

    // Fetch Counter Info for display
    const { data: counters } = useQuery({
        queryKey: ['counters', unitId],
        queryFn: () => countersApi.getByUnitId(unitId),
    });
    const counterName = counters?.find(c => c.id === counterId)?.name || counterId;

    // Ticket Hooks
    const { data: tickets = [], isLoading, error, refetch } = useTickets(unitId, {
        enabled: !!unitId,
    });
    const completeMutation = useCompleteTicket();
    const noShowMutation = useNoShowTicket();
    const callNextMutation = useCallNextTicket();
    const transferMutation = useTransferTicket();
    const recallMutation = useRecallTicket();
    const pickMutation = usePickTicket();
    const confirmArrivalMutation = useConfirmArrivalTicket();

    const createTicketMutation = useMutation({
        mutationFn: (serviceId: string) => unitsApi.createTicket(unitId, { serviceId }),
        onSuccess: () => {
            toast.success(t('messages.ticketCreated'));
            refetch();
        },
        onError: (error: Error) => {
            toast.error(t('messages.failed', { action: 'create ticket' }));
        }
    });

    const queryClient = useQueryClient();

    // Logout / Release Mutation
    const releaseMutation = useMutation({
        mutationFn: () => countersApi.release(counterId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['counters'] });
            router.push('/staff');
        },
        onError: (error: Error) => {
            console.error('Failed to release counter:', error);
            toast.error(`Failed to logout: ${error.message}`);
        }
    });

    const currentTicket = tickets.find(ticket => ticket.status === 'called' || ticket.status === 'in_service');
    const waitingTickets = tickets.filter(ticket => ticket.status === 'waiting');

    // Live timer
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    // WebSocket Connection
    useEffect(() => {
        if (!unitId) return;

        socketClient.connect(unitId);

        const handleTicketUpdate = () => {
            refetch();
        };

        socketClient.onTicketCreated(handleTicketUpdate);
        socketClient.onTicketUpdated(handleTicketUpdate);
        socketClient.onTicketCalled(handleTicketUpdate);

        return () => {
            socketClient.off('ticket.created', handleTicketUpdate);
            socketClient.off('ticket.updated', handleTicketUpdate);
            socketClient.off('ticket.called', handleTicketUpdate);
            socketClient.disconnect();
        };
    }, [unitId, refetch]);

    // Fetch Services
    const { data: services = [] } = useUnitServices(unitId);

    // Group waiting tickets
    const groupedWaiting = useMemo(() => {
        const map: Record<string, any[]> = {};

        // Initialize with all leaf services
        services.forEach(service => {
            if (service.isLeaf) {
                map[service.id] = [];
            }
        });

        // Add tickets to map
        waitingTickets.forEach(ticket => {
            const key = ticket.serviceId || 'uncategorized';
            if (!map[key]) map[key] = [];
            map[key].push(ticket);
        });

        return map;
    }, [waitingTickets, services]);

    // Service Names Cache - derived from services list
    const serviceNames = useMemo(() => {
        const names: Record<string, string> = {};
        services.forEach(s => {
            names[s.id] = s.name;
        });
        return names;
    }, [services]);

    // Collapsed groups state
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    useEffect(() => {
        const keys = Object.keys(groupedWaiting);
        if (keys.length && Object.keys(openGroups).length === 0) {
            const initial: Record<string, boolean> = {};
            keys.forEach((k, i) => initial[k] = i === 0); // Open first group by default
            setOpenGroups(initial);
        }
    }, [groupedWaiting]); // Only run when grouping changes significantly (e.g. new services)

    // Actions
    const handleCallNext = async () => {
        try {
            const result = await callNextMutation.mutateAsync({ counterId });
            if (!result || !result.ok) {
                toast.error(result?.message || t('messages.failed', { action: 'call' }));
            } else {
                const number = result.ticket?.queueNumber || 'NEXT';
                toast.success(t('messages.called', { number }));
            }
            await refetch();
        } catch (error) {
            console.error('Failed to call next:', error);
            toast.error(t('messages.failed', { action: 'call' }));
        }
    };

    const handleConfirmArrival = async () => {
        if (!currentTicket) return;
        try {
            await confirmArrivalMutation.mutateAsync(currentTicket.id);
            toast.success(t('messages.serviceStarted', { number: currentTicket.queueNumber }));
            await refetch();
        } catch (error) {
            console.error('Failed to start service:', error);
            toast.error(t('messages.failed', { action: 'start service' }));
        }
    };

    const handleComplete = async () => {
        if (!currentTicket) return;
        try {
            await completeMutation.mutateAsync(currentTicket.id);
            toast.success(t('messages.completed', { number: currentTicket.queueNumber }));
            await refetch();
        } catch (error) {
            console.error('Failed to complete ticket:', error);
            toast.error(t('messages.failed', { action: 'complete' }));
        }
    };

    const handleNoShow = async () => {
        if (!currentTicket) return;
        try {
            await noShowMutation.mutateAsync(currentTicket.id);
            toast.success(t('messages.noShow', { number: currentTicket.queueNumber }));
            await refetch();
        } catch (error) {
            console.error('Failed to mark no-show:', error);
            toast.error(t('messages.failed', { action: 'mark no-show' }));
        }
    };

    // Transfer Dialog State
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [transferTargetId, setTransferTargetId] = useState('');
    const { data: countersForTransfer = [] } = useCounters(unitId || '');

    const handleTransfer = async () => {
        if (!currentTicket || !transferTargetId) return;
        try {
            await transferMutation.mutateAsync({
                id: currentTicket.id,
                toCounterId: transferTargetId
            });
            toast.success(t('messages.transferred', { number: currentTicket.queueNumber }));
            setIsTransferOpen(false);
            setTransferTargetId('');
            await refetch();
        } catch (error) {
            console.error('Failed to transfer ticket:', error);
            toast.error(t('messages.failed', { action: 'transfer' }));
        }
    };

    if (error) {
        return <div className="container mx-auto p-4">{t('error_loading', { error: (error as Error).message })}</div>;
    }

    return (
        <div className="container mx-auto flex-1 p-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <div className="text-muted-foreground">
                        {unit?.name} • {counterName}
                    </div>
                </div>
                <Button variant="outline" onClick={() => releaseMutation.mutate()} disabled={releaseMutation.isPending}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('logout')}
                </Button>
            </div>

            {/* Transfer Dialog */}
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('actions.transfer')}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="mb-2 block">{t('select_counter_label')}</Label>
                        <div className="grid gap-2">
                            {countersForTransfer.filter(c => c.id !== counterId).map(counter => (
                                <Button
                                    key={counter.id}
                                    variant={transferTargetId === counter.id ? "default" : "outline"}
                                    className="justify-start"
                                    onClick={() => setTransferTargetId(counter.id)}
                                >
                                    {counter.name}
                                </Button>
                            ))}
                            {countersForTransfer.length <= 1 && (
                                <p className="text-muted-foreground text-sm">{t('no_other_counters')}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTransferOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleTransfer} disabled={!transferTargetId || transferMutation.isPending}>
                            {t('transfer_button')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('current.title')}</CardTitle>
                        <CardDescription>{t('current.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentTicket ? (
                            <CurrentTicketDisplay ticket={currentTicket} t={t} />
                        ) : (
                            <div className="text-center text-gray-500 py-4">
                                {t('current.noTicket')}
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            {currentTicket?.status === 'called' && (
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    onClick={handleConfirmArrival}
                                    disabled={confirmArrivalMutation.isPending}
                                >
                                    {t('actions.startService')}
                                </Button>
                            )}
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={handleComplete}
                                    disabled={!currentTicket || completeMutation.isPending}
                                >
                                    {t('current.complete')}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setIsTransferOpen(true)}
                                    disabled={!currentTicket || transferMutation.isPending}
                                >
                                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                                    {t('actions.transfer')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('actions.title')}</CardTitle>
                        <CardDescription>{t('actions.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Button
                                className="w-full"
                                onClick={handleCallNext}
                                disabled={callNextMutation.isPending || waitingTickets.length === 0 || !!currentTicket}
                            >
                                {callNextMutation.isPending ? t('processing') : t('actions.callNext')}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleNoShow}
                                disabled={!currentTicket || noShowMutation.isPending}
                            >
                                {t('actions.noShow')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('queue.title')}</CardTitle>
                    <CardDescription>{t('queue.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {Object.keys(groupedWaiting).length > 0 ? (
                            Object.entries(groupedWaiting).map(([serviceId, ticketsForService]) => (
                                <div key={serviceId}>
                                    <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
                                        <div className="font-medium">
                                            {serviceId === 'uncategorized' ? t('queue.uncategorized') || 'Other' : (serviceNames[serviceId] || serviceId)}
                                            <span className="ml-2 text-sm text-muted-foreground">({ticketsForService.length})</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {serviceId !== 'uncategorized' && (
                                                    <Button size="sm" variant="outline" onClick={(e) => {
                                                        e.stopPropagation();
                                                        createTicketMutation.mutate(serviceId);
                                                    }} disabled={createTicketMutation.isPending}>
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        {t('actions.createTicket') || 'Create'}
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" onClick={() => setOpenGroups(prev => ({ ...prev, [serviceId]: !prev[serviceId] }))}>
                                                    {openGroups[serviceId] ? (t('queue.hide') || 'Hide') : (t('queue.show') || 'Show')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    {openGroups[serviceId] && (
                                        <div className="mt-2 space-y-2">
                                            {ticketsForService.map((ticket: any) => (
                                                <StaffTicketItem
                                                    key={ticket.id}
                                                    ticket={ticket}
                                                    onCall={async () => {
                                                        setInProgressTicketId(ticket.id);
                                                        try {
                                                            await pickMutation.mutateAsync({ id: ticket.id, counterId });
                                                            await refetch();
                                                        } catch (e) {
                                                            console.error('Failed to pick ticket:', e);
                                                        } finally {
                                                            setInProgressTicketId(null);
                                                        }
                                                    }}
                                                    disabled={pickMutation.isPending || inProgressTicketId === ticket.id || !!currentTicket}
                                                    t={t}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 py-4">
                                {t('queue.noTickets')}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}



function StaffTicketItem({ ticket, onCall, disabled, t }: { ticket: any, onCall: () => void, disabled: boolean, t: any }) {
    const { background, formatTime, elapsed } = useTicketTimer(ticket.createdAt, ticket.maxWaitingTime);

    return (
        <div
            className="flex justify-between items-center p-2 border rounded relative overflow-hidden"
            style={{ background: background || undefined }}
        >
            <div className="relative z-10">
                <div className="font-semibold">{ticket.queueNumber}</div>
                <div className="text-xs text-gray-600">
                    {t(`statuses.${ticket.status}`)} • {t('queue.waiting')}: {formatTime(elapsed)}
                    {ticket.maxWaitingTime && (
                        <span className="ml-2 opacity-70">Max: {formatTime(ticket.maxWaitingTime)}</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 relative z-10">
                <Button
                    size="sm"
                    onClick={onCall}
                    disabled={disabled}
                >
                    {t('actions.call') || 'Call'}
                </Button>
            </div>
        </div>
    );
}

function CurrentTicketDisplay({ ticket, t }: { ticket: any, t: any }) {
    const isInService = ticket.status === 'in_service';

    // Service Timer (Active)
    // User requested to count from "moment of call" (calledAt).
    const { formatTime: formatServiceTime, elapsed: serviceElapsed } = useTicketTimer(
        isInService ? ticket.calledAt : null
    );

    // Waiting Time (Static)
    // Calculated from createdAt to calledAt
    const waitingSeconds = useMemo(() => {
        if (!ticket.createdAt || !ticket.calledAt) return 0;
        const start = new Date(ticket.createdAt).getTime();
        const end = new Date(ticket.calledAt).getTime();
        return Math.max(0, Math.floor((end - start) / 1000));
    }, [ticket.createdAt, ticket.calledAt]);

    // Helper to format static seconds
    const formatStaticTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} `;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} `;
    };

    // Background logic:
    // If in service, maybe green or neutral?
    // User didn't specify background for service, but "visual indicators" were requested before.
    // Let's keep it neutral/white for now as the focus is on the timer, or maybe light green if active.
    // The previous "waiting" gradient logic is less relevant for the main card now that waiting is over.
    // Let's use a clean card style.

    return (
        <div className="flex justify-between items-center mb-4 p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            {/* Left/Center: Main Info */}
            <div className="flex-1 text-center">
                <div className="text-5xl font-bold tracking-tight">{ticket.queueNumber}</div>
                <div className="text-lg text-muted-foreground mt-2 font-medium">
                    {t(`statuses.${ticket.status}`)}
                </div>

                {/* Service Time Display */}
                {isInService && (
                    <div className="mt-4">
                        <div className="text-sm text-muted-foreground uppercase tracking-wider text-xs mb-1">
                            {t('queue.service_time')}
                        </div>
                        <div className="text-3xl font-mono font-semibold text-green-600">
                            {formatServiceTime(serviceElapsed)}
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Stats */}
            <div className="flex flex-col gap-3 text-right border-l pl-6 ml-6 py-2">
                <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                        {t('queue.waiting')}
                    </div>
                    <div className="text-xl font-mono font-medium">
                        {formatStaticTime(waitingSeconds)}
                    </div>
                </div>

                {ticket.maxWaitingTime && (
                    <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                            Max
                        </div>
                        <div className="text-sm font-mono text-muted-foreground">
                            {formatStaticTime(ticket.maxWaitingTime)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

