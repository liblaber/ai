// Use a fallback type for SSR compatibility
type ITheme = any;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: '#eff0eb',
    cursorAccent: '#eff0eb',
    foreground: '#eff0eb',
    background: '#08090a',
    selectionBackground: '#97979b33',
    selectionForeground: '#eff0eb',
    selectionInactiveBackground: '#97979b33',

    // ansi escape code colors
    black: '#000000',
    red: '#ff5c57',
    green: '#5af78e',
    yellow: '#f3f99d',
    blue: '#57c7ff',
    magenta: '#ff6ac1',
    cyan: '#9aedfe',
    white: '#f1f1f0',
    brightBlack: '#686868',
    brightRed: '#ff5c57',
    brightGreen: '#5af78e',
    brightYellow: '#f3f99d',
    brightBlue: '#57c7ff',
    brightMagenta: '#ff6ac1',
    brightCyan: '#9aedfe',
    brightWhite: '#f1f1f0',

    ...overrides,
  };
}
