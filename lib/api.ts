import { z } from 'zod';

// Define Zod schemas for type validation
const UserModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  unitIds: z.array(z.string()).optional(),
  roles: z
    .union([
      z.array(z.string()),
      z.array(
        z.object({
          role: z.object({
            name: z.string()
          })
        })
      )
    ])
    .optional()
    .transform((val): string[] => {
      if (!val) return [];
      return val.map((v) => {
        if (typeof v === 'string') return v;
        return v.role.name;
      });
    }),
  type: z.string().optional(),
  permissions: z.record(z.array(z.string())).optional(),
  units: z
    .array(
      z.object({
        unitId: z.string(),
        permissions: z.array(z.string()).optional().default([]),
        unit: z
          .object({
            companyId: z.string()
          })
          .optional()
      })
    )
    .optional()
});

type ServiceModel = {
  id: string;
  unitId: string;
  parentId?: string | null;
  parent?: ServiceModel | null;
  children?: ServiceModel[];
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
  duration?: number | null;
  maxWaitingTime?: number | null;
  prebook?: boolean;
  isLeaf?: boolean;
  gridRow?: number | null;
  gridCol?: number | null;
  gridRowSpan?: number | null;
  gridColSpan?: number | null;
};

const ServiceModelSchema: z.ZodType<ServiceModel> = z.object({
  id: z.string(),
  unitId: z.string(),
  parentId: z.string().nullable().optional(),
  parent: z
    .lazy(() => ServiceModelSchema)
    .nullable()
    .optional(),
  children: z.array(z.lazy(() => ServiceModelSchema)).optional(),
  name: z.string(),
  nameRu: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  descriptionRu: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  backgroundColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
  prefix: z.string().nullable().optional(),
  numberSequence: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  maxWaitingTime: z.number().nullable().optional(),
  prebook: z.boolean().optional(),
  isLeaf: z.boolean().optional(),
  gridRow: z.number().nullable().optional(),
  gridCol: z.number().nullable().optional(),
  gridRowSpan: z.number().nullable().optional(),
  gridColSpan: z.number().nullable().optional()
});

const UnitModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  companyId: z.string(),
  timezone: z.string(),
  config: z.custom<UnitConfig>().nullable().optional(),
  services: z.array(ServiceModelSchema).optional()
});

const TicketModelSchema = z.object({
  id: z.string(),
  queueNumber: z.string(),
  unitId: z.string(),
  serviceId: z.string(),
  status: z.string(),
  priority: z.number().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  calledAt: z.string().nullable().optional(),
  maxWaitingTime: z.number().nullable().optional(),
  counter: z
    .object({
      id: z.string(),
      name: z.string()
    })
    .nullable()
    .optional(),
  preRegistration: z
    .object({
      id: z.string(),
      customerName: z.string(),
      customerPhone: z.string(),
      code: z.string(),
      date: z.string(),
      time: z.string(),
      comment: z.string().optional()
    })
    .nullable()
    .optional()
});

const BookingModelSchema = z.object({
  id: z.string(),
  userName: z.string().nullable().optional(),
  userPhone: z.string().nullable().optional(),
  unitId: z.string(),
  serviceId: z.string(),
  scheduledAt: z.string().nullable().optional(),
  status: z.string(),
  code: z.string(),
  createdAt: z.string().nullable().optional()
});

const CounterModelSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  name: z.string(),
  assignedTo: z.string().nullable().optional(),
  assignedUser: z
    .object({
      name: z.string()
    })
    .optional()
});

export type User = z.infer<typeof UserModelSchema>;
export type Unit = z.infer<typeof UnitModelSchema>;
export type Service = z.infer<typeof ServiceModelSchema>;
export type Ticket = z.infer<typeof TicketModelSchema>;
export type Booking = z.infer<typeof BookingModelSchema>;
export type Counter = z.infer<typeof CounterModelSchema>;

export type Material = {
  id: string;
  type: string;
  url: string;
  filename: string;
  createdAt: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
};

export interface AdScreenConfig {
  width: number;
  duration: number;
  activeMaterialIds: string[];
  logoUrl?: string;
  isCustomColorsEnabled?: boolean;
  headerColor?: string;
  bodyColor?: string;
}

