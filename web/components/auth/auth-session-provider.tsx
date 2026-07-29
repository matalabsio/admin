"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ensureSession, getMe } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { isAuthEnabled } from "@/lib/flags";
import {
  hasLikelyClientSession,
  hasSessionHintCookie,
  type AuthUser,
} from "@/lib/session";

type AuthSessionContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function hasAccessCookie(): boolean {
  return hasSessionHintCookie();
}

type ProviderProps = {
  children: ReactNode;
  serverAuthenticated?: boolean;
};

export function AuthSessionProvider({
  children,
  serverAuthenticated = false,
}: ProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(!serverAuthenticated);
  const initStartedRef = useRef(false);

  const refreshUser = useCallback(async () => {
    if (!isAuthEnabled()) {
      setUser(null);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        try {
          await ensureSession();
          setUser(await getMe());
          return;
        } catch {
          /* fall through */
        }
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!isAuthEnabled()) {
      setLoading(false);
      return;
    }
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    if (!hasLikelyClientSession()) {
      setLoading(false);
      return;
    }

    if (serverAuthenticated && hasAccessCookie()) {
      let cancelled = false;
      void (async () => {
        try {
          const me = await getMe();
          if (!cancelled) setUser(me);
        } catch (err) {
          if (
            !cancelled &&
            err instanceof ApiError &&
            err.status === 401
          ) {
            try {
              await ensureSession();
              const me = await getMe();
              if (!cancelled) setUser(me);
              return;
            } catch {
              /* fall through */
            }
          }
          if (!cancelled) setUser(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;

    async function init() {
      try {
        const me = await getMe();
        if (!cancelled) setUser(me);
      } catch (err) {
        if (
          !cancelled &&
          err instanceof ApiError &&
          err.status === 401
        ) {
          try {
            await ensureSession();
            const me = await getMe();
            if (!cancelled) setUser(me);
            return;
          } catch {
            /* fall through */
          }
        }
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [serverAuthenticated]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      refreshUser,
    }),
    [user, loading, refreshUser],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return ctx;
}
