import {
  type DataAccessPluginId,
  type DataSourceProperty,
  type DataSourcePropertyDescriptor,
  DataSourcePropertyType,
  DataSourceType,
} from '../utils/types';
import type { BaseAccessor } from '../baseAccessor';

export class HubspotAccessor implements BaseAccessor {
  readonly label: string = 'HubSpot';
  readonly dataSourceType: DataSourceType = DataSourceType.HUBSPOT;
  readonly pluginId: DataAccessPluginId = 'hubspot';

  getRequiredDataSourcePropertyDescriptors(): DataSourcePropertyDescriptor[] {
    return [
      {
        type: DataSourcePropertyType.ACCESS_TOKEN,
        label: 'HubSpot Access Token',
        format: 'pat-xxx-xxxxxxxx-xxxx-xxxxxxxxxxxx',
      },
    ];
  }

  async testConnection(_dataSourceProperties: DataSourceProperty[]): Promise<boolean> {
    // TODO: Implement actual connection test to HubSpot API
    return true;
  }

  validateProperties(dataSourceProperties: DataSourceProperty[]) {
    const accessToken = dataSourceProperties.find((prop) => prop.type === DataSourcePropertyType.ACCESS_TOKEN);

    if (!accessToken || !accessToken.value) {
      throw new Error('HubSpot Access Token is required.');
    }
  }
}
