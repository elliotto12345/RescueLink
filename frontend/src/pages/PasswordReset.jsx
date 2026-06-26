import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import { PasswordReset } from "../utils/";
import React from 'react'

export default function PasswordResetScreen({navigation}) {
  const [otp, setOTP] = useState("");

}; {
  return (
    <SafeAreaView style={styles.container}>
      <Text>Reset your password</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create ({
  flex: 1,
  backgroundColor: "#fff"
})