import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getAuthToken, setAuthToken, type CitizenProfile } from "./api";

type AuthState = {
  citizen: CitizenProfile | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (
    phone: string,
    password: string,
    countyHint?: string,
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [citizen, setCitizen] = useState<CitizenProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getAuthToken());

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setCitizen)
      .catch(() => {
        setAuthToken(null);
        setCitizen(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      citizen,
      loading,
      async login(phone, password) {
        const r = await api.login(phone, password);
        setAuthToken(r.token);
        setCitizen(r.citizen);
      },
      async register(phone, password, countyHint) {
        const r = await api.register(phone, password, countyHint);
        setAuthToken(r.token);
        setCitizen(r.citizen);
      },
      logout() {
        setAuthToken(null);
        setCitizen(null);
      },
    }),
    [citizen, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
