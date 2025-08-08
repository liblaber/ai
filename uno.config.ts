import { globSync } from 'fast-glob';
import fs from 'node:fs/promises';
import { basename } from 'node:path';
import { defineConfig, presetIcons, presetUno, presetWind, transformerDirectives } from 'unocss';

const iconPaths = globSync('./icons/*.svg');

const collectionName = 'liblab';

const GRADIENT_DIRECTIONS: Record<string, string> = {
  t: 'top',
  tr: 'top right',
  r: 'right',
  br: 'bottom right',
  b: 'bottom',
  bl: 'bottom left',
  l: 'left',
  tl: 'top left',
};

const customIconCollection = iconPaths.reduce(
  (acc, iconPath) => {
    const [iconName] = basename(iconPath).split('.');

    acc[collectionName] ??= {};
    acc[collectionName][iconName] = async () => fs.readFile(iconPath, 'utf8');

    return acc;
  },
  {} as Record<string, Record<string, () => Promise<string>>>,
);

const BASE_COLORS = {
  white: '#FFFFFF',
  gray: {
    100: '#F7F7F8',
    200: '#D5D7DB',
    300: '#B6B9C0',
    400: '#999EA7',
    500: '#7B818C',
    600: '#626873',
    700: '#4A4F59',
    800: '#33373E',
    900: '#1E2125',
    950: '#08090A',
  },
  accent: {
    50: '#E8F9FF',
    100: '#D1F3FF',
    200: '#A3E7FF',
    300: '#74DAFF',
    400: '#46CEFF',
    500: '#3BCEFF',
    600: '#30B5E6',
    700: '#259BC7',
    800: '#1D7FA0',
    900: '#16647A',
    950: '#0D3D4D',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },
  orange: {
    50: '#FFFAEB',
    100: '#FEEFC7',
    200: '#FEDF89',
    300: '#FEC84B',
    400: '#FDB022',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
    800: '#93370D',
    900: '#792E0D',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#FD6060',
    600: '#E55555',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },
};

const COLOR_PRIMITIVES = {
  ...BASE_COLORS,
  alpha: {
    white: generateAlphaPalette(BASE_COLORS.white),
    gray: generateAlphaPalette(BASE_COLORS.gray[900]),
    red: generateAlphaPalette(BASE_COLORS.red[500]),
    accent: generateAlphaPalette(BASE_COLORS.accent[500]),
  },
};

