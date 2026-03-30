// Layout du groupe auth — stack simple sans tabs
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="server-select" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
