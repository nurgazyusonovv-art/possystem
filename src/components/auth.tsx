"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
} from "react";
import { loginWithPin, signOut } from "@/lib/api";
import type { Session } from "@/lib/types";
import type { Role } from "@/lib/constants";

const SESSION_KEY = "qrmenu_session";

// ---- Сессия дүкөнү (useSyncExternalStore үчүн) ----
// sessionStorage колдонобуз: ар бир таб өзүнчө сессияга ээ болот.
// Ошентип бир браузерде 1-таб Кассир, 2-таб Ашкана/Официант бир убакта иштей алат.
let cacheRaw: string | null = null;
let cacheVal: Session | null = null;

function readSnapshot(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cacheVal = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cacheVal = null;
    }
  }
  return cacheVal;
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  // sessionStorage табдар арасында бөлүнбөйт — өз табда гана кабарлайбыз
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function writeSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(SESSION_KEY);
  // Кэшти жаңы маани менен дароо синхрондойбуз
  cacheRaw = sessionStorage.getItem(SESSION_KEY);
  cacheVal = s;
  emit();
}

interface AuthCtx {
  session: Session | null;
  loaded: boolean;
  login: (pin: string) => Promise<Session | null>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(subscribe, readSnapshot, () => null);
  // Серверде false, клиентте true — гидрациядан кийин гана коргоо иштейт
  const loaded = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const login = useCallback(async (pin: string) => {
    const staff = await loginWithPin(pin);
    if (!staff) return null;
    const s: Session = { id: staff.id, name: staff.name, role: staff.role };
    writeSession(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    writeSession(null); // UI сессиясын дароо тазалайбыз
    void signOut(); // Supabase Auth сессиясын жабабыз
  }, []);

  return (
    <Ctx.Provider value={{ session, loaded, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth AuthProvider ичинде колдонулушу керек");
  return ctx;
}

// Роль ушул экранга кире алабы?
export function canAccess(role: Role | undefined, allowed: Role[]): boolean {
  if (!role) return false;
  if (role === "admin") return true; // админ баарына кире алат
  return allowed.includes(role);
}
