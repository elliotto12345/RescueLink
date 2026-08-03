// RescueLink design tokens — use these across all screens for consistency
export const colours = {
  light: {
    primary: "#2563EB",
    primaryLight: "#EFF6FF",
    primaryDark: "#1D4ED8",
    emergency: "#DC2626",
    emergencyLight: "#FEE2E2",
    white: "#FFFFFF",
    background: "#F9FAFB",
    surface: "#FFFFFF",
    text: "#1F2937",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    border: "#E5E7EB",
    inputBg: "#FAFAFA",
    success: "#16A34A",
    successLight: "#DCFCE7",
    warning: "#FFB200",
    warningLight: "#FEF3C7",
    divider: "#F3F4F6",
  },

  dark: {
    primary: "#B4C5FF",
    primaryLight: "#2563EB",
    primaryDark: "#002A78",
    emergency: "#690005",
    emergencyLight: "#FFB4AB",
    white: "#FFFFFF",
    background: "#11131B",
    surface: "#434655",
    text: "#E1E2ED",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    border: "#8D90A0",
    inputBg: "#1D1F27",
    success: "#16A34A",
    successLight: "#DCFCE7",
    warning: "#D97706",
    warningLight: "#FEF3C7",
    divider: "#434655",
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
