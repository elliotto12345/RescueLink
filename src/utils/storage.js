import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveUser = async (user, token) => {
  await AsyncStorage.setItem("user", JSON.stringify(user));
  await AsyncStorage.setItem("token", token);
};

export const getUser = async () => {
  const user = await AsyncStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

export const clearSession = async () => {
  await AsyncStorage.removeItem("user");
  await AsyncStorage.removeItem("token");
};
