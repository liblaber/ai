import { Loader2 } from 'lucide-react';
import { Label } from '@/components/building-blocks/label/label';
import { cn } from '@/lib/utils';
const LoaderComponent = ({ className }: { className?: string }) => {
  return (
    <Label
      className={cn('text-muted-foreground', className)}
      label="Loading..."
      icon={<Loader2 className="h-4 w-4 animate-spin" />}
    />
  );
};

export { LoaderComponent };
