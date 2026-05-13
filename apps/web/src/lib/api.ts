import type {
  AuthoritySummary,
  CitizenSubmissionView,
  DashboardStats,
  InstitutionResponseView,
  MandateDetail,
  MandateSummary,
  MandateCategory,
  MandateStatus,
  Urgency
} from "@sautiledger/shared";

const API_BASE = "/api";

let authToken: string | null =
  typeof localStorage !== "undefined" ? localStorage.getItem("sl_token") : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem("sl_token", token);
  else localStorage.removeItem("sl_token");
}

export function getAuthToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean; institutionKey?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined)
  };
  if (init.auth && authToken) headers["Authorization"] = `Bearer ${authToken}`;
  if (init.institutionKey) headers["X-Institution-Key"] = init.institutionKey;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as unknown as T;
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message =
      (typeof body === "object" && body && "error" in body && (body as any).error) ||
      res.statusText;
    throw new ApiError(message, res.status, body);
  }
  return body as T;
}

// -------------------- Citizens --------------------

export type CitizenProfile = {
  citizenId: string;
  countyHint: string | null;
  lastLoginAt: string | null;
};

export const api = {
  register(phone: string, password: string, countyHint?: string) {
    return request<{ token: string; citizen: CitizenProfile }>("/citizens/register", {
      method: "POST",
      body: JSON.stringify({ phone, password, countyHint })
    });
  },
  login(phone: string, password: string) {
    return request<{ token: string; citizen: CitizenProfile }>("/citizens/login", {
      method: "POST",
      body: JSON.stringify({ phone, password })
    });
  },
  me() {
    return request<CitizenProfile>("/citizens/me", { auth: true });
  },
  mySubmissions() {
    return request<CitizenSubmissionView[]>("/citizens/me/submissions", { auth: true });
  },

  authorities(params: { level?: string; county?: string; q?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.level) qs.set("level", params.level);
    if (params.county) qs.set("county", params.county);
    if (params.q) qs.set("q", params.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<AuthoritySummary[]>(`/authorities${suffix}`);
  },

  submit(input: {
    originalText: string;
    languageHint?: string;
    location: { county?: string; constituency?: string; ward?: string; country?: "Kenya" };
    targetAuthorityId: string;
    consentToProcess: true;
  }) {
    return request<{
      trackingCode: string;
      processingStatus: "pending" | "processed" | "failed";
      mandateId: string | null;
      mandateTitle: string | null;
      mandateStatus: MandateStatus | null;
    }>("/submissions", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ ...input, location: { country: "Kenya", ...input.location } })
    });
  },

  listMandates(
    params: {
      category?: MandateCategory;
      urgency?: Urgency;
      status?: MandateStatus;
      county?: string;
      ward?: string;
      q?: string;
      sort?: "recent" | "evidence" | "urgency";
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{
      page: number;
      pageSize: number;
      total: number;
      items: MandateSummary[];
    }>(`/mandates${suffix}`);
  },

  mandate(id: string) {
    return request<MandateDetail>(`/mandates/${id}`);
  },

  postResponse(
    id: string,
    institutionKey: string,
    body: {
      responderLabel: string;
      responseText: string;
      newStatus?: MandateStatus;
      expectedResolutionDate?: string;
    }
  ) {
    return request<{ id: string; createdAt: string }>(`/mandates/${id}/responses`, {
      method: "POST",
      institutionKey,
      body: JSON.stringify(body)
    });
  },

  patchStatus(
    id: string,
    institutionKey: string,
    body: { newStatus: MandateStatus; changedByLabel: string; note?: string }
  ) {
    return request<{ id: string; status: MandateStatus }>(`/mandates/${id}/status`, {
      method: "PATCH",
      institutionKey,
      body: JSON.stringify(body)
    });
  },

  tracking(code: string) {
    return request<{
      trackingCode: string;
      createdAt: string;
      processingStatus: "pending" | "processed" | "failed";
      category: MandateCategory | null;
      urgency: Urgency | null;
      mandate: {
        id: string;
        title: string;
        status: MandateStatus;
        submissionCount: number;
        lastActivityAt: string;
      } | null;
    }>(`/tracking/${encodeURIComponent(code)}`);
  },

  dashboardStats() {
    return request<DashboardStats>("/dashboard/stats");
  }
};

export type { MandateSummary, MandateDetail, DashboardStats, InstitutionResponseView };
