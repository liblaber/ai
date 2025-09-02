-- Create tables
CREATE TABLE organizations (
                             organization_id INTEGER PRIMARY KEY,
                             organization_name TEXT NOT NULL,
                             industry TEXT,
                             address TEXT,
                             phone TEXT,
                             email TEXT,
                             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                             subscription_tier TEXT DEFAULT 'free',
                             last_payment_date DATETIME,
                             next_payment_date DATETIME
);

CREATE TABLE users (
                     user_id INTEGER PRIMARY KEY,
                     organization_id INTEGER REFERENCES organizations(organization_id),
                     username TEXT NOT NULL UNIQUE,
                     email TEXT NOT NULL UNIQUE,
                     first_name TEXT,
                     last_name TEXT,
                     role TEXT,
                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                     last_login_at DATETIME,
                     is_active INTEGER DEFAULT 1
);

CREATE TABLE subscriptions (
                             subscription_id INTEGER PRIMARY KEY,
                             organization_id INTEGER REFERENCES organizations(organization_id),
                             plan_name TEXT NOT NULL,
                             start_date DATETIME NOT NULL,
                             end_date DATETIME,
                             status TEXT DEFAULT 'active',
                             monthly_price REAL NOT NULL,
                             features TEXT,
                             created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
                        product_id INTEGER PRIMARY KEY,
                        organization_id INTEGER REFERENCES organizations(organization_id),
                        product_name TEXT NOT NULL,
                        description TEXT,
                        price REAL NOT NULL,
                        cost REAL NOT NULL,
                        stock_quantity INTEGER NOT NULL,
                        category TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_restock_date DATETIME
);

CREATE TABLE sales (
                     sale_id INTEGER PRIMARY KEY,
                     organization_id INTEGER REFERENCES organizations(organization_id),
                     user_id INTEGER REFERENCES users(user_id),
                     sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                     total_amount REAL NOT NULL,
                     payment_method TEXT,
                     status TEXT DEFAULT 'completed',
                     discount_amount REAL DEFAULT 0,
                     tax_amount REAL DEFAULT 0
);

CREATE TABLE sale_items (
                          sale_item_id INTEGER PRIMARY KEY,
                          sale_id INTEGER REFERENCES sales(sale_id),
                          product_id INTEGER REFERENCES products(product_id),
                          quantity INTEGER NOT NULL,
                          unit_price REAL NOT NULL,
                          total_price REAL NOT NULL,
                          discount_percentage REAL DEFAULT 0
);

CREATE TABLE revenue (
                       revenue_id INTEGER PRIMARY KEY,
                       organization_id INTEGER REFERENCES organizations(organization_id),
                       date DATE NOT NULL,
                       total_revenue REAL NOT NULL,
                       total_cost REAL NOT NULL,
                       gross_profit REAL NOT NULL,
                       net_profit REAL NOT NULL,
                       subscription_revenue REAL DEFAULT 0,
                       product_revenue REAL DEFAULT 0
);

-- Insert organizations with temporal data
INSERT INTO organizations (organization_name, industry, address, phone, email, created_at, subscription_tier, last_payment_date, next_payment_date) VALUES
                                                                                                                                                      ('Tech Solutions Inc.', 'Technology', '123 Tech Park, Silicon Valley', '+1234567890', 'info@techsolutions.com', '2023-01-15 09:00:00', 'enterprise', '2025-04-01 00:00:00', '2025-05-01 00:00:00'),
                                                                                                                                                      ('Green Energy Corp.', 'Renewable Energy', '456 Green Ave, Eco City', '+1987654321', 'contact@greenenergy.com', '2023-03-20 10:30:00', 'pro', '2025-04-15 00:00:00', '2025-05-15 00:00:00'),
                                                                                                                                                      ('Global Retail Ltd.', 'Retail', '789 Market St, Commerce City', '+1122334455', 'support@globalretail.com', '2023-06-10 14:15:00', 'business', '2025-04-10 00:00:00', '2025-05-10 00:00:00'),
                                                                                                                                                      ('AI Innovations', 'Artificial Intelligence', '321 AI Boulevard, Tech City', '+1555666777', 'contact@aiinnovations.com', '2023-09-05 11:20:00', 'enterprise', '2025-04-05 00:00:00', '2025-05-05 00:00:00'),
                                                                                                                                                      ('Cloud Services Co.', 'Cloud Computing', '654 Cloud Drive, Data Center', '+1888999000', 'info@cloudservices.com', '2023-11-25 16:45:00', 'pro', '2025-04-20 00:00:00', '2025-05-20 00:00:00'),
                                                                                                                                                      ('StartupHub Inc.', 'Technology Incubator', '987 Innovation Lane, Startup Valley', '+1777888999', 'hello@startuphub.com', '2024-01-10 08:30:00', 'starter', '2025-04-25 00:00:00', '2025-05-25 00:00:00'),
                                                                                                                                                      ('Premium Consulting Group', 'Business Consulting', '147 Executive Plaza, Business District', '+1666777888', 'contact@premiumconsulting.com', '2024-02-20 13:45:00', 'premium', '2025-04-30 00:00:00', '2025-05-30 00:00:00'),
                                                                                                                                                      ('FreeTech Community', 'Open Source Software', '258 Community Center, Dev Town', '+1444555666', 'info@freetech.org', '2024-03-15 10:15:00', 'free', NULL, NULL);

