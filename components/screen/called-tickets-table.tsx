import { Ticket } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface CalledTicketsTableProps {
    tickets: Ticket[];
    backgroundColor?: string;
}

export function CalledTicketsTable({ tickets, backgroundColor }: CalledTicketsTableProps) {
    const t = useTranslations('screen');
    // Find the most recent ticket that is actually in 'called' status
    const latest = tickets.find(t => t.status === 'called');
    // All other tickets (including in_service and older called ones) go to the list
    const others = tickets.filter(t => t.id !== latest?.id);

    // Determine grid columns based on count
    let gridCols = "grid-cols-1";
    if (others.length > 12) gridCols = "grid-cols-3";
    else if (others.length > 6) gridCols = "grid-cols-2";

    return (
        <div className="h-full flex flex-col gap-4 p-4 bg-background" style={{ backgroundColor: backgroundColor || undefined }}>
            {/* Latest called ticket - Big and highlighted */}
            <div className="flex-none">
                <div className="text-2xl text-muted-foreground mb-2 text-center uppercase tracking-widest">{t('nowCalling')}</div>
                {latest ? (
                    <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden">
                        <div className="flex items-center justify-center p-8 gap-8">
                            <div className="text-[10rem] font-black leading-none tracking-tighter">
                                {latest.queueNumber}
                            </div>
                            <div className="text-6xl opacity-50">→</div>
                            <div className="flex flex-col items-center">
                                <div className="text-3xl opacity-80 mb-2 uppercase tracking-widest">{t('counter')}</div>
                                <div className="text-6xl font-bold">
                                    {latest.counter?.name || '---'}
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Card className="bg-muted border-none shadow-inner h-[400px] flex items-center justify-center">
                        <span className="text-4xl text-muted-foreground opacity-50">---</span>
                    </Card>
                )}
            </div>

            {/* Previous tickets list */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="text-xl text-muted-foreground mb-4 mt-8 text-center uppercase tracking-widest">{t('lastCalled')}</div>
                <div className={`grid ${gridCols} gap-3 overflow-y-auto pr-2 content-start`}>
                    {others.map((ticket) => {
                        let bgClass = "bg-card/50 border-border/50";
                        if (ticket.status === 'in_service') bgClass = "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800";
                        else if (ticket.status === 'served') bgClass = "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-75";

                        return (
                            <Card key={ticket.id} className={`flex items-center justify-center p-4 ${bgClass}`}>
                                <div className="flex items-center gap-3 text-2xl font-semibold">
                                    <span className="text-foreground">{ticket.queueNumber}</span>
                                    <span className="text-muted-foreground opacity-50">→</span>
                                    <span className="text-foreground">{ticket.counter?.name}</span>
                                </div>
                            </Card>
                        );
                    })}
                    {others.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-8 opacity-50">
                            {t('noHistory')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
