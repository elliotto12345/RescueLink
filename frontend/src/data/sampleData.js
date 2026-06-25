// Sample / mock data — replace with Firestore or API calls in production
export const RECENT_REQUESTS = [
  {
    id: 1,
    issue: "Flat Tyre",
    mechanic: "Kwame Mensah",
    status: "Completed",
    date: "May 28, 2025",
  },
  {
    id: 2,
    issue: "Engine Overheating",
    mechanic: "Kofi Agyeman",
    status: "Completed",
    date: "May 15, 2025",
  },
  {
    id: 3,
    issue: "Dead Battery",
    mechanic: "Pending",
    status: "Pending",
    date: "June 1, 2025",
  },
];

export const EMERGENCY_CONTACTS = [
  { id: 1, name: "Police", number: "911", emoji: "🚔", color: "#2563EB" },
  { id: 2, name: "Fire Service", number: "112", emoji: "🚒", color: "#DC2626" },
  { id: 3, name: "Ambulance", number: "193", emoji: "🚑", color: "#16A34A" },
  { id: 4, name: "Ghana Highway", number: "0800118000", emoji: "🛣️", color: "#6B7280" },
];

export const PAYMENT_HISTORY = [
  {
    id: 1,
    service: "Flat Tyre Repair",
    amount: 80,
    method: "Mobile Money",
    date: "May 28, 2025",
    status: "Paid",
  },
  {
    id: 2,
    service: "Battery Jump Start",
    amount: 50,
    method: "Card",
    date: "May 15, 2025",
    status: "Paid",
  },
];

export const PROVIDER_REVIEWS = [
  {
    id: 1,
    user: "Ama K.",
    rating: 5,
    comment: "Arrived in 8 minutes. Very professional!",
    date: "May 28, 2025",
  },
  {
    id: 2,
    user: "Yaw B.",
    rating: 4,
    comment: "Fixed my tyre quickly. Fair pricing.",
    date: "May 20, 2025",
  },
];

export const LANDING_FEATURES = [
  {
    emoji: "🚨",
    title: "Instant SOS",
    description: "One tap connects you to verified roadside help nearby.",
  },
  {
    emoji: "🤖",
    title: "AI Diagnosis",
    description: "Describe symptoms and get smart service recommendations.",
  },
  {
    emoji: "📍",
    title: "Live Tracking",
    description: "Track your provider in real time with ETA updates.",
  },
  {
    emoji: "💬",
    title: "Direct Chat",
    description: "Message your provider and stay informed every step.",
  },
];

export const HOW_IT_WORKS = [
  { step: 1, title: "Request Help", description: "Tap SOS and share your location." },
  { step: 2, title: "Get Matched", description: "AI matches you with the best provider." },
  { step: 3, title: "Track & Chat", description: "Follow live updates and communicate." },
  { step: 4, title: "Pay & Rate", description: "Secure payment and leave a review." },
];

export const TESTIMONIALS = [
  {
    name: "Esi M.",
    role: "Driver, Accra",
    text: "RescueLink saved me on the Tema motorway at midnight. Mechanic arrived in 12 minutes!",
    rating: 5,
  },
  {
    name: "Daniel O.",
    role: "Mechanic Partner",
    text: "The dashboard makes it easy to accept jobs and track earnings. Great platform.",
    rating: 5,
  },
];

export const ADMIN_STATS = {
  totalUsers: 1248,
  totalProviders: 156,
  activeRequests: 23,
  completedToday: 47,
};

export const NEARBY_MECHANICS = [
  {
    id: "m1",
    name: "Kwame Mensah",
    phone: "+233 24 123 4567",
    rating: 4.8,
    jobs: 120,
    latitude: 5.6102,
    longitude: -0.182,
    specialties: ["Flat Tyre", "Battery"],
    status: "available",
    lastMessage: "I will be there in about 8 minutes.",
    lastMessageTime: "10:47 AM",
    unread: 0,
  },
  {
    id: "m2",
    name: "Kofi Agyeman",
    phone: "+233 20 987 6543",
    rating: 4.6,
    jobs: 89,
    latitude: 5.5985,
    longitude: -0.195,
    specialties: ["Engine", "Overheating"],
    status: "available",
    lastMessage: "Thanks for choosing me. On my way!",
    lastMessageTime: "Yesterday",
    unread: 1,
  },
  {
    id: "m3",
    name: "Ama Serwaa",
    phone: "+233 55 456 7890",
    rating: 4.9,
    jobs: 203,
    latitude: 5.615,
    longitude: -0.201,
    specialties: ["Electrical", "Diagnostics"],
    status: "available",
    lastMessage: "Can you share a photo of the dashboard warning?",
    lastMessageTime: "Mon",
    unread: 0,
  },
  {
    id: "m4",
    name: "Yaw Boateng",
    phone: "+233 27 321 0987",
    rating: 4.5,
    jobs: 67,
    latitude: 5.592,
    longitude: -0.175,
    specialties: ["Tow", "Flat Tyre"],
    status: "busy",
    lastMessage: "Job completed. Drive safe!",
    lastMessageTime: "May 28",
    unread: 0,
  },
];