-- Insert users with temporal data
INSERT INTO users (organization_id, username, email, first_name, last_name, role, created_at, last_login_at, is_active) VALUES
                                                                                                                          (1, 'jsmith', 'john.smith@techsolutions.com', 'John', 'Smith', 'Sales Manager', '2023-01-16 10:00:00', '2025-05-01 15:30:00', 1),
                                                                                                                          (1, 'mjohnson', 'mary.johnson@techsolutions.com', 'Mary', 'Johnson', 'Sales Representative', '2023-02-01 09:15:00', '2025-05-02 16:45:00', 1),
                                                                                                                          (2, 'dwilliams', 'david.williams@greenenergy.com', 'David', 'Williams', 'Account Manager', '2023-03-21 11:00:00', '2025-05-03 14:20:00', 1),
                                                                                                                          (3, 'sbrown', 'sarah.brown@globalretail.com', 'Sarah', 'Brown', 'Store Manager', '2023-06-11 15:30:00', '2025-05-04 10:15:00', 1),
                                                                                                                          (4, 'rlee', 'robert.lee@aiinnovations.com', 'Robert', 'Lee', 'Data Scientist', '2023-09-06 12:00:00', '2025-05-05 09:30:00', 1),
                                                                                                                          (5, 'lchen', 'lisa.chen@cloudservices.com', 'Lisa', 'Chen', 'Cloud Architect', '2023-11-26 17:00:00', '2025-05-06 16:00:00', 1),
                                                                                                                          (6, 'agarcia', 'alex.garcia@startuphub.com', 'Alex', 'Garcia', 'Sales Manager', '2024-01-11 09:00:00', '2025-05-07 11:30:00', 1),
                                                                                                                          (6, 'mwilson', 'mike.wilson@startuphub.com', 'Mike', 'Wilson', 'Sales Representative', '2024-01-15 10:30:00', '2025-05-08 14:15:00', 1),
                                                                                                                          (7, 'ktaylor', 'karen.taylor@premiumconsulting.com', 'Karen', 'Taylor', 'Account Manager', '2024-02-21 14:00:00', '2025-05-09 16:45:00', 1),
                                                                                                                          (8, 'janderson', 'john.anderson@freetech.org', 'John', 'Anderson', 'Data Scientist', '2024-03-16 11:30:00', '2025-05-10 13:20:00', 1);

-- Insert subscriptions
INSERT INTO subscriptions (organization_id, plan_name, start_date, end_date, status, monthly_price, features) VALUES
                                                                                                                (1, 'Enterprise', '2023-01-15 00:00:00', '2025-12-31 23:59:59', 'active', 999.99, '{"users": 100, "storage": "1TB", "support": "24/7"}'),
                                                                                                                (2, 'Professional', '2023-03-20 00:00:00', '2025-12-31 23:59:59', 'active', 499.99, '{"users": 50, "storage": "500GB", "support": "business hours"}'),
                                                                                                                (3, 'Business', '2023-06-10 00:00:00', '2025-12-31 23:59:59', 'active', 299.99, '{"users": 25, "storage": "250GB", "support": "business hours"}'),
                                                                                                                (4, 'Enterprise', '2023-09-05 00:00:00', '2025-12-31 23:59:59', 'active', 999.99, '{"users": 100, "storage": "1TB", "support": "24/7"}'),
                                                                                                                (5, 'Professional', '2023-11-25 00:00:00', '2025-12-31 23:59:59', 'active', 499.99, '{"users": 50, "storage": "500GB", "support": "business hours"}'),
                                                                                                                (6, 'Starter', '2024-01-10 00:00:00', '2025-12-31 23:59:59', 'active', 99.99, '{"users": 5, "storage": "50GB", "support": "email only"}'),
                                                                                                                (7, 'Premium', '2024-02-20 00:00:00', '2025-12-31 23:59:59', 'active', 799.99, '{"users": 75, "storage": "750GB", "support": "priority 24/7"}'),
                                                                                                                (8, 'Free', '2024-03-15 00:00:00', NULL, 'active', 0.00, '{"users": 1, "storage": "1GB", "support": "community"}'),
                                                                                                                (1, 'Professional', '2022-01-15 00:00:00', '2023-01-14 23:59:59', 'inactive', 499.99, '{"users": 50, "storage": "500GB", "support": "business hours"}'),
                                                                                                                (2, 'Enterprise', '2024-06-01 00:00:00', NULL, 'pending', 999.99, '{"users": 100, "storage": "1TB", "support": "24/7"}'),
                                                                                                                (3, 'Professional', '2024-01-01 00:00:00', '2024-03-31 23:59:59', 'cancelled', 499.99, '{"users": 50, "storage": "500GB", "support": "business hours"}'),
                                                                                                                (4, 'Basic', '2024-04-01 00:00:00', '2024-05-15 23:59:59', 'suspended', 199.99, '{"users": 10, "storage": "100GB", "support": "email only"}');

