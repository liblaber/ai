PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
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
INSERT INTO organizations VALUES(1,'Tech Solutions Inc.','Technology','123 Tech Park, Silicon Valley','+1234567890','info@techsolutions.com','2023-01-15 09:00:00','enterprise','2026-12-01 00:00:00','2027-01-01 00:00:00');
INSERT INTO organizations VALUES(2,'Green Energy Corp.','Renewable Energy','456 Green Ave, Eco City','+1987654321','contact@greenenergy.com','2023-03-20 10:30:00','pro','2026-12-15 00:00:00','2027-01-15 00:00:00');
INSERT INTO organizations VALUES(3,'Global Retail Ltd.','Retail','789 Market St, Commerce City','+1122334455','support@globalretail.com','2023-06-10 14:15:00','business','2026-12-10 00:00:00','2027-01-10 00:00:00');
INSERT INTO organizations VALUES(4,'AI Innovations','Artificial Intelligence','321 AI Boulevard, Tech City','+1555666777','contact@aiinnovations.com','2023-09-05 11:20:00','enterprise','2026-12-05 00:00:00','2027-01-05 00:00:00');
INSERT INTO organizations VALUES(5,'Cloud Services Co.','Cloud Computing','654 Cloud Drive, Data Center','+1888999000','info@cloudservices.com','2023-11-25 16:45:00','pro','2026-12-20 00:00:00','2027-01-20 00:00:00');
INSERT INTO organizations VALUES(6,'StartupHub Inc.','Technology Incubator','987 Innovation Lane, Startup Valley','+1777888999','hello@startuphub.com','2024-01-10 08:30:00','starter','2026-12-25 00:00:00','2027-01-25 00:00:00');
INSERT INTO organizations VALUES(7,'Premium Consulting Group','Business Consulting','147 Executive Plaza, Business District','+1666777888','contact@premiumconsulting.com','2024-02-20 13:45:00','premium','2026-12-30 00:00:00','2027-01-30 00:00:00');
INSERT INTO organizations VALUES(8,'FreeTech Community','Open Source Software','258 Community Center, Dev Town','+1444555666','info@freetech.org','2024-03-15 10:15:00','free',NULL,NULL);
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
INSERT INTO users VALUES(1,1,'jsmith','john.smith@techsolutions.com','John','Smith','Sales Manager','2023-01-16 10:00:00','2026-12-20 15:30:00',1);
INSERT INTO users VALUES(2,1,'mjohnson','mary.johnson@techsolutions.com','Mary','Johnson','Sales Representative','2023-02-01 09:15:00','2026-12-21 16:45:00',1);
INSERT INTO users VALUES(3,2,'dwilliams','david.williams@greenenergy.com','David','Williams','Account Manager','2023-03-21 11:00:00','2026-12-22 14:20:00',1);
INSERT INTO users VALUES(4,3,'sbrown','sarah.brown@globalretail.com','Sarah','Brown','Store Manager','2023-06-11 15:30:00','2026-12-23 10:15:00',1);
INSERT INTO users VALUES(5,4,'rlee','robert.lee@aiinnovations.com','Robert','Lee','Data Scientist','2023-09-06 12:00:00','2026-12-24 09:30:00',1);
INSERT INTO users VALUES(6,5,'lchen','lisa.chen@cloudservices.com','Lisa','Chen','Cloud Architect','2023-11-26 17:00:00','2026-12-25 16:00:00',1);
INSERT INTO users VALUES(7,6,'agarcia','alex.garcia@startuphub.com','Alex','Garcia','Sales Manager','2024-01-11 09:00:00','2026-12-26 11:30:00',1);
INSERT INTO users VALUES(8,6,'mwilson','mike.wilson@startuphub.com','Mike','Wilson','Sales Representative','2024-01-15 10:30:00','2026-12-27 14:15:00',1);
INSERT INTO users VALUES(9,7,'ktaylor','karen.taylor@premiumconsulting.com','Karen','Taylor','Account Manager','2024-02-21 14:00:00','2026-12-28 16:45:00',1);
INSERT INTO users VALUES(10,8,'janderson','john.anderson@freetech.org','John','Anderson','Data Scientist','2024-03-16 11:30:00','2026-12-29 13:20:00',1);
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
INSERT INTO subscriptions VALUES(1,1,'Enterprise','2023-01-15 00:00:00','2027-01-01 23:59:59','active',999.99,'{"users": 100, "storage": "1TB", "support": "24/7"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(2,2,'Professional','2023-03-20 00:00:00','2027-01-01 23:59:59','active',499.99,'{"users": 50, "storage": "500GB", "support": "business hours"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(3,3,'Business','2023-06-10 00:00:00','2027-01-01 23:59:59','active',299.99,'{"users": 25, "storage": "250GB", "support": "business hours"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(4,4,'Enterprise','2023-09-05 00:00:00','2027-01-01 23:59:59','active',999.99,'{"users": 100, "storage": "1TB", "support": "24/7"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(5,5,'Professional','2023-11-25 00:00:00','2027-01-01 23:59:59','active',499.99,'{"users": 50, "storage": "500GB", "support": "business hours"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(6,6,'Starter','2024-01-10 00:00:00','2027-01-01 23:59:59','active',99.99,'{"users": 5, "storage": "50GB", "support": "email only"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(7,7,'Premium','2024-02-20 00:00:00','2027-01-01 23:59:59','active',799.99,'{"users": 75, "storage": "750GB", "support": "priority 24/7"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(8,8,'Free','2024-03-15 00:00:00',NULL,'active',0.0,'{"users": 1, "storage": "1GB", "support": "community"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(9,1,'Professional','2022-01-15 00:00:00','2023-01-14 23:59:59','inactive',499.99,'{"users": 50, "storage": "500GB", "support": "business hours"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(10,2,'Enterprise','2024-06-01 00:00:00',NULL,'pending',999.99,'{"users": 100, "storage": "1TB", "support": "24/7"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(11,3,'Professional','2024-01-01 00:00:00','2024-03-31 23:59:59','cancelled',499.99,'{"users": 50, "storage": "500GB", "support": "business hours"}','2025-08-13 07:27:30');
INSERT INTO subscriptions VALUES(12,4,'Basic','2024-04-01 00:00:00','2024-05-15 23:59:59','suspended',199.99,'{"users": 10, "storage": "100GB", "support": "email only"}','2025-08-13 07:27:30');
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
INSERT INTO products VALUES(1,1,'Enterprise Software Suite','Complete business management solution',999.99,300.0,50,'Software','2023-01-20 10:00:00','2026-12-01 09:00:00');
INSERT INTO products VALUES(2,1,'Cloud Storage Package','Secure cloud storage solution',49.99,15.0,100,'Cloud Services','2023-02-01 11:00:00','2026-12-02 10:00:00');
INSERT INTO products VALUES(3,2,'Solar Panel Kit','Residential solar power system',2999.99,1500.0,30,'Solar Energy','2023-03-25 14:00:00','2026-12-03 13:00:00');
INSERT INTO products VALUES(4,2,'Wind Turbine','Small-scale wind power generator',1999.99,1000.0,20,'Wind Energy','2023-04-15 15:00:00','2026-12-04 14:00:00');
INSERT INTO products VALUES(5,3,'Smart Home Hub','Central control for smart devices',199.99,80.0,200,'Electronics','2023-06-15 09:00:00','2026-12-05 08:00:00');
INSERT INTO products VALUES(6,3,'Wireless Router','High-speed internet router',89.99,35.0,150,'Networking','2023-07-01 10:00:00','2026-12-06 09:00:00');
INSERT INTO products VALUES(7,4,'AI Analytics Platform','Advanced data analysis tool',1499.99,500.0,40,'AI Software','2023-09-10 11:00:00','2026-12-01 10:00:00');
INSERT INTO products VALUES(8,5,'Cloud Backup Solution','Enterprise-grade backup service',199.99,60.0,100,'Cloud Services','2023-11-30 13:00:00','2026-12-02 12:00:00');
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
INSERT INTO sales VALUES(1,1,1,'2023-04-05 10:30:00',1099.989, 'Credit Card','completed',0,99.99);
INSERT INTO sales VALUES(2,2,3,'2023-04-10 14:15:00',3299.989, 'Bank Transfer','completed',0,299.99);
INSERT INTO sales VALUES(3,3,4,'2023-04-15 11:20:00',219.989, 'Credit Card','completed',0,19.99);
INSERT INTO sales VALUES(4,1,2,'2023-05-01 09:30:00',1449.98, 'Credit Card','completed',50,144.99);
INSERT INTO sales VALUES(5,2,3,'2023-05-05 13:20:00',2199.989, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(6,3,4,'2023-05-10 15:45:00',318.9789, 'Credit Card','completed',0,28.99);
INSERT INTO sales VALUES(7,1,1,'2023-06-01 10:00:00',2199.979, 'Credit Card','completed',100,199.99);
INSERT INTO sales VALUES(8,2,3,'2023-06-05 14:30:00',5499.978, 'Bank Transfer','completed',0,499.99);
INSERT INTO sales VALUES(9,3,4,'2023-06-10 16:00:00',428.967, 'Credit Card','completed',0,38.99);
INSERT INTO sales VALUES(10,1,2,'2023-07-05 10:30:00',1154.9789, 'Credit Card','completed',0,104.99);
INSERT INTO sales VALUES(11,2,3,'2023-07-10 14:15:00',2199.989, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(12,3,4,'2023-07-15 11:20:00',318.9789, 'Credit Card','completed',0,28.99);
INSERT INTO sales VALUES(13,1,1,'2023-08-01 09:30:00',1649.967, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(14,2,3,'2023-08-05 13:20:00',3299.989, 'Bank Transfer','completed',0,299.99);
INSERT INTO sales VALUES(15,3,4,'2023-08-10 15:45:00',219.989, 'Credit Card','completed',0,19.99);
INSERT INTO sales VALUES(16,1,2,'2023-09-01 10:00:00',2199.979, 'Credit Card','completed',100,199.99);
INSERT INTO sales VALUES(17,2,3,'2023-09-05 14:30:00',2199.989, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(18,3,4,'2023-09-10 16:00:00',318.9789, 'Credit Card','completed',0,28.99);
INSERT INTO sales VALUES(19,1,1,'2023-10-05 10:30:00',1649.967, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(20,2,3,'2023-10-10 14:15:00',3299.989, 'Bank Transfer','completed',0,299.99);
INSERT INTO sales VALUES(21,3,4,'2023-10-15 11:20:00',219.989, 'Credit Card','completed',0,19.99);
INSERT INTO sales VALUES(22,1,2,'2023-11-01 09:30:00',2199.979, 'Credit Card','completed',100,199.99);
INSERT INTO sales VALUES(23,2,3,'2023-11-05 13:20:00',2199.989, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(24,3,4,'2023-11-10 15:45:00',318.9789, 'Credit Card','completed',0,28.99);
INSERT INTO sales VALUES(25,1,1,'2023-12-01 10:00:00',1649.967, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(26,2,3,'2023-12-05 14:30:00',3299.989, 'Bank Transfer','completed',0,299.99);
INSERT INTO sales VALUES(27,3,4,'2023-12-10 16:00:00',219.989, 'Credit Card','completed',0,19.99);
INSERT INTO sales VALUES(28,1,1,'2024-01-05 10:30:00',1154.9789, 'Credit Card','completed',0,104.99);
INSERT INTO sales VALUES(29,1,2,'2024-01-10 14:15:00',199.96, 'PayPal','completed',20,17.99);
INSERT INTO sales VALUES(30,2,3,'2024-01-15 11:20:00',3299.989, 'Bank Transfer','completed',0,299.99);
INSERT INTO sales VALUES(31,3,4,'2024-01-20 16:45:00',318.9789, 'Credit Card','completed',0,28.99);
INSERT INTO sales VALUES(32,1,1,'2024-02-01 09:30:00',2199.979, 'Credit Card','completed',100,199.99);
INSERT INTO sales VALUES(33,2,3,'2024-02-05 13:20:00',5499.978, 'Bank Transfer','completed',0,499.99);
INSERT INTO sales VALUES(34,3,4,'2024-02-10 15:45:00',637.956, 'Credit Card','completed',0,57.99);
INSERT INTO sales VALUES(35,4,5,'2024-02-15 11:30:00',1649.989, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(36,5,6,'2024-02-20 14:15:00',439.978, 'PayPal','completed',40,35.99);
INSERT INTO sales VALUES(37,1,2,'2024-03-01 10:00:00',1649.967, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(38,2,3,'2024-03-05 14:30:00',2199.989, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(39,3,4,'2024-03-10 16:00:00',428.967, 'Credit Card','completed',0,38.99);
INSERT INTO sales VALUES(40,6,7,'2024-04-01 10:30:00',1374.989, 'Check','completed',50,124.99);
INSERT INTO sales VALUES(41,7,9,'2024-04-05 14:15:00',879.989, 'Cash','completed',0,79.99);
INSERT INTO sales VALUES(42,8,10,'2024-04-10 11:20:00',329.989, 'Cryptocurrency','completed',0,29.99);
INSERT INTO sales VALUES(43,1,1,'2024-04-15 16:45:00',2199.989, 'Wire Transfer','completed',100,199.99);
INSERT INTO sales VALUES(44,2,3,'2024-05-01 09:30:00',3299.989, 'Credit Card','pending',0,299.99);
INSERT INTO sales VALUES(45,3,4,'2024-05-05 13:20:00',659.989, 'PayPal','cancelled',0,59.99);
INSERT INTO sales VALUES(46,4,5,'2024-05-10 15:45:00',1649.989, 'Bank Transfer','refunded',0,149.99);
INSERT INTO sales VALUES(47,5,6,'2024-05-15 11:30:00',439.989, 'Credit Card','failed',0,39.99);
INSERT INTO sales VALUES(48,6,8,'2024-05-01 10:00:00',219.989, 'Check','completed',20,17.99);
INSERT INTO sales VALUES(49,7,9,'2024-05-05 14:30:00',989.989, 'Cryptocurrency','completed',0,89.99);
INSERT INTO sales VALUES(50,8,10,'2024-05-10 16:00:00',164.989, 'Cash','completed',0,14.99);
INSERT INTO sales VALUES(51,1,1,'2025-01-15 10:00:00',1649.97, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(52,2,3,'2025-01-20 14:30:00',3299.99, 'Bank Transfer','completed',0,299.99);
INSERT INTO sales VALUES(53,3,4,'2025-01-25 16:00:00',428.97, 'Credit Card','completed',0,38.99);
INSERT INTO sales VALUES(54,4,5,'2025-02-05 11:30:00',1649.99, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(55,5,6,'2025-02-10 14:15:00',439.98, 'PayPal','completed',40,35.99);
INSERT INTO sales VALUES(56,1,2,'2025-03-01 10:00:00',1649.97, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(57,2,3,'2025-03-05 14:30:00',2199.99, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(58,3,4,'2025-03-10 16:00:00',428.97, 'Credit Card','completed',0,38.99);
INSERT INTO sales VALUES(59,6,7,'2025-04-01 10:30:00',1374.99, 'Check','completed',50,124.99);
INSERT INTO sales VALUES(60,7,9,'2025-04-05 14:15:00',879.99, 'Cash','completed',0,79.99);
INSERT INTO sales VALUES(61,8,10,'2025-04-10 11:20:00',329.99, 'Cryptocurrency','completed',0,29.99);
INSERT INTO sales VALUES(62,1,1,'2025-04-15 16:45:00',2199.99, 'Wire Transfer','completed',100,199.99);
INSERT INTO sales VALUES(63,2,3,'2025-05-01 09:30:00',3299.99, 'Credit Card','completed',0,299.99);
INSERT INTO sales VALUES(64,3,4,'2025-05-05 13:20:00',659.99, 'PayPal','completed',0,59.99);
INSERT INTO sales VALUES(65,4,5,'2025-05-10 15:45:00',1649.99, 'Bank Transfer','completed',0,149.99);
INSERT INTO sales VALUES(66,5,6,'2025-05-15 11:30:00',439.99, 'Credit Card','completed',0,39.99);
INSERT INTO sales VALUES(67,6,8,'2025-06-01 10:00:00',219.99, 'Check','completed',20,17.99);
INSERT INTO sales VALUES(68,7,9,'2025-06-05 14:30:00',989.99, 'Cryptocurrency','completed',0,89.99);
INSERT INTO sales VALUES(69,8,10,'2025-06-10 16:00:00',164.99, 'Cash','completed',0,14.99);
INSERT INTO sales VALUES(70,1,1,'2025-07-05 10:30:00',1649.97, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(71,2,3,'2025-07-10 14:15:00',2199.99, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(72,3,4,'2025-07-15 11:20:00',428.97, 'Credit Card','completed',0,38.99);
INSERT INTO sales VALUES(73,1,2,'2025-08-01 09:30:00',2199.97, 'Credit Card','completed',100,199.99);
INSERT INTO sales VALUES(74,2,3,'2025-08-05 13:20:00',5499.97, 'Bank Transfer','completed',0,499.99);
INSERT INTO sales VALUES(75,3,4,'2025-08-10 15:45:00',637.95, 'Credit Card','completed',0,57.99);
INSERT INTO sales VALUES(76,4,5,'2025-09-01 11:30:00',1649.99, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(77,5,6,'2025-09-05 14:15:00',439.98, 'PayPal','completed',40,35.99);
INSERT INTO sales VALUES(78,1,1,'2025-10-01 10:00:00',1649.97, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(79,2,3,'2025-10-05 14:30:00',2199.99, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(80,3,4,'2025-10-10 16:00:00',428.97, 'Credit Card','completed',0,38.99);
INSERT INTO sales VALUES(81,6,7,'2025-11-01 10:30:00',1374.99, 'Check','completed',50,124.99);
INSERT INTO sales VALUES(82,7,9,'2025-11-05 14:15:00',879.99, 'Cash','completed',0,79.99);
INSERT INTO sales VALUES(83,8,10,'2025-11-10 11:20:00',329.99, 'Cryptocurrency','completed',0,29.99);
INSERT INTO sales VALUES(84,1,2,'2025-12-01 16:45:00',2199.99, 'Wire Transfer','completed',100,199.99);
INSERT INTO sales VALUES(85,2,3,'2025-12-05 09:30:00',3299.99, 'Credit Card','completed',0,299.99);
INSERT INTO sales VALUES(86,3,4,'2025-12-10 13:20:00',659.99, 'PayPal','completed',0,59.99);
INSERT INTO sales VALUES(87,4,5,'2025-12-15 15:45:00',1649.99, 'Bank Transfer','completed',0,149.99);
INSERT INTO sales VALUES(88,5,6,'2026-01-01 11:30:00',439.99, 'Credit Card','completed',0,39.99);
INSERT INTO sales VALUES(89,6,8,'2026-01-05 10:00:00',219.99, 'Check','completed',20,17.99);
INSERT INTO sales VALUES(90,7,9,'2026-01-10 14:30:00',989.99, 'Cryptocurrency','completed',0,89.99);
INSERT INTO sales VALUES(91,8,10,'2026-01-15 16:00:00',164.99, 'Cash','completed',0,14.99);
INSERT INTO sales VALUES(92,1,1,'2026-02-01 10:30:00',1649.97, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(93,2,3,'2026-02-05 14:15:00',2199.99, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(94,3,4,'2026-02-10 11:20:00',428.97, 'Credit Card','completed',0,38.99);
INSERT INTO sales VALUES(95,4,5,'2026-03-01 09:30:00',1649.99, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(96,5,6,'2026-03-05 13:20:00',439.98, 'PayPal','completed',40,35.99);
INSERT INTO sales VALUES(97,1,2,'2026-03-10 15:45:00',1649.97, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(98,2,3,'2026-04-01 10:00:00',2199.99, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(99,3,4,'2026-04-05 14:30:00',428.97, 'Credit Card','completed',0,38.99);
INSERT INTO sales VALUES(100,6,7,'2026-05-01 10:30:00',1374.99, 'Check','completed',50,124.99);
INSERT INTO sales VALUES(101,7,9,'2026-05-05 14:15:00',879.99, 'Cash','completed',0,79.99);
INSERT INTO sales VALUES(102,8,10,'2026-05-10 11:20:00',329.99, 'Cryptocurrency','completed',0,29.99);
INSERT INTO sales VALUES(103,1,1,'2026-06-01 16:45:00',2199.99, 'Wire Transfer','completed',100,199.99);
INSERT INTO sales VALUES(104,2,3,'2026-06-05 09:30:00',3299.99, 'Credit Card','completed',0,299.99);
INSERT INTO sales VALUES(105,3,4,'2026-06-10 13:20:00',659.99, 'PayPal','completed',0,59.99);
INSERT INTO sales VALUES(106,4,5,'2026-07-01 15:45:00',1649.99, 'Bank Transfer','completed',0,149.99);
INSERT INTO sales VALUES(107,5,6,'2026-07-05 11:30:00',439.99, 'Credit Card','completed',0,39.99);
INSERT INTO sales VALUES(108,6,8,'2026-07-10 10:00:00',219.99, 'Check','completed',20,17.99);
INSERT INTO sales VALUES(109,7,9,'2026-07-15 14:30:00',989.99, 'Cryptocurrency','completed',0,89.99);
INSERT INTO sales VALUES(110,8,10,'2026-08-01 16:00:00',164.99, 'Cash','completed',0,14.99);
INSERT INTO sales VALUES(111,1,1,'2026-08-05 10:30:00',1649.97, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(112,2,3,'2026-08-10 14:15:00',2199.99, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(113,3,4,'2026-09-01 11:20:00',428.97, 'Credit Card','completed',0,38.99);
INSERT INTO sales VALUES(114,4,5,'2026-09-05 09:30:00',1649.99, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(115,5,6,'2026-09-10 13:20:00',439.98, 'PayPal','completed',40,35.99);
INSERT INTO sales VALUES(116,1,2,'2026-10-01 15:45:00',1649.97, 'Credit Card','completed',0,149.99);
INSERT INTO sales VALUES(117,2,3,'2026-10-05 10:00:00',2199.99, 'Bank Transfer','completed',0,199.99);
INSERT INTO sales VALUES(118,3,4,'2026-10-10 14:30:00',428.97, 'Credit Card','completed',0,38.99);
INSERT INTO sales VALUES(119,6,7,'2026-11-01 10:30:00',1374.99, 'Check','completed',50,124.99);
INSERT INTO sales VALUES(120,7,9,'2026-11-05 14:15:00',879.99, 'Cash','completed',0,79.99);
INSERT INTO sales VALUES(121,8,10,'2026-11-10 11:20:00',329.99, 'Cryptocurrency','completed',0,29.99);
INSERT INTO sales VALUES(122,1,1,'2026-12-01 16:45:00',2199.99, 'Wire Transfer','completed',100,199.99);
INSERT INTO sales VALUES(123,2,3,'2026-12-05 09:30:00',3299.99, 'Credit Card','completed',0,299.99);
INSERT INTO sales VALUES(124,3,4,'2026-12-10 13:20:00',659.99, 'PayPal','completed',0,59.99);
CREATE TABLE sale_items (
                          sale_item_id INTEGER PRIMARY KEY,
                          sale_id INTEGER REFERENCES sales(sale_id),
                          product_id INTEGER REFERENCES products(product_id),
                          quantity INTEGER NOT NULL,
                          unit_price REAL NOT NULL,
                          total_price REAL NOT NULL,
                          discount_percentage REAL DEFAULT 0
);
INSERT INTO sale_items VALUES(1,1,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(2,2,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(3,3,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(4,4,1,1,999.99,999.99,5.0);
INSERT INTO sale_items VALUES(5,4,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(6,5,4,1,1999.99,1999.99,0.0);
INSERT INTO sale_items VALUES(7,6,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(8,6,6,1,89.99,89.99,0.0);
INSERT INTO sale_items VALUES(9,7,1,2,999.99,1999.98,5.0);
INSERT INTO sale_items VALUES(10,8,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(11,8,4,1,1999.99,1999.99,0.0);
INSERT INTO sale_items VALUES(12,9,5,2,199.99,399.98,0.0);
INSERT INTO sale_items VALUES(13,9,6,1,89.99,89.99,0.0);
INSERT INTO sale_items VALUES(14,10,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(15,10,2,1,49.99,49.99,0.0);
INSERT INTO sale_items VALUES(16,11,4,1,1999.99,1999.99,0.0);
INSERT INTO sale_items VALUES(17,12,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(18,12,6,1,89.99,89.99,0.0);
INSERT INTO sale_items VALUES(19,13,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(20,13,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(21,14,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(22,15,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(23,16,1,2,999.99,1999.98,5.0);
INSERT INTO sale_items VALUES(24,17,4,1,1999.99,1999.99,0.0);
INSERT INTO sale_items VALUES(25,18,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(26,18,6,1,89.99,89.99,0.0);
INSERT INTO sale_items VALUES(27,19,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(28,19,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(29,20,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(30,21,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(31,22,1,2,999.99,1999.98,5.0);
INSERT INTO sale_items VALUES(32,23,4,1,1999.99,1999.99,0.0);
INSERT INTO sale_items VALUES(33,24,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(34,24,6,1,89.99,89.99,0.0);
INSERT INTO sale_items VALUES(35,25,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(36,25,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(37,26,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(38,27,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(39,28,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(40,28,2,1,49.99,49.99,0.0);
INSERT INTO sale_items VALUES(41,29,2,4,49.99,199.96,10.0);
INSERT INTO sale_items VALUES(42,30,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(43,31,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(44,31,6,1,89.99,89.99,0.0);
INSERT INTO sale_items VALUES(45,32,1,2,999.99,1999.98,5.0);
INSERT INTO sale_items VALUES(46,33,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(47,33,4,1,1999.99,1999.99,0.0);
INSERT INTO sale_items VALUES(48,34,5,2,199.99,399.98,0.0);
INSERT INTO sale_items VALUES(49,34,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(50,35,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(51,36,8,2,199.99,399.98,10.0);
INSERT INTO sale_items VALUES(52,37,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(53,37,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(54,38,4,1,1999.99,1999.99,0.0);
INSERT INTO sale_items VALUES(55,39,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(56,39,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(57,40,2,2,49.99,99.98,5.0);
INSERT INTO sale_items VALUES(58,40,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(59,40,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(60,41,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(61,42,2,4,49.99,199.96,10.0);
INSERT INTO sale_items VALUES(62,43,1,2,999.99,1999.98,5.0);
INSERT INTO sale_items VALUES(63,44,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(64,45,6,1,89.99,89.99,0.0);
INSERT INTO sale_items VALUES(65,46,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(66,47,8,2,199.99,399.98,10.0);
INSERT INTO sale_items VALUES(67,48,2,4,49.99,199.96,10.0);
INSERT INTO sale_items VALUES(68,49,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(69,50,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(70,51,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(71,51,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(72,52,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(73,53,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(74,53,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(75,54,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(76,55,8,2,199.99,399.98,10.0);
INSERT INTO sale_items VALUES(77,56,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(78,56,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(79,57,4,1,1999.99,1999.99,0.0);
INSERT INTO sale_items VALUES(80,58,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(81,58,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(82,59,2,2,49.99,99.98,5.0);
INSERT INTO sale_items VALUES(83,59,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(84,59,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(85,60,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(86,61,2,4,49.99,199.96,10.0);
INSERT INTO sale_items VALUES(87,62,1,2,999.99,1999.98,5.0);
INSERT INTO sale_items VALUES(88,63,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(89,64,6,1,89.99,89.99,0.0);
INSERT INTO sale_items VALUES(90,65,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(91,66,8,2,199.99,399.98,10.0);
INSERT INTO sale_items VALUES(92,67,2,4,49.99,199.96,10.0);
INSERT INTO sale_items VALUES(93,68,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(94,69,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(95,70,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(96,70,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(97,71,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(98,72,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(99,72,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(100,73,1,2,999.99,1999.98,5.0);
INSERT INTO sale_items VALUES(101,74,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(102,74,4,1,1999.99,1999.99,0.0);
INSERT INTO sale_items VALUES(103,75,5,2,199.99,399.98,0.0);
INSERT INTO sale_items VALUES(104,75,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(105,76,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(106,77,8,2,199.99,399.98,10.0);
INSERT INTO sale_items VALUES(107,78,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(108,78,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(109,79,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(110,80,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(111,80,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(112,81,2,2,49.99,99.98,5.0);
INSERT INTO sale_items VALUES(113,81,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(114,81,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(115,82,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(116,83,2,4,49.99,199.96,10.0);
INSERT INTO sale_items VALUES(117,84,1,2,999.99,1999.98,5.0);
INSERT INTO sale_items VALUES(118,85,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(119,86,6,1,89.99,89.99,0.0);
INSERT INTO sale_items VALUES(120,87,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(121,88,8,2,199.99,399.98,10.0);
INSERT INTO sale_items VALUES(122,89,2,4,49.99,199.96,10.0);
INSERT INTO sale_items VALUES(123,90,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(124,91,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(125,92,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(126,92,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(127,93,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(128,94,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(129,94,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(130,95,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(131,96,8,2,199.99,399.98,10.0);
INSERT INTO sale_items VALUES(132,97,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(133,97,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(134,98,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(135,99,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(136,99,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(137,100,2,2,49.99,99.98,5.0);
INSERT INTO sale_items VALUES(138,100,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(139,100,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(140,101,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(141,102,2,4,49.99,199.96,10.0);
INSERT INTO sale_items VALUES(142,103,1,2,999.99,1999.98,5.0);
INSERT INTO sale_items VALUES(143,104,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(144,105,6,1,89.99,89.99,0.0);
INSERT INTO sale_items VALUES(145,106,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(146,107,8,2,199.99,399.98,10.0);
INSERT INTO sale_items VALUES(147,108,2,4,49.99,199.96,10.0);
INSERT INTO sale_items VALUES(148,109,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(149,110,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(150,111,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(151,111,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(152,112,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(153,113,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(154,113,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(155,114,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(156,115,8,2,199.99,399.98,10.0);
INSERT INTO sale_items VALUES(157,116,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(158,116,2,10,49.99,499.9,0.0);
INSERT INTO sale_items VALUES(159,117,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(160,118,5,1,199.99,199.99,0.0);
INSERT INTO sale_items VALUES(161,118,6,2,89.99,179.98,0.0);
INSERT INTO sale_items VALUES(162,119,2,2,49.99,99.98,5.0);
INSERT INTO sale_items VALUES(163,119,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(164,119,7,1,1499.99,1499.99,0.0);
INSERT INTO sale_items VALUES(165,120,1,1,999.99,999.99,0.0);
INSERT INTO sale_items VALUES(166,121,2,4,49.99,199.96,10.0);
INSERT INTO sale_items VALUES(167,122,1,2,999.99,1999.98,5.0);
INSERT INTO sale_items VALUES(168,123,3,1,2999.99,2999.99,0.0);
INSERT INTO sale_items VALUES(169,124,6,1,89.99,89.99,0.0);
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
INSERT INTO revenue VALUES(1,1,'2023-04-30',1099.989,300.0,799.99,699.99,999.99,99.99);
INSERT INTO revenue VALUES(2,2,'2023-04-30',3299.989,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(3,3,'2023-04-30',219.989,80.0,139.99,119.99,299.99,-80.0);
INSERT INTO revenue VALUES(4,1,'2023-05-31',1449.98,450.0,999.98,849.98,999.99,450.0);
INSERT INTO revenue VALUES(5,2,'2023-05-31',2199.989,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(6,3,'2023-05-31',318.9789,115.0,203.98,173.98,299.99,19.0);
INSERT INTO revenue VALUES(7,1,'2023-06-30',2199.979,600.0,1599.98,1399.98,999.99,1200.0);
INSERT INTO revenue VALUES(8,2,'2023-06-30',5499.978,2500.0,2999.98,2699.98,499.99,5000.0);
INSERT INTO revenue VALUES(9,3,'2023-06-30',428.967,155.0,273.97,233.97,299.99,129.0);
INSERT INTO revenue VALUES(10,1,'2023-07-31',1154.9789,315.0,839.98,739.98,999.99,155.0);
INSERT INTO revenue VALUES(11,2,'2023-07-31',2199.989,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(12,3,'2023-07-31',318.9789,115.0,203.98,173.98,299.99,19.0);
INSERT INTO revenue VALUES(13,1,'2023-08-31',1649.967,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(14,2,'2023-08-31',3299.989,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(15,3,'2023-08-31',219.989,80.0,139.99,119.99,299.99,-80.0);
INSERT INTO revenue VALUES(16,1,'2023-09-30',2199.979,600.0,1599.98,1399.98,999.99,1200.0);
INSERT INTO revenue VALUES(17,2,'2023-09-30',2199.989,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(18,3,'2023-09-30',318.9789,115.0,203.98,173.98,299.99,19.0);
INSERT INTO revenue VALUES(19,1,'2023-10-31',1649.967,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(20,2,'2023-10-31',3299.989,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(21,3,'2023-10-31',219.989,80.0,139.99,119.99,299.99,-80.0);
INSERT INTO revenue VALUES(22,1,'2023-11-30',2199.979,600.0,1599.98,1399.98,999.99,1200.0);
INSERT INTO revenue VALUES(23,2,'2023-11-30',2199.989,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(24,3,'2023-11-30',318.9789,115.0,203.98,173.98,299.99,19.0);
INSERT INTO revenue VALUES(25,1,'2023-12-31',1649.967,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(26,2,'2023-12-31',3299.989,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(27,3,'2023-12-31',219.989,80.0,139.99,119.99,299.99,-80.0);
INSERT INTO revenue VALUES(28,1,'2024-01-31',1354.9589,315.0,1039.96,889.96,999.99,355.0);
INSERT INTO revenue VALUES(29,2,'2024-01-31',3299.989,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(30,3,'2024-01-31',318.9789,115.0,203.98,173.98,299.99,19.0);
INSERT INTO revenue VALUES(31,4,'2024-01-31',1499.99,500.0,999.99,849.99,999.99,500.0);
INSERT INTO revenue VALUES(32,5,'2024-01-31',399.98,120.0,279.98,239.98,499.99,-100.0);
INSERT INTO revenue VALUES(33,1,'2024-02-29',2199.979,600.0,1599.98,1399.98,999.99,1200.0);
INSERT INTO revenue VALUES(34,2,'2024-02-29',5499.978,2500.0,2999.98,2699.98,499.99,5000.0);
INSERT INTO revenue VALUES(35,3,'2024-02-29',637.956,230.0,407.96,347.96,299.99,337.97);
INSERT INTO revenue VALUES(36,4,'2024-02-29',1649.989,500.0,1149.99,999.99,999.99,650.0);
INSERT INTO revenue VALUES(37,5,'2024-02-29',439.978,120.0,319.98,279.98,499.99,-60.0);
INSERT INTO revenue VALUES(38,1,'2024-03-31',1649.967,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(39,2,'2024-03-31',2199.989,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(40,3,'2024-03-31',428.967,155.0,273.97,233.97,299.99,129.0);
INSERT INTO revenue VALUES(41,4,'2024-03-31',0.0,0.0,0.0,0.0,999.99, -999.99);
INSERT INTO revenue VALUES(42,5,'2024-03-31',0.0,0.0,0.0,0.0,499.99, -499.99);
INSERT INTO revenue VALUES(43,6,'2024-04-30',2624.978,1625.0,999.98,849.98,99.99,2525.0);
INSERT INTO revenue VALUES(44,7,'2024-04-30',1679.978,800.0,879.98,729.98,799.99,880.0);
INSERT INTO revenue VALUES(45,8,'2024-04-30',494.978,180.0,314.98,284.98,0.0,495.0);
INSERT INTO revenue VALUES(46,1,'2024-04-30',2199.989,600.0,1599.99,1399.99,999.99,1200.0);
INSERT INTO revenue VALUES(47,2,'2024-05-31',3299.989,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(48,3,'2024-05-31',659.989,200.0,459.99,400.0,299.99,360.0);
INSERT INTO revenue VALUES(49,4,'2024-05-31',1649.989,500.0,1149.99,999.99,999.99,650.0);
INSERT INTO revenue VALUES(50,5,'2024-05-31',439.989,120.0,319.99,279.99,499.99,-60.0);
INSERT INTO revenue VALUES(51,6,'2024-05-31',319.989,80.0,239.99,209.99,99.99,220.0);
INSERT INTO revenue VALUES(52,7,'2024-05-31',1079.989,300.0,779.99,699.99,799.99,280.0);
INSERT INTO revenue VALUES(53,8,'2024-05-31',164.989,15.0,149.99,134.99,0.0,150.0);
INSERT INTO revenue VALUES(54,1,'2025-01-31',1649.97,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(55,2,'2025-01-31',3299.99,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(56,3,'2025-01-31',428.97,155.0,273.97,233.97,299.99,129.0);
INSERT INTO revenue VALUES(57,4,'2025-02-28',1649.99,500.0,1149.99,999.99,999.99,650.0);
INSERT INTO revenue VALUES(58,5,'2025-02-28',439.98,120.0,319.98,279.98,499.99,-60.0);
INSERT INTO revenue VALUES(59,1,'2025-03-31',1649.97,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(60,2,'2025-03-31',2199.99,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(61,3,'2025-03-31',428.97,155.0,273.97,233.97,299.99,129.0);
INSERT INTO revenue VALUES(62,6,'2025-04-30',2624.99,1625.0,999.99,849.99,99.99,2525.0);
INSERT INTO revenue VALUES(63,7,'2025-04-30',1679.99,800.0,879.99,729.99,799.99,880.0);
INSERT INTO revenue VALUES(64,8,'2025-04-30',494.99,180.0,314.99,284.99,0.0,495.0);
INSERT INTO revenue VALUES(65,1,'2025-04-30',2199.99,600.0,1599.99,1399.99,999.99,1200.0);
INSERT INTO revenue VALUES(66,2,'2025-05-31',3299.99,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(67,3,'2025-05-31',659.99,200.0,459.99,400.0,299.99,360.0);
INSERT INTO revenue VALUES(68,4,'2025-05-31',1649.99,500.0,1149.99,999.99,999.99,650.0);
INSERT INTO revenue VALUES(69,5,'2025-05-31',439.99,120.0,319.99,279.99,499.99,-60.0);
INSERT INTO revenue VALUES(70,6,'2025-06-30',319.99,80.0,239.99,209.99,99.99,220.0);
INSERT INTO revenue VALUES(71,7,'2025-06-30',1079.99,300.0,779.99,699.99,799.99,280.0);
INSERT INTO revenue VALUES(72,8,'2025-06-30',164.99,15.0,149.99,134.99,0.0,150.0);
INSERT INTO revenue VALUES(73,1,'2025-07-31',1649.97,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(74,2,'2025-07-31',2199.99,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(75,3,'2025-07-31',428.97,155.0,273.97,233.97,299.99,129.0);
INSERT INTO revenue VALUES(76,1,'2025-08-31',2199.97,600.0,1599.97,1399.97,999.99,1200.0);
INSERT INTO revenue VALUES(77,2,'2025-08-31',5499.97,2500.0,2999.97,2699.97,499.99,5000.0);
INSERT INTO revenue VALUES(78,3,'2025-08-31',637.95,230.0,407.95,347.95,299.99,337.96);
INSERT INTO revenue VALUES(79,4,'2025-09-30',1649.99,500.0,1149.99,999.99,999.99,650.0);
INSERT INTO revenue VALUES(80,5,'2025-09-30',439.98,120.0,319.98,279.98,499.99,-60.0);
INSERT INTO revenue VALUES(81,1,'2025-10-31',1649.97,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(82,2,'2025-10-31',2199.99,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(83,3,'2025-10-31',428.97,155.0,273.97,233.97,299.99,129.0);
INSERT INTO revenue VALUES(84,6,'2025-11-30',2624.99,1625.0,999.99,849.99,99.99,2525.0);
INSERT INTO revenue VALUES(85,7,'2025-11-30',1679.99,800.0,879.99,729.99,799.99,880.0);
INSERT INTO revenue VALUES(86,8,'2025-11-30',494.99,180.0,314.99,284.99,0.0,495.0);
INSERT INTO revenue VALUES(87,1,'2025-12-31',2199.99,600.0,1599.99,1399.99,999.99,1200.0);
INSERT INTO revenue VALUES(88,2,'2025-12-31',3299.99,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(89,3,'2025-12-31',659.99,200.0,459.99,400.0,299.99,360.0);
INSERT INTO revenue VALUES(90,4,'2025-12-31',1649.99,500.0,1149.99,999.99,650.0, 1300);
INSERT INTO revenue VALUES(91,5,'2026-01-31',439.99,120.0,319.99,279.99,499.99,-60.0);
INSERT INTO revenue VALUES(92,6,'2026-01-31',319.99,80.0,239.99,209.99,99.99,220.0);
INSERT INTO revenue VALUES(93,7,'2026-01-31',1079.99,300.0,779.99,699.99,799.99,280.0);
INSERT INTO revenue VALUES(94,8,'2026-01-31',164.99,15.0,149.99,134.99,0.0,150.0);
INSERT INTO revenue VALUES(95,1,'2026-02-28',1649.97,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(96,2,'2026-02-28',2199.99,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(97,3,'2026-02-28',428.97,155.0,273.97,233.97,299.99,129.0);
INSERT INTO revenue VALUES(98,4,'2026-03-31',1649.99,500.0,1149.99,999.99,999.99,650.0);
INSERT INTO revenue VALUES(99,5,'2026-03-31',439.98,120.0,319.98,279.98,499.99,-60.0);
INSERT INTO revenue VALUES(100,1,'2026-03-31',1649.97,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(101,2,'2026-04-30',2199.99,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(102,3,'2026-04-30',428.97,155.0,273.97,233.97,299.99,129.0);
INSERT INTO revenue VALUES(103,6,'2026-05-31',2624.99,1625.0,999.99,849.99,99.99,2525.0);
INSERT INTO revenue VALUES(104,7,'2026-05-31',1679.99,800.0,879.99,729.99,799.99,880.0);
INSERT INTO revenue VALUES(105,8,'2026-05-31',494.99,180.0,314.99,284.99,0.0,495.0);
INSERT INTO revenue VALUES(106,1,'2026-06-30',2199.99,600.0,1599.99,1399.99,999.99,1200.0);
INSERT INTO revenue VALUES(107,2,'2026-06-30',3299.99,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(108,3,'2026-06-30',659.99,200.0,459.99,400.0,299.99,360.0);
INSERT INTO revenue VALUES(109,4,'2026-07-31',1649.99,500.0,1149.99,999.99,650.0, 150);
INSERT INTO revenue VALUES(110,5,'2026-07-31',439.99,120.0,319.99,279.99,499.99,-60.0);
INSERT INTO revenue VALUES(111,6,'2026-07-31',319.99,80.0,239.99,209.99,99.99,220.0);
INSERT INTO revenue VALUES(112,7,'2026-07-31',1079.99,300.0,779.99,699.99,799.99,280.0);
INSERT INTO revenue VALUES(113,8,'2026-07-31',164.99,15.0,149.99,134.99,0.0,150.0);
INSERT INTO revenue VALUES(114,1,'2026-08-31',1649.97,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(115,2,'2026-08-31',2199.99,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(116,3,'2026-08-31',428.97,155.0,273.97,233.97,299.99,129.0);
INSERT INTO revenue VALUES(117,4,'2026-09-30',1649.99,500.0,1149.99,999.99,650.0, 500.0);
INSERT INTO revenue VALUES(118,5,'2026-09-30',439.98,120.0,319.98,279.98,499.99,-60.0);
INSERT INTO revenue VALUES(119,1,'2026-10-31',1649.97,450.0,1199.97,1049.97,999.99,650.0);
INSERT INTO revenue VALUES(120,2,'2026-10-31',2199.99,1000.0,1199.99,1049.99,499.99,1700.0);
INSERT INTO revenue VALUES(121,3,'2026-10-31',428.97,155.0,273.97,233.97,299.99,129.0);
INSERT INTO revenue VALUES(122,6,'2026-11-30',2624.99,1625.0,999.99,849.99,99.99,2525.0);
INSERT INTO revenue VALUES(123,7,'2026-11-30',1679.99,800.0,879.99,729.99,799.99,880.0);
INSERT INTO revenue VALUES(124,8,'2026-11-30',494.99,180.0,314.99,284.99,0.0,495.0);
INSERT INTO revenue VALUES(125,1,'2026-12-31',2199.99,600.0,1599.99,1399.99,999.99,1200.0);
INSERT INTO revenue VALUES(126,2,'2026-12-31',3299.99,1500.0,1799.99,1599.99,499.99,2800.0);
INSERT INTO revenue VALUES(127,3,'2026-12-31',659.99,200.0,459.99,400.0,299.99,360.0);
COMMIT;
