// src/theme.ts
export const palette = {
  // Surface colors
  surface: '#ffffff',
  surfaceElevated: '#f8f9fa',
  surfaceHover: '#e9ecef',
  
  // Border and divider colors
  borderColor: '#e1e5e9',
  
  // Text colors
  textPrimary: '#172b4d',
  textSecondary: '#6b778c',
  textMuted: '#8993a4',
  textFaint: '#97a0af',
  
  // Accent colors
  accent: '#0052cc',
  accentSoft: 'rgba(0, 82, 204, 0.1)',
  
  // Status colors
  success: '#36b37e',
  warning: '#ffa500',
  error: '#ff5722',
  info: '#0052cc',
  
  // Shadow
  shadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  
  // Dark theme variants (for future use)
  dark: {
    surface: '#1a1a1a',
    surfaceElevated: '#2a2a2a',
    textPrimary: '#ffffff',
    textSecondary: '#b3b3b3',
    borderColor: '#404040',
  }
};

export const breakpoints = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1280px',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const typography = {
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '24px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export default {
  palette,
  breakpoints,
  spacing,
  typography,
};