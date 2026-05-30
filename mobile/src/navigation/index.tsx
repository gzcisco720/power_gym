import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type RootStackParamList = Record<string, never>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#ffffff',
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    />
  );
}
