'use client';

import { use, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { shiftApi, unitsApi, Ticket, Service } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Users, ListChecks, Clock, AlertTriangle, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { PreRegistrationDetailsModal } from '@/components/staff/PreRegistrationDetailsModal';

export default function ShiftDashboardPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = use(params);
  const t = useTranslations('supervisor');
  const queryClient = useQueryClient();
  const [showEODDialog, setShowEODDialog] = useState(false);
  const [forceReleaseDialogOpen, setForceReleaseDialogOpen] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState<{ id: string; name: string } | null>(null);
  const [detailsTicket, setDetailsTicket] = useState<Ticket | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const openDetails = (ticket: Ticket) => {
    setDetailsTicket(ticket);
    setIsDetailsOpen(true);
  };

  // Fetch unit info
  const { data: unit } = useQuery({
    queryKey: ['unit', unitId],
    queryFn: () => unitsApi.getById(unitId),
  });

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['shift-dashboard', unitId],
    queryFn: () => shiftApi.getDashboard(unitId),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch queue
  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['shift-queue', unitId],
    queryFn: () => shiftApi.getQueue(unitId),
    refetchInterval: 10000,
  });

  // Fetch counters
  const { data: counters, isLoading: countersLoading } = useQuery({
    queryKey: ['shift-counters', unitId],
    queryFn: () => shiftApi.getCounters(unitId),
    refetchInterval: 10000,
  });

  // Force release mutation
  const forceReleaseMutation = useMutation({
    mutationFn: (counterId: string) => shiftApi.forceReleaseCounter(counterId),
    onSuccess: () => {
      toast.success(t('counterReleased'));
      queryClient.invalidateQueries({ queryKey: ['shift-counters', unitId] });
      queryClient.invalidateQueries({ queryKey: ['shift-dashboard', unitId] });
      setForceReleaseDialogOpen(false);
      setSelectedCounter(null);
    },
    onError: (error: Error) => {
      toast.error(`${t('errorReleasingCounter')}: ${error.message}`);
    },
  });

  // EOD mutation
  const eodMutation = useMutation({
    mutationFn: () => shiftApi.executeEOD(unitId),
    onSuccess: (data) => {
      toast.success(
        `${t('eodSuccess')}: ${data.activeTicketsClosed} ${t('ticketsClosed')}, ${data.waitingTicketsNoShow} ${t('ticketsNoShow')}, ${data.countersReleased} ${t('countersReleased')}`
      );
      queryClient.invalidateQueries({ queryKey: ['shift-dashboard', unitId] });
      queryClient.invalidateQueries({ queryKey: ['shift-queue', unitId] });
      queryClient.invalidateQueries({ queryKey: ['shift-counters', unitId] });
      setShowEODDialog(false);
    },
    onError: (error: Error) => {
      toast.error(`${t('errorEOD')}: ${error.message}`);
    },
  });

  const handleForceRelease = (counter: { id: string; name: string }) => {
    setSelectedCounter(counter);
    setForceReleaseDialogOpen(true);
  };

  const confirmForceRelease = () => {
    if (selectedCounter) {
      forceReleaseMutation.mutate(selectedCounter.id);
    }
  };

  return (
    <>
      <div className="container mx-auto p-4 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
            <p className="text-muted-foreground">{unit?.name}</p>
          </div>
          <Button
            variant="destructive"
            size="lg"
            onClick={() => setShowEODDialog(true)}
            disabled={eodMutation.isPending}
          >
            {eodMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('processing')}
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                {t('endOfDay')}
              </>
            )}
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('activeCounters')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <div className="text-4xl font-bold">{stats?.activeCountersCount || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('queueLength')}</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <div className="text-4xl font-bold">{stats?.queueLength || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('avgWaitTime')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <div className="text-4xl font-bold">
                  {stats?.averageWaitTimeMinutes || 0} <span className="text-xl text-muted-foreground">{t('min')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Queue and Counters Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Queue List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('queueList')}</CardTitle>
              <CardDescription>{t('queueListDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin h-8 w-8" />
                </div>
              ) : queue && queue.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {queue.map((ticket) => (
                    <TicketListItem key={ticket.id} ticket={ticket} onShowDetails={() => openDetails(ticket)} t={t} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">{t('noTicketsInQueue')}</div>
              )}
            </CardContent>
          </Card>

          {/* Counters List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('countersList')}</CardTitle>
              <CardDescription>{t('countersListDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {countersLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin h-8 w-8" />
                </div>
              ) : counters && counters.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {counters.map((counter) => (
                    <div
                      key={counter.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{counter.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {counter.isOccupied ? (
                            <>
                              <span className="block text-red-500 font-medium">
                                {t('occupiedBy')}: {counter.assignedUser?.name || t('unknown')}
                              </span>
                              {counter.activeTicket && (
                                <span className="block text-xs mt-1">
                                  {t('serving')}: {counter.activeTicket.queueNumber}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-green-600">{t('free')}</span>
                          )}
                        </div>
                      </div>
                      {counter.isOccupied && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleForceRelease(counter)}
                          disabled={forceReleaseMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {t('forceRelease')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">{t('noCounters')}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Force Release Confirmation Dialog */}
      <Dialog open={forceReleaseDialogOpen} onOpenChange={setForceReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmForceRelease')}</DialogTitle>
            <DialogDescription>
              {t('forceReleaseWarning', { counterName: selectedCounter?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceReleaseDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={confirmForceRelease} disabled={forceReleaseMutation.isPending}>
              {forceReleaseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('processing')}
                </>
              ) : (
                t('confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EOD Confirmation Dialog */}
      <Dialog open={showEODDialog} onOpenChange={setShowEODDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('confirmEOD')}
            </DialogTitle>
            <DialogDescription className="space-y-2" asChild>
              <div>
                <div>{t('eodWarning')}</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{t('eodStep1')}</li>
                  <li>{t('eodStep2')}</li>
                  <li>{t('eodStep3')}</li>
                  <li>{t('eodStep4')}</li>
                </ul>
                <div className="font-semibold text-destructive">{t('eodIrreversible')}</div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEODDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => eodMutation.mutate()}
              disabled={eodMutation.isPending}
            >
              {eodMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('processing')}
                </>
              ) : (
                t('executeEOD')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreRegistrationDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        ticket={detailsTicket}
      /></>
  );
}

import { useTicketTimer } from '@/lib/ticket-timer';

function TicketListItem({ ticket, onShowDetails, t }: { ticket: Ticket & { service?: Service }, onShowDetails: () => void, t: (key: string, values?: Record<string, string | number>) => string }) {
  const { background, formatTime, elapsed } = useTicketTimer(ticket.createdAt || undefined, ticket.maxWaitingTime);

  return (
    <div
      className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent relative overflow-hidden"
      style={{ background: background || undefined }}
    >
      <div className="flex-1 relative z-10">
        <div className="font-semibold">{ticket.queueNumber}</div>
        <div className="text-sm text-muted-foreground">
          {ticket.service?.nameRu || ticket.service?.name}
          {ticket.preRegistration && (
            <div className="flex items-center gap-2 mt-1">
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full font-medium">
                {t('pre_registration.badge', { defaultValue: 'PRE' })}
              </span>
              <span className="text-xs font-medium text-blue-800">
                {ticket.preRegistration.time}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 relative z-10">
        <div className="text-sm text-muted-foreground text-right">
          <div>{formatTime(elapsed)}</div>
          {ticket.maxWaitingTime && (
            <div className="text-xs opacity-70">Max: {formatTime(ticket.maxWaitingTime)}</div>
          )}
        </div>
        {ticket.preRegistration && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onShowDetails();
            }}
          >
            <Info className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
