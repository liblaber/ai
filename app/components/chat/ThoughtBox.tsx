import { type PropsWithChildren, useState } from 'react';
import { Brain } from 'lucide-react';

const ThoughtBox = ({ title, children }: PropsWithChildren<{ title: string }>) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`
        bg-depth-2
        shadow-md
        rounded-lg
        cursor-pointer
        transition-all
        duration-300
        ${isExpanded ? 'max-h-96' : 'max-h-13'}
        overflow-auto
        border border-depth-3
      `}
    >
      <div className="p-4 flex items-center gap-4 rounded-lg  text-secondary font-medium leading-5 text-sm  border border-depth-3">
        <Brain className="text-2xl" />
        <div className="div">
          <span> {title}</span> {!isExpanded && <span className="text-tertiary"> - Click to expand</span>}
        </div>
      </div>
      <div
        className={`
        transition-opacity
        duration-300
        p-4
        rounded-lg
        ${isExpanded ? 'opacity-100' : 'opacity-0'}
      `}
      >
        {children}
      </div>
    </div>
  );
};

export default ThoughtBox;
