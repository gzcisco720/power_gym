import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuthStore } from '../stores/auth.store';
import { LoginScreen } from '../screens/LoginScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import {
  TrainersScreen,
  MembersScreen,
  InvitesScreen,
  CalendarScreen,
  BillingScreen,
  TrainingTemplatesScreen,
  NutritionTemplatesScreen,
  MyTrainingScreen,
  MyNutritionScreen,
  MyBodyTestsScreen,
  MyScheduleScreen,
  MyHealthScreen,
  BodyTestsScreen,
  JourneyScreen,
} from '../screens/placeholders';
import { CheckInScreen } from '../screens/check-in/CheckInScreen';
import { CheckInFormScreen } from '../screens/check-in/CheckInFormScreen';
import { CheckInDetailScreen } from '../screens/check-in/CheckInDetailScreen';
import { CheckIn } from '../types/check-ins';
import { ServicesScreen } from '../screens/services/ServicesScreen';
import { EquipmentScreen } from '../screens/equipment/EquipmentScreen';
import { EquipmentDetailScreen } from '../screens/equipment/EquipmentDetailScreen';
import { AppDrawerContent } from '../components/drawer/AppDrawerContent';
import { DrawerHeader } from '../components/drawer/DrawerHeader';
import { NAV_CONFIG } from './nav-config';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { EquipmentItem } from '../types/equipment';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type AppStackParamList = {
  Drawer: undefined;
  Settings: undefined;
  EquipmentDetail: { equipment: EquipmentItem };
  CheckInForm: undefined;
  CheckInDetail: { checkIn: CheckIn };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Drawer = createDrawerNavigator();

const authScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#0a0a0a' },
} as const;

const SCREEN_REGISTRY: Record<string, () => React.JSX.Element> = {
  Dashboard: DashboardScreen,
  Trainers: TrainersScreen,
  Members: MembersScreen,
  Invites: InvitesScreen,
  Calendar: CalendarScreen,
  Equipment: EquipmentScreen,
  Services: ServicesScreen,
  Billing: BillingScreen,
  TrainingTemplates: TrainingTemplatesScreen,
  NutritionTemplates: NutritionTemplatesScreen,
  MyTraining: MyTrainingScreen,
  MyNutrition: MyNutritionScreen,
  MyBodyTests: MyBodyTestsScreen,
  MySchedule: MyScheduleScreen,
  MyHealth: MyHealthScreen,
  BodyTests: BodyTestsScreen,
  CheckIn: CheckInScreen,
  Journey: JourneyScreen,
};

function DrawerNavigator() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'member';
  const navGroups = NAV_CONFIG[role];

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
      {allItems.map((item) => {
        const ScreenComponent = SCREEN_REGISTRY[item.screen];
        if (!ScreenComponent) return null;
        return (
          <Drawer.Screen
            key={item.screen}
            name={item.screen}
            component={ScreenComponent}
          />
        );
      })}
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Drawer" component={DrawerNavigator} />
      <AppStack.Screen name="Settings" component={SettingsScreen} />
      <AppStack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} />
      <AppStack.Screen name="CheckInForm" component={CheckInFormScreen} />
      <AppStack.Screen name="CheckInDetail" component={CheckInDetailScreen} />
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
