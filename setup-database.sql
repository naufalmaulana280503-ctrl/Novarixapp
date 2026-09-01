-- Novarix Database Setup Script (Optional - for MySQL only)
-- The backend now defaults to SQLite and does NOT require MySQL.
-- Use this script only if you explicitly want to switch back to MySQL.

CREATE DATABASE IF NOT EXISTS novarix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'novarix'@'localhost' IDENTIFIED BY 'novarix123';
GRANT ALL PRIVILEGES ON novarix.* TO 'novarix'@'localhost';
FLUSH PRIVILEGES;
