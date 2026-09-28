/**
 * Design tokens taken from app.padosipro.com (visual reference only).
 * The site's typeface (Eina01) is commercial, so Manrope, a free geometric sans, stands in for it.
 */
export const colors = {
  primary: '#155C49',
  primaryDeep: '#133E35',
  background: '#FAFAF7',
  surface: '#F2F4F7',
  card: '#FFFFFF',
  text: '#101828',
  textMuted: '#667085',
  textMutedDeep: '#344054',
  border: '#D0D5DD',
  success: '#027A48',
  successBg: '#ECFDF3',
  warning: '#B54708',
  warningBg: '#FFFAEB',
  error: '#B42318',
  errorBg: '#FFF1F0',
  gold: '#C9A84C',
  goldBg: '#FDF6E3',
  tealMuted: '#E8F8F3',
  tealSoft: '#4CC4A2',
  white: '#FFFFFF',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 } as const;

export const radius = { sm: 6, md: 12, lg: 18, xl: 24, pill: 9999 } as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

export const type = {
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' as const, color: colors.textMuted },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textMuted },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMutedDeep },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },
} as const;

/** Minimum touch target (Android guideline 48dp, Apple 44pt). */
export const TOUCH_MIN = 48;
