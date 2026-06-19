import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ParamListBase } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useBrandingStore } from '../../stores/branding.store';
import { Button } from '~/components/ui/button';

interface DrawerHeaderProps {
  navigation: DrawerNavigationProp<ParamListBase>;
}

export function DrawerHeader({ navigation }: DrawerHeaderProps) {
  const { gymName } = useBrandingStore();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center border-b border-foreground/[.06] bg-background px-4"
      style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
    >
      <Button
        testID="drawer-hamburger"
        accessibilityLabel="Open menu"
        onPress={() => navigation.toggleDrawer()}
        variant="ghost"
        size="icon"
        className="mr-2"
      >
        <Text className="text-[22px] text-foreground">☰</Text>
      </Button>
      <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
        {gymName ?? 'Power Gym'}
      </Text>
    </View>
  );
}
