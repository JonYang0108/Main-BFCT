import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { authService } from "@/services/authService";
import type { AuthContextValue } from "@/types/domain";

const AuthContext = createContext<AuthContextValue>({
  loading: true,
  profile: null,
  refresh: async () => undefined,
  role: null,
  session: null,
  signOut: async () => undefined,
  user: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [session, setSession] = useState<AuthContextValue["session"]>(null);
  const [role, setRole] = useState<AuthContextValue["role"]>(null);
  const [profile, setProfile] = useState<AuthContextValue["profile"]>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const context = await authService.getCurrentUserContext();

      if (!mountedRef.current) {
        return;
      }

      setSession(context.session);
      setUser(context.user);
      setProfile(context.profile);
      setRole(context.role);
    } catch (error) {
      console.error("[AuthContext] Failed to refresh auth state:", error);

      if (!mountedRef.current) {
        return;
      }

      setSession(null);
      setUser(null);
      setProfile(null);
      setRole(null);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const bootstrap = async () => {
      try {
        await refresh();
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = authService.onAuthStateChange((_event, nextSession) => {
      if (!mountedRef.current) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void refresh();
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setSession(null);
      setRole(null);
      setProfile(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ loading, profile, refresh, role, session, signOut, user }}
    >
      {children}
    </AuthContext.Provider>
  );
};
