'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LockScreenProps {
    isLocked: boolean;
    onUnlockRequest: () => void;
}

export function LockScreen({ isLocked, onUnlockRequest }: LockScreenProps) {
    const t = useTranslations('kiosk.lock_screen');
    const [clickCount, setClickCount] = useState(0);

    if (!isLocked) return null;

    const handleUnlockClick = () => {
        const newCount = clickCount + 1;
        setClickCount(newCount);

        if (newCount >= 5) {
            onUnlockRequest();
            setClickCount(0);
        } else {
            // Reset clicks if not continued quickly
            setTimeout(() => setClickCount(0), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
            <div
                className="bg-card p-8 rounded-full mb-6 shadow-lg cursor-pointer"
                onClick={handleUnlockClick}
            >
                <Lock className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t('kiosk_locked', { defaultValue: 'Kiosk Locked' })}</h1>
            <p className="text-muted-foreground max-w-md">
                {t('contact_admin', { defaultValue: 'This kiosk is currently locked. Please contact an administrator.' })}
            </p>
        </div>
    );
}