-- Insert products with temporal data
INSERT INTO products (organization_id, product_name, description, price, cost, stock_quantity, category, created_at, last_restock_date) VALUES
                                                                                                                                          (1, 'Enterprise Software Suite', 'Complete business management solution', 999.99, 300.00, 50, 'Software', '2023-01-20 10:00:00', '2025-05-01 09:00:00'),
                                                                                                                                          (1, 'Cloud Storage Package', 'Secure cloud storage solution', 49.99, 15.00, 100, 'Cloud Services', '2023-02-01 11:00:00', '2025-05-02 10:00:00'),
                                                                                                                                          (2, 'Solar Panel Kit', 'Residential solar power system', 2999.99, 1500.00, 30, 'Solar Energy', '2023-03-25 14:00:00', '2025-05-03 13:00:00'),
                                                                                                                                          (2, 'Wind Turbine', 'Small-scale wind power generator', 1999.99, 1000.00, 20, 'Wind Energy', '2023-04-15 15:00:00', '2025-05-04 14:00:00'),
                                                                                                                                          (3, 'Smart Home Hub', 'Central control for smart devices', 199.99, 80.00, 200, 'Electronics', '2023-06-15 09:00:00', '2025-05-05 08:00:00'),
                                                                                                                                          (3, 'Wireless Router', 'High-speed internet router', 89.99, 35.00, 150, 'Networking', '2023-07-01 10:00:00', '2025-05-06 09:00:00'),
                                                                                                                                          (4, 'AI Analytics Platform', 'Advanced data analysis tool', 1499.99, 500.00, 40, 'AI Software', '2023-09-10 11:00:00', '2025-05-01 10:00:00'),
                                                                                                                                          (5, 'Cloud Backup Solution', 'Enterprise-grade backup service', 199.99, 60.00, 100, 'Cloud Services', '2023-11-30 13:00:00', '2025-05-02 12:00:00');

