import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { supabase } from '../services/supabase';
import { authApi, unwrap, ApiError } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [pendingOnboardingName, setPendingOnboardingName] = useState('');
  const refreshProfileRef = useRef(async () => ({ hasProfile: false }));

  const refreshProfile = useCallback(async () => {
    try {
      const body = await authApi.getMe();
      const data = unwrap(body);
      setProfile(data);
      setNeedsOnboarding(false);
      return { hasProfile: true };
    } catch (e) {
      if (e instanceof ApiError && e.code === 'PROFILE_NOT_FOUND') {
        setProfile(null);
        setNeedsOnboarding(true);
        return { hasProfile: false };
      }
      throw e;
    }
  }, []);

  refreshProfileRef.current = refreshProfile;

  useEffect(() => {
    let cancelled = false;

    const run = async (s) => {
      if (!s) {
        setProfile(null);
        setNeedsOnboarding(false);
        setPendingOnboardingName('');
        return;
      }
      try {
        await refreshProfileRef.current();
      } catch {
        if (!cancelled) {
          await supabase.auth.signOut();
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      setSession(s);
      run(s).finally(() => {
        if (!cancelled) setBootstrapped(true);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (cancelled) return;
      setSession(s);
      if (s) {
        run(s).catch(() => {});
      } else {
        setProfile(null);
        setNeedsOnboarding(false);
        setPendingOnboardingName('');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const sendOtp = useCallback(async (phone) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  }, []);

  const verifyOtp = useCallback(async (phone, code) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    if (error) throw error;
  }, []);

  const createProfile = useCallback(async (fullName) => {
    const body = await authApi.createProfile(fullName);
    const data = unwrap(body);
    setProfile(data);
    setNeedsOnboarding(false);
    setPendingOnboardingName('');
    return data;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setNeedsOnboarding(false);
    setPendingOnboardingName('');
  }, []);

  const user = profile;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        needsOnboarding,
        bootstrapped,
        sendOtp,
        verifyOtp,
        createProfile,
        logout,
        refreshProfile,
        pendingOnboardingName,
        setPendingOnboardingName,
      }}
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
