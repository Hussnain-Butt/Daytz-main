-- This script will drop existing tables and recreate them to ensure a clean state.
-- The order of dropping is important to respect foreign key constraints.
DROP TABLE IF EXISTS user_tutorials;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS dates;
DROP TABLE IF EXISTS attraction;
DROP TABLE IF EXISTS calendar_day;
DROP TABLE IF EXISTS notifications; -- ✅ Dropping the new table first
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS advertisements;
DROP TABLE IF EXISTS tutorials;

-- Drop custom types if they exist
DROP TYPE IF EXISTS status_type;
DROP TYPE IF EXISTS transaction_type;
DROP TYPE IF EXISTS notification_status; -- ✅ Dropping the new type


-- =================================================================
-- RECREATING TYPES AND TABLES
-- =================================================================

-- ✅ Step 1: Create Custom Types first
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_type') THEN
        CREATE TYPE status_type AS ENUM ('unscheduled', 'pending', 'approved', 'cancelled', 'completed');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM (
            'purchase', 'replenishment', 'admin', 'refund', 'deduction',
            'bonus', 'penalty', 'gift', 'subscription', 'advertising'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM ('read', 'unread');
    END IF;
END $$;


-- ✅ Step 2: Create Tables that don't depend on others
-- USERS Table (Updated for Firebase Cloud Messaging)
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,                 -- Stores the Auth0/Google subject ID
    first_name VARCHAR(255) DEFAULT '',
    last_name VARCHAR(255) DEFAULT '',
    profile_picture_url VARCHAR(1024) DEFAULT NULL,
    video_url VARCHAR(1024) DEFAULT NULL,
    zipcode VARCHAR(10) DEFAULT NULL,
    stickers JSON DEFAULT NULL,
    enable_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_profile_complete BOOLEAN DEFAULT FALSE NOT NULL,
    auth0_id VARCHAR(255) NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    tokens INTEGER DEFAULT 100, -- Default tokens for new users
    fcm_token VARCHAR(255) NULL -- Replaced one_signal_player_id with fcm_token
);

CREATE TABLE advertisements (
    ad_id SERIAL PRIMARY KEY,
    video_url VARCHAR(1024),
    metadata JSON,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tutorials (
    tutorial_id SERIAL PRIMARY KEY,
    video_url VARCHAR(1024),
    title VARCHAR(255),
    description TEXT,
    sequence_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ✅ Step 3: Create Tables that depend on USERS
-- NOTIFICATIONS Table (New)
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'MATCH', 'DATE_PROPOSAL', 'DATE_APPROVED'
    status notification_status NOT NULL DEFAULT 'unread',
    related_entity_id VARCHAR(255) NULL, -- e.g., matched user's ID, date_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    proposing_user_id VARCHAR(255),  -- Optional: to link back to the user who initiated the action
    notified_user_id VARCHAR(255),   -- Optional: the user who receives the notification
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (proposing_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (notified_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);


-- CALENDAR_DAY Table
CREATE TABLE calendar_day (
    calendar_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    user_video_url VARCHAR(1024) DEFAULT NULL,
    vimeo_uri TEXT NULL,
    processing_status TEXT DEFAULT 'pending',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_calendar_day_vimeo_uri ON calendar_day (vimeo_uri);
CREATE INDEX IF NOT EXISTS idx_calendar_day_user_date ON calendar_day (user_id, date);

-- ATTRACTION Table
CREATE TABLE attraction (
    attraction_id SERIAL PRIMARY KEY,
    date DATE,
    user_from VARCHAR(255),
    user_to VARCHAR(255),
    romantic_rating INT CHECK (romantic_rating BETWEEN 0 AND 3),
    sexual_rating INT CHECK (sexual_rating BETWEEN 0 AND 3),
    friendship_rating INT CHECK (friendship_rating BETWEEN 0 AND 3),
    long_term_potential BOOLEAN,
    intellectual BOOLEAN,
    emotional BOOLEAN,
    result BOOLEAN,
    first_message_rights BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    FOREIGN KEY (user_from) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (user_to) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(user_from, user_to, date)
);

-- DATES Table
CREATE TABLE dates (
    date_id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time TIME WITH TIME ZONE,
    user_from VARCHAR(255),
    user_to VARCHAR(255),
    location_metadata JSON,
    status status_type NOT NULL DEFAULT 'pending',
    user_from_approved BOOLEAN DEFAULT FALSE,
    user_to_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_from) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (user_to) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(user_from, user_to, date)
);

-- TRANSACTIONS Table
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    transaction_type transaction_type NOT NULL,
    amount_usd DECIMAL(10, 2) DEFAULT 0.00,
    token_amount INT DEFAULT 0,
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    related_entity_id VARCHAR(255) NULL,
    related_entity_type VARCHAR(50) NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ✅ Step 4: Create tables that depend on both USERS and TUTORIALS
-- USER_TUTORIALS Table
CREATE TABLE user_tutorials (
    user_tutorial_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    tutorial_id INT,
    shown BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (tutorial_id) REFERENCES tutorials(tutorial_id) ON DELETE CASCADE,
    UNIQUE (user_id, tutorial_id)
);


-- =================================================================
-- FUNCTIONS AND TRIGGERS
-- =================================================================

CREATE OR REPLACE FUNCTION delete_user_cascade(p_user_id VARCHAR)
RETURNS VOID AS $$
BEGIN
    RAISE NOTICE 'Attempting to delete user % and related data via cascade...', p_user_id;
    DELETE FROM users WHERE user_id = p_user_id;
    IF EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE WARNING 'User % was not deleted successfully.', p_user_id;
    ELSE
        RAISE NOTICE 'User % deleted successfully.', p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
      NEW.updated_at = CURRENT_TIMESTAMP;
   END IF;
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Note: You would still need to create triggers on each table where you want this function to run.
-- Example: CREATE TRIGGER set_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();