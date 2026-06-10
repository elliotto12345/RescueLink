import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../pages/HomeScreen";
import LoginScreen from "../pages/LoginScreen";
import RegisterScreen from "../pages/RegisterScreen";
import UserDashboard from "../pages/UserDashboard";
import RequestHelpScreen from "../pages/RequestHelpScreen";
import TrackMechanicScreen from "../pages/TrackMechanicScreen";
import ChatScreen from "../pages/ChatScreen";
import AIAssistantScreen from "../pages/AIAssistantScreen";
import MechanicDashboard from "../pages/MechanicDashboard";
import JobScreen from "../pages/JobScreen";
import AdminDashboard from "../pages/AdminDashboard";
import ProfileScreen from "../pages/ProfileScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="UserDashboard" component={UserDashboard} />
        <Stack.Screen name="RequestHelp" component={RequestHelpScreen} />
        <Stack.Screen name="TrackMechanic" component={TrackMechanicScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
        <Stack.Screen name="MechanicDashboard" component={MechanicDashboard} />
        <Stack.Screen name="JobScreen" component={JobScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
