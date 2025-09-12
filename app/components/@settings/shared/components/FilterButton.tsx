import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ListFilter } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/Button';

export interface FilterButtonProps<TOption> {
  options: TOption[];
  getOptionLabel: (option: TOption) => string;
  onSelect: (option: TOption) => void;
  buttonText?: string;
}

export function FilterButton<TOption>({
  options,
  getOptionLabel,
  onSelect,
  buttonText = 'Filter',
}: FilterButtonProps<TOption>) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline">
          <ListFilter className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[140px] bg-[#2A2A2A] rounded-lg p-1 shadow-xl z-[9999]"
          sideOffset={5}
          align="end"
        >
          {options.map((option) => (
            <DropdownMenu.Item
              key={getOptionLabel(option)}
              className="text-sm text-white px-3 py-2 rounded hover:bg-gray-600/50 cursor-pointer outline-none"
              onSelect={() => {
                onSelect(option);
                setOpen(false);
              }}
            >
              {getOptionLabel(option)}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
