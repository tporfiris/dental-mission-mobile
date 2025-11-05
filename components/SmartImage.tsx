// components/SmartImage.tsx
import React, { useState } from 'react';
import { Image, ImageProps, ActivityIndicator, View, StyleSheet } from 'react-native';

interface SmartImageProps extends Omit<ImageProps, 'source'> {
  localUri: string;
  cloudUri?: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({ 
  localUri, 
  cloudUri, 
  style,
  ...props 
}) => {
  const [useLocal, setUseLocal] = useState(!cloudUri);
  const [isLoading, setIsLoading] = useState(false);

  // Prefer cloud URI if available, fall back to local
  const imageUri = useLocal || !cloudUri ? localUri : cloudUri;

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
        onError={(error) => {
          console.log('Image load error:', error.nativeEvent.error);
          setIsLoading(false);
          // If cloud fails and we have local, fall back to local
          if (!useLocal && localUri) {
            console.log('Falling back to local image');
            setUseLocal(true);
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
});