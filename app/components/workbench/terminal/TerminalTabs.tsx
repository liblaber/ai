import { useStore } from '@nanostores/react';
import React, { memo, useEffect, useRef, useState } from 'react';
import { type ImperativePanelHandle, Panel } from 'react-resizable-panels';
import { IconButton } from '~/components/ui/IconButton';
import { shortcutEventEmitter } from '~/lib/hooks';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { Terminal, type TerminalRef } from './Terminal';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('Terminal');

const MAX_TERMINALS = 3;
export const DEFAULT_TERMINAL_SIZE = 25;

export const TerminalTabs = memo(() => {
  const showTerminal = useStore(workbenchStore.showTerminal);

  const terminalRefs = useRef<Array<TerminalRef | null>>([]);
  const terminalPanelRef = useRef<ImperativePanelHandle>(null);
  const terminalToggledByShortcut = useRef(false);

  const [activeTerminal, setActiveTerminal] = useState(0);
  const [terminalCount, setTerminalCount] = useState(1);

  const addTerminal = () => {
    if (terminalCount < MAX_TERMINALS) {
      setTerminalCount(terminalCount + 1);
      setActiveTerminal(terminalCount);
    }
  };

  useEffect(() => {
    const { current: terminal } = terminalPanelRef;

    if (!terminal) {
      return;
    }

    const isCollapsed = terminal.isCollapsed();

    if (!showTerminal && !isCollapsed) {
      terminal.collapse();
    } else if (showTerminal && isCollapsed) {
      terminal.resize(DEFAULT_TERMINAL_SIZE);
    }

    terminalToggledByShortcut.current = false;
  }, [showTerminal]);

  useEffect(() => {
    const unsubscribeFromEventEmitter = shortcutEventEmitter.on('toggleTerminal', () => {
      terminalToggledByShortcut.current = true;
    });

    return () => {
      unsubscribeFromEventEmitter();
    };
  }, []);

  return (
    <Panel
      ref={terminalPanelRef}
      defaultSize={showTerminal ? DEFAULT_TERMINAL_SIZE : 0}
      minSize={10}
      collapsible
      onExpand={() => {
        if (!terminalToggledByShortcut.current) {
          workbenchStore.toggleTerminal(true);
        }
      }}
      onCollapse={() => {
        if (!terminalToggledByShortcut.current) {
          workbenchStore.toggleTerminal(false);
        }
      }}
    >
      <div className="h-full">
        <div className="bg-depth-1 h-full flex flex-col">
          <div className="flex items-center bg-depth-2 border-y border-depth-3 gap-1.5 min-h-[34px] p-2">
            {Array.from({ length: terminalCount }, (_, index) => {
              const isActive = activeTerminal === index;

              return (
                <React.Fragment key={index}>
                  <button
                    key={index}
                    className={classNames(
                      'flex items-center text-sm cursor-pointer gap-1.5 px-3 py-2 h-full whitespace-nowrap rounded-full',
                      {
                        'bg-depth-3 text-secondary hover:text-primary': isActive,
                        'bg-depth-2 text-secondary hover:bg-depth-3': !isActive,
                      },
                    )}
                    onClick={() => setActiveTerminal(index)}
                  >
                    <div className="i-liblab:ic_code text-xl opacity-50" />
                    Terminal {terminalCount > 1 && index + 1}
                  </button>
                </React.Fragment>
              );
            })}
            {terminalCount < MAX_TERMINALS && (
              <IconButton
                icon="i-liblab:ic_plus_circ"
                className="enabled:opacity-50 enabled:hover:opacity-100"
                size="2xl"
                onClick={addTerminal}
              />
            )}
            <IconButton
              className="ml-auto"
              icon="i-ph:caret-down"
              title="Close"
              size="md"
              onClick={() => workbenchStore.toggleTerminal(false)}
            />
          </div>
          {Array.from({ length: terminalCount }, (_, index) => {
            const isActive = activeTerminal === index;

            logger.debug(`Starting terminal [${index}]`);

            return (
              <Terminal
                key={index}
                id={`terminal_${index}`}
                className={classNames('h-full overflow-hidden', {
                  hidden: !isActive,
                })}
                ref={(ref) => {
                  terminalRefs.current.push(ref);
                }}
                onTerminalReady={(terminal) => workbenchStore.attachTerminal(terminal)}
                onTerminalResize={(cols, rows) => workbenchStore.onTerminalResize(cols, rows)}
              />
            );
          })}
        </div>
      </div>
    </Panel>
  );
});
