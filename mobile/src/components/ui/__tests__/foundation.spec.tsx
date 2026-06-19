/**
 * Stage 1 unit tests — Foundation: cn utility, path alias, and Reusables components
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

// Static imports to verify ~ alias and component availability
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Switch } from '~/components/ui/switch';

// ── cn utility ────────────────────────────────────────────────────────────────

describe('cn', () => {
  it('merges class strings', () => {
    // falsy values are excluded
    expect(cn('a', false && 'b', 'c')).toBe('a c');
    // tailwind conflict resolution: later class wins
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

// ── path-alias ────────────────────────────────────────────────────────────────

describe('path-alias', () => {
  it("resolves '~/components/ui/button'", () => {
    // If the moduleNameMapper is wired correctly, the static import above resolves
    expect(Button).toBeDefined();
    expect(typeof Button).toBe('function');
  });
});

// ── ui/Button ─────────────────────────────────────────────────────────────────

jest.mock('@expo-google-fonts/space-grotesk', () => ({}));
jest.mock('expo-font', () => ({ useFonts: () => [true] }));

describe('ui/Button', () => {
  it('renders label and fires onPress', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button onPress={onPress}>
        <Text>Press me</Text>
      </Button>,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ── ui/Input ──────────────────────────────────────────────────────────────────

describe('ui/Input', () => {
  it('forwards value and onChangeText', () => {
    const onChange = jest.fn();
    const { getByDisplayValue } = render(
      <Input value="hello" onChangeText={onChange} />,
    );
    expect(getByDisplayValue('hello')).toBeTruthy();
    fireEvent.changeText(getByDisplayValue('hello'), 'world');
    expect(onChange).toHaveBeenCalledWith('world');
  });
});

// ── ui/Dialog (CLI) ───────────────────────────────────────────────────────────

jest.mock('@rn-primitives/portal', () => ({
  Host: ({ children }: { children: React.ReactNode }) => children,
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ui/Dialog (CLI)', () => {
  it('open state renders content', () => {
    // open=true → content visible
    const { getByText, unmount } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(getByText('Test Dialog')).toBeTruthy();
    unmount();

    // open=false (default) → content not in tree
    const { queryByText } = render(
      <Dialog>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hidden Content</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(queryByText('Hidden Content')).toBeNull();
  });
});

// ── ui/Switch ─────────────────────────────────────────────────────────────────

describe('ui/Switch', () => {
  it('toggles checked state', () => {
    const onCheckedChange = jest.fn();
    const { getByRole } = render(
      <Switch checked={false} onCheckedChange={onCheckedChange} />,
    );
    const switchEl = getByRole('switch');
    fireEvent.press(switchEl);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
