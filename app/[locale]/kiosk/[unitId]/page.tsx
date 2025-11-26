'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useUnitServicesTree, useCreateTicketInUnit } from '@/lib/hooks';
import type { Ticket, Service } from '@/lib/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { ArrowLeft, Home } from 'lucide-react';
import dynamic from 'next/dynamic';
const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/navigation';
import { useLocale } from 'next-intl';
import { getLocalizedName } from '@/lib/utils';
import KioskLanguageSwitcher from '@/components/KioskLanguageSwitcher';
import { useUnit } from '@/lib/hooks';
import { PinCodeModal } from '@/components/kiosk/pin-code-modal';
import { KioskSettingsSheet } from '@/components/kiosk/kiosk-settings-sheet';
import { LockScreen } from '@/components/kiosk/lock-screen';
import { PreRegRedemptionModal } from '@/components/kiosk/PreRegRedemptionModal';

export default function UnitKioskPage() {
  const params = useParams() as { unitId?: string };
  const unitId = params.unitId;
  const [selectedServicePath, setSelectedServicePath] = useState<Service[]>([]);
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const { data: unitServicesTree, isLoading: servicesLoading } = useUnitServicesTree(unitId!);
  const createTicketMutation = useCreateTicketInUnit();
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [autoCloseTimerId, setAutoCloseTimerId] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number>(5);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('kiosk');
  const [baseAppUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  });

  const { data: unit } = useUnit(unitId!, { refetchInterval: 120000 }); // Poll every 2 minutes
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [clockClicks, setClockClicks] = useState(0);
  const [isRedemptionModalOpen, setIsRedemptionModalOpen] = useState(false);

  // Custom colors from config
  const isCustomColorsEnabled = unit?.config?.kiosk?.isCustomColorsEnabled || false;
  const headerColor = isCustomColorsEnabled ? (unit?.config?.kiosk?.headerColor || '#ffffff') : '#ffffff';
  const bodyColor = isCustomColorsEnabled ? (unit?.config?.kiosk?.bodyColor || '#f3f4f6') : '#f3f4f6';
  const serviceGridColor = isCustomColorsEnabled ? (unit?.config?.kiosk?.serviceGridColor || '#ffffff') : '#ffffff';

  const handleClockClick = () => {
    setClockClicks(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setIsPinModalOpen(true);
        return 0;
      }
      return newCount;
    });
    // Reset clicks if not continued quickly
    setTimeout(() => setClockClicks(0), 2000);
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Clear interval on component unmount
    return () => clearInterval(timer);
  }, []);

  // Cleanup any pending auto-close timer when unmounting
  useEffect(() => {
    return () => {
      if (autoCloseTimerId) {
        clearInterval(autoCloseTimerId);
      }
    };
  }, [autoCloseTimerId]);

  // Reset grid to main level when ticket modal opens
  useEffect(() => {
    if (isTicketModalOpen) {
      setSelectedServicePath([]);
    }
  }, [isTicketModalOpen]);

  // Get current services based on selected path
  // unitServicesTree contains flat list of services, so we need to filter by parentId
  const currentServices = () => {
    if (!unitServicesTree) {
      return []; // Return empty array if services haven't loaded yet
    }

    if (selectedServicePath.length === 0) {
      // Top level services - services without parent (parentId is null or undefined)
      return unitServicesTree.filter(service => !service.parentId);
    } else {
      // Services under the currently selected service
      const lastService = selectedServicePath[selectedServicePath.length - 1];
      return unitServicesTree.filter(service => service.parentId === lastService.id);
    }
  };

  const handleServiceSelection = async (service: Service) => {
    if (service.isLeaf) {
      // This is a leaf service, create a ticket
      setMessage('');
      try {
        const ticket = await createTicketMutation.mutateAsync({
          unitId: unitId!,
          serviceId: service.id,
        });
        setCreatedTicket(ticket);
        setIsTicketModalOpen(true);

        // Reset countdown and start timer
        setCountdown(5);
        if (autoCloseTimerId) {
          clearInterval(autoCloseTimerId);
        }

        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              setIsTicketModalOpen(false);
              setCreatedTicket(null);
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        setAutoCloseTimerId(timer);

        setMessage(t('ticketCreated', {
          defaultValue: 'Ticket created successfully!',
          service: getLocalizedName(service.name, service.nameRu, service.nameEn, locale)
        }));
      } catch (error) {
        console.error('Failed to create ticket:', error);
        setMessage(t('ticketCreationFailed', {
          defaultValue: 'Failed to create ticket. Please try again.'
        }));
      }
    } else {
      // This is a parent service, navigate to its children
      setSelectedServicePath(prev => [...prev, service]);
    }
  };

  const handleGoBack = () => {
    if (selectedServicePath.length > 0) {
      const newPath = [...selectedServicePath];
      newPath.pop();
      setSelectedServicePath(newPath);
    } else {
      // If we're at the top level, navigate back to unit selection
      router.push('/kiosk');
    }
  };

  if (servicesLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background p-4" style={{ backgroundColor: bodyColor }}>
        {/* Header with date/time and language/theme toggles */}
        <div className="flex justify-between items-center mb-4 p-4 rounded-lg" style={{ backgroundColor: headerColor }}>
          {/* Date and Time in two rows - time first, date second */}
          <div className="text-center">
            <div className="text-3xl font-bold">
              {new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm mt-1">
              {new Date().toLocaleDateString(locale, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          {/* Language and Theme toggles on the right */}
          <div className="flex space-x-2">
            <KioskLanguageSwitcher />
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

  // If no services are available at the current level
  if (currentServices().length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background p-4" style={{ backgroundColor: bodyColor }}>
        {/* Header with date/time and language/theme toggles */}
        <div className="flex justify-between items-center mb-4 p-4 rounded-lg" style={{ backgroundColor: headerColor }}>
          {/* Date and Time in two rows - time first, date second */}
          <div className="text-center">
            <div className="text-3xl font-bold">
              {new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm mt-1">
              {new Date().toLocaleDateString(locale, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          {/* Language and Theme toggles on the right */}
          <div className="flex space-x-2">
            <KioskLanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">
              {selectedServicePath.length > 0 ? (
                getLocalizedName(
                  selectedServicePath[selectedServicePath.length - 1].name,
                  selectedServicePath[selectedServicePath.length - 1].nameRu,
                  selectedServicePath[selectedServicePath.length - 1].nameEn,
                  locale
                )
              ) : (
                t('selectService')
              )}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t('noServicesAvailable', { defaultValue: 'No services available at this level' })}
            </p>
            <Button onClick={handleGoBack}>
              {selectedServicePath.length > 0 ? t('back') : t('changeLocation', { defaultValue: 'Change Location' })}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background p-4" style={{ backgroundColor: bodyColor }}>
      {/* Header with date/time and language/theme toggles */}
      <div className="flex justify-between items-center mb-4 p-4 rounded-lg shadow-sm" style={{ backgroundColor: headerColor }}>
        {/* Date and Time in two rows - time first, date second */}
        <div className="text-center cursor-pointer select-none" onClick={handleClockClick}>
          <div className="text-3xl font-bold">
            {currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-sm mt-1">
            {currentTime.toLocaleDateString(locale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        {/* Language toggle and Logo on the right */}
        <div className="flex items-center gap-4 md:gap-8">
          {unit?.config?.kiosk?.isPreRegistrationEnabled && (
            <Button
              variant="secondary"
              className="h-12 md:h-16 md:w-50 text-xl"
              onClick={() => setIsRedemptionModalOpen(true)}
            >
              {t('pre_registration.button', { defaultValue: 'I have a code' })}
            </Button>
          )}

          <KioskLanguageSwitcher className="h-12 w-12 md:h-16 md:w-16 text-xl" />
          {/* ThemeToggle removed as per request */}

          {unit?.config?.kiosk?.logoUrl && (
            <div className="relative h-12 md:h-16 w-auto">
              <Image
                src={unit.config.kiosk.logoUrl}
                alt="Logo"
                className="h-full w-auto object-contain"
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation breadcrumbs and buttons */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center overflow-x-auto">
          <span className="whitespace-nowrap text-muted-foreground mr-2">
            #
          </span>
          {selectedServicePath.length === 0 ? (
            <span className="text-muted-foreground">
              {t('services', { defaultValue: 'Services' })}
            </span>
          ) : (
            selectedServicePath.map((service, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <Separator orientation="vertical" className="mx-2 h-4" />}
                <span className="whitespace-nowrap">
                  {getLocalizedName(service.name, service.nameRu, service.nameEn, locale)}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {selectedServicePath.length > 1 && (
            <Button variant="outline" size="sm" onClick={() => setSelectedServicePath([])}>
              <Home className="mr-2 h-4 w-4" />
              {t('home', { defaultValue: 'Home' })}
            </Button>
          )}
          {selectedServicePath.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back', { defaultValue: 'Back' })}
            </Button>
          )}
        </div>
      </div>

      {/* Services grid */}
      <div
        className="flex-1 grid grid-cols-8 grid-rows-4 gap-4 h-full w-full overflow-auto bg-muted p-4 rounded-lg"
        style={{ backgroundColor: serviceGridColor }}
      >
        {/* Render services with their exact grid positions */}
        {currentServices().map((service) => {
          if (service.gridRow !== null && service.gridCol !== null) {
            // Calculate grid positions accounting for CSS Grid 1-indexed positions
            const startRow = (service.gridRow ?? 0) + 1; // Convert from 0-indexed to 1-indexed
            const startCol = (service.gridCol ?? 0) + 1; // Convert from 0-indexed to 1-indexed
            const rowSpan = service.gridRowSpan || 1;
            const colSpan = service.gridColSpan || 1;

            return (
              <div
                key={service.id}
                className="h-full w-full"
                style={{
                  gridRow: `${startRow} / span ${rowSpan}`,
                  gridColumn: `${startCol} / span ${colSpan}`,
                }}
              >
                <Card
                  className="h-full w-full cursor-pointer transition-all hover:shadow-lg flex flex-col border-0 relative overflow-hidden"
                  onClick={() => handleServiceSelection(service)}
                  style={{
                    backgroundColor: service.backgroundColor || undefined,
                    color: service.textColor || undefined,
                  }}
                >
                  <CardHeader className="flex-1 flex flex-col items-center justify-center p-3 overflow-hidden min-h-0 relative z-10">
                    <CardTitle className="text-2xl font-semibold text-center wrap-break-word px-1 line-clamp-2 shrink-0">
                      {getLocalizedName(
                        service.name,
                        service.nameRu || '',
                        service.nameEn || '',
                        locale
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 pt-0 shrink-0 relative z-10">
                    {service.description && (
                      <p className="text-base text-center text-muted-foreground wrap-break-word px-1 line-clamp-2">
                        {getLocalizedName(
                          service.description,
                          service.descriptionRu,
                          service.descriptionEn,
                          locale
                        )}
                      </p>
                    )}
                  </CardContent>
                  {service.imageUrl && (
                    <div className="absolute inset-0 z-0 p-4">
                      <Image
                        src={service.imageUrl}
                        alt={service.name}
                        fill
                        className="object-contain opacity-20"
                        unoptimized
                      />
                    </div>
                  )}
                </Card>
              </div>
            );
          }

          return null;
        })}

        {/* Add empty cells to fill up the grid structure where no services are positioned */}
        {Array.from({ length: 32 }).map((_, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;

          // Check if this cell is already occupied by a service
          const isOccupied = currentServices().some(service => {
            if (service.gridRow === null || service.gridCol === null) {
              return false;
            }

            // Check if this cell falls within the service's grid position
            return (
              row >= (service.gridRow || 0) &&
              row < (service.gridRow || 0) + (service.gridRowSpan || 1) &&
              col >= (service.gridCol || 0) &&
              col < (service.gridCol || 0) + (service.gridColSpan || 1)
            );
          });

          // Only render empty cell if not occupied
          if (!isOccupied) {
            return (
              <div
                key={`empty-${row}-${col}`}
                className="opacity-0 border-0"
                style={{
                  gridRow: `${row + 1}`,
                  gridColumn: `${col + 1}`,
                }}
              />
            );
          }

          return null;
        })}
      </div>

      {/* Ticket modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={(open) => {
        setIsTicketModalOpen(open);
        if (!open) {
          setCreatedTicket(null);
          if (autoCloseTimerId) {
            clearInterval(autoCloseTimerId);
            setAutoCloseTimerId(null);
          }
        }
      }}>
        {createdTicket && (
          <DialogContent className="w-[320px] sm:w-[420px] flex flex-col items-center">
            {/* Logo (top) */}
            {unit?.config?.kiosk?.logoUrl && (
              <div className="mb-4 h-16 w-auto">
                <Image
                  src={unit.config.kiosk.logoUrl}
                  alt="Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
            )}

            {/* Header text (if set) */}
            {unit?.config?.kiosk?.headerText && (
              <div className="mb-2 text-lg font-medium text-center">{unit.config.kiosk.headerText}</div>
            )}

            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                {getLocalizedName(
                  // If the service name might be in the ticket or use current selection fallback
                  unitServicesTree?.find(s => s.id === createdTicket.serviceId)?.name || '',
                  unitServicesTree?.find(s => s.id === createdTicket.serviceId)?.nameRu || '',
                  unitServicesTree?.find(s => s.id === createdTicket.serviceId)?.nameEn || '',
                  locale
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="text-center w-full flex flex-col items-center">
              <div className="text-7xl font-bold mb-4 leading-none">{createdTicket.queueNumber}</div>

              <Separator className="my-4 w-full" />

              <div className="mb-4 text-sm text-muted-foreground">
                {t('ticket.scanQrCode')}
              </div>

              <div className="mb-4 bg-white p-2 rounded-lg">
                {/* QR code component will be dynamically imported to avoid SSR issues */}
                <QRCode value={`${baseAppUrl}/${locale}/ticket/${createdTicket.id}`} size={180} />
              </div>

              {/* Show Footer if configured */}
              {unit?.config?.kiosk?.footerText && (
                <>
                  <Separator className="my-4 w-full" />
                  <div className="text-sm text-muted-foreground text-center">{unit.config.kiosk.footerText}</div>
                </>
              )}
            </div>
            <DialogFooter className="w-full sm:justify-center">
              <DialogClose asChild>
                <Button variant="secondary" className="w-full sm:w-auto min-w-[120px]">
                  {t('close')} ({countdown})
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <PinCodeModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => setIsSettingsOpen(true)}
        correctPin={unit?.config?.kiosk?.pin || '0000'}
      />

      <KioskSettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        unitId={unitId!}
        currentConfig={unit?.config}
        onLock={() => {
          setIsSettingsOpen(false);
          setIsLocked(true);
        }}
        isLocked={isLocked}
        onUnlock={() => {
          setIsLocked(false);
          setIsSettingsOpen(false);
        }}
      />

      <LockScreen
        isLocked={isLocked}
        onUnlockRequest={() => setIsPinModalOpen(true)}
      />

      <PreRegRedemptionModal
        isOpen={isRedemptionModalOpen}
        onClose={() => setIsRedemptionModalOpen(false)}
        unitId={unitId!}
        onSuccess={(ticket) => {
          setCreatedTicket(ticket);
          setIsTicketModalOpen(true);
          // Start auto-close timer logic (copied from handleServiceSelection)
          setCountdown(5);
          if (autoCloseTimerId) {
            clearInterval(autoCloseTimerId);
          }
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                setIsTicketModalOpen(false);
                setCreatedTicket(null);
                clearInterval(timer);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          setAutoCloseTimerId(timer);
        }}
      />
    </div>
  );
}