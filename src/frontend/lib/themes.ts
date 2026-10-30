export type UiTheme = 'cosmic' | 'brutalist' | 'cupertino';

export const UI_THEMES = {
  cosmic: {
    id: 'cosmic',
    label: 'COSMIC',
    description: 'Sci-Fiテーマ（cosmic-ui）',
  },
  brutalist: {
    id: 'brutalist',
    label: 'NEO BRUTALISM',
    description: '太い罫線とハードシャドウのneo-brutalism-ui',
  },
  cupertino: {
    id: 'cupertino',
    label: 'CUPERTINO',
    description: 'iOS / iPadOS風。タッチ操作とシステムの明暗設定に最適化',
  },
} as const satisfies Record<UiTheme, { id: UiTheme; label: string; description: string }>;

export const THEME_ORDER: readonly UiTheme[] = ['cosmic', 'brutalist', 'cupertino'];

export function isUiTheme(value: unknown): value is UiTheme {
  return value === 'cosmic' || value === 'brutalist' || value === 'cupertino';
}

export function nextTheme(theme: UiTheme): UiTheme {
  const index = THEME_ORDER.indexOf(theme);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
}
