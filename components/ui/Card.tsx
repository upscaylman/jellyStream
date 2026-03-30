import { View, StyleSheet, Platform, ViewProps } from 'react-native';
import React from 'react';

const cardStyles = StyleSheet.create({
  card: Platform.select({
    default: {},
  }) as Record<string, unknown>,
});

export function Card({ style, ...props }: ViewProps) {
  return <View style={[cardStyles.card, style]} {...props} />;
}