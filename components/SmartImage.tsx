// components/SmartImage.tsx
import React, { useState } from 'react';
import { Image, ImageProps, ActivityIndicator, View, StyleSheet, Text } from 'react-native';

interface SmartImageProps extends Omit<ImageProps, 'source'> {
  localUri: string;
  cloudUri?: string;
  placeholderInitials?: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({ 
  localUri, 
  cloudUri,
  placeholderInitials,
  style,
  ...props 
}) => {
  const [useLocal, setUseLocal] = useState(!cloudUri);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Validate URI - check if it's a valid file path or URL
  const isValidUri = (uri: string): boolean => {
    if (!uri) return false;
    return uri.startsWith('file://') || uri.startsWith('http://') || uri.startsWith('https://');
  };

  // Determine which URI to use
  const getImageUri = (): string | null => {
    if (!useLocal && cloudUri && isValidUri(cloudUri)) {
      return cloudUri;
    }
    if (localUri && isValidUri(localUri)) {
      return localUri;
    }
    return null;
  };

  const imageUri = getImageUri();

  // If no valid URI, show placeholder
  if (!imageUri || hasError) {
    return (
      <View style={[style, styles.placeholderContainer]}>
        <Text style={styles.placeholderText}>
          {placeholderInitials || '👤'}
        </Text>
      </View>
    );
  }

  return (
    <View style={style}>
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <ActivityIndicator size="small" color="#007bff" />
        </View>
      )}
      <Image
        {...props}
        style={style}
        source={{ uri: imageUri }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          // ✅ REMOVED: console.log - silently handle error
          setIsLoading(false);
          
          if (!useLocal && localUri && isValidUri(localUri)) {
            setUseLocal(true);
          } else {
            setHasError(true);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});