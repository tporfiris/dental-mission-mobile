// utils/responsive.ts
import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 16 Pro as reference - adjust to your design specs)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

/**
 * Scales a value relative to screen width
 * Use for horizontal spacing, padding, margins
 */
export const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scales a value relative to screen height
 * Use for vertical spacing, padding, margins
 */
export const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Scales font sizes based on screen width
 * Includes max/min bounds to prevent extreme scaling
 */
export const scaleFontSize = (size: number): number => {
  const newSize = size * (SCREEN_WIDTH / BASE_WIDTH);
  
  // Prevent fonts from becoming too large or too small
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(newSize);
};

/**
 * Moderately scales a value (less aggressive than full scaling)
 * Good for spacing that shouldn't scale linearly
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return size + (scale - 1) * size * factor;
};

/**
 * Get responsive dimensions for common UI elements
 */
export const responsive = {
  // Screen dimensions
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  
  // Safe area padding (approximate - adjust based on device)
  safeAreaTop: Platform.select({ ios: scaleHeight(44), android: 0 }),
  safeAreaBottom: Platform.select({ ios: scaleHeight(34), android: 0 }),
  
  // Common spacing values (scaled)
  spacing: {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(12),
    lg: moderateScale(16),
    xl: moderateScale(20),
    xxl: moderateScale(24),
    xxxl: moderateScale(32),
  },
  
  // Common font sizes (scaled)
  fontSize: {
    xs: scaleFontSize(10),
    sm: scaleFontSize(12),
    base: scaleFontSize(14),
    md: scaleFontSize(16),
    lg: scaleFontSize(18),
    xl: scaleFontSize(20),
    xxl: scaleFontSize(24),
    xxxl: scaleFontSize(28),
    jumbo: scaleFontSize(32),
  },
  
  // Border radius values
  borderRadius: {
    sm: moderateScale(4),
    md: moderateScale(8),
    lg: moderateScale(12),
    xl: moderateScale(16),
    round: moderateScale(9999),
  },
  
  // Icon sizes
  iconSize: {
    xs: moderateScale(12),
    sm: moderateScale(16),
    md: moderateScale(20),
    lg: moderateScale(24),
    xl: moderateScale(32),
    xxl: moderateScale(40),
  },
  
  // Button heights
  buttonHeight: {
    sm: scaleHeight(32),
    md: scaleHeight(40),
    lg: scaleHeight(48),
    xl: scaleHeight(56),
  },
  
  // Input heights
  inputHeight: {
    sm: scaleHeight(36),
    md: scaleHeight(44),
    lg: scaleHeight(52),
  },
};

/**
 * Helper to create responsive styles
 * Usage: const styles = createResponsiveStyles((r) => ({ container: { padding: r.spacing.md } }))
 */
export const createResponsiveStyles = <T extends Record<string, any>>(
  stylesFn: (responsive: typeof responsive) => T
): T => {
  return stylesFn(responsive);
};

/**
 * Check if device is a small screen (e.g., iPhone SE, iPhone 12 mini)
 */
export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Check if device is a medium screen (e.g., iPhone 12, 13, 14)
 */
export const isMediumDevice = (): boolean => {
  return SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 400;
};

/**
 * Check if device is a large screen (e.g., iPhone 14 Pro Max, 15 Pro Max)
 */
export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH >= 400;
};

/**
 * Get a value based on screen size
 */
export const getResponsiveValue = <T,>(
  small: T,
  medium: T,
  large: T
): T => {
  if (isSmallDevice()) return small;
  if (isMediumDevice()) return medium;
  return large;
};

export default responsive;