import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Database, Plus, Search } from 'lucide-react';
import AddDataSourceForm from './forms/AddDataSourceForm';
import AddResourceAccess from '~/components/@settings/shared/components/AddResourceAccess';
import { classNames } from '~/utils/classNames';
import {
  type DataSourceWithEnvironments,
  type EnvironmentDataSource,
  useEnvironmentDataSourcesStore,
} from '~/lib/stores/environmentDataSources';
import { settingsPanelStore, useSettingsStore } from '~/lib/stores/settings';
import { useStore } from '@nanostores/react';
import { logger } from '~/utils/logger';
import { z } from 'zod';
import { FilterButton } from '~/components/@settings/shared/components/FilterButton';
import ActiveFilters from '~/components/@settings/shared/components/ActiveFilters';
import { DataSourceDetails } from '~/components/@settings/tabs/data/forms/DataSourceDetails';

interface EnvironmentDataSourcesResponse {
  success: boolean;
  environmentDataSources: EnvironmentDataSource[];
}

const environmentDataSourceSchema = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  dataSourceId: z.string(),
  environmentId: z.string(),
  conversationCount: z.number(),
  environment: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
  }),
  dataSource: z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.coerce.date(),
    type: z.string(),
    typeLabel: z.string(),
    updatedAt: z.coerce.date(),
  }),
  dataSourceProperties: z.array(
    z.object({
      type: z.string(),
      environmentVariable: z.object({
        id: z.string(),
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
        type: z.enum(['GLOBAL', 'DATA_SOURCE']),
        environmentId: z.string(),
        dataSourceId: z.string().optional(),
        createdById: z.string(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
      }),
    }),
  ),
});

const environmentDataSourcesResponseSchema = z.object({
  success: z.boolean(),
  environmentDataSources: z.array(environmentDataSourceSchema),
});

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

