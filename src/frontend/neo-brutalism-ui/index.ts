export type UiTheme = 'cosmic' | 'brutalist';

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
} as const satisfies Record<UiTheme, { id: UiTheme; label: string; description: string }>;

export function isUiTheme(value: unknown): value is UiTheme {
  return value === 'cosmic' || value === 'brutalist';
}
