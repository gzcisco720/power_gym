import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuthStore } from '../stores/auth.store';
import { LoginScreen } from '../screens/LoginScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AppDrawerContent } from '../components/drawer/AppDrawerContent';
import { DrawerHeader } from '../components/drawer/DrawerHeader';
import { NAV_CONFIG } from './nav-config';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type AppStackParamList = {
  Drawer: undefined;
  Settings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Drawer = createDrawerNavigator();

const authScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#0a0a0a' },
} as const;

function SettingsPlaceholder() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-[18px] font-semibold text-foreground">Settings</Text>
    </View>
  );
}

function DrawerNavigator() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'member';
  const navGroups = NAV_CONFIG[role];

  // Collect all screens for this role in order, with Dashboard first
  const allItems = navGroups.flatMap((g) => g.items);

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        header: () => <DrawerHeader navigation={navigation} />,
        drawerStyle: { width: '78%', backgroundColor: '#0a0a0a' },
      })}
    >
      {/* Always include Dashboard first to satisfy initialRouteName */}
      <Drawer.Screen name="Dashboard" component={HomeScreen} />
      {allItems
        .filter((item) => item.screen !== 'Dashboard')
        .map((item) => (
          <Drawer.Screen
            key={item.screen}
            name={item.screen}
            component={ScreenPlaceholder(item.label)}
          />
        ))}
    </Drawer.Navigator>
  );
}

// Memoized map so each call with the same label returns the same component reference
const placeholderCache = new Map<string, () => React.JSX.Element>();

function ScreenPlaceholder(label: string): () => React.JSX.Element {
  if (!placeholderCache.has(label)) {
    const Component = function PlaceholderScreen() {
      return (
        <View className="flex-1 items-center justify-center bg-background">
          <Text className="text-[18px] font-semibold text-foreground">{label}</Text>
        </View>
      );
    };
    Component.displayName = `PlaceholderScreen(${label})`;
    placeholderCache.set(label, Component);
  }
  return placeholderCache.get(label)!;
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Drawer" component={DrawerNavigator} />
      <AppStack.Screen name="Settings" component={SettingsPlaceholder} />
    </AppStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={authScreenOptions}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

export function RootNavigator() {
  const { accessToken } = useAuthStore();
  return accessToken ? <AppNavigator /> : <AuthNavigator />;
}

export const linking = {
  prefixes: ['powergym://', 'https://app.powergym.com'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};
