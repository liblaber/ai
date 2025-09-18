/**
 * Specified enum values for sample database
 * These values correspond to the data in sample-db-init.sql
 *
 * This is used to populate the enum values for the sample database
 * because the SQLite database does not have a native support for this.
 */
export const SAMPLE_DB_ENUM_VALUES: Record<string, Record<string, string[]>> = {
  organizations: {
    subscription_tier: ['free', 'starter', 'pro', 'business', 'premium', 'enterprise'],
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
    status: ['active', 'inactive', 'pending', 'cancelled', 'suspended'],
  },
  products: {
    category: ['Software', 'Cloud Services', 'Solar Energy', 'Wind Energy', 'Electronics', 'Networking', 'AI Software'],
  },
  sales: {
    payment_method: ['Credit Card', 'Bank Transfer', 'PayPal', 'Check', 'Cash', 'Cryptocurrency', 'Wire Transfer'],
    status: ['completed', 'pending', 'cancelled', 'refunded', 'failed'],
  },
};
