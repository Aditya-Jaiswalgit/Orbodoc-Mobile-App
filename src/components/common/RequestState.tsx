import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

export function RequestState({ loading, error, empty, onRetry }: {
  loading?: boolean; error?: string | null; empty?: string; onRetry?: () => void;
}) {
  if (!loading && !error && !empty) return null;
  return (
    <View style={{ padding: 16, alignItems: 'center', gap: 8 }}>
      {loading ? <ActivityIndicator color="#0D9488" /> : <Text>{error || empty}</Text>}
      {!loading && error && onRetry && (
        <TouchableOpacity onPress={onRetry} accessibilityRole="button">
          <Text style={{ color: '#0D9488', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