export interface KioskConfig {
  pin?: string;
  headerText?: string;
  footerText?: string;
  printerIp?: string;
  printerPort?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  isCustomColorsEnabled?: boolean;
  headerColor?: string;
  bodyColor?: string;
  serviceGridColor?: string;
  logoUrl?: string;
  printerType?: string;
  isPrintEnabled?: boolean;
  feedbackUrl?: string;
  isPreRegistrationEnabled?: boolean;
}

export interface UnitConfig {
  adScreen?: AdScreenConfig;
  kiosk?: KioskConfig;
  logoUrl?: string;
  [key: string]: unknown;
}

// Base API configuration
const API_BASE_URL = '/api';

// Create a base fetch function with proper error handling and authentication
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  schema?: z.ZodType<T, z.ZodTypeDef, unknown>
): Promise<T> {
  let token = null;
  let refreshToken = null;
  let currentLocale = null;

  // Only access localStorage and navigator on the client side
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('access_token') || null;
    refreshToken = localStorage.getItem('refresh_token') || null;

    // Determine locale from localStorage (if set) or navigator language as fallback
    const lsLocale = localStorage.getItem('NEXT_LOCALE');
    const navLocale = window.navigator?.language?.split('-')[0] || 'en';
    const inferredLocale = lsLocale || navLocale;
    currentLocale = ['en', 'ru'].includes(inferredLocale)
      ? inferredLocale
      : 'en';
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }), // Add token if available
      ...(currentLocale && { 'Accept-Language': currentLocale }), // Add locale to headers
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);

    // If we get a 401 Unauthorized error, we might need to refresh the token (only on client)
    if (response.status === 401 && typeof window !== 'undefined') {
      // Attempt to refresh the token
      try {
        if (refreshToken) {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshToken}`
            }
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            localStorage.setItem('access_token', refreshData.accessToken);

            // Retry the original request with the new token
            const retryConfig = {
              ...options,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${refreshData.accessToken}`,
                ...options.headers
              }
            };

            const retryResponse = await fetch(url, retryConfig);
            if (!retryResponse.ok) {
              throw new Error(
                `API Error: ${retryResponse.status} - ${await retryResponse.text()}`
              );
            }

            const retryData = await retryResponse.json();
            if (schema) {
              return schema.parse(retryData);
            }
            return retryData;
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }

      // If refresh failed or no refresh token, clear stored tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      // Notify the app that auth is no longer valid so UI can react (logout/redirect)
      try {
        if (typeof window !== 'undefined') {
          // Use a custom event so components can react to global unauthenticated state
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      } catch (e) {
        console.warn('Failed to dispatch auth:logout event', e);
      }

      throw new Error(`Unauthorized: ${await response.text()}`);
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();

    // Validate data against schema if provided
    if (schema) {
      try {
        return schema.parse(data);
      } catch (zodError) {
        // Log the full response and schema mismatch to aid debugging
        console.error(
          'Zod parse error while validating API response for',
          url,
          zodError,
          { data }
        );
        throw zodError;
      }
    }

    return data;
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
}

// Auth API functions
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiRequest<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }).then((res) => ({ accessToken: res.token })), // Map 'token' to 'accessToken' for frontend compatibility

  me: (token: string) =>
    apiRequest<User>(
      '/auth/me',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      UserModelSchema
    ),

  getMe: () => apiRequest<User>('/auth/me', {}, UserModelSchema),

  refresh: (refreshToken: string) =>
    apiRequest<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshToken}`
      }
    })
};

// User API functions
export const usersApi = {
  getAll: (search?: string) => {
    const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest<User[]>(
      `/users${queryParams}`,
      {},
      z.array(UserModelSchema)
    );
  },

  getById: (id: string) =>
    apiRequest<User>(`/users/${id}`, {}, UserModelSchema),

  create: (userData: { name: string; email?: string; password?: string }) =>
    apiRequest<User>(
      '/users',
      {
        method: 'POST',
        body: JSON.stringify(userData)
      },
      UserModelSchema
    ),

  getUserUnits: (userId: string) =>
    apiRequest<unknown[]>(`/users/${userId}/units`, {}),

  setUserUnits: (
    userId: string,
    units: { unitId: string; permissions: string[] }[]
  ) =>
    apiRequest<unknown>(`/users/${userId}/units`, {
      method: 'POST',
      body: JSON.stringify({ units })
    }),

  assignUserToUnit: (
    userId: string,
    unitId: string,
    permissions: string[] = []
  ) =>
    apiRequest<unknown>(`/users/${userId}/units/assign`, {
      method: 'POST',
      body: JSON.stringify({ unitId, permissions })
    }),

  removeUserFromUnit: (userId: string, unitId: string) =>
    apiRequest<unknown>(`/users/${userId}/units/remove`, {
      method: 'POST',
      body: JSON.stringify({ unitId })
    }),

  update: (
    userId: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      roles?: string[];
    }
  ) =>
    apiRequest<User>(
      `/users/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data)
      },
      UserModelSchema
    )
};