export default function DataTab() {
  const { showAddForm } = useStore(settingsPanelStore);
  const [showAddFormLocal, setShowAddFormLocal] = useState(showAddForm);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddAccessForm, setShowAddAccessForm] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSourceWithEnvironments | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setEnvironmentDataSources, dataSources } = useEnvironmentDataSourcesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedTab } = useSettingsStore();
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [headerTitle, setHeaderTitle] = useState<string>('Edit Data Source');
  const [headerBackHandler, setHeaderBackHandler] = useState<(() => void) | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<string>('details');

  const filterOptions = useMemo(
    () => Array.from(new Set(dataSources.map((dataSources) => dataSources.typeLabel))),
    [dataSources],
  );

  // Update local state when store changes
  useEffect(() => {
    setShowAddFormLocal(showAddForm);
  }, [showAddForm]);

  // Show add form when opened from chat
  useEffect(() => {
    if (selectedTab === 'data') {
      setShowAddFormLocal(true);
    }
  }, [selectedTab]);

  // Centralized data source loading function with proper validation
  const loadDataSources = useCallback(async () => {
    try {
      const response = await fetch('/api/data-sources');

      if (!response.ok) {
        logger.error('Failed to fetch data sources:', response.status, response.statusText);
        return;
      }

      const responseText = await response.text();

      if (!responseText) {
        logger.error('Empty response when fetching data sources');
        return;
      }

      let data: EnvironmentDataSourcesResponse;

      try {
        const rawData = JSON.parse(responseText);
        const validationResult = environmentDataSourcesResponseSchema.safeParse(rawData);

        if (!validationResult.success) {
          logger.error('Invalid data sources response format:', validationResult.error);
          return;
        }

        data = validationResult.data as EnvironmentDataSourcesResponse;
      } catch (parseError) {
        logger.error('Failed to parse data sources response:', parseError);
        return;
      }

      if (data.success) {
        setEnvironmentDataSources(data.environmentDataSources);
      } else {
        logger.error('Data sources fetch was not successful:', data);
      }
    } catch (error) {
      logger.error('Error loading data sources:', error);
    }
  }, [setEnvironmentDataSources]);

  // Load data sources on mount
  useEffect(() => {
    loadDataSources();
  }, [loadDataSources]);

  useEffect(() => {
    const selectedDataSourceToRefresh = dataSources.find((ds) => ds.id === selectedDataSource?.id);

    setSelectedDataSource(selectedDataSourceToRefresh || null);
  }, [dataSources]);

  const handleShowDetails = (dataSource: DataSourceWithEnvironments) => {
    setShowDetails(true);
    setSelectedDataSource(dataSource);
    setShowAddFormLocal(false);
    setHeaderTitle('Data Source');
    setHeaderBackHandler(() => handleBack);
  };

  const handleBack = () => {
    setShowDetails(false);
    setShowAddFormLocal(false);
  };

  const handleAdd = () => {
    setShowAddFormLocal(true);
  };

  const addFilter = (filter: string) => {
    if (!activeFilters.includes(filter)) {
      setActiveFilters([...activeFilters, filter]);
    }
  };

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter((f) => f !== filter));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  if (showAddFormLocal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className={classNames(
                'inline-flex items-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors',
                'dark:bg-gray-900 dark:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-medium text-primary">Create Data Source</h2>
              <p className="text-sm text-secondary">Add a new data source connection</p>
            </div>
          </div>
        </div>
        <AddDataSourceForm
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          onSuccess={async () => {
            // Reload data sources using centralized function
            await loadDataSources();
            handleBack();
          }}
        />
      </div>
    );
  }

  if (showDetails && selectedDataSource) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => (headerBackHandler ? headerBackHandler() : handleBack())}
              className={classNames(
                'inline-flex items-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors',
                'dark:bg-gray-900 dark:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-medium text-primary">{headerTitle}</h2>
            </div>
          </div>
        </div>
        {showDetails && selectedDataSource && (
          <DataSourceDetails
            dataSource={selectedDataSource}
            setHeaderTitle={setHeaderTitle}
            setHeaderBackHandler={setHeaderBackHandler}
            onExit={handleBack}
            activeTab={activeDetailsTab}
            setActiveTab={setActiveDetailsTab}
            reloadDataSources={loadDataSources}
            onAddMembers={() => {
              setShowAddAccessForm(true);
              setShowDetails(false);
              setActiveDetailsTab('members');
            }}
          />
        )}
      </div>
    );
  }

  if (showAddAccessForm && selectedDataSource) {
    return (
      <AddResourceAccess
        resourceScope="DATA_SOURCE"
        resource={selectedDataSource}
        onBack={() => {
          setShowDetails(true);
          setShowAddAccessForm(false);
        }}
      />
    );
  }

  const filteredDataSources = dataSources
    .filter((ds) => !activeFilters?.length || activeFilters.includes(ds.typeLabel))
    .filter((ds) => {
      if (!searchQuery) {
        return true;
      }

      const q = searchQuery.toLowerCase();

      return ds.name.toLowerCase().includes(q) || ds.typeLabel.toLowerCase().includes(q);
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-primary">Connected Data Sources</h2>
          <h2 className="text-lg text-secondary">{dataSources.length}</h2>
        </div>
        <button
          onClick={handleAdd}
          className={classNames(
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            'bg-accent-500 hover:bg-accent-600',
            'text-gray-950 dark:text-gray-950',
          )}
        >
          <Plus className="w-4 h-4" />
          <span>Add Data Source</span>
        </button>
      </div>

      <div className="relative px-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-10 pr-2.5 py-2 rounded-[50px] bg-gray-600/50 text-white placeholder-gray-400 focus:outline-none"
              placeholder="Search..."
            />
          </div>

          <FilterButton
            options={filterOptions}
            getOptionLabel={(option) => option}
            onSelect={(option) => addFilter(option)}
          />
        </div>
      </div>

      <ActiveFilters filters={activeFilters} onRemove={removeFilter} onClearAll={clearAllFilters} />

      <div className="space-y-4">
        {dataSources.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Data Sources</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Get started by adding your first data source.
            </p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 py-3 text-sm text-secondary border-b border-depth-3">
              <div className="col-span-6">Data Source</div>
              <div className="col-span-6">Environments</div>
            </div>
            {filteredDataSources.map((ds) => {
              return (
                <motion.div
                  key={ds.id}
                  className="border-b border-depth-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleShowDetails(ds)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleShowDetails(ds);
                      }
                    }}
                    className="grid grid-cols-12 items-center py-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                  >
                    <div className="col-span-6 flex items-center gap-3">
                      <div>
                        <div className="font-medium text-primary">{ds.name}</div>
                        <div className="text-xs text-secondary">{ds.typeLabel}</div>
                      </div>
                    </div>
                    <div className="col-span-6 flex items-center justify-between">
                      <div className="text-sm text-primary">{ds.environments.length}</div>
                      <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
