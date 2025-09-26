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
    const accessToken = _dataSourceProperties.find((prop) => prop.type === DataSourcePropertyType.ACCESS_TOKEN);

    if (!accessToken || !accessToken.value) {
      return false;
    }

    try {
      const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing HubSpot connection:', error);
      return false;
    }
  }

  validateProperties(dataSourceProperties: DataSourceProperty[]) {
    const accessToken = dataSourceProperties.find((prop) => prop.type === DataSourcePropertyType.ACCESS_TOKEN);

    if (!accessToken || !accessToken.value) {
      throw new Error('HubSpot Access Token is required.');
    }
  }
}
