'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from '@/components/ui/sheet';
import { useUpdateUnit } from '@/lib/hooks';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { LogoUpload } from '@/components/ui/logo-upload';
import type { UnitConfig } from '@/lib/api';

interface KioskSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  currentConfig?: UnitConfig | null;
  onLock: () => void;
  isLocked: boolean;
  onUnlock: () => void;
}

export function KioskSettingsSheet({
  isOpen,
  onClose,
  unitId,
  currentConfig,
  onLock,
  isLocked,
  onUnlock
}: KioskSettingsSheetProps) {
  const t = useTranslations('kiosk.settings');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side='right'
        className='w-full overflow-y-auto sm:w-[600px] sm:max-w-[800px] sm:px-12'
      >
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription>{t('description')}</SheetDescription>
        </SheetHeader>

        {isOpen && (
          <KioskSettingsForm
            unitId={unitId}
            currentConfig={currentConfig}
            onClose={onClose}
            onLock={onLock}
            isLocked={isLocked}
            onUnlock={onUnlock}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function KioskSettingsForm({
  unitId,
  currentConfig,
  onClose,
  onLock,
  isLocked,
  onUnlock
}: {
  unitId: string;
  currentConfig?: UnitConfig | null;
  onClose: () => void;
  onLock: () => void;
  isLocked: boolean;
  onUnlock: () => void;
}) {
  const t = useTranslations('kiosk.settings');
  const updateUnitMutation = useUpdateUnit();

  const [showHeader, setShowHeader] = useState(
    currentConfig?.kiosk?.showHeader !== false
  );
  const [showFooter, setShowFooter] = useState(
    currentConfig?.kiosk?.showFooter !== false
  );
  const [printerIp, setPrinterIp] = useState(
    currentConfig?.kiosk?.printerIp || ''
  );
  const [printerPort, setPrinterPort] = useState(
    currentConfig?.kiosk?.printerPort || '9100'
  );
  const [printerType, setPrinterType] = useState(
    currentConfig?.kiosk?.printerType || 'receipt'
  );
  const [isPrintEnabled, setIsPrintEnabled] = useState(
    currentConfig?.kiosk?.isPrintEnabled !== false
  );
  const [logoUrl, setLogoUrl] = useState(currentConfig?.kiosk?.logoUrl || '');

  const handleSave = () => {
    const newConfig = {
      ...currentConfig,
      kiosk: {
        ...currentConfig?.kiosk,
        showHeader,
        showFooter,
        printerIp,
        printerPort,
        printerType,
        isPrintEnabled,
        logoUrl
      }
    };

    updateUnitMutation.mutate(
      { id: unitId, config: newConfig },
      {
        onSuccess: () => {
          toast.success(t('save_success'));
          onClose();
        },
        onError: () => {
          toast.error(t('save_error'));
        }
      }
    );
  };

  const handleTestPrint = () => {
    // In a real app, this would call an API to send a test print command
    toast.success(t('test_print_sent') + (printerIp || 'printer'));
  };

  return (
    <>
      <div className='space-y-6 py-6'>
        <div className='space-y-2'>
          <LogoUpload
            label={t('logo_upload')}
            currentLogoUrl={logoUrl}
            onLogoUploaded={setLogoUrl}
            onLogoRemoved={() => setLogoUrl('')}
          />
        </div>

        <div className='flex items-center justify-between'>
          <div className='space-y-0.5'>
            <Label>{t('show_header')}</Label>
            <p className='text-muted-foreground text-sm'>
              {t('show_header_desc')}
            </p>
          </div>
          <Switch checked={showHeader} onCheckedChange={setShowHeader} />
        </div>

        <div className='flex items-center justify-between'>
          <div className='space-y-0.5'>
            <Label>{t('show_footer')}</Label>
            <p className='text-muted-foreground text-sm'>
              {t('show_footer_desc')}
            </p>
          </div>
          <Switch checked={showFooter} onCheckedChange={setShowFooter} />
        </div>

        <div className='flex items-center justify-between'>
          <div className='space-y-0.5'>
            <Label>{t('enable_printing')}</Label>
            <p className='text-muted-foreground text-sm'>
              {t('enable_printing_desc')}
            </p>
          </div>
          <Switch
            checked={isPrintEnabled}
            onCheckedChange={setIsPrintEnabled}
          />
        </div>

        {isPrintEnabled && (
          <>
            <div className='grid grid-cols-3 gap-4'>
              <div className='col-span-2 space-y-2'>
                <Label>{t('printer_ip')}</Label>
                <Input
                  value={printerIp}
                  onChange={(e) => setPrinterIp(e.target.value)}
                  placeholder='192.168.1.100'
                />
              </div>
              <div className='space-y-2'>
                <Label>{t('printer_port')}</Label>
                <Input
                  value={printerPort}
                  onChange={(e) => setPrinterPort(e.target.value)}
                  placeholder='9100'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label>{t('printer_type')}</Label>
              <div className='flex gap-4'>
                <Button
                  variant={printerType === 'receipt' ? 'default' : 'outline'}
                  onClick={() => setPrinterType('receipt')}
                  className='flex-1'
                >
                  {t('printer_type_receipt')}
                </Button>
                <Button
                  variant={printerType === 'label' ? 'default' : 'outline'}
                  onClick={() => setPrinterType('label')}
                  className='flex-1'
                >
                  {t('printer_type_label')}
                </Button>
              </div>
            </div>
          </>
        )}

        <Button
          variant='outline'
          className='w-full'
          onClick={handleTestPrint}
          disabled={!isPrintEnabled}
        >
          {t('test_print')}
        </Button>

        <div className='border-t pt-4'>
          {isLocked ? (
            <Button
              variant='default'
              className='flex w-full items-center gap-2'
              onClick={onUnlock}
            >
              <Lock className='h-4 w-4' />
              {t('unlock_kiosk', { defaultValue: 'Unlock Kiosk' })}
            </Button>
          ) : (
            <Button
              variant='destructive'
              className='flex w-full items-center gap-2'
              onClick={onLock}
            >
              <Lock className='h-4 w-4' />
              {t('lock_kiosk')}
            </Button>
          )}
        </div>
      </div>

      <SheetFooter>
        <Button onClick={handleSave} disabled={updateUnitMutation.isPending}>
          {updateUnitMutation.isPending ? t('saving') : t('save_changes')}
        </Button>
      </SheetFooter>
    </>
  );
}
