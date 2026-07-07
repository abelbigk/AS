import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';

export default function AuthLayout() {
  return (
    <PaperProvider>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false, animationEnabled: false }} />
        <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      </Stack>
    </PaperProvider>
  );
}
