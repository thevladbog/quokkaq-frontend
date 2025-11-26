'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { slotsApi, unitsApi } from '@/lib/api';

interface SlotConfigurationProps {
    unitId: string;
}

const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function SlotConfiguration({ unitId }: SlotConfigurationProps) {
    const t = useTranslations('admin.slots'); // Assuming 'slots' namespace exists or will be added
    const tCommon = useTranslations('common');
    const queryClient = useQueryClient();
    const locale = useLocale();

    // Helper function to get localized service name with hierarchy
    const getLocalizedServiceName = (service: any, servicesList?: any[]) => {
        if (!service) return '';

        const allServices = servicesList || services || [];

        const getName = (s: any) => {
            if (locale === 'ru' && s.nameRu) return s.nameRu;
            if (locale === 'en' && s.nameEn) return s.nameEn;
            return s.name;
        };

        // Build hierarchy path
        const buildPath = (s: any): string[] => {
            const path: string[] = [];
            let current = s;

            while (current) {
                path.unshift(getName(current));
                // Try to get parent from parent field or find by parentId
                if (current.parent) {
                    current = current.parent;
                } else if (current.parentId && allServices.length > 0) {
                    current = allServices.find((srv: any) => srv.id === current.parentId);
                } else {
                    current = null;
                }
            }

            return path;
        };

        const path = buildPath(service);
        return path.join(' → ');
    };

    // --- Queries ---

    const { data: services } = useQuery({
        queryKey: ['unit-services', unitId],
        queryFn: () => unitsApi.getServices(unitId),
    });

    const { data: config, isLoading: isConfigLoading } = useQuery({
        queryKey: ['slot-config', unitId],
        queryFn: () => slotsApi.getConfig(unitId),
    });

    const { data: capacities, isLoading: isCapacitiesLoading } = useQuery({
        queryKey: ['slot-capacities', unitId],
        queryFn: () => slotsApi.getCapacities(unitId),
    });

    // --- State ---

    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [interval, setInterval] = useState(30);
    const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [localCapacities, setLocalCapacities] = useState<Record<string, number>>({});

    // Initialize config state
    useEffect(() => {
        if (config) {
            setStartTime(config.startTime || '09:00');
            setEndTime(config.endTime || '17:00');
            setInterval(config.intervalMinutes || 30);
            setWorkingDays(config.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
        }
    }, [config]);

    // Initialize selected service
    useEffect(() => {
        if (services && services.length > 0 && !selectedServiceId) {
            // Find first leaf service ideally, or just first service
            const firstService = services.find(s => s.isLeaf !== false); // Assuming isLeaf property or similar
            if (firstService) {
                setSelectedServiceId(firstService.id);
            } else if (services.length > 0) {
                setSelectedServiceId(services[0].id);
            }
        }
    }, [services, selectedServiceId]);

    // Initialize local capacities map for easier editing
    // Key: "Day-Time-ServiceId" -> Capacity
    useEffect(() => {
        if (capacities) {
            const map: Record<string, number> = {};
            capacities.forEach(c => {
                map[`${c.dayOfWeek}-${c.startTime}-${c.serviceId}`] = c.capacity;
            });
            setLocalCapacities(map);
        }
    }, [capacities]);

    // --- Mutations ---

    const updateConfigMutation = useMutation({
        mutationFn: (data: { startTime: string; endTime: string; intervalMinutes: number; workingDays: string[] }) =>
            slotsApi.updateConfig(unitId, data),
        onSuccess: () => {
            toast.success(t('config_saved'));
            queryClient.invalidateQueries({ queryKey: ['slot-config', unitId] });
        },
        onError: () => toast.error(t('config_save_error')),
    });

    const updateCapacitiesMutation = useMutation({
        mutationFn: (data: Array<{ dayOfWeek: string; startTime: string; serviceId: string; capacity: number }>) =>
            slotsApi.updateCapacities(unitId, data),
        onSuccess: () => {
            toast.success(t('capacities_saved'));
            queryClient.invalidateQueries({ queryKey: ['slot-capacities', unitId] });
        },
        onError: () => toast.error(t('capacities_save_error')),
    });

    // --- Helpers ---

    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        if (!startTime || !endTime || !interval) return slots;

        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        let current = startH * 60 + startM;
        const end = endH * 60 + endM;

        while (current < end) {
            const h = Math.floor(current / 60);
            const m = current % 60;
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            current += interval;
        }

        return slots;
    }, [startTime, endTime, interval]);

    const handleConfigSave = () => {
        updateConfigMutation.mutate({
            startTime,
            endTime,
            intervalMinutes: interval,
            workingDays,
        });
    };

    const handleCapacityChange = (day: string, time: string, value: string) => {
        if (!selectedServiceId) return;
        const numVal = parseInt(value);
        if (isNaN(numVal) || numVal < 0) return;

        setLocalCapacities(prev => ({
            ...prev,
            [`${day}-${time}-${selectedServiceId}`]: numVal
        }));
    };

    const handleCapacitiesSave = () => {
        // Build updates for the currently selected service
        const currentServiceUpdates: Array<{ dayOfWeek: string; startTime: string; serviceId: string; capacity: number }> = [];

        workingDays.forEach(day => {
            timeSlots.forEach(time => {
                const key = `${day}-${time}-${selectedServiceId}`;
                const capacity = localCapacities[key] ?? 0;
                // Only include if capacity > 0
                if (capacity > 0) {
                    currentServiceUpdates.push({
                        dayOfWeek: day,
                        startTime: time,
                        serviceId: selectedServiceId,
                        capacity: capacity
                    });
                }
            });
        });

        // Merge with existing capacities from OTHER services
        const existingOtherServices = (capacities || []).filter(c => c.serviceId !== selectedServiceId);
        const allUpdates = [...existingOtherServices, ...currentServiceUpdates];

        updateCapacitiesMutation.mutate(allUpdates);
    };

    const toggleWorkingDay = (day: string) => {
        setWorkingDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    if (isConfigLoading || isCapacitiesLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('configuration_title', { defaultValue: 'Slot Configuration' })}</CardTitle>
                    <CardDescription>{t('configuration_desc', { defaultValue: 'Set working hours and interval for appointment slots.' })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>{t('start_time', { defaultValue: 'Start Time' })}</Label>
                            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('end_time', { defaultValue: 'End Time' })}</Label>
                            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('interval_minutes', { defaultValue: 'Interval (minutes)' })}</Label>
                            <Input type="number" value={interval} onChange={(e) => setInterval(parseInt(e.target.value))} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('working_days', { defaultValue: 'Working Days' })}</Label>
                        <div className="flex flex-wrap gap-4">
                            {DAYS_OF_WEEK.map(day => (
                                <div key={day} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`day-${day}`}
                                        checked={workingDays.includes(day)}
                                        onCheckedChange={() => toggleWorkingDay(day)}
                                    />
                                    <Label htmlFor={`day-${day}`}>{t(`days.${day}`, { defaultValue: day })}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleConfigSave} disabled={updateConfigMutation.isPending}>
                        {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('save_config', { defaultValue: 'Save Configuration' })}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('capacity_title', { defaultValue: 'Slot Capacities' })}</CardTitle>
                    <CardDescription>{t('capacity_desc', { defaultValue: 'Set the maximum number of appointments per slot for each service.' })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-end justify-between gap-4">
                        <div className="w-full max-w-xs space-y-2">
                            <Label>{t('select_service', { defaultValue: 'Select Service' })}</Label>
                            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('select_service_placeholder', { defaultValue: 'Select a service' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    {services?.filter(s => s.prebook !== false).map(service => (
                                        <SelectItem key={service.id} value={service.id}>
                                            {getLocalizedServiceName(service)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleCapacitiesSave} disabled={updateCapacitiesMutation.isPending || !selectedServiceId}>
                            {updateCapacitiesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            {t('save_capacities', { defaultValue: 'Save Capacities' })}
                        </Button>
                    </div>

                    {selectedServiceId && (
                        <div className="overflow-x-auto border rounded-md">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">{t('time', { defaultValue: 'Time' })}</th>
                                        {workingDays.map(day => (
                                            <th key={day} className="px-4 py-3 min-w-[100px] text-center">
                                                {t(`days.${day}`, { defaultValue: day })}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeSlots.map(time => (
                                        <tr key={time} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-4 py-2 font-medium sticky left-0 bg-white dark:bg-gray-900 z-10">{time}</td>
                                            {workingDays.map(day => {
                                                const key = `${day}-${time}-${selectedServiceId}`;
                                                const capacity = localCapacities[key] ?? 0;
                                                const hasCapacity = capacity > 0;
                                                return (
                                                    <td key={`${day}-${time}`} className="px-2 py-1">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            className={cn(
                                                                "h-8 text-center transition-colors",
                                                                hasCapacity && "bg-blue-50 dark:bg-blue-950/30 font-medium border-blue-200 dark:border-blue-900"
                                                            )}
                                                            value={capacity}
                                                            onChange={(e) => handleCapacityChange(day, time, e.target.value)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <GenerationSection unitId={unitId} t={t} />
            <DayManagementSection unitId={unitId} t={t} services={services || []} getLocalizedServiceName={getLocalizedServiceName} />
        </div>
    );
}

function GenerationSection({ unitId, t }: { unitId: string, t: any }) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const queryClient = useQueryClient();

    const generateMutation = useMutation({
        mutationFn: () => slotsApi.generate(unitId, from, to),
        onSuccess: () => {
            toast.success(t('generated_success', { defaultValue: 'Slots generated successfully' }));
            queryClient.invalidateQueries({ queryKey: ['slot-day'] }); // Invalidate day queries
        },
        onError: (err: any) => toast.error(t('generated_error', { defaultValue: 'Generation failed' }) + ': ' + err.message),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('generation_title', { defaultValue: 'Generate Slots' })}</CardTitle>
                <CardDescription>{t('generation_desc', { defaultValue: 'Generate daily slots based on the configuration above. Existing slots in the range will be overwritten.' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-end gap-4">
                    <div className="space-y-2">
                        <Label>{t('from_date', { defaultValue: 'From Date' })}</Label>
                        <DatePicker value={from} onChange={setFrom} placeholder={t('from_date', { defaultValue: 'From Date' })} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('to_date', { defaultValue: 'To Date' })}</Label>
                        <DatePicker value={to} onChange={setTo} placeholder={t('to_date', { defaultValue: 'To Date' })} />
                    </div>
                    <Button onClick={() => generateMutation.mutate()} disabled={!from || !to || generateMutation.isPending}>
                        {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('generate_btn', { defaultValue: 'Generate' })}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function DayManagementSection({ unitId, t, services, getLocalizedServiceName }: { unitId: string, t: any, services: any[], getLocalizedServiceName: (service: any, servicesList?: any[]) => string }) {
    const [date, setDate] = useState('');
    const [details, setDetails] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['slot-day', unitId, date],
        queryFn: () => slotsApi.getDay(unitId, date),
        enabled: !!date,
        retry: false,
    });

    useEffect(() => {
        if (data) {
            setDetails(data);
        } else if (date && !isLoading) {
            setDetails(null);
        }
    }, [data, date, isLoading]);

    const updateDayMutation = useMutation({
        mutationFn: (data: any) => slotsApi.updateDay(unitId, date, data),
        onSuccess: () => {
            toast.success(t('day_saved', { defaultValue: 'Day schedule saved' }));
            refetch();
        },
        onError: (err: any) => toast.error(t('day_save_error', { defaultValue: 'Failed to save day' }) + ': ' + err.message),
    });

    const handleSave = () => {
        if (!details) return;
        updateDayMutation.mutate({
            isDayOff: details.isDayOff,
            slots: details.slots.map((s: any) => ({
                serviceId: s.serviceId,
                startTime: s.startTime,
                capacity: s.capacity // This is the "Total Capacity" edited by user
            }))
        });
    };

    const handleCapacityChange = (slotId: string, newVal: string) => {
        const num = parseInt(newVal);
        if (isNaN(num) || num < 0) return;

        setDetails((prev: any) => {
            if (!prev) return null;
            return {
                ...prev,
                slots: prev.slots.map((s: any) =>
                    s.id === slotId ? { ...s, capacity: num } : s
                )
            };
        });
    };

    const toggleDayOff = (checked: boolean) => {
        setDetails((prev: any) => {
            if (!prev) return null;
            return { ...prev, isDayOff: checked };
        });
    };

    // Group slots by service for display
    const slotsByService = useMemo(() => {
        if (!details || !details.slots) return {};
        const groups: Record<string, any[]> = {};
        details.slots.forEach((s: any) => {
            if (!groups[s.serviceId]) groups[s.serviceId] = [];
            groups[s.serviceId].push(s);
        });
        return groups;
    }, [details]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('day_management_title', { defaultValue: 'Day Management' })}</CardTitle>
                <CardDescription>{t('day_management_desc', { defaultValue: 'Manage slots for a specific day.' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2 max-w-xs">
                    <Label>{t('select_day', { defaultValue: 'Select Day' })}</Label>
                    <DatePicker value={date} onChange={setDate} placeholder={t('select_day', { defaultValue: 'Select Day' })} />
                </div>

                {date && isLoading && <Loader2 className="animate-spin" />}

                {date && !isLoading && !data && (
                    <div className="text-muted-foreground italic">
                        {t('no_slots_generated', { defaultValue: 'No slots generated for this day.' })}
                    </div>
                )}

                {details && (
                    <div className="space-y-6 border p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is-day-off"
                                checked={details.isDayOff}
                                onCheckedChange={toggleDayOff}
                            />
                            <Label htmlFor="is-day-off" className="font-bold text-red-600">
                                {t('mark_as_day_off', { defaultValue: 'Mark as Day Off (Holiday)' })}
                            </Label>
                        </div>

                        {!details.isDayOff && (
                            <div className="space-y-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-800 dark:text-blue-200">
                                    {t('capacity_hint', { defaultValue: 'Hint: "Total Capacity" includes existing bookings. "Available" is calculated as Total - Booked. If you want to add 1 more slot to a fully booked time, increase Total Capacity by 1.' })}
                                </div>

                                {Object.entries(slotsByService).map(([serviceId, slots]) => {
                                    const service = services.find(s => s.id === serviceId);
                                    if (!service) return null;
                                    return (
                                        <div key={serviceId} className="space-y-2">
                                            <h4 className="font-semibold">{getLocalizedServiceName(service, services)}</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                                {slots.map((slot: any) => (
                                                    <div key={slot.id} className="border p-2 rounded text-center space-y-1">
                                                        <div className="font-medium">{slot.startTime}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {t('booked')}: {slot.booked}
                                                        </div>
                                                        <div className="text-xs text-green-600 font-medium">
                                                            {t('available')}: {Math.max(0, slot.capacity - slot.booked)}
                                                        </div>
                                                        <Input
                                                            type="number"
                                                            className="h-7 text-center text-sm"
                                                            value={slot.capacity}
                                                            onChange={(e) => handleCapacityChange(slot.id, e.target.value)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <Button onClick={handleSave} disabled={updateDayMutation.isPending}>
                            {updateDayMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('save_day', { defaultValue: 'Save Day Changes' })}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
