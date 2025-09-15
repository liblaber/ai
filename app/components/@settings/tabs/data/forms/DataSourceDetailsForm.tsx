import { useEffect, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { BaseSelect } from '~/components/ui/Select';
import { SelectDatabaseTypeOptions, SingleValueWithTooltip } from '~/components/database/SelectDatabaseTypeOptions';
import {
  type DataSourceOption,
  DEFAULT_DATA_SOURCES,
  useDataSourceTypesPlugin,
} from '~/lib/hooks/plugins/useDataSourceTypesPlugin';
import type { DataSourceWithEnvironments } from '~/lib/stores/environmentDataSources';
import { useDataSourceActions } from '~/lib/stores/environmentDataSources';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { DeleteConfirmationModal } from '~/components/ui/DeleteConfirmationModal';

interface Props {
  dataSource: DataSourceWithEnvironments | null;
}

export default function DataSourceDetailsForm({ dataSource }: Props) {
  const { availableDataSourceOptions } = useDataSourceTypesPlugin();
  const [dataSourceType, setDataSourceType] = useState<DataSourceOption>({} as DataSourceOption);
  const [dataSourceName, setDataSourceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationCount, setConversationCount] = useState<number | undefined>(undefined);
  const [isLoadingConversationCount, setIsLoadingConversationCount] = useState(false);
  const { refetchEnvironmentDataSources } = useDataSourceActions();

  useEffect(() => {
    if (!dataSource) {
      setDataSourceType(DEFAULT_DATA_SOURCES[0]);
      setDataSourceName('');

      return;
    }

    const matchingOption = availableDataSourceOptions.find((opt) => opt.value === dataSource.type.toLowerCase());

    setDataSourceType(matchingOption || DEFAULT_DATA_SOURCES[0]);
    setDataSourceName(dataSource.name);
  }, [dataSource?.id, dataSource?.name]);

  if (!dataSource) {
    return null;
  }

  const onEditSubmit = async () => {
    if (!dataSource?.id) {
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('name', dataSourceName);
      formData.append('type', dataSourceType.type!);

      const response = await fetch(`/api/data-sources/${dataSource.id}`, {
        method: 'PUT',
        body: formData,
      });

      const result = (await response.json()) as { success: boolean; error?: string };

      if (result.success) {
        toast.success('Data source updated');
        await refetchEnvironmentDataSources();
      } else {
        toast.error(result.error || 'Failed to update data source');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update data source');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDataSource = async () => {
    try {
      setIsLoadingConversationCount(true);

      const response = await fetch(`/api/data-sources/${dataSource.id}`);
      const data = await response.json<{ success: boolean; conversationCount?: number }>();

      if (data.success) {
        setConversationCount(data.conversationCount);
        setIsDeleteModalOpen(true);
      } else {
        toast.error('Failed to fetch conversation count');
      }
    } catch (error) {
      toast.error('Failed to fetch conversation count');
      console.error('Error fetching conversation count:', error);
    } finally {
      setIsLoadingConversationCount(false);
    }
  };

  const onDeleteDataSource = async () => {
    try {
      const response = await fetch(`/api/data-sources/${dataSource.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Data source deleted');
        await refetchEnvironmentDataSources();
      } else {
        toast.error('Failed to delete data source');
        console.error('Error deleting data source:', response);
      }
    } catch (error) {
      toast.error('Failed to delete data source');
      console.error('Error deleting data source:', error);
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const areValuesChanged = dataSourceName !== dataSource?.name || dataSourceType.type !== dataSource?.type;

  const isSubmitDisabled =
    !dataSourceName || !dataSourceType || dataSourceType.status !== 'available' || !areValuesChanged;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-2 mb-6 items-end">
          <div className="min-w-[160px] flex-1">
            <label className="mb-3 block text-sm font-medium text-secondary">Data source</label>
            <BaseSelect
              value={dataSourceType}
              onChange={(value) => {
                const newDbType = value as DataSourceOption;

                // Keep UI responsive but do not persist here
                if ((value as DataSourceOption).status !== 'available') {
                  return;
                }

                setDataSourceType(newDbType);
              }}
              options={availableDataSourceOptions}
              width="100%"
              minWidth="100%"
              isSearchable={false}
              isDisabled={true}
              menuPlacement="bottom"
              components={{
                MenuList: SelectDatabaseTypeOptions,
                SingleValue: SingleValueWithTooltip,
              }}
            />
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-secondary">Name</label>
          <input
            type="text"
            value={dataSourceName}
            onChange={(e) => setDataSourceName(e.target.value)}
            className={classNames(
              'w-full px-4 py-2 bg-[#F5F5F5] dark:bg-gray-700 rounded-lg',
              'text-primary placeholder-tertiary text-base',
              'rounded-lg',
              'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            placeholder="Enter data source name"
          />
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between">
          <Button onClick={handleDeleteDataSource} variant="destructive" disabled={isLoadingConversationCount}>
            {isLoadingConversationCount ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                <span>Delete data source</span>
              </>
            )}
          </Button>
          <Button type="button" variant="primary" onClick={onEditSubmit} disabled={isSubmitDisabled}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={onDeleteDataSource}
        entityName={`"${dataSource.name}"`}
        customWarning={
          conversationCount
            ? {
                title: `This will also delete ${conversationCount} conversation${conversationCount === 1 ? '' : 's'}!`,
                description:
                  'All conversations associated with this data source will be permanently deleted and cannot be recovered.',
              }
            : undefined
        }
      />
    </div>
  );
}
