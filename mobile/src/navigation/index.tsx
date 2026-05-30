import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Init: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function InitScreen() {
  return <View className="flex-1 bg-background" />;
}

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen name="Init" component={InitScreen} />
    </Stack.Navigator>
  );
}
