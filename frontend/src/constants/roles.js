export const ROLES = {
  DRIVER: "user",
  PROVIDER: "mechanic",
  ADMIN: "admin",
};

export const ROLE_LABELS = {
  [ROLES.DRIVER]: "Driver",
  [ROLES.PROVIDER]: "Service Provider",
  [ROLES.ADMIN]: "Admin",
};

export const getDashboardForRole = (role) => {
  if (role === ROLES.PROVIDER) return "MechanicDashboard";
  if (role === ROLES.ADMIN) return "AdminDashboard";
  return "UserDashboard";
};
