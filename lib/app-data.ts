export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MCC_MANAGER"
  | "MCC_OFFICER"
  | "MILK_COLLECTOR"
  | "FARMER"
  | "VETERINARY_OFFICER"
  | "PROCESSING_INDUSTRY"
  | "FINANCE_OFFICER";

export const DEFAULT_INITIAL_PASSWORD = "MyPassword@2026";

export type AppUser = {
  uid: string;
  username?: string;
  fullName: string;
  email: string;
  password: string;
  mustChangePassword?: boolean;
  role: UserRole;
  mccIds: string[];
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
};

export type MccCenter = {
  mccId: string;
  mccCode: string;
  name: string;
  description: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  phone: string;
  email: string;
  managerUserId?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt?: string;
};

export type AuditEntry = {
  auditId: string;
  userId: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  description: string;
  timestamp: string;
};

export type AppState = {
  users: AppUser[];
  mccs: MccCenter[];
  auditLogs: AuditEntry[];
  settings: {
    projectName: string;
    milkPrice: number;
    mccSharePercent: number;
    collectorSharePercent: number;
    timezone: string;
    notificationEmail: string;
  };
};

export const STORAGE_KEY = "milk-system-demo-store";

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: [
    "dashboard.view",
    "users.view",
    "users.create",
    "users.edit",
    "mcc.view",
    "mcc.create",
    "mcc.edit",
    "audit.view",
    "settings.view",
    "settings.edit",
    "operations.view",
    "operations.write",
    "accounting.view",
    "administration.view",
  ],
  ADMIN: [
    "dashboard.view",
    "users.view",
    "users.create",
    "users.edit",
    "mcc.view",
    "mcc.create",
    "mcc.edit",
    "audit.view",
    "settings.view",
    "settings.edit",
    "operations.view",
    "operations.write",
    "accounting.view",
    "administration.view",
  ],
  MCC_MANAGER: [
    "dashboard.view",
    "mcc.view",
    "mcc.edit",
    "settings.view",
    "operations.view",
    "operations.write",
    "accounting.view",
    "administration.view",
  ],
  MCC_OFFICER: [
    "dashboard.view",
    "operations.view",
    "operations.write",
    "accounting.view",
    "administration.view",
  ],
  MILK_COLLECTOR: [
    "dashboard.view",
    "operations.view",
    "operations.write",
  ],
  FARMER: [
    "dashboard.view",
  ],
  VETERINARY_OFFICER: [
    "dashboard.view",
    "operations.view",
    "operations.write",
    "farmer-cow.manage",
  ],
  PROCESSING_INDUSTRY: [
    "dashboard.view",
    "operations.view",
  ],
  FINANCE_OFFICER: [
    "dashboard.view",
    "operations.view",
  ],
};

export const defaultState: AppState = {
  users: [
    {
      uid: "admin-1",
      fullName: "System Administrator",
      email: "admin@milk.local",
      password: "admin123",
      role: "SUPER_ADMIN",
      mccIds: ["MCC-001"],
      status: "ACTIVE",
    },
    {
      uid: "manager-1",
      fullName: "MCC Manager",
      email: "manager@milk.local",
      password: "manager123",
      role: "MCC_MANAGER",
      mccIds: ["MCC-001"],
      status: "ACTIVE",
    },
    {
      uid: "officer-1",
      fullName: "MCC Officer",
      email: "officer@milk.local",
      password: "officer123",
      role: "MCC_OFFICER",
      mccIds: ["MCC-001"],
      status: "ACTIVE",
    },
  ],
  mccs: [
    {
      mccId: "MCC-001",
      mccCode: "MCC-001",
      name: "Example Milk Collection Center",
      description: "Main collection center for cooperative operations",
      district: "Kigali",
      sector: "Nyarugenge",
      cell: "Kigali City",
      village: "Kimisagara",
      phone: "+250788000001",
      email: "mcc001@milk.local",
      managerUserId: "manager-1",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    },
  ],
  auditLogs: [
    {
      auditId: "audit-1",
      userId: "admin-1",
      action: "LOGIN",
      module: "auth",
      entityType: "user",
      entityId: "admin-1",
      description: "System administrator logged in successfully.",
      timestamp: new Date().toISOString(),
    },
    {
      auditId: "audit-2",
      userId: "admin-1",
      action: "MCC_CREATED",
      module: "mcc",
      entityType: "mccCenter",
      entityId: "MCC-001",
      description: "MCC-001 was created in the system.",
      timestamp: new Date().toISOString(),
    },
  ],
  settings: {
    projectName: "Digital Milk Collection System",
    milkPrice: 620,
    mccSharePercent: 10,
    collectorSharePercent: 5,
    timezone: "UTC",
    notificationEmail: "notify@milk.local",
  },
};

export async function readAppState(): Promise<AppState> {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const response = await fetch("/api/system", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as AppState;
      if (payload?.users && payload?.mccs && payload?.auditLogs) {
        return payload;
      }
    }
  } catch {
    // fall through to local fallback
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AppState>;
    return {
      users: parsed.users ?? defaultState.users,
      mccs: parsed.mccs ?? defaultState.mccs,
      auditLogs: parsed.auditLogs ?? defaultState.auditLogs,
      settings: {
        ...defaultState.settings,
        ...(parsed.settings ?? {}),
      },
    };
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    return defaultState;
  }
}

export async function writeAppState(state: AppState): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const response = await fetch("/api/system", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveState", state }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "The changes could not be saved to MySQL.");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("The changes could not be saved to MySQL. Check that the database is available and try again.");
  }
}

export async function appendAuditEntry(
  entry: Omit<AuditEntry, "auditId" | "timestamp">,
  userId = "system",
): Promise<AppState> {
  if (typeof window === "undefined") {
    return defaultState;
  }

  const state = await readAppState();
  const nextAuditLogs = [
    {
      ...entry,
      auditId: `audit-${Date.now()}`,
      userId,
      timestamp: new Date().toISOString(),
    },
    ...state.auditLogs,
  ];

  const nextState = { ...state, auditLogs: nextAuditLogs };
  await writeAppState(nextState);
  return nextState;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
