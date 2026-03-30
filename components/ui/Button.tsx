import React from 'react';
import { Pressable, StyleSheet, Platform, PressableProps } from 'react-native';

const buttonStyles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
});

export default function Button({ style, ...props }: PressableProps) {
  return <Pressable style={[buttonStyles.button, style]} {...props} />;
}