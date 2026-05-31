import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { BiometricsPrompt } from '../components/BiometricsPrompt';
import { useAuthStore } from '../stores/auth.store';

export function HomeScreen() {
  const { biometricsEnabled, setBiometricsEnabled } = useAuthStore();
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

  return (
    <View testID="home-screen" className="flex-1 items-center justify-center bg-background">
      <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
        Power Gym
      </Text>
      <BiometricsPrompt
        visible={showPrompt}
        onDismiss={() => setShowPrompt(false)}
        setBiometricsEnabled={setBiometricsEnabled}
      />
    </View>
  );
}
