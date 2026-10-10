import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { appToastConfig } from '../src/components/common/AppToast';

jest.mock('lucide-react-native', () => ({ X: 'X' }));

test('app toast renders a working dismiss X', async () => {
  const hide = jest.fn();
  const toast = appToastConfig.success({
    position: 'top',
    type: 'success',
    isVisible: true,
    visibilityTime: 3500,
    text1: 'Role Permission Saved',
    text2: 'Permissions saved successfully.',
    show: jest.fn(),
    hide,
    onPress: jest.fn(),
    props: {},
  });
  let screen: Renderer.ReactTestRenderer;
  await act(async () => { screen = Renderer.create(<>{toast}</>); });

  expect(screen!.root.findByProps({ accessibilityLabel: 'Dismiss notification' })).toBeTruthy();
  expect(screen!.root.findAllByType(Text).map(node => node.props.children)).toContain('Role Permission Saved');
  await act(async () => screen!.root.findByProps({ accessibilityLabel: 'Dismiss notification' }).props.onPress());
  expect(hide).toHaveBeenCalledTimes(1);
  await act(async () => screen!.unmount());
});
