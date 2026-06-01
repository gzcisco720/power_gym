import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Screen } from '../components/Screen';
import { BiometricsPrompt } from '../components/BiometricsPrompt';
import { useAuthStore } from '../stores/auth.store';
import { OwnerDashboard } from './dashboard/OwnerDashboard';
import { TrainerDashboard } from './dashboard/TrainerDashboard';
import { MemberDashboard } from './dashboard/MemberDashboard';

export function DashboardScreen(): React.JSX.Element {
  const { biometricsEnabled, setBiometricsEnabled, user } = useAuthStore();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (biometricsEnabled) return;
    LocalAuthentication.hasHardwareAsync().then((hasHardware) => {
      if (hasHardware) {
        LocalAuthentication.isEnrolledAsync().then((isEnrolled) => {
          if (isEnrolled) setShowPrompt(true);
        });
      }
    });
  }, [biometricsEnabled]);

  const role = user?.role ?? 'owner';

  return (
    <Screen testID="home-screen" scrollable={false}>
      <View className="flex-1">
        {role === 'trainer' ? (
          <TrainerDashboard />
        ) : role === 'member' ? (
          <MemberDashboard />
        ) : (
          <OwnerDashboard />
        )}
      </View>
      <BiometricsPrompt
        visible={showPrompt}
        onDismiss={() => setShowPrompt(false)}
        setBiometricsEnabled={setBiometricsEnabled}
      />
    </Screen>
  );
}
