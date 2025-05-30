import { AlertTriangle } from 'lucide-react';
import { Label } from '@/components/building-blocks/label/label';
import { cn } from '@/lib/utils';

const ErrorComponent = ({ errorMessage, className }: { errorMessage?: string; className?: string }) => {
  return (
    <Label
      className={cn('h-full w-full text-destructive', className)}
      label={errorMessage || 'Error'}
      icon={<AlertTriangle className="h-4 w-4" />}
    />
  );
};

export { ErrorComponent };
