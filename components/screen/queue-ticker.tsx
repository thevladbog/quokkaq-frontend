import { Ticket } from "@/lib/api";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

interface QueueTickerProps {
    tickets: Ticket[];
}

export function QueueTicker({ tickets }: QueueTickerProps) {
    const t = useTranslations('screen');

    // Calculate duration: base 8s + 0.8s per ticket for moderate speed
    // We use a fixed base because we are now traversing the full viewport width
    const duration = 15 + (tickets.length * 0.8);

    return (
        <div className="bg-foreground text-background h-16 flex items-center overflow-hidden relative whitespace-nowrap">
            <div className="absolute left-0 top-0 bottom-0 bg-foreground z-10 px-4 flex items-center font-bold text-xl uppercase tracking-wider shadow-[10px_0_20px_rgba(0,0,0,0.5)]">
                {t('waiting')}:
            </div>

            <div className="flex items-center overflow-hidden w-full">
                {tickets.length > 0 ? (
                    <motion.div
                        className="flex items-center gap-16"
                        initial={{ x: "100vw" }}
                        animate={{ x: "-100%" }}
                        transition={{
                            repeat: Infinity,
                            ease: "linear",
                            duration: duration,
                            repeatType: "loop"
                        }}
                    >
                        {tickets.map((ticket) => (
                            <span key={ticket.id} className="text-2xl font-mono font-bold">
                                {ticket.queueNumber}
                            </span>
                        ))}
                    </motion.div>
                ) : (
                    <span className="text-xl opacity-70 pl-4">{t('queueEmpty')}</span>
                )}
            </div>
        </div>
    );
}
