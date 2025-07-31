-- File: init.sql
-- ✅ COMPLETE AND FINAL UPDATED CODE

-- This script will drop existing tables and recreate them to ensure a clean state.
-- CORRECTED ORDER: First drop tables that have foreign keys, then drop the tables they reference.
DROP TABLE IF EXISTS date_feedback;
DROP TABLE IF EXISTS user_tutorials;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS dates;
DROP TABLE IF EXISTS attractions;
DROP TABLE IF EXISTS calendar_day;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS advertisements;
DROP TABLE IF EXISTS tutorials;
DROP TABLE IF EXISTS user_blocks; -- ✅ NAYA: Block table ko drop list mein add kiya
-- Drop the 'users' table LAST, because many other tables depend on it.
DROP TABLE IF EXISTS users;

-- Drop custom types if they exist
DROP TYPE IF EXISTS status_type;
DROP TYPE IF EXISTS transaction_type;
DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS date_outcome_type;


-- =================================================================
-- RECREATING TYPES AND TABLES
-- =================================================================

-- Step 1: Create Custom Types first
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_type') THEN
        CREATE TYPE status_type AS ENUM ('unscheduled', 'pending', 'approved', 'declined', 'cancelled', 'completed');
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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'date_outcome_type') THEN
        CREATE TYPE date_outcome_type AS ENUM ('amazing', 'stood_up', 'cancelled', 'other');
    END IF;
END $$;


-- Step 2: Create Tables that don't depend on others
-- USERS Table (Created first)
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,
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
    tokens INTEGER DEFAULT 100,
    fcm_token VARCHAR(255) NULL,
    referral_source VARCHAR(255) DEFAULT NULL
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


-- Step 3: Create Tables that depend on USERS
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status notification_status NOT NULL DEFAULT 'unread',
    related_entity_id VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    proposing_user_id VARCHAR(255),
    notified_user_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (proposing_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (notified_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

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

-- ATTRACTIONS Table (RENAMED)
CREATE TABLE attractions (
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

-- ✅ =================================================================
-- ✅ NEW TABLE FOR BLOCKING USERS
-- ✅ =================================================================
CREATE TABLE user_blocks (
    blocker_id VARCHAR(255) NOT NULL,
    blocked_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for faster lookups on block checks
CREATE INDEX idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked_id ON user_blocks(blocked_id);


-- Step 4: Create tables that depend on both USERS and TUTORIALS
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

CREATE TABLE date_feedback (
    feedback_id SERIAL PRIMARY KEY,
    date_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    outcome date_outcome_type NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_date
        FOREIGN KEY(date_id) 
        REFERENCES dates(date_id)
        ON DELETE CASCADE,
        
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_date_user UNIQUE (date_id, user_id)
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