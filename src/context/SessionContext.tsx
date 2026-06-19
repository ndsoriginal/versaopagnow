"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

type SessionContextValue = {
  session: Session | null;
  user: User | null;
};

const SessionContext = createContext<SessionContextValue>({ session: null, user: null });

export const SessionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Get initial session if available (guard supabase.auth presence)
    (async () => {
      try {
        if (supabase && (supabase as any).auth && typeof (supabase as any).auth.getSession === "function") {
          // @ts-ignore
          const result = await (supabase as any).auth.getSession();
          const s = result?.data?.session ?? null;
          if (mounted) {
            setSession(s);
            setUser(s?.user ?? null);
          }
        } else if (supabase && (supabase as any).auth && typeof (supabase as any).auth.session === "function") {
          // older fallback
          // @ts-ignore
          const s = (supabase as any).auth.session();
          if (mounted) {
            setSession(s);
            setUser(s?.user ?? null);
          }
        } else {
          // Supabase auth not available (stub). Keep session null.
          if (mounted) {
            setSession(null);
            setUser(null);
          }
        }
      } catch {
        // ignore errors and keep defaults
      }
    })();

    // Subscribe to auth state changes only if available
    let sub: any = null;
    try {
      if (supabase && (supabase as any).auth && typeof (supabase as any).auth.onAuthStateChange === "function") {
        // @ts-ignore
        sub = (supabase as any).auth.onAuthStateChange(async (event: string, sess: Session | null) => {
          if (!mounted) return;
          setSession(sess as Session | null);
          setUser((sess as Session | null)?.user ?? null);

          if (event === "SIGNED_IN" && sess?.user) {
            // SÓ redireciona se o usuário estiver explicitamente na página de login
            if (window.location.pathname === "/login") {
              navigate("/", { replace: true });
            }
          } else if (event === "SIGNED_OUT") {
            navigate("/", { replace: true }); // Mantém na Home ao deslogar
          }
        });
      }
    } catch {
      // ignore subscription errors
      sub = null;
    }

    return () => {
      mounted = false;
      try {
        // unsubscribe if subscription shape exists
        if (sub?.subscription?.unsubscribe) {
          sub.subscription.unsubscribe();
        } else if (sub?.unsubscribe) {
          sub.unsubscribe();
        }
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SessionContext.Provider value={{ session, user }}>{children}</SessionContext.Provider>;
};

export const useSession = () => useContext(SessionContext);