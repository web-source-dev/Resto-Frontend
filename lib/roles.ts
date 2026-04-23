export type Role =
  | "admin"
  | "manager"
  | "receptionist"
  | "waiter"
  | "kitchen"
  | "rider";

// Route → roles that can access it
const access: Record<string, Role[]> = {
  "/": ["admin", "manager"],
  "/orders": ["admin", "manager", "receptionist", "waiter"],
  "/kds": ["admin", "manager", "kitchen"],
  "/tables": ["admin", "manager", "receptionist", "waiter"],
  "/menu": ["admin", "manager", "kitchen"],
  "/inventory": ["admin", "manager", "kitchen"],
  "/wastage": ["admin", "manager", "kitchen"],
  "/expenses": ["admin", "manager", "kitchen", "receptionist"],
  "/staff": ["admin", "manager"],
  "/customers": ["admin", "manager", "receptionist"],
  "/reports": ["admin", "manager"],
  "/settings": ["admin", "manager"],
  "/promotions": ["admin", "manager"],
  "/waiter": ["admin", "manager", "waiter"],
  "/delivery": ["admin", "manager", "rider", "receptionist"],
};

export function canAccess(role: Role | string | undefined, path: string): boolean {
  if (!role) return false;
  // match by longest prefix (so /orders and /orders/123 both resolve)
  const keys = Object.keys(access).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (path === k || path.startsWith(k + "/")) {
      return access[k].includes(role as Role);
    }
  }
  return false;
}

export function homeFor(role: Role | string | undefined): string {
  switch (role) {
    case "kitchen":
      return "/kds";
    case "waiter":
      return "/waiter";
    case "receptionist":
      return "/orders";
    case "rider":
      return "/delivery";
    case "manager":
    case "admin":
    default:
      return "/";
  }
}

export function canPerform(
  role: Role | string | undefined,
  action:
    | "menu.write"
    | "menu.delete"
    | "inventory.write"
    | "wastage.approve"
    | "staff.manage"
    | "order.void"
    | "campaigns.send"
    | "po.create"
    | "settings.write"
): boolean {
  if (!role) return false;
  const r = role as Role;
  switch (action) {
    case "menu.write":
    case "menu.delete":
      return ["admin", "manager"].includes(r);
    case "inventory.write":
      return ["admin", "manager", "kitchen", "receptionist"].includes(r);
    case "wastage.approve":
      return ["admin", "manager"].includes(r);
    case "staff.manage":
      return ["admin", "manager"].includes(r);
    case "order.void":
      return ["admin", "manager", "receptionist"].includes(r);
    case "campaigns.send":
    case "po.create":
    case "settings.write":
      return ["admin", "manager"].includes(r);
    default:
      return false;
  }
}
