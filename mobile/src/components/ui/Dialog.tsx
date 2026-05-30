import * as DialogPrimitive from '@rn-primitives/dialog';
import React from 'react';
import { View } from 'react-native';

const Root = DialogPrimitive.Root;
const Trigger = DialogPrimitive.Trigger;
const Close = DialogPrimitive.Close;
const Title = DialogPrimitive.Title;
const Description = DialogPrimitive.Description;

function Overlay({ children }: { children?: React.ReactNode }) {
  const { open } = DialogPrimitive.useRootContext();
  if (!open) return null;
  return (
    <View className="absolute inset-0 z-50 flex-1 items-center justify-center bg-black/60 px-6">
      {children}
    </View>
  );
}

function Content({ children }: { children?: React.ReactNode }) {
  const { open } = DialogPrimitive.useRootContext();
  if (!open) return null;
  return (
    <DialogPrimitive.Content className="w-full rounded-2xl bg-card px-6 pb-6 pt-6">
      {children}
    </DialogPrimitive.Content>
  );
}

export const Dialog = {
  Root,
  Trigger,
  Overlay,
  Content,
  Close,
  Title,
  Description,
};
