-- Create tables
CREATE TABLE organizations (
    organization_id SERIAL PRIMARY KEY,
    organization_name VARCHAR(100) NOT NULL,
    industry VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    last_payment_date TIMESTAMP,
    next_payment_date TIMESTAMP
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(organization_id),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(organization_id),
    plan_name VARCHAR(50) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    monthly_price DECIMAL(10,2) NOT NULL,
    features JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(organization_id),
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_restock_date TIMESTAMP
);

CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(organization_id),
    user_id INTEGER REFERENCES users(user_id),
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'completed',
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE sale_items (
    sale_item_id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(sale_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0
);

CREATE TABLE revenue (
    revenue_id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(organization_id),
    date DATE NOT NULL,
    total_revenue DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    gross_profit DECIMAL(10,2) NOT NULL,
    net_profit DECIMAL(10,2) NOT NULL,
    subscription_revenue DECIMAL(10,2) DEFAULT 0,
    product_revenue DECIMAL(10,2) DEFAULT 0
);

-- Insert organizations with temporal data
INSERT INTO organizations (organization_name, industry, address, phone, email, created_at, subscription_tier, last_payment_date, next_payment_date) VALUES
('Tech Solutions Inc.', 'Technology', '123 Tech Park, Silicon Valley', '+1234567890', 'info@techsolutions.com', '2023-01-15 09:00:00', 'enterprise', '2025-04-01 00:00:00', '2025-05-01 00:00:00'),
('Green Energy Corp.', 'Renewable Energy', '456 Green Ave, Eco City', '+1987654321', 'contact@greenenergy.com', '2023-03-20 10:30:00', 'pro', '2025-04-15 00:00:00', '2025-05-15 00:00:00'),
('Global Retail Ltd.', 'Retail', '789 Market St, Commerce City', '+1122334455', 'support@globalretail.com', '2023-06-10 14:15:00', 'business', '2025-04-10 00:00:00', '2025-05-10 00:00:00'),
('AI Innovations', 'Artificial Intelligence', '321 AI Boulevard, Tech City', '+1555666777', 'contact@aiinnovations.com', '2023-09-05 11:20:00', 'enterprise', '2025-04-05 00:00:00', '2025-05-05 00:00:00'),
('Cloud Services Co.', 'Cloud Computing', '654 Cloud Drive, Data Center', '+1888999000', 'info@cloudservices.com', '2023-11-25 16:45:00', 'pro', '2025-04-20 00:00:00', '2025-05-20 00:00:00');

-- Insert users with temporal data
INSERT INTO users (organization_id, username, email, first_name, last_name, role, created_at, last_login_at, is_active) VALUES
(1, 'jsmith', 'john.smith@techsolutions.com', 'John', 'Smith', 'Sales Manager', '2023-01-16 10:00:00', '2025-05-01 15:30:00', true),
(1, 'mjohnson', 'mary.johnson@techsolutions.com', 'Mary', 'Johnson', 'Sales Representative', '2023-02-01 09:15:00', '2025-05-02 16:45:00', true),
(2, 'dwilliams', 'david.williams@greenenergy.com', 'David', 'Williams', 'Account Manager', '2023-03-21 11:00:00', '2025-05-03 14:20:00', true),
(3, 'sbrown', 'sarah.brown@globalretail.com', 'Sarah', 'Brown', 'Store Manager', '2023-06-11 15:30:00', '2025-05-04 10:15:00', true),
(4, 'rlee', 'robert.lee@aiinnovations.com', 'Robert', 'Lee', 'Data Scientist', '2023-09-06 12:00:00', '2025-05-05 09:30:00', true),
(5, 'lchen', 'lisa.chen@cloudservices.com', 'Lisa', 'Chen', 'Cloud Architect', '2023-11-26 17:00:00', '2025-05-06 16:00:00', true);

-- Insert subscriptions
INSERT INTO subscriptions (organization_id, plan_name, start_date, end_date, status, monthly_price, features) VALUES
(1, 'Enterprise', '2023-01-15 00:00:00', '2025-05-31 23:59:59', 'active', 999.99, '{"users": 100, "storage": "1TB", "support": "24/7"}'),
(2, 'Professional', '2023-03-20 00:00:00', '2025-05-31 23:59:59', 'active', 499.99, '{"users": 50, "storage": "500GB", "support": "business hours"}'),
(3, 'Business', '2023-06-10 00:00:00', '2025-05-31 23:59:59', 'active', 299.99, '{"users": 25, "storage": "250GB", "support": "business hours"}'),
(4, 'Enterprise', '2023-09-05 00:00:00', '2025-05-31 23:59:59', 'active', 999.99, '{"users": 100, "storage": "1TB", "support": "24/7"}'),
(5, 'Professional', '2023-11-25 00:00:00', '2025-05-31 23:59:59', 'active', 499.99, '{"users": 50, "storage": "500GB", "support": "business hours"}');

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
(3, 4, '2025-05-06 16:00:00', 389.97, 'Credit Card', 'completed', 0, 38.99);

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
(47, 6, 2, 89.99, 179.98, 0);

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
(1, '2025-05-06', 1499.97, 450.00, 1049.97, 899.97, 999.99, 499.98),
(2, '2025-05-06', 1999.99, 1000.00, 999.99, 849.99, 499.99, 1500.00),
(3, '2025-05-06', 389.97, 155.00, 234.97, 194.97, 299.99, 89.98),
(4, '2025-05-06', 0.00, 0.00, 0.00, 0.00, 999.99, -999.99),
(5, '2025-05-06', 0.00, 0.00, 0.00, 0.00, 499.99, -499.99); 
