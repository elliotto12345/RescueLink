import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "../contexts/AuthContext";

// Public
import HomeScreen from "../pages/HomeScreen";
import LoginScreen from "../pages/LoginScreen";
import RegisterScreen from "../pages/RegisterScreen";
import ForgotPasswordScreen from "../pages/ForgotPasswordScreen";
import VerifyOTPScreen from "../pages/VerifyOTPScreen";
import NewPasswordScreen from "../pages/NewPasswordScreen";

// Driver
import UserDashboard from "../pages/driver/UserDashboard";
import RequestHelpScreen from "../pages/driver/RequestHelpScreen";
import TrackMechanicScreen from "../pages/driver/TrackMechanicScreen";
import EmergencyCenterScreen from "../pages/driver/EmergencyCenterScreen";
import PaymentsScreen from "../pages/driver/PaymentsScreen";
import RatingsScreen from "../pages/driver/RatingsScreen";
import ChatScreen from "../pages/driver/ChatScreen";
import AIAssistantScreen from "../pages/driver/AIAssistantScreen";

// Mechanic
import MechanicDashboard from "../pages/mechanic/MechanicDashboard";
import JobScreen from "../pages/mechanic/JobScreen";
import PerformanceInsightsScreen from "../pages/mechanic/PerformanceInsightsScreen";

// Admin
import AdminDashboard from "../pages/admin/AdminDashboard";

// Shared
import ProfileScreen from "../pages/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          {/* Public routes */}
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
          <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
          <Stack.Screen name="NewPassword" component={NewPasswordScreen} />

          {/* Driver routes */}
          <Stack.Screen name="UserDashboard" component={UserDashboard} />
          <Stack.Screen name="RequestHelp" component={RequestHelpScreen} />
          <Stack.Screen name="TrackMechanic" component={TrackMechanicScreen} />
          <Stack.Screen
            name="EmergencyCenter"
            component={EmergencyCenterScreen}
          />
          <Stack.Screen name="Payments" component={PaymentsScreen} />
          <Stack.Screen name="Ratings" component={RatingsScreen} />

          {/* Mechanic routes */}
          <Stack.Screen
            name="MechanicDashboard"
            component={MechanicDashboard}
          />
          <Stack.Screen name="JobScreen" component={JobScreen} />
          <Stack.Screen
            name="PerformanceInsights"
            component={PerformanceInsightsScreen}
          />

          {/* Admin routes */}
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />

          {/* Shared routes */}
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
