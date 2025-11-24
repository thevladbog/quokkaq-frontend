'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUpdateUnit } from '@/lib/hooks';
import { toast } from 'sonner';
import { LogoUpload } from '@/components/ui/logo-upload';

interface KioskConfig {
    pin?: string;
    headerText?: string;
    footerText?: string;
    printerIp?: string;
    printerPort?: string;
    printerType?: string;
    isPrintEnabled?: boolean;
    logoUrl?: string;
    feedbackUrl?: string;
    isCustomColorsEnabled?: boolean;
    headerColor?: string;
    bodyColor?: string;
    serviceGridColor?: string;
}

interface KioskSettingsProps {
    unitId: string;
    currentConfig: Record<string, unknown>;
}

export function KioskSettings({ unitId, currentConfig }: KioskSettingsProps) {
    const t = useTranslations('admin.kiosk_settings');
    const updateUnitMutation = useUpdateUnit();

    const typedConfig = currentConfig as { kiosk?: KioskConfig };
    const kioskConfig = typedConfig.kiosk || {};

    const [pin, setPin] = useState(kioskConfig.pin || '');
    const [headerText, setHeaderText] = useState(kioskConfig.headerText || '');
    const [footerText, setFooterText] = useState(kioskConfig.footerText || '');
    const [printerIp, setPrinterIp] = useState(kioskConfig.printerIp || '');
    const [printerPort, setPrinterPort] = useState(kioskConfig.printerPort || '9100');
    const [printerType, setPrinterType] = useState(kioskConfig.printerType || 'receipt');
    const [isPrintEnabled, setIsPrintEnabled] = useState(kioskConfig.isPrintEnabled ?? true);
    const [logoUrl, setLogoUrl] = useState(kioskConfig.logoUrl || '');
    const [feedbackUrl, setFeedbackUrl] = useState(kioskConfig.feedbackUrl || '');

    // New color settings
    const [isCustomColorsEnabled, setIsCustomColorsEnabled] = useState(kioskConfig.isCustomColorsEnabled || false);
    const [headerColor, setHeaderColor] = useState(kioskConfig.headerColor || '#ffffff');
    const [bodyColor, setBodyColor] = useState(kioskConfig.bodyColor || '#f3f4f6'); // Default gray-100
    const [serviceGridColor, setServiceGridColor] = useState(kioskConfig.serviceGridColor || '#ffffff');

    // Sync state with currentConfig when it changes - REMOVED
    // We now use a key on the component to reset state when config changes.
    // This avoids "setState in useEffect" warnings and potential loops.

    const handleSave = () => {
        const typedConfig = currentConfig as { kiosk?: KioskConfig };
        const newConfig = {
            ...(currentConfig || {}),
            kiosk: {
                ...(typedConfig.kiosk || {}),
                pin,
                headerText,
                footerText,
                printerIp,
                printerPort,
                printerType,
                isPrintEnabled,
                logoUrl,
                feedbackUrl,
                isCustomColorsEnabled,
                headerColor,
                bodyColor,
                serviceGridColor,
            }
        };

        updateUnitMutation.mutate({ id: unitId, config: newConfig }, {
            onSuccess: () => {
                toast.success(t('save_success'));
            },
            onError: () => {
                toast.error(t('save_error'));
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('title')}</CardTitle>
                    <CardDescription>{t('description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <LogoUpload
                            label={t('logo_upload')}
                            currentLogoUrl={logoUrl}
                            onLogoUploaded={setLogoUrl}
                            onLogoRemoved={() => setLogoUrl('')}
                        />
                    </div>

                    {/* Color Settings Section */}
                    <div className="space-y-4 pt-2 pb-4 border-b">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="custom-colors">{t('use_custom_colors', { defaultValue: 'Use custom colors' })}</Label>
                            <Switch
                                id="custom-colors"
                                checked={isCustomColorsEnabled}
                                onCheckedChange={setIsCustomColorsEnabled}
                            />
                        </div>

                        {isCustomColorsEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="header-color">{t('header_color', { defaultValue: 'Header Color' })}</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            id="header-color"
                                            type="color"
                                            value={headerColor}
                                            onChange={(e) => setHeaderColor(e.target.value)}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            type="text"
                                            value={headerColor}
                                            onChange={(e) => setHeaderColor(e.target.value)}
                                            className="flex-1"
                                            placeholder="#ffffff"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="body-color">{t('body_color', { defaultValue: 'Body Color' })}</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            id="body-color"
                                            type="color"
                                            value={bodyColor}
                                            onChange={(e) => setBodyColor(e.target.value)}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            type="text"
                                            value={bodyColor}
                                            onChange={(e) => setBodyColor(e.target.value)}
                                            className="flex-1"
                                            placeholder="#f3f4f6"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="grid-color">{t('grid_color', { defaultValue: 'Service Grid Color' })}</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            id="grid-color"
                                            type="color"
                                            value={serviceGridColor}
                                            onChange={(e) => setServiceGridColor(e.target.value)}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            type="text"
                                            value={serviceGridColor}
                                            onChange={(e) => setServiceGridColor(e.target.value)}
                                            className="flex-1"
                                            placeholder="#ffffff"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="kiosk-pin">{t('pin_code')}</Label>
                        <Input
                            id="kiosk-pin"
                            type="text"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="1234"
                            maxLength={6}
                        />
                        <p className="text-xs text-muted-foreground">{t('pin_help')}</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ticket-header">{t('ticket_header')}</Label>
                        <Textarea
                            id="ticket-header"
                            value={headerText}
                            onChange={(e) => setHeaderText(e.target.value)}
                            placeholder={t('header_placeholder')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ticket-footer">{t('ticket_footer')}</Label>
                        <Textarea
                            id="ticket-footer"
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                            placeholder={t('footer_placeholder')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="feedback-url">{t('feedback_url')}</Label>
                        <Input
                            id="feedback-url"
                            value={feedbackUrl}
                            onChange={(e) => setFeedbackUrl(e.target.value)}
                            placeholder="https://example.com/survey?ticket={{ticketId}}"
                        />
                        <p className="text-xs text-muted-foreground">{t('feedback_url_help')}</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="enable-printing">{t('enable_printing')}</Label>
                            <Switch
                                id="enable-printing"
                                checked={isPrintEnabled}
                                onCheckedChange={setIsPrintEnabled}
                            />
                        </div>

                        {isPrintEnabled && (
                            <>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="printer-ip">{t('printer_ip')}</Label>
                                        <Input
                                            id="printer-ip"
                                            value={printerIp}
                                            onChange={(e) => setPrinterIp(e.target.value)}
                                            placeholder="192.168.1.100"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="printer-port">{t('printer_port')}</Label>
                                        <Input
                                            id="printer-port"
                                            value={printerPort}
                                            onChange={(e) => setPrinterPort(e.target.value)}
                                            placeholder="9100"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('printer_type')}</Label>
                                    <div className="flex gap-4">
                                        <Button
                                            variant={printerType === 'receipt' ? 'default' : 'outline'}
                                            onClick={() => setPrinterType('receipt')}
                                            className="flex-1"
                                            type="button"
                                        >
                                            {t('printer_type_receipt')}
                                        </Button>
                                        <Button
                                            variant={printerType === 'label' ? 'default' : 'outline'}
                                            onClick={() => setPrinterType('label')}
                                            className="flex-1"
                                            type="button"
                                        >
                                            {t('printer_type_label')}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <Button onClick={handleSave} disabled={updateUnitMutation.isPending}>
                        {updateUnitMutation.isPending ? t('saving') : t('save_changes')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
