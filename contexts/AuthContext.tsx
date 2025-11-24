'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Only run API calls on client side
  useEffect(() => {
    setIsClient(true);
    // Check if we're on the client before accessing localStorage
    if (typeof window !== 'undefined') {
      // Initialize token from localStorage on mount
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsLoading(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // Redirect to the localized login page if we can determine the locale
      // Try to extract locale from current path (e.g., /en/..., /ru/...) or fallback to default
      // Determine locale from current pathname (mounted above Intl provider)
      const localeFromPath = pathname?.split('/')?.[1] || 'en';
      const knownLocales = ['en', 'ru'];
      const loginPath = knownLocales.includes(localeFromPath) ? `/${localeFromPath}/login` : '/login';
      router.push(loginPath as string);
      // Note: In a more sophisticated setup, we might want to use the router
      // to navigate to the localized login page, but this approach maintains consistency
    }
  }, [pathname, router]);

  const login = useCallback((newToken: string) => {
    if (typeof window !== 'undefined') {
      setToken(newToken);
      localStorage.setItem('access_token', newToken);
      // Fetch user data after login
      authApi.getMe()
        .then(userData => {
          setUser(userData);
          // Reset loading state after successful login
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Failed to fetch user after login:', error);
          setToken(null);
          setUser(null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          // Reset loading state after failed login
          setIsLoading(false);
        });
    }
  }, []);

  // Fetch user data only after mounting on client and manage loading state
  useEffect(() => {
    if (isClient) {
      // Always set loading to true when starting the auth process
      setIsLoading(true);

      // If there's no token, we're not authenticated, finish loading
      if (!token) {
        setIsLoading(false);
        return;
      }

      // If there's a token, fetch user data
      const fetchUser = async () => {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          // If token is invalid, perform logout to redirect and clear state
          logout();
        } finally {
          // Always finish loading, whether success or error
          setIsLoading(false);
        }
      };

      fetchUser();
    }
  }, [isClient, token, logout]);

  // Listen for global 'auth:logout' events (dispatched by apiRequest on 401 / refresh failure)
  useEffect(() => {
    const handleGlobalLogout = () => {
      logout();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:logout', handleGlobalLogout as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:logout', handleGlobalLogout as EventListener);
      }
    };
  }, [logout]);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};