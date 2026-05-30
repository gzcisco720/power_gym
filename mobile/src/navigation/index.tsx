import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Init: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function InitScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
        Hello World
      </Text>
      <Text className="mt-0.5 text-[12px] text-foreground/65">
        Power Gym mobile is running
      </Text>
    </View>
  );
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
