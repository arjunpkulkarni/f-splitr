import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, unwrap } from '../services/api';
import { getToken, setToken, removeToken } from '../services/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const body = await authApi.getMe();
          const data = unwrap(body);
          setUser(data);
        }
      } catch {
        await removeToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const completePhoneAuth = useCallback(async (phone, code, firstName) => {
    const body = await authApi.verifyOtp(phone, code, firstName);
    const data = unwrap(body);
    const token = data.access_token ?? data.token;
    if (!token) throw new Error('No token returned');
    await setToken(token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    await removeToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, completePhoneAuth, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
