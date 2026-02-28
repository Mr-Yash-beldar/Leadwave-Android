import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { api } from '../services/api';
import { setLogoutHandler } from '../services/apiClient';

interface User {
  _id: string;
  role: string;
  name?: string;
  email?: string;
  number?: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isFirstLaunch: boolean;
  isServerUp: boolean;
  login: (creds: any) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshProfile: () => Promise<User | null>;
  checkServerStatus: () => Promise<boolean>;  // Add this
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isServerUp, setIsServerUp] = useState(true);

  // Add checkServerStatus method
  const checkServerStatus = useCallback(async (): Promise<boolean> => {
    try {
      const isUp = await api.checkHealth();
      setIsServerUp(isUp);
      return isUp;
    } catch (error) {
      console.error('Server health check failed:', error);
      setIsServerUp(false);
      return false;
    }
  }, []);

  const logout = useCallback(async (reason?: string) => {
    try {
      await AsyncStorage.multiRemove(['user', 'token', 'refreshToken']);
      setUser(null);
      if (reason === 'session_expired') {
        // Must use setTimeout or alert might be swallowed if navigating immediately
        setTimeout(() => {
          Alert.alert('Session Expired', 'Please login again.');
        }, 500);
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
  }, []);

  // Register logout handler for API interceptor
  useEffect(() => {
    setLogoutHandler(() => logout('session_expired'));
  }, [logout]);

  const refreshProfile = useCallback(async () => {
    try {
      const profileData = await api.getProfile();
      if (profileData && profileData.data) {
        const u = profileData.data;
        const updatedUser: User = {
          _id: u._id,
          role: u.role,
          name: u.name,
          email: u.email,
          number: u.number || u.phone
        };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
    return null;
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('alreadyLaunched', 'true');
    setIsFirstLaunch(false);
  };

  useEffect(() => {
    const initAuth = async () => {
      // Building connection...
      await new Promise(resolve => setTimeout(() => resolve(true), 1500));

      // Check Server Health
      const serverUp = await api.checkHealth();
      setIsServerUp(serverUp);

      if (!serverUp) {
        setLoading(false);
        return;
      }

      try {
        const alreadyLaunched = await AsyncStorage.getItem('alreadyLaunched');
        setIsFirstLaunch(alreadyLaunched === null);

        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          // Refresh profile in background if we have a user
          refreshProfile();
        }
      } catch (e) {
        console.error("Auth init error:", e);
      }
      setLoading(false);
    };

    initAuth();
  }, [refreshProfile]);

  const login = async (creds: { email: string; password: string }) => {
    const response = await api.login(creds);

    if (response && response.success && response.accessToken) {
      const { accessToken, refreshToken } = response;

      const tokenOnly = accessToken.startsWith('Bearer ') ? accessToken.split(' ')[1] : accessToken;
      const decoded: any = jwtDecode(tokenOnly);

      if (decoded.role !== 'salesperson') {
        throw new Error('Access Denied: Only salespeople can access this application.');
      }

      const userData: User = {
        _id: decoded.id,
        role: decoded.role,
        email: creds.email
      };

      setUser(userData);
      await AsyncStorage.multiSet([
        ['user', JSON.stringify(userData)],
        ['token', accessToken],
        ['refreshToken', refreshToken]
      ]);

      // Fetch full profile details immediately after login
      await refreshProfile();
    } else {
      throw new Error(response?.message || 'Login failed: Invalid response from server');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isFirstLaunch,
      isServerUp,
      login,
      logout,
      completeOnboarding,
      refreshProfile,
      checkServerStatus  // Add this to the provider value
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);