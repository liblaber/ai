import { useDrag, useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import type { TabVisibilityConfig } from '~/components/@settings/core/types';
import { TAB_LABELS } from '~/components/@settings/core/types';
import { Switch } from '~/components/ui/Switch';

interface DraggableTabListProps {
  tabs: TabVisibilityConfig[];
  onReorder: (tabs: TabVisibilityConfig[]) => void;
  onVisibilityChange?: (tab: TabVisibilityConfig, visible: boolean) => void;
  showControls?: boolean;
}

interface DraggableTabItemProps {
  tab: TabVisibilityConfig;
  index: number;
  moveTab: (dragIndex: number, hoverIndex: number) => void;
  showControls?: boolean;
  onVisibilityChange?: (tab: TabVisibilityConfig, visible: boolean) => void;
}

interface DragItem {
  type: string;
  index: number;
  id: string;
}

const DraggableTabItem = ({ tab, index, moveTab, showControls, onVisibilityChange }: DraggableTabItemProps) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'tab',
    item: { type: 'tab', index, id: tab.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: 'tab',
    hover: (item: DragItem, monitor) => {
      if (!monitor.isOver({ shallow: true })) {
        return;
      }

      if (item.index === index) {
        return;
      }

      if (item.id === tab.id) {
        return;
      }

      moveTab(item.index, index);
      item.index = index;
    },
  });

  const ref = (node: HTMLDivElement | null) => {
    dragRef(node);
    dropRef(node);
  };

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={{
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.1)' : 'none',
      }}
      className={classNames(
        'flex items-center justify-between p-4 rounded-lg',
        'bg-[#F5F5F5] dark:bg-[#1A1A1A]',
        'border border-[#E5E5E5] dark:border-[#333333]',
        isDragging ? 'z-50' : '',
      )}
    >
      <div className="flex items-center gap-4">
        <div className="cursor-grab">
          <div className="i-ph:dots-six-vertical w-4 h-4 text-liblab-elements-textSecondary" />
        </div>
        <div>
          <div className="font-medium text-liblab-elements-textPrimary">{TAB_LABELS[tab.id]}</div>
          {showControls && <div className="text-xs text-liblab-elements-textSecondary">Order: {tab.order}</div>}
        </div>
      </div>
      {showControls && !tab.locked && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={tab.visible}
              onCheckedChange={(checked: boolean) => onVisibilityChange?.(tab, checked)}
              className="data-[state=checked]:bg-accent-500"
              aria-label={`Toggle ${TAB_LABELS[tab.id]} visibility`}
            />
            <label className="text-sm text-liblab-elements-textSecondary">Visible</label>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const DraggableTabList = ({
  tabs,
  onReorder,
  onVisibilityChange,
  showControls = false,
}: DraggableTabListProps) => {
  const moveTab = (dragIndex: number, hoverIndex: number) => {
    const items = Array.from(tabs);
    const [reorderedItem] = items.splice(dragIndex, 1);
    items.splice(hoverIndex, 0, reorderedItem);

    // Update order numbers based on position
    const reorderedTabs = items.map((tab, index) => ({
      ...tab,
      order: index + 1,
    }));

    onReorder(reorderedTabs);
  };

  return (
    <div className="space-y-2">
      {tabs.map((tab, index) => (
        <DraggableTabItem
          key={tab.id}
          tab={tab}
          index={index}
          moveTab={moveTab}
          showControls={showControls}
          onVisibilityChange={onVisibilityChange}
        />
      ))}
    </div>
  );
};
