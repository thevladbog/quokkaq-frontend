'use client';

import { Ticket } from "@/lib/api";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface CallNotificationProps {
    ticket: Ticket | null;
    onComplete: () => void;
}

export function CallNotification({ ticket, onComplete }: CallNotificationProps) {
    const t = useTranslations('screen');

    useEffect(() => {
        if (ticket) {
            const timer = setTimeout(() => {
                onComplete();
            }, 5000); // Show for 5 seconds
            return () => clearTimeout(timer);
        }
    }, [ticket, onComplete]);

    return (
        <AnimatePresence>
            {ticket && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 100 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: -100 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                >
                    <div className="bg-green-600 text-white p-16 rounded-3xl shadow-2xl text-center border-8 border-white/20 max-w-5xl w-full mx-4">
                        <div className="text-4xl font-medium mb-8 opacity-90 uppercase tracking-widest">
                            {t('ticketCalled')}
                        </div>
                        <div className="flex items-center justify-center gap-8 mb-8">
                            <div className="text-[9rem] font-black leading-none">
                                {ticket.queueNumber}
                            </div>
                            <div className="text-8xl opacity-50">→</div>
                            <div className="flex flex-col items-center">
                                <div className="text-8xl font-bold">
                                    {ticket.counter?.name || '?'}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
