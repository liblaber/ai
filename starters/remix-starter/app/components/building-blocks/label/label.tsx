import { cn } from '@/lib/utils';

type LabelProps = {
  label: string;
  icon: React.ReactNode;
  className?: string;
};

const Label = ({ label, icon, className }: LabelProps) => {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
    </div>
  );
};

export { Label };
