'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useUsers,
  useUnits,
  useUserUnits,
  useAssignUserToUnit,
  useRemoveUserFromUnit,
  useUpdateUser,
  useCurrentUser
} from '@/lib/hooks';
import { useTranslations } from 'next-intl';

interface UserUnit {
  id: string;
  userId: string;
  unitId: string;
  permissions: string[];
  unit: {
    id: string;
    name: string;
    code: string;
  };
}

interface Unit {
  id: string;
  name: string;
  code: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'UNIT_SETTINGS_MANAGE', label: 'Manage Unit Settings' },
  { id: 'UNIT_GRID_MANAGE', label: 'Manage Grid' },
  { id: 'UNIT_SERVICES_MANAGE', label: 'Manage Services' },
  { id: 'UNIT_TICKET_SCREEN_MANAGE', label: 'Manage Ticket Screen' },
  { id: 'UNIT_USERS_MANAGE', label: 'Manage Unit Users' },
  { id: 'ACCESS_STAFF_PANEL', label: 'Access Staff Panel' },
  { id: 'ACCESS_KIOSK', label: 'Access Kiosk' },
  { id: 'ACCESS_TICKET_SCREEN', label: 'Access Ticket Screen' },
  { id: 'ACCESS_SUPERVISOR_PANEL', label: 'Access Supervisor Panel' },
];

