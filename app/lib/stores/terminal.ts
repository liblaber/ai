import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import { LiblabShell } from '~/utils/shell';
import { coloredText } from '~/utils/terminal';

export class TerminalStore {
  #shells: Array<LiblabShell> = [];

  showTerminal: WritableAtom<boolean> = atom(true);

  get getShells() {
    return this.#shells;
  }

  toggleTerminal(value?: boolean) {
    this.showTerminal.set(value !== undefined ? value : !this.showTerminal.get());
  }
  async attachTerminal(terminal: ITerminal) {
    try {
      const newShellProcess = new LiblabShell();
      await newShellProcess.init(terminal);
      this.#shells.push(newShellProcess);
    } catch (error: any) {
      terminal.write(coloredText.red('Failed to spawn shell\n\n') + error.message);
      return;
    }
  }

  onTerminalResize(cols: number, rows: number) {
    for (const { process } of this.#shells) {
      process?.resize({ cols, rows });
    }
  }
}