export default defineConfig({
  content: {
    filesystem: [
      '**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/build/**',
      '!**/starters/**',
    ],
  },
  safelist: [...Object.keys(customIconCollection[collectionName] || {}).map((x) => `i-liblab:${x}`)],
  shortcuts: {
    'liblab-ease-cubic-bezier': 'ease-[cubic-bezier(0.4,0,0.2,1)]',
    'transition-theme': 'transition-[background-color,border-color,color] duration-150 liblab-ease-cubic-bezier',
    kdb: 'bg-liblab-elements-code-background text-liblab-elements-code-text py-1 px-1.5 rounded-md',
    'max-w-chat': 'max-w-[var(--chat-max-width)]',
    'max-w-homepage-textarea': 'max-w-[var(--homepage-textarea-max-width)]',
  },
  rules: [
    /**
     * This shorthand doesn't exist in Tailwind and we overwrite it to avoid
     * any conflicts with minified CSS classes.
     */
    ['b', {}],

    // Override all gradient directions to use RGB instead of OKLCH
    [
      /^bg-gradient-to-(t|tr|r|br|b|bl|l|tl)$/,
      ([, dir]) => ({
        'background-image': `linear-gradient(to ${GRADIENT_DIRECTIONS[dir]}, var(--un-gradient-stops))`,
      }),
    ],
  ],
  theme: {
    colors: {
      ...COLOR_PRIMITIVES,
      liblab: {
        elements: {
          borderColor: 'var(--color-bg-depth-2)',
          borderColorActive: 'var(--accent)',
          borderColorSecondary: 'var(--color-bg-depth-2Secondary)',
          bg: {
            depth: {
              1: 'var(--depth-1)',
              2: 'var(--depth-2)',
              3: 'var(--depth-3)',
              4: 'var(--depth-4)',
            },
          },
          textPrimary: 'var(--primary)',
          textSecondary: 'var(--secondary)',
          textTertiary: 'var(--tertiary)',
          code: {
            background: 'var(--liblab-elements-code-background)',
            text: 'var(--liblab-elements-code-text)',
          },
          button: {
            primary: {
              background: 'var(--liblab-elements-button-primary-background)',
              backgroundHover: 'var(--liblab-elements-button-primary-backgroundHover)',
              text: 'var(--liblab-elements-button-primary-text)',
            },
            secondary: {
              background: 'var(--liblab-elements-button-secondary-background)',
              backgroundHover: 'var(--liblab-elements-button-secondary-backgroundHover)',
              text: 'var(--liblab-elements-button-secondary-text)',
            },
            danger: {
              background: 'var(--liblab-elements-button-danger-background)',
              backgroundHover: 'var(--liblab-elements-button-danger-backgroundHover)',
              text: 'var(--liblab-elements-button-danger-text)',
            },
          },
          item: {
            contentDefault: 'var(--liblab-elements-item-contentDefault)',
            contentActive: 'var(--liblab-elements-item-contentActive)',
            contentAccent: 'var(--liblab-elements-item-contentAccent)',
            contentDanger: 'var(--liblab-elements-item-contentDanger)',
            backgroundDefault: 'var(--liblab-elements-item-backgroundDefault)',
            backgroundActive: 'var(--liblab-elements-item-backgroundActive)',
            backgroundAccent: 'var(--liblab-elements-item-backgroundAccent)',
            backgroundDanger: 'var(--liblab-elements-item-backgroundDanger)',
          },
          actions: {
            background: 'var(--liblab-elements-actions-background)',
            code: {
              background: 'var(--liblab-elements-actions-code-background)',
            },
          },
          artifacts: {
            background: 'var(--liblab-elements-artifacts-background)',
            backgroundHover: 'var(--liblab-elements-artifacts-backgroundHover)',
            borderColor: 'var(--color-depth-2)',
            inlineCode: {
              background: 'var(--liblab-elements-artifacts-inlineCode-background)',
              text: 'var(--liblab-elements-artifacts-inlineCode-text)',
            },
          },
          messages: {
            background: 'var(--liblab-elements-messages-background)',
            linkColor: 'var(--liblab-elements-messages-linkColor)',
            code: {
              background: 'var(--liblab-elements-messages-code-background)',
            },
            inlineCode: {
              background: 'var(--liblab-elements-messages-inlineCode-background)',
              text: 'var(--liblab-elements-messages-inlineCode-text)',
            },
          },
          icon: {
            success: 'var(--liblab-elements-icon-success)',
            error: 'var(--liblab-elements-icon-error)',
            primary: 'var(--liblab-elements-icon-primary)',
            secondary: 'var(--liblab-elements-icon-secondary)',
            tertiary: 'var(--liblab-elements-icon-tertiary)',
            background: 'var(--liblab-elements-icon-background)',
          },
          preview: {
            addressBar: {
              background: 'var(--liblab-elements-preview-addressBar-background)',
              backgroundHover: 'var(--liblab-elements-preview-addressBar-backgroundHover)',
              backgroundActive: 'var(--liblab-elements-preview-addressBar-backgroundActive)',
              text: 'var(--liblab-elements-preview-addressBar-text)',
              textActive: 'var(--liblab-elements-preview-addressBar-textActive)',
            },
          },
          terminals: {
            background: 'var(--liblab-elements-terminals-background)',
            buttonBackground: 'var(--liblab-elements-terminals-buttonBackground)',
          },
          dividerColor: 'var(--liblab-elements-dividerColor)',
          loader: {
            background: 'var(--liblab-elements-loader-background)',
            progress: 'var(--liblab-elements-loader-progress)',
          },
          prompt: {
            background: 'var(--liblab-elements-prompt-background)',
          },
          sidebar: {
            dropdownShadow: 'var(--liblab-elements-sidebar-dropdownShadow)',
            buttonBackgroundDefault: 'var(--liblab-elements-sidebar-buttonBackgroundDefault)',
            buttonBackgroundHover: 'var(--liblab-elements-sidebar-buttonBackgroundHover)',
            buttonText: 'var(--liblab-elements-sidebar-buttonText)',
          },
          cta: {
            background: 'var(--liblab-elements-cta-background)',
            text: 'var(--liblab-elements-cta-text)',
          },
        },
      },
    },
  },
  transformers: [transformerDirectives()],
  presets: [
    presetUno({
      dark: {
        light: '[data-theme="light"]',
        dark: '[data-theme="dark"]',
      },
    }),
    presetIcons({
      warn: true,
      collections: {
        ...customIconCollection,
      },
      unit: 'em',
    }),
    presetWind(),
  ],
});

/**
 * Generates an alpha palette for a given hex color.
 *
 * @param hex - The hex color code (without alpha) to generate the palette from.
 * @returns An object where keys are opacity percentages and values are hex colors with alpha.
 *
 * Example:
 *
 * ```
 * {
 *   '1': '#FFFFFF03',
 *   '2': '#FFFFFF05',
 *   '3': '#FFFFFF08',
 * }
 * ```
 */
function generateAlphaPalette(hex: string) {
  return [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].reduce(
    (acc, opacity) => {
      const alpha = Math.round((opacity / 100) * 255)
        .toString(16)
        .padStart(2, '0');

      acc[opacity] = `${hex}${alpha}`;

      return acc;
    },
    {} as Record<number, string>,
  );
}
