import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { api } from '../services/api';

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
  login: (creds: any) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async (reason?: string) => {
    await AsyncStorage.multiRemove(['user', 'token', 'refreshToken', 'loginTime']);
    setUser(null);
    if (reason === 'session_expired') {
      Alert.alert('Session Expired', 'Please login again.');
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const loginTime = await AsyncStorage.getItem('loginTime');
      if (loginTime) {
        const timeElapsed = Date.now() - parseInt(loginTime, 10);
        if (timeElapsed >= SESSION_TIMEOUT) {
          await logout('session_expired');
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [logout]);

  useEffect(() => {
    const initAuth = async () => {
      const isExpired = await checkSession();
      if (!isExpired) {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      }
      setLoading(false);
    };

    initAuth();

    const interval = setInterval(() => {
        checkSession();
    }, 60000);

    return () => clearInterval(interval);
  }, [checkSession]);

  const login = async (creds: { email: string; password: string }) => {
    const response = await api.login(creds);
    
    // Response check: { success, accessToken, refreshToken }
    if (response && response.success && response.accessToken) {
      const { accessToken, refreshToken } = response;
      
      // Decode token to get role and id
      // accessToken might have 'Bearer ' prefix, jwt-decode wants just the token
      const tokenOnly = accessToken.startsWith('Bearer ') ? accessToken.split(' ')[1] : accessToken;
      const decoded: any = jwtDecode(tokenOnly);
      
      if (decoded.role !== 'salesperson') {
          throw new Error('Access Denied: Only salespeople can access this application.');
      }

      const userData: User = {
        _id: decoded.id,
        role: decoded.role,
        email: creds.email // Store email from creds since it's not in token
      };

      const loginTime = Date.now().toString();

      setUser(userData);
      await AsyncStorage.multiSet([
        ['user', JSON.stringify(userData)],
        ['token', accessToken], // We store it with Bearer if provided
        ['refreshToken', refreshToken],
        ['loginTime', loginTime]
      ]);
    } else {
      throw new Error(response?.message || 'Login failed: Invalid response from server');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
