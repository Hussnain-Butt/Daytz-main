import { Appearance } from 'react-native';

// Function to detect the current color scheme
const isDarkTheme = () => {
  return Appearance.getColorScheme() === 'dark';
};

// Define your color variables
export const colors = {
  // Default colors
  Description: isDarkTheme() ? '#FFF' : '#5F5F5F',
  placeholderTextColor: isDarkTheme() ? '#9CA4A4' : '#9CA4A4',
  Grey: isDarkTheme() ? '#9CA4A4' : '#9CA4A4',
  Success: isDarkTheme() ? '#3ADB76' : '#3ADB76',
  White: isDarkTheme() ? '#FFFFFF' : '#FFFFFF',
  Black: isDarkTheme() ? '#000000' : '#000000',
  LightBlack: isDarkTheme() ? '#222B45' : '#222B45',
  Red: isDarkTheme() ? '#FFF' : '#F46A6A',
  ErrorBorder: isDarkTheme() ? '#FFF' : '#F46A6A',
  ErrorText: isDarkTheme() ? '#FFF' : '#F46A6A',
  // Daytz Color Scheme
  PinkPrimary: isDarkTheme() ? '#ff149d' : '#ff149d',
  TealPrimary: isDarkTheme() ? '#00E0FF' : '#00E0FF',
  PurplePrimary: isDarkTheme() ? '#450074' : '#450074',
  GoldPrimary: isDarkTheme() ? '#FFDB5C' : '#FFDB5C',
  ActiveButtonColor: isDarkTheme() ? '#EEE299' : '#EEE299',
  DeActiveButtonColor: isDarkTheme() ? '#CDCFD0' : '#CDCFD0',
  TealLight: isDarkTheme() ? '#88ECFD' : '#88ECFD',
  Green: isDarkTheme() ? '#3DA282' : '#3DA282',
  LightGrey: isDarkTheme() ? '#E0E0E0' : '#E0E0E0',
  DarkGrey: isDarkTheme() ? '#828282' : '#828282',
  GreyDark: isDarkTheme() ? '#1E1E1E' : '#1E1E1E',
  GreyBackground: isDarkTheme() ? '#AAAAAA' : '#AAAAAA',
  ArrowIcon: isDarkTheme() ? '#D9D9D9' : '#D9D9D9',
  PinkSecondary: isDarkTheme() ? '#a60d66' : '#a60d66',
  TealSecondary: isDarkTheme() ? '#3596a5' : '#3596a5',
  PurpleSecondary: isDarkTheme() ? '#260c53' : '#260c53',
  GoldSecondary: isDarkTheme() ? '#b39c00' : '#b39c00',
  Background: isDarkTheme() ? '#2D2D2D' : '#2D2D2D',
  LightBackground: isDarkTheme() ? '#3F3F3F' : '#3F3F3F',
};

// Create a theme object for React Native Paper
export const theme = {
  dark: isDarkTheme(),
  roundness: 4,
  colors: {
    ...colors,
    primary: colors.PinkPrimary,
    accent: colors.TealPrimary,
    background: colors.Background,
    surface: colors.White,
    text: colors.Black,
    error: colors.Red,
    disabled: colors.LightGrey,
    placeholder: colors.Grey,
    backdrop: colors.Black,
  },
};
