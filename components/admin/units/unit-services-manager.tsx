'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    useUnits,
    useUnitServices,
    useCreateService,
    useUpdateService,
    useDeleteService
} from '@/lib/hooks';
import { useTranslations } from 'next-intl';
import { ImageUpload } from '@/components/ui/image-upload';

interface Service {
    id: string;
    name: string;
    nameRu?: string | null;
    nameEn?: string | null;
    description?: string | null;
    descriptionRu?: string | null;
    descriptionEn?: string | null;
    imageUrl?: string | null;
    backgroundColor?: string | null;
    textColor?: string | null;
    prefix?: string | null;
    numberSequence?: string | null;
    duration?: number | null; // Maximum service time in minutes
    maxWaitingTime?: number | null; // Maximum waiting time in seconds
    prebook: boolean;
    isLeaf: boolean;
    unitId: string;
    parentId?: string | null;
    parent?: Service | null;
    children?: Service[];
}

interface UnitServicesManagerProps {
    unitId: string;
}

export function UnitServicesManager({ unitId }: UnitServicesManagerProps) {
    const [selectedUnitId] = useState<string>(unitId);

    const { data: units = [] } = useUnits();
    const {
        data: services = [],
        isLoading: servicesLoading,
        refetch
    } = useUnitServices(selectedUnitId);

    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formValues, setFormValues] = useState<Partial<Service>>({
        name: '',
        nameRu: '',
        nameEn: '',
        description: '',
        descriptionRu: '',
        descriptionEn: '',
        imageUrl: '',
        backgroundColor: '',
        textColor: '',
        prefix: '',
        numberSequence: '',
        duration: undefined,
        maxWaitingTime: undefined,
        prebook: false,
        isLeaf: false
    });

    const createServiceMutation = useCreateService();
    const updateServiceMutation = useUpdateService();
    const deleteServiceMutation = useDeleteService();

    const t = useTranslations('admin');
    const tRoot = useTranslations();

    useEffect(() => {
        if (editingService) {
            setFormValues({
                name: editingService.name,
                nameRu: editingService.nameRu,
                nameEn: editingService.nameEn,
                description: editingService.description,
                descriptionRu: editingService.descriptionRu,
                descriptionEn: editingService.descriptionEn,
                imageUrl: editingService.imageUrl,
                backgroundColor: editingService.backgroundColor,
                textColor: editingService.textColor,
                prefix: editingService.prefix,
                numberSequence: editingService.numberSequence,
                duration: editingService.duration,
                maxWaitingTime: editingService.maxWaitingTime,
                prebook: editingService.prebook,
                isLeaf: editingService.isLeaf,
                parentId: editingService.parentId
            });
        } else if (isCreating) {
            setFormValues({
                name: '',
                nameRu: '',
                nameEn: '',
                description: '',
                descriptionRu: '',
                descriptionEn: '',
                imageUrl: '',
                backgroundColor: '',
                textColor: '',
                prefix: '',
                numberSequence: '',
                duration: undefined,
                maxWaitingTime: undefined,
                prebook: false,
                isLeaf: false,
                parentId: ''
            });
        }
    }, [editingService, isCreating]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        setFormValues(prev => ({
            ...prev,
            [name]: val
        }));
    };

    const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({
            ...prev,
            [name]: value ? Number(value) : undefined
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedUnitId) return;

        try {
            if (editingService) {
                await updateServiceMutation.mutateAsync({
                    id: editingService.id,
                    ...formValues,
                    name: formValues.name || editingService.name,
                    prebook: formValues.prebook ?? editingService.prebook,
                    isLeaf: formValues.isLeaf ?? editingService.isLeaf
                });
            } else {
                if (!formValues.name) return;
                await createServiceMutation.mutateAsync({
                    ...formValues,
                    name: formValues.name,
                    unitId: selectedUnitId,
                    prebook: formValues.prebook ?? false,
                    isLeaf: formValues.isLeaf ?? false
                });
            }

            // Reset form and refetch services
            setEditingService(null);
            setIsCreating(false);
            refetch();
        } catch (error) {
            console.error('Error saving service:', error);
        }
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setIsCreating(false);
    };

    const handleDelete = async (serviceId: string) => {
        if (confirm('Are you sure you want to delete this service?')) {
            try {
                await deleteServiceMutation.mutateAsync({ id: serviceId });
                refetch();
            } catch (error) {
                console.error('Error deleting service:', error);
            }
        }
    };

    const handleCancel = () => {
        setEditingService(null);
        setIsCreating(false);
    };

    const selectedUnit = units.find(unit => unit.id === selectedUnitId);

    return (
        <div className="container mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Services List */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>{t('services.title')}</CardTitle>
                        <CardDescription>
                            {t('services.description', { unit: selectedUnit?.name || 'selected unit' })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <Button onClick={() => { setIsCreating(true); setEditingService(null); }}>
                                {t('services.add_new')}
                            </Button>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('services.name')}</TableHead>
                                    <TableHead>{t('services.ticket_prefix')}</TableHead>
                                    <TableHead>{t('services.duration_short')}</TableHead>
                                    <TableHead>{t('services.is_leaf_short')}</TableHead>
                                    <TableHead>{t('services.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {servicesLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">
                                            Loading services...
                                        </TableCell>
                                    </TableRow>
                                ) : services.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center">
                                            {t('services.no_services_found', { defaultValue: 'No services found' })}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    services.map((service) => (
                                        <TableRow key={service.id}>
                                            <TableCell className="font-medium">{service.name}</TableCell>
                                            <TableCell>{service.prefix || '-'}</TableCell>
                                            <TableCell>{service.duration ? `${service.duration} min` : '-'}</TableCell>
                                            <TableCell>{service.isLeaf ? 'Yes' : 'No'}</TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(service as unknown as Service)}
                                                    >
                                                        {t('services.edit')}
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(service.id)}
                                                    >
                                                        {tRoot('general.delete', { defaultValue: 'Delete' })}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Service Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {editingService ? t('services.edit') : isCreating ? t('services.add_new') : t('services.title')}
                        </CardTitle>
                        <CardDescription>
                            {editingService
                                ? t('services.editing_desc', { name: editingService.name, defaultValue: `Editing service: ${editingService.name}` })
                                : isCreating
                                    ? t('services.creating_desc', { defaultValue: 'Create a new service' })
                                    : t('services.select_desc', { defaultValue: 'Select a service to edit or create a new one' })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(editingService || isCreating) && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('services.name')} (EN) *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formValues.name || ''}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="nameRu">{tRoot('forms.fields.name_ru')}</Label>
                                    <Input
                                        id="nameRu"
                                        name="nameRu"
                                        value={formValues.nameRu || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="nameEn">{tRoot('forms.fields.name_en')}</Label>
                                    <Input
                                        id="nameEn"
                                        name="nameEn"
                                        value={formValues.nameEn || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">{tRoot('forms.fields.desc_en')}</Label>
                                    <Input
                                        id="description"
                                        name="description"
                                        value={formValues.description || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="descriptionRu">{tRoot('forms.fields.desc_ru')}</Label>
                                    <Input
                                        id="descriptionRu"
                                        name="descriptionRu"
                                        value={formValues.descriptionRu || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="descriptionEn">{tRoot('forms.fields.desc_en_short')}</Label>
                                    <Input
                                        id="descriptionEn"
                                        name="descriptionEn"
                                        value={formValues.descriptionEn || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <ImageUpload
                                        label={tRoot('forms.fields.image_url')}
                                        value={formValues.imageUrl}
                                        onChange={(url) => setFormValues(prev => ({ ...prev, imageUrl: url }))}
                                        onRemove={() => setFormValues(prev => ({ ...prev, imageUrl: '' }))}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="backgroundColor">{tRoot('forms.fields.bg_color')}</Label>
                                        <Input
                                            id="backgroundColor"
                                            name="backgroundColor"
                                            type="color"
                                            value={formValues.backgroundColor || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="textColor">{tRoot('forms.fields.text_color')}</Label>
                                        <Input
                                            id="textColor"
                                            name="textColor"
                                            type="color"
                                            value={formValues.textColor || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="prefix">{tRoot('forms.fields.prefix')}</Label>
                                        <Input
                                            id="prefix"
                                            name="prefix"
                                            value={formValues.prefix || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="numberSequence">{tRoot('forms.fields.number_sequence')}</Label>
                                        <Input
                                            id="numberSequence"
                                            name="numberSequence"
                                            value={formValues.numberSequence || ''}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="parentId">{tRoot('forms.fields.parent_service')}</Label>
                                    <select
                                        id="parentId"
                                        name="parentId"
                                        value={formValues.parentId || ''}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border rounded"
                                    >
                                        <option value="">{tRoot('forms.fields.no_parent')}</option>
                                        {services
                                            .filter(s => s.id !== editingService?.id) // Don't show current service as option
                                            .map(service => (
                                                <option key={service.id} value={service.id}>
                                                    {service.name} {service.parentId ? `(child of ${services.find(s => s.id === service.parentId)?.name})` : ''}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="duration">{tRoot('forms.fields.max_duration')}</Label>
                                    <Input
                                        id="duration"
                                        name="duration"
                                        type="number"
                                        min="1"
                                        value={formValues.duration || ''}
                                        onChange={handleNumberInputChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="maxWaitingTime">{tRoot('forms.fields.max_waiting_time')}</Label>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <Label htmlFor="mwt_minutes" className="text-xs text-muted-foreground">Minutes</Label>
                                            <Input
                                                id="mwt_minutes"
                                                type="number"
                                                min="0"
                                                value={formValues.maxWaitingTime ? Math.floor(formValues.maxWaitingTime / 60) : 0}
                                                onChange={(e) => {
                                                    const mins = parseInt(e.target.value) || 0;
                                                    const secs = (formValues.maxWaitingTime || 0) % 60;
                                                    setFormValues(prev => ({ ...prev, maxWaitingTime: (mins * 60) + secs }));
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label htmlFor="mwt_seconds" className="text-xs text-muted-foreground">Seconds</Label>
                                            <Input
                                                id="mwt_seconds"
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={formValues.maxWaitingTime ? formValues.maxWaitingTime % 60 : 0}
                                                onChange={(e) => {
                                                    const secs = parseInt(e.target.value) || 0;
                                                    const mins = Math.floor((formValues.maxWaitingTime || 0) / 60);
                                                    setFormValues(prev => ({ ...prev, maxWaitingTime: (mins * 60) + secs }));
                                                }}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setFormValues(prev => ({ ...prev, maxWaitingTime: undefined }))}
                                            disabled={formValues.maxWaitingTime === undefined || formValues.maxWaitingTime === 0}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Total: {formValues.maxWaitingTime || 0} seconds
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center">
                                        <input
                                            id="prebook"
                                            name="prebook"
                                            type="checkbox"
                                            checked={!!formValues.prebook}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        <Label htmlFor="prebook">{tRoot('forms.fields.allow_prebooking')}</Label>
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            id="isLeaf"
                                            name="isLeaf"
                                            type="checkbox"
                                            checked={!!formValues.isLeaf}
                                            onChange={handleInputChange}
                                            className="mr-2"
                                        />
                                        <Label htmlFor="isLeaf">{tRoot('forms.fields.is_leaf')}</Label>
                                    </div>
                                </div>

                                <div className="flex space-x-2 pt-4">
                                    <Button type="submit" disabled={createServiceMutation.isPending || updateServiceMutation.isPending}>
                                        {createServiceMutation.isPending || updateServiceMutation.isPending
                                            ? tRoot('common.loading', { defaultValue: 'Saving...' })
                                            : editingService
                                                ? tRoot('general.update', { defaultValue: 'Update' })
                                                : tRoot('general.create', { defaultValue: 'Create' })}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleCancel}>
                                        {tRoot('general.cancel', { defaultValue: 'Cancel' })}
                                    </Button>
                                </div>
                            </form>
                        )}

                        {!editingService && !isCreating && (
                            <div className="text-center text-muted-foreground py-8">
                                {t('services.select_to_edit_or_click_add', { defaultValue: 'Select a service to edit or click "Add New Service"' })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
