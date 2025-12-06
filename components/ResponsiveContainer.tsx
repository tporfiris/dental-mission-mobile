// components/ResponsiveContainer.tsx
// A wrapper component that handles responsive padding and safe areas automatically

import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, ScrollViewProps, SafeAreaView } from 'react-native';
import responsive from '../utils/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  useSafeArea?: boolean;
  horizontalPadding?: keyof typeof responsive.spacing | number;
  verticalPadding?: keyof typeof responsive.spacing | number;
  scrollViewProps?: Omit<ScrollViewProps, 'children'>;
}

/**
 * ResponsiveContainer
 * 
 * A container component that automatically handles:
 * - Responsive padding based on screen size
 * - Safe area insets (for notched devices)
 * - Optional ScrollView behavior
 * 
 * Usage:
 * <ResponsiveContainer scrollable>
 *   <YourContent />
 * </ResponsiveContainer>
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  scrollable = false,
  useSafeArea = true,
  horizontalPadding = 'lg',
  verticalPadding = 'lg',
  scrollViewProps,
}) => {
  const getPaddingValue = (padding: keyof typeof responsive.spacing | number) => {
    return typeof padding === 'number' ? padding : responsive.spacing[padding];
  };

  const containerStyle: ViewStyle = {
    flex: 1,
    paddingHorizontal: getPaddingValue(horizontalPadding),
    paddingVertical: getPaddingValue(verticalPadding),
    ...style,
  };

  if (scrollable) {
    const Container = useSafeArea ? SafeAreaView : View;
    return (
      <Container style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={containerStyle}
          showsVerticalScrollIndicator={false}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </Container>
    );
  }

  if (useSafeArea) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={containerStyle}>{children}</View>
      </SafeAreaView>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Default background - can be overridden
  },
});

/**
 * ResponsiveCard
 * 
 * A card component with responsive padding and margins
 * 
 * Usage:
 * <ResponsiveCard>
 *   <Text>Card content</Text>
 * </ResponsiveCard>
 */
interface ResponsiveCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'filled';
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  style,
  variant = 'elevated',
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return styles.cardElevated;
      case 'outlined':
        return styles.cardOutlined;
      case 'filled':
        return styles.cardFilled;
      default:
        return {};
    }
  };

  return (
    <View style={[styles.card, getVariantStyle(), style]}>
      {children}
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: responsive.borderRadius.lg,
    padding: responsive.spacing.lg,
    marginBottom: responsive.spacing.lg,
    width: '100%',
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardOutlined: {
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardFilled: {
    backgroundColor: '#f8f9fa',
  },
});

// Merge card styles into main styles
Object.assign(styles, cardStyles);

/**
 * ResponsiveRow
 * 
 * A flex row that automatically wraps on smaller screens
 */
interface ResponsiveRowProps {
  children: React.ReactNode;
  style?: ViewStyle;
  spacing?: keyof typeof responsive.spacing | number;
  wrap?: boolean;
}

export const ResponsiveRow: React.FC<ResponsiveRowProps> = ({
  children,
  style,
  spacing = 'md',
  wrap = true,
}) => {
  const gap = typeof spacing === 'number' ? spacing : responsive.spacing[spacing];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap: gap,
          width: '100%',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * ResponsiveButton
 * 
 * A button that maintains consistent sizing across screen sizes
 */
interface ResponsiveButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  fullWidth = false,
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return buttonStyles.buttonPrimary;
      case 'secondary':
        return buttonStyles.buttonSecondary;
      case 'danger':
        return buttonStyles.buttonDanger;
      case 'outline':
        return buttonStyles.buttonOutline;
      default:
        return {};
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: responsive.spacing.sm,
          paddingHorizontal: responsive.spacing.md,
        };
      case 'md':
        return {
          paddingVertical: responsive.spacing.md,
          paddingHorizontal: responsive.spacing.lg,
        };
      case 'lg':
        return {
          paddingVertical: responsive.spacing.lg,
          paddingHorizontal: responsive.spacing.xl,
        };
      default:
        return {};
    }
  };

  return (
    <View
      style={[
        buttonStyles.buttonBase,
        getVariantStyle(),
        getSizeStyle(),
        disabled && buttonStyles.buttonDisabled,
        fullWidth && { width: '100%' },
        style,
      ]}
    >
      {/* Add Pressable implementation here based on your needs */}
      {children}
    </View>
  );
};

const buttonStyles = StyleSheet.create({
  buttonBase: {
    borderRadius: responsive.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007bff',
  },
  buttonSecondary: {
    backgroundColor: '#6c757d',
  },
  buttonDanger: {
    backgroundColor: '#dc3545',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007bff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default ResponsiveContainer;