// Unit API functions
export const unitsApi = {
  getAll: () => apiRequest<Unit[]>('/units', {}, z.array(UnitModelSchema)),

  getById: (id: string) =>
    apiRequest<Unit>(`/units/${id}`, {}, UnitModelSchema),

  getServices: (unitId: string) =>
    apiRequest<Service[]>(
      `/units/${unitId}/services`,
      {},
      z.array(ServiceModelSchema)
    ),

  getTickets: (unitId: string) =>
    apiRequest<Ticket[]>(
      `/units/${unitId}/tickets`,
      {},
      z.array(TicketModelSchema)
    ),

  getServicesTree: (unitId: string) =>
    apiRequest<Service[]>(
      `/units/${unitId}/services-tree`,
      {},
      z.array(ServiceModelSchema)
    ),

  create: (data: { name: string; code: string; companyId: string }) =>
    apiRequest<Unit>('/units', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: Partial<Unit>) =>
    apiRequest<Unit>(`/units/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  createTicket: (
    unitId: string,
    ticketData: { serviceId: string; preferredName?: string }
  ) =>
    apiRequest<Ticket>(
      `/units/${unitId}/tickets`,
      {
        method: 'POST',
        body: JSON.stringify(ticketData)
      },
      TicketModelSchema
    ),

  // Material and Ad Settings endpoints
  uploadMaterial: async (unitId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    let token = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('access_token') || null;
    }

    const response = await fetch(`${API_BASE_URL}/units/${unitId}/materials`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
  },

  getMaterials: (unitId: string) =>
    apiRequest<Material[]>(`/units/${unitId}/materials`, {}),

  deleteMaterial: (unitId: string, materialId: string) =>
    apiRequest<unknown>(`/units/${unitId}/materials/${materialId}`, {
      method: 'DELETE'
    }),

  updateAdSettings: (
    unitId: string,
    settings: {
      width?: number;
      duration?: number;
      activeMaterialIds?: string[];
    }
  ) =>
    apiRequest<Unit>(`/units/${unitId}/ad-settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings)
    })
};

