import { useState, useRef } from 'react';
import { Info } from 'lucide-react';

export const SampleDatabaseTooltip = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8, // 8px below the icon
        left: rect.left + rect.width + 8, // 8px to the right of the icon
      });
    }

    setIsVisible(true);
  };

  const handleMouseLeave = () => setIsVisible(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isVisible && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width + 8,
      });
    }

    setIsVisible(!isVisible);
  };

  return (
    <>
      <div
        ref={iconRef}
        className="w-4 h-4 cursor-help ml-2"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <Info className="w-4 h-4" />
      </div>
      {isVisible && (
        <div
          className="fixed w-96 max-w-96 min-w-96 box-border bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 z-[99999]"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="text-sm w-full break-words whitespace-normal">
            <h3 className="font-semibold text-primary mb-2">Sample Database Overview</h3>
            <p className="text-secondary mb-3">
              This sample database contains information about organizations, the products they offer, and their business
              activities. It includes the following entities:
            </p>
            <div className="space-y-2 text-secondary">
              <div>
                <strong className="text-primary">Organizations</strong> – Basic company details like name, industry,
                contact info, and subscription tier.
              </div>
              <div>
                <strong className="text-primary">Users</strong> – People who work for each organization, including their
                roles and login activity.
              </div>
              <div>
                <strong className="text-primary">Products</strong> – Items or services offered by organizations, with
                descriptions, pricing, and stock levels.
              </div>
              <div>
                <strong className="text-primary">Sales</strong> – Records of individual sales, including payment details
                and amounts.
              </div>
              <div>
                <strong className="text-primary">Sale Items</strong> – Specific products sold in each sale, along with
                quantity, price, and discounts.
              </div>
              <div>
                <strong className="text-primary">Revenue</strong> – Financial summaries per organization, such as
                revenue, profit, and breakdowns by source.
              </div>
              <div>
                <strong className="text-primary">Subscriptions</strong> – Ongoing service plans for each organization,
                including start/end dates and pricing.
              </div>
            </div>
            <p className="text-secondary mt-3">
              Use this data to explore how organizations operate, manage products, generate revenue, and interact with
              users.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