-- Insert sales data for multiple months
INSERT INTO sales (organization_id, user_id, sale_date, total_amount, payment_method, status, discount_amount, tax_amount) VALUES
-- April 2023
(1, 1, '2023-04-05 10:30:00', 999.99, 'Credit Card', 'completed', 0, 99.99),
(2, 3, '2023-04-10 14:15:00', 2999.99, 'Bank Transfer', 'completed', 0, 299.99),
(3, 4, '2023-04-15 11:20:00', 199.99, 'Credit Card', 'completed', 0, 19.99),
-- May 2023
(1, 2, '2023-05-01 09:30:00', 1499.98, 'Credit Card', 'completed', 50.00, 144.99),
(2, 3, '2023-05-05 13:20:00', 1999.99, 'Bank Transfer', 'completed', 0, 199.99),
(3, 4, '2023-05-10 15:45:00', 289.98, 'Credit Card', 'completed', 0, 28.99),
-- June 2023
(1, 1, '2023-06-01 10:00:00', 2099.98, 'Credit Card', 'completed', 100.00, 199.99),
(2, 3, '2023-06-05 14:30:00', 4999.98, 'Bank Transfer', 'completed', 0, 499.99),
(3, 4, '2023-06-10 16:00:00', 389.97, 'Credit Card', 'completed', 0, 38.99),
-- July 2023
(1, 2, '2023-07-05 10:30:00', 1049.98, 'Credit Card', 'completed', 0, 104.99),
(2, 3, '2023-07-10 14:15:00', 1999.99, 'Bank Transfer', 'completed', 0, 199.99),
(3, 4, '2023-07-15 11:20:00', 289.98, 'Credit Card', 'completed', 0, 28.99),
-- August 2023
(1, 1, '2023-08-01 09:30:00', 1499.97, 'Credit Card', 'completed', 0, 149.99),
(2, 3, '2023-08-05 13:20:00', 2999.99, 'Bank Transfer', 'completed', 0, 299.99),
(3, 4, '2023-08-10 15:45:00', 199.99, 'Credit Card', 'completed', 0, 19.99),
-- September 2023
(1, 2, '2023-09-01 10:00:00', 2099.98, 'Credit Card', 'completed', 100.00, 199.99),
(2, 3, '2023-09-05 14:30:00', 1999.99, 'Bank Transfer', 'completed', 0, 199.99),
(3, 4, '2023-09-10 16:00:00', 289.98, 'Credit Card', 'completed', 0, 28.99),
-- October 2023
(1, 1, '2023-10-05 10:30:00', 1499.97, 'Credit Card', 'completed', 0, 149.99),
(2, 3, '2023-10-10 14:15:00', 2999.99, 'Bank Transfer', 'completed', 0, 299.99),
(3, 4, '2023-10-15 11:20:00', 199.99, 'Credit Card', 'completed', 0, 19.99),
-- November 2023
(1, 2, '2023-11-01 09:30:00', 2099.98, 'Credit Card', 'completed', 100.00, 199.99),
(2, 3, '2023-11-05 13:20:00', 1999.99, 'Bank Transfer', 'completed', 0, 199.99),
(3, 4, '2023-11-10 15:45:00', 289.98, 'Credit Card', 'completed', 0, 28.99),
-- December 2023
(1, 1, '2023-12-01 10:00:00', 1499.97, 'Credit Card', 'completed', 0, 149.99),
(2, 3, '2023-12-05 14:30:00', 2999.99, 'Bank Transfer', 'completed', 0, 299.99),
(3, 4, '2023-12-10 16:00:00', 199.99, 'Credit Card', 'completed', 0, 19.99),
-- January 2024
(1, 1, '2024-01-05 10:30:00', 1049.98, 'Credit Card', 'completed', 0, 104.99),
(1, 2, '2024-01-10 14:15:00', 199.96, 'PayPal', 'completed', 20.00, 17.99),
(2, 3, '2024-01-15 11:20:00', 2999.99, 'Bank Transfer', 'completed', 0, 299.99),
(3, 4, '2024-01-20 16:45:00', 289.98, 'Credit Card', 'completed', 0, 28.99),
-- February 2024
(1, 1, '2024-02-01 09:30:00', 2099.98, 'Credit Card', 'completed', 100.00, 199.99),
(2, 3, '2024-02-05 13:20:00', 4999.98, 'Bank Transfer', 'completed', 0, 499.99),
(3, 4, '2024-02-10 15:45:00', 579.96, 'Credit Card', 'completed', 0, 57.99),
(4, 5, '2024-02-15 11:30:00', 1499.99, 'Credit Card', 'completed', 0, 149.99),
(5, 6, '2024-02-20 14:15:00', 399.98, 'PayPal', 'completed', 40.00, 35.99),
-- March 2024
(1, 2, '2024-03-01 10:00:00', 1499.97, 'Credit Card', 'completed', 0, 149.99),
(2, 3, '2024-03-05 14:30:00', 1999.99, 'Bank Transfer', 'completed', 0, 199.99),
(3, 4, '2024-03-10 16:00:00', 389.97, 'Credit Card', 'completed', 0, 38.99),
-- April 2025
(1, 1, '2025-04-01 10:30:00', 2099.98, 'Credit Card', 'completed', 100.00, 199.99),
(2, 3, '2025-04-05 13:20:00', 4999.98, 'Bank Transfer', 'completed', 0, 499.99),
(3, 4, '2025-04-10 15:45:00', 579.96, 'Credit Card', 'completed', 0, 57.99),
(4, 5, '2025-04-15 11:30:00', 1499.99, 'Credit Card', 'completed', 0, 149.99),
(5, 6, '2025-04-20 14:15:00', 399.98, 'PayPal', 'completed', 40.00, 35.99),
-- May 2025
(1, 2, '2025-05-01 10:00:00', 1499.97, 'Credit Card', 'completed', 0, 149.99),
(2, 3, '2025-05-03 14:30:00', 1999.99, 'Bank Transfer', 'completed', 0, 199.99),
(3, 4, '2025-05-06 16:00:00', 389.97, 'Credit Card', 'completed', 0, 38.99),
(5, 6, '2025-05-06 16:00:00', 399.98, 'PayPal', 'completed', 40.00, 35.99),
-- June 2025
(1, 1, '2025-06-01 10:30:00', 2099.98, 'Credit Card', 'completed', 100.00, 199.99),
(2, 3, '2025-06-05 13:20:00', 4999.98, 'Bank Transfer', 'completed', 0, 499.99),
(3, 4, '2025-06-10 15:45:00', 579.96, 'Credit Card', 'completed', 0, 57.99),
-- July 2025
(1, 2, '2025-07-01 10:00:00', 1499.97, 'Credit Card', 'completed', 0, 149.99),
(2, 3, '2025-07-03 14:30:00', 1999.99, 'Bank Transfer', 'completed', 0, 199.99),
(3, 4, '2025-07-06 16:00:00', 389.97, 'Credit Card', 'completed', 0, 38.99),
(1, 1, '2025-07-15 10:30:00', 2099.98, 'Credit Card', 'completed', 100.00, 199.99),
(2, 3, '2025-07-20 13:20:00', 4999.98, 'Bank Transfer', 'completed', 0, 499.99),
(3, 4, '2025-07-25 15:45:00', 579.96, 'Credit Card', 'completed', 0, 57.99),
-- August 2025
(1, 1, '2025-08-01 10:30:00', 1499.97, 'Credit Card', 'completed', 0, 149.99),
(2, 3, '2025-08-05 13:20:00', 2999.99, 'Bank Transfer', 'completed', 0, 299.99),
(3, 4, '2025-08-10 15:45:00', 199.99, 'Credit Card', 'completed', 0, 19.99),
(4, 5, '2025-08-15 11:30:00', 1499.99, 'Credit Card', 'completed', 0, 149.99),
(5, 6, '2025-08-20 14:15:00', 399.98, 'PayPal', 'completed', 40.00, 35.99),
-- September 2025
(1, 2, '2025-09-01 10:00:00', 2099.98, 'Credit Card', 'completed', 100.00, 199.99),
(2, 3, '2025-09-05 14:30:00', 1999.99, 'Bank Transfer', 'completed', 0, 199.99),
(3, 4, '2025-09-10 16:00:00', 289.98, 'Credit Card', 'completed', 0, 28.99),
(4, 5, '2025-09-15 11:30:00', 1499.99, 'Credit Card', 'completed', 0, 149.99),
(5, 6, '2025-09-20 14:15:00', 399.98, 'PayPal', 'completed', 40.00, 35.99),
-- October 2025
(1, 1, '2025-10-01 10:30:00', 1499.97, 'Credit Card', 'completed', 0, 149.99),
(2, 3, '2025-10-05 13:20:00', 2999.99, 'Bank Transfer', 'completed', 0, 299.99),
(3, 4, '2025-10-10 15:45:00', 199.99, 'Credit Card', 'completed', 0, 19.99),
(4, 5, '2025-10-15 11:30:00', 1499.99, 'Credit Card', 'completed', 0, 149.99),
(5, 6, '2025-10-20 14:15:00', 399.98, 'PayPal', 'completed', 40.00, 35.99),
-- November 2025
(1, 2, '2025-11-01 10:00:00', 2099.98, 'Credit Card', 'completed', 100.00, 199.99),
(2, 3, '2025-11-05 14:30:00', 1999.99, 'Bank Transfer', 'completed', 0, 199.99),
(3, 4, '2025-11-10 16:00:00', 289.98, 'Credit Card', 'completed', 0, 28.99),
(4, 5, '2025-11-15 11:30:00', 1499.99, 'Credit Card', 'completed', 0, 149.99),
(5, 6, '2025-11-20 14:15:00', 399.98, 'PayPal', 'completed', 40.00, 35.99),
-- December 2025
(1, 1, '2025-12-01 10:30:00', 1499.97, 'Credit Card', 'completed', 0, 149.99),
(2, 3, '2025-12-05 13:20:00', 2999.99, 'Bank Transfer', 'completed', 0, 299.99),
(3, 4, '2025-12-10 15:45:00', 199.99, 'Credit Card', 'completed', 0, 19.99),
(4, 5, '2025-12-15 11:30:00', 1499.99, 'Credit Card', 'completed', 0, 149.99),
(5, 6, '2025-12-20 14:15:00', 399.98, 'PayPal', 'completed', 40.00, 35.99),
-- Sales with new payment methods
(5, 6, '2024-04-01 10:30:00', 1249.99, 'Check', 'completed', 50.00, 124.99),
(6, 7, '2024-04-05 14:15:00', 799.99, 'Cash', 'completed', 0, 79.99),
(7, 9, '2024-04-10 11:20:00', 299.99, 'Cryptocurrency', 'completed', 0, 29.99),
(8, 10, '2024-04-15 16:45:00', 1999.99, 'Wire Transfer', 'completed', 100.00, 199.99),
(5, 6, '2025-08-01 09:30:00', 2999.99, 'Credit Card', 'pending', 0, 299.99),
(6, 7, '2025-08-05 13:20:00', 599.99, 'PayPal', 'cancelled', 0, 59.99),
(7, 9, '2025-08-10 15:45:00', 1499.99, 'Bank Transfer', 'refunded', 0, 149.99),
(8, 10, '2025-08-15 11:30:00', 399.99, 'Credit Card', 'failed', 0, 39.99),
(5, 6, '2024-05-01 10:00:00', 199.99, 'Check', 'completed', 20.00, 17.99),
(6, 7, '2024-05-05 14:30:00', 899.99, 'Cryptocurrency', 'completed', 0, 89.99),
(7, 9, '2024-05-10 16:00:00', 149.99, 'Cash', 'completed', 0, 14.99);