// Ticket API functions
export const ticketsApi = {
  getAll: () =>
    apiRequest<Ticket[]>('/tickets', {}, z.array(TicketModelSchema)),

  getByUnitId: (unitId: string) =>
    apiRequest<Ticket[]>(
      `/units/${unitId}/tickets`,
      {},
      z.array(TicketModelSchema)
    ),

  getById: (id: string) =>
    apiRequest<Ticket>(`/tickets/${id}`, {}, TicketModelSchema),

  create: (ticketData: { unitId: string; serviceId: string }) =>
    apiRequest<Ticket>(
      '/tickets',
      {
        method: 'POST',
        body: JSON.stringify(ticketData)
      },
      TicketModelSchema
    ),

  complete: (id: string) =>
    apiRequest<Ticket>(
      `/tickets/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'served' })
      },
      TicketModelSchema
    ),

  noShow: (id: string) =>
    apiRequest<Ticket>(
      `/tickets/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'no_show' })
      },
      TicketModelSchema
    ),

  recall: (id: string) =>
    apiRequest<Ticket>(
      `/tickets/${id}/recall`,
      {
        method: 'POST'
      },
      TicketModelSchema
    ),

  pick: (id: string, counterId: string) =>
    apiRequest<Ticket>(
      `/tickets/${id}/pick`,
      {
        method: 'POST',
        body: JSON.stringify({ counterId })
      },
      TicketModelSchema
    ),

  confirmArrival: (id: string) =>
    apiRequest<Ticket>(
      `/tickets/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_service' })
      },
      TicketModelSchema
    ),

  transfer: (
    id: string,
    transferData: { toCounterId?: string; toUserId?: string }
  ) =>
    apiRequest<Ticket>(
      `/tickets/${id}/transfer`,
      {
        method: 'POST',
        body: JSON.stringify(transferData)
      },
      TicketModelSchema
    ),

  returnToQueue: (id: string) =>
    apiRequest<Ticket>(
      `/tickets/${id}/return`,
      {
        method: 'POST'
      },
      TicketModelSchema
    )
};

// Booking API functions
export const bookingsApi = {
  create: (bookingData: {
    unitId: string;
    serviceId: string;
    userName?: string;
    userPhone?: string;
    scheduledAt?: string;
  }) =>
    apiRequest<Booking>(
      '/bookings',
      {
        method: 'POST',
        body: JSON.stringify(bookingData)
      },
      BookingModelSchema
    )
};

// Service API functions
export const servicesApi = {
  getAll: () =>
    apiRequest<Service[]>('/services', {}, z.array(ServiceModelSchema)),

  getById: (id: string) =>
    apiRequest<Service>(`/services/${id}`, {}, ServiceModelSchema),

  getByUnitId: (unitId: string) =>
    apiRequest<Service[]>(
      `/services/unit/${unitId}`,
      {},
      z.array(ServiceModelSchema)
    ),

  create: (serviceData: Omit<Service, 'id'>) =>
    apiRequest<Service>(
      '/services',
      {
        method: 'POST',
        body: JSON.stringify(serviceData)
      },
      ServiceModelSchema
    ),

  update: (id: string, serviceData: Partial<Service>) =>
    apiRequest<Service>(
      `/services/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(serviceData)
      },
      ServiceModelSchema
    ),

  delete: (id: string) =>
    apiRequest<unknown>(`/services/${id}`, {
      method: 'DELETE'
    })
};

