export const SQLITE_EXAMPLE_ENUM_VALUES: Record<string, Record<string, string[]>> = {
  organizations: {
    subscription_tier: ['free', 'pro', 'business', 'enterprise'],
  },
  users: {
    role: [
      'Sales Manager',
      'Sales Representative',
      'Account Manager',
      'Store Manager',
      'Data Scientist',
      'Cloud Architect',
    ],
  },
  subscriptions: {
    status: ['active'],
  },
  products: {
    category: ['Software', 'Cloud Services', 'Solar Energy', 'Wind Energy', 'Electronics', 'Networking', 'AI Software'],
  },
  sales: {
    payment_method: ['Credit Card', 'Bank Transfer', 'PayPal'],
    status: ['completed'],
  },
};
