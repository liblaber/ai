import { atom } from 'nanostores';

export type Theme = 'dark' | 'light';

export const kTheme = 'liblab_theme';

export function themeIsDark() {
  return themeStore.get() === 'dark';
}

export const DEFAULT_THEME: Theme = 'dark';

export const themeStore = atom<Theme>(initStore());

function initStore() {
  /*
   * if (!import.meta.env.SSR) {
   *   const persistedTheme = localStorage.getItem(kTheme) as Theme | undefined;
   *   const themeAttribute = document.querySelector('html')?.getAttribute('data-theme');
   *
   *   return persistedTheme ?? (themeAttribute as Theme) ?? DEFAULT_THEME;
   * }
   */

  // at the moment, we only support dark theme
  return DEFAULT_THEME;
}

export function toggleTheme() {
  const currentTheme = themeStore.get();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  // Update the theme store
  themeStore.set(newTheme);

  // Update localStorage
  localStorage.setItem(kTheme, newTheme);

  // Update the HTML attribute
  document.querySelector('html')?.setAttribute('data-theme', newTheme);

  // Update user profile if it exists
  try {
    const userProfile = localStorage.getItem('liblab_user_profile');

    if (userProfile) {
      const profile = JSON.parse(userProfile);
      profile.theme = newTheme;
      localStorage.setItem('liblab_user_profile', JSON.stringify(profile));
    }
  } catch (error) {
    console.error('Error updating user profile theme:', error);
  }
}
