import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuthStore } from '../../stores/auth.store';
import { useBrandingStore } from '../../stores/branding.store';
import { NAV_CONFIG } from '../../navigation/nav-config';

type ActiveRouteKey = string;

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getRoleLabel(role: string): string {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)} portal`;
}

function getActiveRouteKey(state: DrawerContentComponentProps['state']): ActiveRouteKey {
  if (!state.routes.length) return '';
  return state.routes[state.index]?.name ?? '';
}

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const user = useAuthStore((s) => s.user);
  const { gymName, fetchBranding } = useBrandingStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  if (!user) return null;

  const navGroups = NAV_CONFIG[user.role];
  const activeKey = getActiveRouteKey(state);

  return (
    <View className="flex-1 bg-background">
      {/* Branding header */}
      <View
        className="border-b border-foreground/[.06] px-4"
        style={{ paddingTop: insets.top + 16, paddingBottom: 20 }}
      >
        <View className="mb-1 h-10 w-10 items-center justify-center rounded-full bg-primary">
          <Text className="text-sm font-semibold text-foreground">
            {gymName ? gymName.charAt(0).toUpperCase() : 'G'}
          </Text>
        </View>
        <Text className="text-[16px] font-semibold text-foreground">{gymName ?? 'Power Gym'}</Text>
        <Text className="mt-0.5 text-[12px] text-foreground/65">{getRoleLabel(user.role)}</Text>
      </View>

      {/* Scrollable nav groups */}
      <ScrollView className="flex-1 py-2" showsVerticalScrollIndicator={false}>
        {navGroups.map((group) => (
          <View key={group.label} className="mb-4">
            <Text className="mb-1 px-4 text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
              {group.label}
            </Text>
            {group.items.map((item) => {
              const isActive = activeKey === item.screen;
              return (
                <Pressable
                  key={item.key}
                  testID={`drawer-item-${item.screen}`}
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate(item.screen as never)}
                  className={`mx-2 flex-row items-center rounded-lg px-3 py-2.5 ${
                    isActive ? 'bg-primary/12' : ''
                  }`}
                >
                  <Text
                    className={`text-[14px] font-medium ${
                      isActive ? 'text-primary-light' : 'text-foreground'
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* User footer */}
      <Pressable
        testID="drawer-user-footer"
        accessibilityLabel="Open settings"
        accessibilityRole="button"
        onPress={() => navigation.navigate('Settings' as never)}
        className="flex-row items-center border-t border-foreground/[.06] px-4"
        style={{ paddingTop: 16, paddingBottom: insets.bottom || 16 }}
      >
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-primary/20">
          <Text className="text-sm font-semibold text-primary-light">
            {getInitials(user.firstName, user.lastName)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[14px] font-medium text-foreground">
            {user.firstName} {user.lastName}
          </Text>
          <Text className="text-[12px] capitalize text-foreground/65">{user.role}</Text>
        </View>
        <Text className="text-[16px] text-foreground/65">⚙</Text>
      </Pressable>
    </View>
  );
}
