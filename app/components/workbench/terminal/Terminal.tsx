import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createScopedLogger } from '~/utils/logger';
import { getTerminalTheme } from './theme';

const logger = createScopedLogger('Terminal');

export interface TerminalRef {
  reloadStyles: () => void;
}

export interface TerminalProps {
  className?: string;
  readonly?: boolean;
  id: string;
  onTerminalReady?: (terminal: any) => void;
  onTerminalResize?: (cols: number, rows: number) => void;
}

export const Terminal = forwardRef<TerminalRef, TerminalProps>(
  ({ className, readonly, id, onTerminalReady, onTerminalResize }, ref) => {
    const terminalElementRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<any>();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
      const loadTerminal = async () => {
        const element = terminalElementRef.current!;

        // Dynamically import xterm packages to avoid SSR issues
        const [{ FitAddon }, { WebLinksAddon }, { Terminal: xTerm }] = await Promise.all([
          import('@xterm/addon-fit'),
          import('@xterm/addon-web-links'),
          import('@xterm/xterm'),
        ]);

        // Import xterm CSS only on client side
        await import('@xterm/xterm/css/xterm.css');

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();

        const terminal = new xTerm({
          cursorBlink: true,
          convertEol: true,
          disableStdin: readonly,
          theme: getTerminalTheme(readonly ? { cursor: '#00000000' } : {}),
          fontSize: 12,
          fontFamily: 'Menlo, courier-new, courier, monospace',
        });

        terminalRef.current = terminal;

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);
        terminal.open(element);

        const resizeObserver = new ResizeObserver(() => {
          fitAddon.fit();
          onTerminalResize?.(terminal.cols, terminal.rows);
        });

        resizeObserver.observe(element);

        logger.debug(`Attach [${id}]`);

        onTerminalReady?.(terminal);
        setIsLoaded(true);

        return () => {
          resizeObserver.disconnect();
          terminal.dispose();
        };
      };

      loadTerminal();
    }, []);

    useEffect(() => {
      if (!isLoaded || !terminalRef.current) {
        return;
      }

      const terminal = terminalRef.current;

      // we render a transparent cursor in case the terminal is readonly
      terminal.options.theme = getTerminalTheme(readonly ? { cursor: '#00000000' } : {});

      terminal.options.disableStdin = readonly;
    }, [readonly, isLoaded]);

    useImperativeHandle(ref, () => {
      return {
        reloadStyles: () => {
          const terminal = terminalRef.current!;
          terminal.options.theme = getTerminalTheme(readonly ? { cursor: '#00000000' } : {});
        },
      };
    }, [readonly]);

    return <div className={className} ref={terminalElementRef} />;
  },
);