-- Insert sale items
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, discount_percentage) VALUES
-- April 2023
(1, 1, 1, 999.99, 999.99, 0),
(2, 3, 1, 2999.99, 2999.99, 0),
(3, 5, 1, 199.99, 199.99, 0),
-- May 2023
(4, 1, 1, 999.99, 999.99, 5),
(4, 2, 10, 49.99, 499.90, 0),
(5, 3, 1, 1999.99, 1999.99, 0),
(6, 5, 1, 199.99, 199.99, 0),
(6, 6, 1, 89.99, 89.99, 0),
-- June 2023
(7, 1, 2, 999.99, 1999.98, 5),
(8, 3, 1, 2999.99, 2999.99, 0),
(8, 4, 1, 1999.99, 1999.99, 0),
(9, 5, 2, 199.99, 399.98, 0),
(9, 6, 1, 89.99, 89.99, 0),
-- July 2023
(10, 1, 1, 999.99, 999.99, 0),
(10, 2, 1, 49.99, 49.99, 0),
(11, 3, 1, 1999.99, 1999.99, 0),
(12, 5, 1, 199.99, 199.99, 0),
(12, 6, 1, 89.99, 89.99, 0),
-- August 2023
(13, 1, 1, 999.99, 999.99, 0),
(13, 2, 10, 49.99, 499.90, 0),
(14, 3, 1, 2999.99, 2999.99, 0),
(15, 5, 1, 199.99, 199.99, 0),
-- September 2023
(16, 1, 2, 999.99, 1999.98, 5),
(17, 3, 1, 1999.99, 1999.99, 0),
(18, 5, 1, 199.99, 199.99, 0),
(18, 6, 1, 89.99, 89.99, 0),
-- October 2023
(19, 1, 1, 999.99, 999.99, 0),
(19, 2, 10, 49.99, 499.90, 0),
(20, 3, 1, 2999.99, 2999.99, 0),
(21, 5, 1, 199.99, 199.99, 0),
-- November 2023
(22, 1, 2, 999.99, 1999.98, 5),
(23, 3, 1, 1999.99, 1999.99, 0),
(24, 5, 1, 199.99, 199.99, 0),
(24, 6, 1, 89.99, 89.99, 0),
-- December 2023
(25, 1, 1, 999.99, 999.99, 0),
(25, 2, 10, 49.99, 499.90, 0),
(26, 3, 1, 2999.99, 2999.99, 0),
(27, 5, 1, 199.99, 199.99, 0),
-- January 2024
(28, 1, 1, 999.99, 999.99, 0),
(28, 2, 1, 49.99, 49.99, 0),
(29, 2, 4, 49.99, 199.96, 10),
(30, 3, 1, 2999.99, 2999.99, 0),
(31, 5, 1, 199.99, 199.99, 0),
(31, 6, 1, 89.99, 89.99, 0),
-- February 2024
(32, 1, 2, 999.99, 1999.98, 5),
(33, 3, 1, 2999.99, 2999.99, 0),
(33, 4, 1, 1999.99, 1999.99, 0),
(34, 5, 2, 199.99, 399.98, 0),
(34, 6, 2, 89.99, 179.98, 0),
(35, 7, 1, 1499.99, 1499.99, 0),
(36, 8, 2, 199.99, 399.98, 10),
-- March 2024
(37, 1, 1, 999.99, 999.99, 0),
(37, 2, 10, 49.99, 499.90, 0),
(38, 3, 1, 1999.99, 1999.99, 0),
(39, 5, 1, 199.99, 199.99, 0),
(39, 6, 2, 89.99, 179.98, 0),
-- April 2025
(40, 1, 2, 999.99, 1999.98, 5),
(41, 3, 1, 2999.99, 2999.99, 0),
(41, 4, 1, 1999.99, 1999.99, 0),
(42, 5, 2, 199.99, 399.98, 0),
(42, 6, 2, 89.99, 179.98, 0),
(43, 7, 1, 1499.99, 1499.99, 0),
(44, 8, 2, 199.99, 399.98, 10),
-- May 2025
(45, 1, 1, 999.99, 999.99, 0),
(45, 2, 10, 49.99, 499.90, 0),
(46, 3, 1, 1999.99, 1999.99, 0),
(47, 5, 1, 199.99, 199.99, 0),
(47, 6, 2, 89.99, 179.98, 0),
(48, 8, 2, 199.99, 399.98, 10),
-- June 2025
(49, 1, 2, 999.99, 1999.98, 5),
(50, 3, 1, 2999.99, 2999.99, 0),
(50, 4, 1, 1999.99, 1999.99, 0),
(51, 5, 2, 199.99, 399.98, 0),
(51, 6, 2, 89.99, 179.98, 0),
-- July 2025
(52, 1, 1, 999.99, 999.99, 0),
(52, 2, 10, 49.99, 499.90, 0),
(53, 3, 1, 1999.99, 1999.99, 0),
(54, 5, 1, 199.99, 199.99, 0),
(54, 6, 2, 89.99, 179.98, 0),
(55, 1, 2, 999.99, 1999.98, 5),
(56, 3, 1, 2999.99, 2999.99, 0),
(56, 4, 1, 1999.99, 1999.99, 0),
(57, 5, 2, 199.99, 399.98, 0),
(57, 6, 2, 89.99, 179.98, 0),
-- August 2025
(58, 1, 1, 999.99, 999.99, 0),
(58, 2, 10, 49.99, 499.90, 0),
(59, 3, 1, 2999.99, 2999.99, 0),
(60, 5, 1, 199.99, 199.99, 0),
(61, 7, 1, 1499.99, 1499.99, 0),
(62, 8, 2, 199.99, 399.98, 10),
-- September 2025
(63, 1, 2, 999.99, 1999.98, 5),
(64, 3, 1, 1999.99, 1999.99, 0),
(65, 5, 1, 199.99, 199.99, 0),
(66, 7, 1, 1499.99, 1499.99, 0),
(67, 8, 2, 199.99, 399.98, 10),
-- October 2025
(68, 1, 1, 999.99, 999.99, 0),
(68, 2, 10, 49.99, 499.90, 0),
(69, 3, 1, 2999.99, 2999.99, 0),
(70, 5, 1, 199.99, 199.99, 0),
(71, 7, 1, 1499.99, 1499.99, 0),
(72, 8, 2, 199.99, 399.98, 10),
-- November 2025
(73, 1, 2, 999.99, 1999.98, 5),
(74, 3, 1, 1999.99, 1999.99, 0),
(75, 5, 1, 199.99, 199.99, 0),
(76, 7, 1, 1499.99, 1499.99, 0),
(77, 8, 2, 199.99, 399.98, 10),
-- December 2025
(78, 1, 1, 999.99, 999.99, 0),
(78, 2, 10, 49.99, 499.90, 0),
(79, 3, 1, 2999.99, 2999.99, 0),
(80, 5, 1, 199.99, 199.99, 0),
(81, 7, 1, 1499.99, 1499.99, 0),
(82, 8, 2, 199.99, 399.98, 10);