// Counter API functions
export const countersApi = {
  callNext: (
    counterId: string,
    callData?: { strategy?: 'fifo' | 'by_service'; serviceId?: string }
  ) =>
    apiRequest<{ ok: boolean; ticket?: Ticket; message?: string }>(
      `/counters/${counterId}/call-next`,
      {
        method: 'POST',
        body: JSON.stringify(callData || {})
      }
    ),

  getByUnitId: (unitId: string) =>
    apiRequest<Counter[]>(
      `/units/${unitId}/counters`,
      {},
      z.array(CounterModelSchema)
    ),

  create: (unitId: string, data: { name: string }) =>
    apiRequest<Counter>(
      `/units/${unitId}/counters`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      CounterModelSchema
    ),

  update: (id: string, data: { name?: string; assignedTo?: string }) =>
    apiRequest<Counter>(
      `/counters/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data)
      },
      CounterModelSchema
    ),

  delete: (id: string) =>
    apiRequest<unknown>(`/counters/${id}`, {
      method: 'DELETE'
    }),

  occupy: (id: string) =>
    apiRequest<Counter>(
      `/counters/${id}/occupy`,
      {
        method: 'POST'
      },
      CounterModelSchema
    ),

  release: (id: string) =>
    apiRequest<Counter>(
      `/counters/${id}/release`,
      {
        method: 'POST'
      },
      CounterModelSchema
    )
};

// Shift API functions
export const shiftApi = {
  getDashboard: (unitId: string) =>
    apiRequest<{
      activeCountersCount: number;
      queueLength: number;
      averageWaitTimeMinutes: number;
    }>(`/units/${unitId}/shift/dashboard`, {}),

  getQueue: (unitId: string) =>
    apiRequest<Array<Ticket & { service: Service }>>(
      `/units/${unitId}/shift/queue`,
      {}
    ),

  getCounters: (unitId: string) =>
    apiRequest<
      Array<{
        id: string;
        name: string;
        assignedTo: string | null;
        assignedUser?: { name: string };
        isOccupied: boolean;
        activeTicket: Ticket | null;
      }>
    >(`/units/${unitId}/shift/counters`, {}),

  forceReleaseCounter: (counterId: string) =>
    apiRequest<{
      counter: Counter;
      completedTicket: Ticket | null;
    }>(`/counters/${counterId}/force-release`, {
      method: 'POST'
    }),

  executeEOD: (unitId: string) =>
    apiRequest<{
      success: boolean;
      activeTicketsClosed: number;
      waitingTicketsNoShow: number;
      countersReleased: number;
      sequencesReset: number;
    }>(`/units/${unitId}/shift/eod`, {
      method: 'POST'
    })
};

// Slot API functions
export const slotsApi = {
  getConfig: (unitId: string) =>
    apiRequest<{
      startTime: string;
      endTime: string;
      intervalMinutes: number;
      days: string[];
    }>(`/units/${unitId}/slots/config`, {}),

  updateConfig: (
    unitId: string,
    config: {
      startTime: string;
      endTime: string;
      intervalMinutes: number;
      days: string[];
    }
  ) =>
    apiRequest<{
      startTime: string;
      endTime: string;
      intervalMinutes: number;
      days: string[];
    }>(`/units/${unitId}/slots/config`, {
      method: 'PUT',
      body: JSON.stringify(config)
    }),

  getCapacities: (unitId: string) =>
    apiRequest<
      Array<{
        dayOfWeek: string;
        startTime: string;
        serviceId: string;
        capacity: number;
      }>
    >(`/units/${unitId}/slots/capacities`, {}),

  updateCapacities: (
    unitId: string,
    capacities: Array<{
      dayOfWeek: string;
      startTime: string;
      serviceId: string;
      capacity: number;
    }>
  ) =>
    apiRequest<unknown>(`/units/${unitId}/slots/capacities`, {
      method: 'PUT',
      body: JSON.stringify(capacities)
    }),

  generate: (unitId: string, from: string, to: string) =>
    apiRequest<void>(`/units/${unitId}/slots/generate`, {
      method: 'POST',
      body: JSON.stringify({ from, to })
    }),

  getDay: (unitId: string, date: string) =>
    apiRequest<{
      id: string;
      unitId: string;
      date: string;
      isDayOff: boolean;
      slots: Array<{
        id: string;
        dayScheduleId: string;
        serviceId: string;
        startTime: string;
        capacity: number;
        booked: number;
      }>;
    } | null>(`/units/${unitId}/slots/day/${date}`, {}),

  updateDay: (
    unitId: string,
    date: string,
    data: {
      isDayOff: boolean;
      slots: Array<{
        serviceId: string;
        startTime: string;
        capacity: number;
      }>;
    }
  ) =>
    apiRequest<void>(`/units/${unitId}/slots/day/${date}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
};

// Pre-registration API functions
export interface PreRegistration {
  id: string;
  unitId: string;
  serviceId: string;
  date: string;
  time: string;
  code: string;
  customerName: string;
  customerPhone: string;
  comment?: string;
  status: string;
  ticketId?: string;
  createdAt: string;
  service?: Service;
  ticket?: Ticket;
}

export const preRegistrationsApi = {
  getByUnitId: (unitId: string) =>
    apiRequest<PreRegistration[]>(`/units/${unitId}/pre-registrations`, {}),

  create: (
    unitId: string,
    data: {
      serviceId: string;
      date: string;
      time: string;
      customerName: string;
      customerPhone: string;
      comment?: string;
    }
  ) =>
    apiRequest<PreRegistration>(`/units/${unitId}/pre-registrations`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (unitId: string, id: string, data: Partial<PreRegistration>) =>
    apiRequest<PreRegistration>(`/units/${unitId}/pre-registrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  getAvailableSlots: (unitId: string, serviceId: string, date: string) =>
    apiRequest<string[]>(
      `/units/${unitId}/pre-registrations/slots?serviceId=${serviceId}&date=${date}`,
      {}
    ),

  validate: (unitId: string, code: string) =>
    apiRequest<PreRegistration>(`/units/${unitId}/pre-registrations/validate`, {
      method: 'POST',
      body: JSON.stringify({ code })
    }),

  redeem: (unitId: string, code: string) =>
    apiRequest<{ success: boolean; ticket?: Ticket; message?: string }>(
      `/units/${unitId}/pre-registrations/redeem`,
      {
        method: 'POST',
        body: JSON.stringify({ code })
      }
    )
};
