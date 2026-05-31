import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { DrawerHeader } from '../../components/drawer/DrawerHeader';

interface PlaceholderScreenProps {
  title: string;
  testID: string;
}

export function PlaceholderScreen({ title, testID }: PlaceholderScreenProps) {
  const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();

  return (
    <View testID={testID} className="flex-1 bg-background">
      <DrawerHeader navigation={navigation} />
      <View className="flex-1 px-4 py-6">
        <Text className="text-[18px] font-semibold tracking-[-0.3px] text-foreground">
          {title}
        </Text>
      </View>
    </View>
  );
}