-- Insert revenue data for multiple months
INSERT INTO revenue (organization_id, date, total_revenue, total_cost, gross_profit, net_profit, subscription_revenue, product_revenue) VALUES
-- April 2023
(1, '2023-04-30', 999.99, 300.00, 699.99, 599.99, 999.99, 0.00),
(2, '2023-04-30', 2999.99, 1500.00, 1499.99, 1299.99, 499.99, 2500.00),
(3, '2023-04-30', 199.99, 80.00, 119.99, 99.99, 299.99, -100.00),
-- May 2023
(1, '2023-05-31', 1499.98, 450.00, 1049.98, 899.98, 999.99, 499.99),
(2, '2023-05-31', 1999.99, 1000.00, 999.99, 849.99, 499.99, 1500.00),
(3, '2023-05-31', 289.98, 115.00, 174.98, 144.98, 299.99, -10.01),
-- June 2023
(1, '2023-06-30', 2099.98, 600.00, 1499.98, 1299.98, 999.99, 1099.99),
(2, '2023-06-30', 4999.98, 2500.00, 2499.98, 2199.98, 499.99, 4500.00),
(3, '2023-06-30', 389.97, 155.00, 234.97, 194.97, 299.99, 89.98),
-- July 2023
(1, '2023-07-31', 1049.98, 315.00, 734.98, 634.98, 999.99, 49.99),
(2, '2023-07-31', 1999.99, 1000.00, 999.99, 849.99, 499.99, 1500.00),
(3, '2023-07-31', 289.98, 115.00, 174.98, 144.98, 299.99, -10.01),
-- August 2023
(1, '2023-08-31', 1499.97, 450.00, 1049.97, 899.97, 999.99, 499.98),
(2, '2023-08-31', 2999.99, 1500.00, 1499.99, 1299.99, 499.99, 2500.00),
(3, '2023-08-31', 199.99, 80.00, 119.99, 99.99, 299.99, -100.00),
-- September 2023
(1, '2023-09-30', 2099.98, 600.00, 1499.98, 1299.98, 999.99, 1099.99),
(2, '2023-09-30', 1999.99, 1000.00, 999.99, 849.99, 499.99, 1500.00),
(3, '2023-09-30', 289.98, 115.00, 174.98, 144.98, 299.99, -10.01),
-- October 2023
(1, '2023-10-31', 1499.97, 450.00, 1049.97, 899.97, 999.99, 499.98),
(2, '2023-10-31', 2999.99, 1500.00, 1499.99, 1299.99, 499.99, 2500.00),
(3, '2023-10-31', 199.99, 80.00, 119.99, 99.99, 299.99, -100.00),
-- November 2023
(1, '2023-11-30', 2099.98, 600.00, 1499.98, 1299.98, 999.99, 1099.99),
(2, '2023-11-30', 1999.99, 1000.00, 999.99, 849.99, 499.99, 1500.00),
(3, '2023-11-30', 289.98, 115.00, 174.98, 144.98, 299.99, -10.01),
-- December 2023
(1, '2023-12-31', 1499.97, 450.00, 1049.97, 899.97, 999.99, 499.98),
(2, '2023-12-31', 2999.99, 1500.00, 1499.99, 1299.99, 499.99, 2500.00),
(3, '2023-12-31', 199.99, 80.00, 119.99, 99.99, 299.99, -100.00),
-- January 2024
(1, '2024-01-31', 1249.94, 315.00, 934.94, 784.94, 999.99, 249.95),
(2, '2024-01-31', 2999.99, 1500.00, 1499.99, 1299.99, 499.99, 2500.00),
(3, '2024-01-31', 289.98, 115.00, 174.98, 144.98, 299.99, -10.01),
(4, '2024-01-31', 0.00, 0.00, 0.00, 0.00, 999.99, -999.99),
(5, '2024-01-31', 0.00, 0.00, 0.00, 0.00, 499.99, -499.99),
-- February 2024
(1, '2024-02-29', 2099.98, 600.00, 1499.98, 1299.98, 999.99, 1099.99),
(2, '2024-02-29', 4999.98, 2500.00, 2499.98, 2199.98, 499.99, 4500.00),
(3, '2024-02-29', 579.96, 230.00, 349.96, 299.96, 299.99, 279.97),
(4, '2024-02-29', 1499.99, 500.00, 999.99, 849.99, 999.99, 500.00),
(5, '2024-02-29', 399.98, 120.00, 279.98, 239.98, 499.99, -100.01),
-- March 2024
(1, '2024-03-31', 1499.97, 450.00, 1049.97, 899.97, 999.99, 499.98),
(2, '2024-03-31', 1999.99, 1000.00, 999.99, 849.99, 499.99, 1500.00),
(3, '2024-03-31', 389.97, 155.00, 234.97, 194.97, 299.99, 89.98),
(4, '2024-03-31', 0.00, 0.00, 0.00, 0.00, 999.99, -999.99),
(5, '2024-03-31', 0.00, 0.00, 0.00, 0.00, 499.99, -499.99),
-- April 2025
(1, '2025-04-30', 2099.98, 600.00, 1499.98, 1299.98, 999.99, 1099.99),
(2, '2025-04-30', 4999.98, 2500.00, 2499.98, 2199.98, 499.99, 4500.00),
(3, '2025-04-30', 579.96, 230.00, 349.96, 299.96, 299.99, 279.97),
(4, '2025-04-30', 1499.99, 500.00, 999.99, 849.99, 999.99, 500.00),
(5, '2025-04-30', 399.98, 120.00, 279.98, 239.98, 499.99, -100.01),
-- May 2025
(1, '2025-05-31', 1499.97, 450.00, 1049.97, 899.97, 999.99, 499.98),
(2, '2025-05-31', 1999.99, 1000.00, 999.99, 849.99, 499.99, 1500.00),
(3, '2025-05-31', 389.97, 155.00, 234.97, 194.97, 299.99, 89.98),
(4, '2025-05-31', 0.00, 0.00, 0.00, 0.00, 999.99, -999.99),
(5, '2025-05-31', 399.98, 120.00, 279.98, 239.98, 499.99, -100.01),
-- June 2025
(1, '2025-06-30', 2099.98, 600.00, 1499.98, 1299.98, 999.99, 1099.99),
(2, '2025-06-30', 4999.98, 2500.00, 2499.98, 2199.98, 499.99, 4500.00),
(3, '2025-06-30', 579.96, 230.00, 349.96, 299.96, 299.99, 279.97),
(4, '2025-06-30', 0.00, 0.00, 0.00, 0.00, 999.99, -999.99),
(5, '2025-06-30', 0.00, 0.00, 0.00, 0.00, 499.99, -499.99),
-- July 2025
(1, '2025-07-31', 3599.95, 1050.00, 2549.95, 2199.95, 999.99, 2599.96),
(2, '2025-07-31', 6999.97, 3500.00, 3499.97, 3099.97, 499.99, 6500.00),
(3, '2025-07-31', 969.93, 385.00, 584.93, 494.93, 299.99, 669.94),
(4, '2025-07-31', 0.00, 0.00, 0.00, 0.00, 999.99, -999.99),
(5, '2025-07-31', 0.00, 0.00, 0.00, 0.00, 499.99, -499.99),
-- August 2025
(1, '2025-08-31', 1499.97, 450.00, 1049.97, 899.97, 999.99, 499.98),
(2, '2025-08-31', 2999.99, 1500.00, 1499.99, 1299.99, 499.99, 2500.00),
(3, '2025-08-31', 199.99, 80.00, 119.99, 99.99, 299.99, -100.00),
(4, '2025-08-31', 1499.99, 500.00, 999.99, 849.99, 999.99, 500.00),
(5, '2025-08-31', 399.98, 120.00, 279.98, 239.98, 499.99, -100.01),
-- September 2025
(1, '2025-09-30', 2099.98, 600.00, 1499.98, 1299.98, 999.99, 1099.99),
(2, '2025-09-30', 1999.99, 1000.00, 999.99, 849.99, 499.99, 1500.00),
(3, '2025-09-30', 289.98, 115.00, 174.98, 144.98, 299.99, -10.01),
(4, '2025-09-30', 1499.99, 500.00, 999.99, 849.99, 999.99, 500.00),
(5, '2025-09-30', 399.98, 120.00, 279.98, 239.98, 499.99, -100.01),
-- October 2025
(1, '2025-10-31', 1499.97, 450.00, 1049.97, 899.97, 999.99, 499.98),
(2, '2025-10-31', 2999.99, 1500.00, 1499.99, 1299.99, 499.99, 2500.00),
(3, '2025-10-31', 199.99, 80.00, 119.99, 99.99, 299.99, -100.00),
(4, '2025-10-31', 1499.99, 500.00, 999.99, 849.99, 999.99, 500.00),
(5, '2025-10-31', 399.98, 120.00, 279.98, 239.98, 499.99, -100.01),
-- November 2025
(1, '2025-11-30', 2099.98, 600.00, 1499.98, 1299.98, 999.99, 1099.99),
(2, '2025-11-30', 1999.99, 1000.00, 999.99, 849.99, 499.99, 1500.00),
(3, '2025-11-30', 289.98, 115.00, 174.98, 144.98, 299.99, -10.01),
(4, '2025-11-30', 1499.99, 500.00, 999.99, 849.99, 999.99, 500.00),
(5, '2025-11-30', 399.98, 120.00, 279.98, 239.98, 499.99, -100.01),
-- December 2025
(1, '2025-12-31', 1499.97, 450.00, 1049.97, 899.97, 999.99, 499.98),
(2, '2025-12-31', 2999.99, 1500.00, 1499.99, 1299.99, 499.99, 2500.00),
(3, '2025-12-31', 199.99, 80.00, 119.99, 99.99, 299.99, -100.00),
(4, '2025-12-31', 1499.99, 500.00, 999.99, 849.99, 999.99, 500.00),
(5, '2025-12-31', 399.98, 120.00, 279.98, 239.98, 499.99, -100.01);
</sql>
