import { TriangleAlert } from 'lucide-react';

export const GenerationError = () => (
  <div className="text-secondary flex flex-col items-center">
    <TriangleAlert size={80} className="font-medium mb-8 text-center" />

    <div className="text-lg font-medium text-center">Error occurred while generating response</div>
  </div>
);
