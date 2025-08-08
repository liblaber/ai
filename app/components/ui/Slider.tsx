import { motion } from 'framer-motion';
import { memo } from 'react';
import { classNames } from '~/utils/classNames';
import { genericMemo } from '~/utils/react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';

type SliderTab = 'code' | 'diff' | 'preview';

interface SliderOption {
  value: SliderTab;
  text: string;
}

interface SliderProps {
  selected: SliderTab;
  setSelected?: (selected: SliderTab) => void;
}

const sliderOptions: SliderOption[] = [
  { value: 'code', text: 'Code' },
  { value: 'diff', text: 'Diff' },
  { value: 'preview', text: 'Preview' },
];

export const Slider = genericMemo(({ selected, setSelected }: SliderProps) => {
  const devMode = useStore(workbenchStore.devMode);

  if (!devMode) {
    return (
      <div className="flex items-center">
        <span className="mr-1 text-sm font-bold text-secondary cursor-default select-none px-2.5 py-1">Preview</span>
      </div>
    );
  }

  return (
    <div className="flex items-center flex-wrap shrink-0 gap-1 bg-depth-1 overflow-hidden rounded-lg h-full">
      {sliderOptions.map((option) => (
        <SliderButton
          key={option.value}
          selected={selected === option.value}
          setSelected={() => setSelected?.(option.value)}
        >
          {option.text}
        </SliderButton>
      ))}
    </div>
  );
});

interface SliderButtonProps {
  selected: boolean;
  children: string | JSX.Element | Array<JSX.Element | string>;
  setSelected: () => void;
}

const SliderButton = memo(({ selected, children, setSelected }: SliderButtonProps) => {
  return (
    <button
      onClick={setSelected}
      className={classNames(
        'bg-transparent text-sm px-2.5 py-1 rounded-md relative h-full',
        selected ? 'text-white' : 'text-secondary hover:text-primary cursor-pointer',
      )}
    >
      <span className="relative z-10">{children}</span>
      {selected && (
        <motion.span
          layoutId="pill-tab"
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-0 bg-depth-3 rounded-md h-full"
        ></motion.span>
      )}
    </button>
  );
});
