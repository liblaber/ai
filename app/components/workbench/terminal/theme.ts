import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--liblab-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--liblab-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--liblab-elements-terminal-textColor'),
    background: cssVar('--liblab-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--liblab-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--liblab-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--liblab-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--liblab-elements-terminal-color-black'),
    red: cssVar('--liblab-elements-terminal-color-red'),
    green: cssVar('--liblab-elements-terminal-color-green'),
    yellow: cssVar('--liblab-elements-terminal-color-yellow'),
    blue: cssVar('--liblab-elements-terminal-color-blue'),
    magenta: cssVar('--liblab-elements-terminal-color-magenta'),
    cyan: cssVar('--liblab-elements-terminal-color-cyan'),
    white: cssVar('--liblab-elements-terminal-color-white'),
    brightBlack: cssVar('--liblab-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--liblab-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--liblab-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--liblab-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--liblab-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--liblab-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--liblab-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--liblab-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
