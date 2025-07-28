export type ProviderInfo = {
  name: string;
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
  icon?: string;
};

export interface IProviderSetting {
  enabled?: boolean;
  baseUrl?: string;
}

export type IProviderConfig = ProviderInfo & {
  settings: IProviderSetting;
};
