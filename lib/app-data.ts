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

export type AppUser = {
  uid: string;
  fullName: string;
  email: string;
  password: string;
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
  ],
  ADMIN: [
    "dashboard.view",
    "users.view",
    "users.create",
    "mcc.view",
    "mcc.create",
    "audit.view",
    "settings.view",
  ],
  MCC_MANAGER: [
    "dashboard.view",
    "mcc.view",
    "mcc.edit",
    "audit.view",
    "settings.view",
  ],
  MCC_OFFICER: [
    "dashboard.view",
    "mcc.view",
    "audit.view",
  ],
  MILK_COLLECTOR: [
    "dashboard.view",
    "mcc.view",
  ],
  FARMER: [
    "dashboard.view",
  ],
  VETERINARY_OFFICER: [
    "dashboard.view",
    "mcc.view",
  ],
  PROCESSING_INDUSTRY: [
    "dashboard.view",
  ],
  FINANCE_OFFICER: [
    "dashboard.view",
    "audit.view",
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
    timezone: "UTC",
    notificationEmail: "notify@milk.local",
  },
};

export function readAppState(): AppState {
  if (typeof window === "undefined") {
    return defaultState;
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

export function writeAppState(state: AppState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function appendAuditEntry(
  entry: Omit<AuditEntry, "auditId" | "timestamp">,
  userId = "system",
): AppState {
  const state = readAppState();
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
  writeAppState(nextState);
  return nextState;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