export default function UsersPage() {
  const { data: currentUser } = useCurrentUser();
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [debouncedUserSearchTerm, setDebouncedUserSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearchTerm(userSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [userSearchTerm]);

  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers(debouncedUserSearchTerm);
  const { data: units = [], isLoading: unitsLoading } = useUnits();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUnitToAssign, setSelectedUnitToAssign] = useState<Unit | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);


  const assignUserToUnitMutation = useAssignUserToUnit();
  const removeUserFromUnitMutation = useRemoveUserFromUnit();
  const updateUserMutation = useUpdateUser();

  // Get user units when a user is selected
  const {
    data: userUnitsData,
    isLoading: userUnitsLoading,
    refetch: refetchUserUnits
  } = useUserUnits(selectedUser || '', { enabled: !!selectedUser });

  const t = useTranslations('admin');

  // Update selectedUserUnits when userUnitsData changes
  const selectedUserUnitIds = (userUnitsData as UserUnit[])?.map((uu) => uu.unitId) || [];

  const openAssignDialog = (unit: Unit) => {
    setSelectedUnitToAssign(unit);
    setSelectedPermissions([]);
    setAssignDialogOpen(true);
  };

  const handleAssignUnit = async () => {
    if (!selectedUser || !selectedUnitToAssign) return;

    try {
      await assignUserToUnitMutation.mutateAsync({
        userId: selectedUser,
        unitId: selectedUnitToAssign.id,
        permissions: selectedPermissions
      });
      // Refresh user's units
      refetchUserUnits();
      setAssignDialogOpen(false);
      setSelectedUnitToAssign(null);
      setSelectedPermissions([]);
    } catch (error) {
      console.error('Failed to assign unit to user:', error);
    }
  };

  // Handle unit removal
  const handleRemoveUnit = async (userId: string, unitId: string) => {
    try {
      await removeUserFromUnitMutation.mutateAsync({ userId, unitId });
      // Refresh user's units
      refetchUserUnits();
    } catch (error) {
      console.error('Failed to remove unit from user:', error);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleEditPermissions = (userUnit: UserUnit) => {
    setSelectedUnitToAssign(userUnit.unit);
    setSelectedPermissions(userUnit.permissions || []);
    setAssignDialogOpen(true);
  }

  const handleToggleSystemAdmin = async (checked: boolean) => {
    if (!selectedUser) return;
    try {
      const roles = checked ? ['admin'] : [];
      await updateUserMutation.mutateAsync({
        userId: selectedUser,
        data: { roles }
      });
      // Ideally we should refetch users to update the list/state locally, 
      // but useUsers hook should handle invalidation if set up correctly.
      // Our useUpdateUser invalidates 'users' query, so it should be fine.
    } catch (error) {
      console.error('Failed to update user roles:', error);
    }
  };

  if (usersError) {
    return <div className="container mx-auto p-4">{t('users.error_loading', { error: (usersError as Error).message })}</div>;
  }

  const selectedUserData = users.find(user => user.id === selectedUser);
  // Roles are now transformed to string[] by Zod schema
  const isSystemAdmin = selectedUserData?.roles?.includes('admin');

  // Helper to get translated permission label
  const getPermissionLabel = (permissionId: string) => {

    return t(`users.permissions_list.${permissionId}`) || permissionId;
  };

  // Filter available units based on current user permissions
  const getAvailableUnits = () => {
    if (!units) return [];

    // Admin sees all units
    if (currentUser?.roles?.includes('admin')) {
      return units;
    }

    // Regular users see only units where they have UNIT_USERS_MANAGE permission
    const allowedUnitIds = Object.entries(currentUser?.permissions || {})
      .filter(([_, perms]) => (perms as string[]).includes('UNIT_USERS_MANAGE'))
      .map(([unitId]) => unitId);

    return (units as Unit[]).filter(u => allowedUnitIds.includes(u.id));
  };

  const availableUnits = getAvailableUnits();

  // Check if current user can manage the selected unit assignment
  const canManageUnit = (unitId: string) => {
    if (currentUser?.roles?.includes('admin')) return true;
    const perms = currentUser?.permissions?.[unitId] || [];
    return perms.includes('UNIT_USERS_MANAGE');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">{t('users.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t('users.users_list')}</CardTitle>
            <CardDescription>{t('users.all_users')}</CardDescription>
            <div className="mt-2">
              <Input
                placeholder={t('users.search_placeholder')}
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {usersLoading ? (
                <div className="text-center py-4">{t('users.loading_users')}</div>
              ) : users.length === 0 ? (
                <div className="text-center py-4">{t('users.no_users')}</div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 rounded border cursor-pointer ${selectedUser === user.id ? 'bg-accent border-primary' : 'hover:bg-accent'
                      }`}
                    onClick={() => setSelectedUser(user.id)}
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Details and Units Assignment */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('users.user_details_units')}</CardTitle>
            <CardDescription>
              {selectedUserData
                ? t('users.manage_units_for', { name: selectedUserData.name })
                : t('users.select_user_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-6">
                {/* System Admin Toggle - Only visible to Admins */}
                {currentUser?.roles?.includes('admin') && (
                  <div className="flex items-center justify-between border p-4 rounded bg-muted/20">
                    <div>
                      <h3 className="font-medium">{t('users.system_admin')}</h3>
                      <p className="text-sm text-muted-foreground">{t('users.system_admin_desc')}</p>
                    </div>
                    <Switch
                      checked={!!isSystemAdmin}
                      onCheckedChange={handleToggleSystemAdmin}
                      disabled={updateUserMutation.isPending}
                    />
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-medium mb-2">{t('users.assigned_units')}</h3>
                  <div className="border rounded p-4">
                    {userUnitsLoading ? (
                      <div>{t('users.loading_units')}</div>
                    ) : (
                      <>
                        {userUnitsData && userUnitsData.length > 0 ? (
                          (userUnitsData as UserUnit[]).map((uu) => (
                            <div key={uu.id} className="flex flex-col p-3 border-b last:border-0">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{uu.unit?.name || 'Unknown Unit'} ({uu.unit?.code || '???'})</span>
                                <div className="flex gap-2">
                                  {canManageUnit(uu.unitId) && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditPermissions(uu)}
                                      >
                                        {t('users.permissions')}
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleRemoveUnit(selectedUser, uu.unitId)}
                                        disabled={removeUserFromUnitMutation.isPending}
                                      >
                                        {t('users.remove')}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {uu.permissions && uu.permissions.length > 0
                                  ? uu.permissions.map(p => getPermissionLabel(p)).join(', ')
                                  : t('users.no_permissions_assigned')}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground italic">{t('users.no_units_assigned')}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">{t('users.available_units')}</h3>
                  <Input
                    placeholder={t('users.search_units')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border rounded p-4 max-h-60 overflow-y-auto">
                    {unitsLoading ? (
                      <div>{t('users.loading_units')}</div>
                    ) : (
                      <>
                        {availableUnits
                          .filter((unit) =>
                            !selectedUserUnitIds.includes(unit.id)
                          )
                          .filter((unit) =>
                            unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            unit.code.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((unit) => (
                            <div key={unit.id} className="flex justify-between items-center p-2 border-b">
                              <span>{unit.name} ({unit.code})</span>
                              <Button
                                size="sm"
                                onClick={() => openAssignDialog(unit)}
                              >
                                {t('users.assign')}
                              </Button>
                            </div>
                          ))}
                        {availableUnits
                          .filter((unit) =>
                            !selectedUserUnitIds.includes(unit.id)
                          )
                          .filter((unit) =>
                            unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            unit.code.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .length === 0 && (
                            <p className="text-muted-foreground italic">{t('users.no_available_units')}</p>
                          )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('users.select_user_prompt')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('users.assign_unit_title', { name: selectedUnitToAssign?.name || '' })}</DialogTitle>
            <DialogDescription>
              {t('users.assign_unit_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <div key={permission.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={permission.id}
                    checked={selectedPermissions.includes(permission.id)}
                    onCheckedChange={() => togglePermission(permission.id)}
                  />
                  <Label htmlFor={permission.id}>{getPermissionLabel(permission.id)}</Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>{t('users.cancel')}</Button>
            <Button onClick={handleAssignUnit} disabled={assignUserToUnitMutation.isPending}>
              {assignUserToUnitMutation.isPending ? t('users.saving') : t('users.save_permissions')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}