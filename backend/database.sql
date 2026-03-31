-- WhatsApp Blast System Database Schema
-- Run this SQL file to create the database and tables

CREATE DATABASE IF NOT EXISTS wa_blast_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wa_blast_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- WhatsApp Sessions (Devices)
CREATE TABLE IF NOT EXISTS wa_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) DEFAULT NULL,
  status ENUM('disconnected', 'connecting', 'connected', 'banned') DEFAULT 'disconnected',
  session_data LONGTEXT DEFAULT NULL,
  qr_code TEXT DEFAULT NULL,
  last_connected TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) DEFAULT NULL,
  phone_number VARCHAR(20) NOT NULL,
  group_id INT DEFAULT NULL,
  is_valid TINYINT(1) DEFAULT 1,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Contact Groups table
CREATE TABLE IF NOT EXISTS contact_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  contact_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add foreign key for contacts to groups
ALTER TABLE contacts ADD CONSTRAINT fk_contact_group FOREIGN KEY (group_id) REFERENCES contact_groups(id) ON DELETE SET NULL;

-- Message Templates
CREATE TABLE IF NOT EXISTS message_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  media_type ENUM('none', 'image', 'video', 'document') DEFAULT 'none',
  media_url VARCHAR(500) DEFAULT NULL,
  variables JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Blast Campaigns
CREATE TABLE IF NOT EXISTS blast_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  media_type ENUM('none', 'image', 'video', 'document') DEFAULT 'none',
  media_url VARCHAR(500) DEFAULT NULL,
  status ENUM('draft', 'scheduled', 'running', 'paused', 'completed', 'failed') DEFAULT 'draft',
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  total_contacts INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  delay_min INT DEFAULT 2000,
  delay_max INT DEFAULT 5000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES wa_sessions(id) ON DELETE CASCADE
);

-- Blast Campaign Contacts (message logs)
CREATE TABLE IF NOT EXISTS blast_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  contact_id INT DEFAULT NULL,
  phone_number VARCHAR(20) NOT NULL,
  contact_name VARCHAR(150) DEFAULT NULL,
  status ENUM('pending', 'sent', 'failed', 'invalid') DEFAULT 'pending',
  message_id VARCHAR(100) DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES blast_campaigns(id) ON DELETE CASCADE
);

-- Auto Reply Rules
CREATE TABLE IF NOT EXISTS auto_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id INT NOT NULL,
  trigger_keyword VARCHAR(255) NOT NULL,
  match_type ENUM('exact', 'contains', 'starts_with', 'regex') DEFAULT 'contains',
  reply_message TEXT NOT NULL,
  media_type ENUM('none', 'image', 'document') DEFAULT 'none',
  media_url VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  reply_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES wa_sessions(id) ON DELETE CASCADE
);

-- Incoming Messages Log
CREATE TABLE IF NOT EXISTS message_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  direction ENUM('incoming', 'outgoing') NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  message_type ENUM('text', 'image', 'video', 'document', 'audio', 'sticker') DEFAULT 'text',
  content TEXT DEFAULT NULL,
  media_url VARCHAR(500) DEFAULT NULL,
  message_id VARCHAR(100) DEFAULT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES wa_sessions(id) ON DELETE CASCADE
);

-- Default admin user (password: admin123)
INSERT INTO users (name, email, password, role) VALUES 
('Administrator', 'admin@wablast.com', '$2a$10$rOzJqsmLhT6LQR/V0DXq6OqRJCzL1g0KfFqYkIZO1PDoJxJj5Tpqy', 'admin')
ON DUPLICATE KEY UPDATE name = name;
