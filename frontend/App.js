import { LogBox } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";

LogBox.ignoreLogs(["BloomFilter error", "BloomFilterError"]);

export default function App() {
  return <AppNavigator />;
}
