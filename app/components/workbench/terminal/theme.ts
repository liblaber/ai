// Use a fallback type for SSR compatibility
type ITheme = any;

const getCssVar = (token: string) => {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const style = getComputedStyle(document.documentElement);

  return style.getPropertyValue(token) || undefined;
};

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: getCssVar('--liblab-elements-terminal-cursorColor'),
    cursorAccent: getCssVar('--liblab-elements-terminal-cursorColorAccent'),
    foreground: getCssVar('--liblab-elements-terminal-textColor'),
    background: getCssVar('--liblab-elements-terminal-backgroundColor'),
    selectionBackground: getCssVar('--liblab-elements-terminal-selection-backgroundColor'),
    selectionForeground: getCssVar('--liblab-elements-terminal-selection-textColor'),
    selectionInactiveBackground: getCssVar('--liblab-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: getCssVar('--liblab-elements-terminal-color-black'),
    red: getCssVar('--liblab-elements-terminal-color-red'),
    green: getCssVar('--liblab-elements-terminal-color-green'),
    yellow: getCssVar('--liblab-elements-terminal-color-yellow'),
    blue: getCssVar('--liblab-elements-terminal-color-blue'),
    magenta: getCssVar('--liblab-elements-terminal-color-magenta'),
    cyan: getCssVar('--liblab-elements-terminal-color-cyan'),
    white: getCssVar('--liblab-elements-terminal-color-white'),
    brightBlack: getCssVar('--liblab-elements-terminal-color-brightBlack'),
    brightRed: getCssVar('--liblab-elements-terminal-color-brightRed'),
    brightGreen: getCssVar('--liblab-elements-terminal-color-brightGreen'),
    brightYellow: getCssVar('--liblab-elements-terminal-color-brightYellow'),
    brightBlue: getCssVar('--liblab-elements-terminal-color-brightBlue'),
    brightMagenta: getCssVar('--liblab-elements-terminal-color-brightMagenta'),
    brightCyan: getCssVar('--liblab-elements-terminal-color-brightCyan'),
    brightWhite: getCssVar('--liblab-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
