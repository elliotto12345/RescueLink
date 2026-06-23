// Bottom navigation configs per role — pass activeRoute to highlight current tab
export const DRIVER_NAV = [
  { id: "home", label: "Home", emoji: "🏠", route: "UserDashboard" },
  { id: "request", label: "Request", emoji: "🔧", route: "RequestHelp" },
  { id: "emergency", label: "SOS", emoji: "🚨", route: "EmergencyCenter" },
  { id: "chat", label: "Chat", emoji: "💬", route: "Chat" },
  { id: "profile", label: "Profile", emoji: "👤", route: "Profile" },
];

export const PROVIDER_NAV = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "jobs", label: "Jobs", emoji: "📋" },
  { id: "chat", label: "Chat", emoji: "💬", route: "Chat" },
  { id: "profile", label: "Profile", emoji: "👤", route: "Profile" },
];
