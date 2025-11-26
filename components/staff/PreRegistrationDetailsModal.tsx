import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ticket } from "@/lib/api";
import { useTranslations } from "next-intl";
import { Calendar, Clock, Phone, User, FileText, Hash } from "lucide-react";

interface PreRegistrationDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: Ticket | null;
}

export function PreRegistrationDetailsModal({
    isOpen,
    onClose,
    ticket,
}: PreRegistrationDetailsModalProps) {
    const t = useTranslations("staff.pre_registration");

    if (!ticket || !ticket.preRegistration) return null;

    const { preRegistration } = ticket;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("details_title", { defaultValue: "Pre-registration Details" })}</DialogTitle>
                    <DialogDescription>
                        {t("details_description", { defaultValue: "Information about the pre-registered appointment." })}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <User className="h-4 w-4 text-muted-foreground justify-self-end" />
                        <div className="col-span-3">
                            <div className="text-sm font-medium">{t("customer_name", { defaultValue: "Customer Name" })}</div>
                            <div className="text-sm text-muted-foreground">{preRegistration.customerName}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Phone className="h-4 w-4 text-muted-foreground justify-self-end" />
                        <div className="col-span-3">
                            <div className="text-sm font-medium">{t("customer_phone", { defaultValue: "Phone" })}</div>
                            <div className="text-sm text-muted-foreground">{preRegistration.customerPhone}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Hash className="h-4 w-4 text-muted-foreground justify-self-end" />
                        <div className="col-span-3">
                            <div className="text-sm font-medium">{t("code", { defaultValue: "Code" })}</div>
                            <div className="text-sm text-muted-foreground font-mono">{preRegistration.code}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Calendar className="h-4 w-4 text-muted-foreground justify-self-end" />
                        <div className="col-span-3">
                            <div className="text-sm font-medium">{t("date", { defaultValue: "Date" })}</div>
                            <div className="text-sm text-muted-foreground">{preRegistration.date}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Clock className="h-4 w-4 text-muted-foreground justify-self-end" />
                        <div className="col-span-3">
                            <div className="text-sm font-medium">{t("time", { defaultValue: "Time" })}</div>
                            <div className="text-sm text-muted-foreground">{preRegistration.time}</div>
                        </div>
                    </div>
                    {preRegistration.comment && (
                        <div className="grid grid-cols-4 items-start gap-4">
                            <FileText className="h-4 w-4 text-muted-foreground justify-self-end mt-1" />
                            <div className="col-span-3">
                                <div className="text-sm font-medium">{t("comment", { defaultValue: "Comment" })}</div>
                                <div className="text-sm text-muted-foreground italic">&ldquo;{preRegistration.comment}&rdquo;</div>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={onClose}>{t("close", { defaultValue: "Close" })}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
