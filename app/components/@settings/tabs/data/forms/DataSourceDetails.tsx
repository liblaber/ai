import type { DataSourceWithEnvironments } from '~/lib/stores/environmentDataSources';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/Tabs';
import { classNames } from '~/utils/classNames';
import DataSourceDetailsForm from '~/components/@settings/tabs/data/forms/DataSourceDetailsForm';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import DataSourceEnvironmentsForm from '~/components/@settings/tabs/data/forms/DataSourceEnvironmentsForm';

type Props = {
  dataSource: DataSourceWithEnvironments;
  membersCount?: number;
  setHeaderTitle?: (title: string) => void;
  setHeaderBackHandler?: (handler: () => void) => void;
  onExit: () => void;
};

export const DataSourceDetails = ({
  dataSource,
  membersCount = 0,
  setHeaderTitle,
  setHeaderBackHandler,
  onExit,
}: Props) => {
  const environmentsCount = dataSource.environments?.length || 0;
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);
  const headerTitle = `Edit "${dataSource.name}"`;

  useEffect(() => {
    setHeaderTitle?.(headerTitle);
    setHeaderBackHandler?.(() => onExit);
  }, []);

  const resetHeader = () => {
    setHeaderTitle?.(headerTitle);
    setHeaderBackHandler?.(() => onExit);
    setSelectedEnvironmentId(null);
  };

  return (
    <div>
      <Tabs defaultValue="details">
        <TabsList className={classNames('rounded-[20px] bg-[#0D0D0D] p-1 h-10', 'text-secondary')}>
          <TabsTrigger
            value="details"
            onClick={resetHeader}
            className={classNames(
              'rounded-[14px] px-4 py-1.5',
              'data-[state=active]:bg-gray-700 data-[state=active]:text-white',
            )}
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="environments"
            onClick={resetHeader}
            className={classNames(
              'rounded-[14px] px-4 py-1.5',
              'data-[state=active]:bg-gray-700 data-[state=active]:text-white',
            )}
          >
            Environments {environmentsCount}
          </TabsTrigger>
          <TabsTrigger
            value="members"
            onClick={resetHeader}
            className={classNames(
              'rounded-[14px] px-4 py-1.5',
              'data-[state=active]:bg-gray-700 data-[state=active]:text-white',
            )}
          >
            Members {membersCount}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <DataSourceDetailsForm dataSource={dataSource} />
        </TabsContent>
        <TabsContent value="environments" className="mt-4">
          {selectedEnvironmentId ? (
            <DataSourceEnvironmentsForm
              dataSource={dataSource}
              environmentId={selectedEnvironmentId}
              onBack={() => {
                setSelectedEnvironmentId(null);
                setHeaderTitle?.(headerTitle);
                setHeaderBackHandler?.(() => onExit);
              }}
              setHeaderTitle={setHeaderTitle}
              setHeaderBackHandler={setHeaderBackHandler}
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden">
                {(dataSource.environments || []).map((env) => (
                  <motion.div
                    key={env.id}
                    className="border-b border-depth-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedEnvironmentId(env.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedEnvironmentId(env.id);
                        }
                      }}
                      className="grid grid-cols-12 items-center py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <div className="col-span-12 flex items-center justify-between">
                        <div className="font-medium text-primary">{env.name}</div>
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          {/* Members content goes here */}
        </TabsContent>
      </Tabs>
    </div>
  );
};
