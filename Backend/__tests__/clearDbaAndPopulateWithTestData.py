import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def db_conn():
    """Setup for the database connection"""
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
    )

def clear_and_populate_db():
    # SQL script to clear and populate the database
    sql_script = """
    -- Clear existing data
    TRUNCATE TABLE users, attraction, calendar_day, dates, transactions, advertisements, tutorials, user_tutorials RESTART IDENTITY CASCADE;

    -- Insert sample data into users table
    INSERT INTO users (user_id, first_name, last_name, profile_picture_url, video_url, zipcode)
    VALUES 
    ('223', 'John', 'Doe', 'https://example.com/johndoe.jpg', 'https://vimeo.com/926973062', '99685'),
    ('224', 'Jane', 'Smith', 'https://daytzbucket1.s3.us-west-1.amazonaws.com/jpg_44-2+(1).jpg', 'https://vimeo.com/921388669', '99692'),
    ('225', 'Alice', 'Johnson', 'https://example.com/alicejohnson.jpg', NULL, '99638'),
    ('226', 'Bob', 'Brown', 'https://example.com/bobbrown.jpg', 'https://vimeo.com/926973062', '99685'),
    ('227', 'Charlie', 'Davis', 'https://example.com/charliedavis.jpg', 'https://vimeo.com/921388669', '99692'),
    ('228', 'David', 'Green', 'https://example.com/davidgreen.jpg', 'https://vimeo.com/926973062', '99685'),
    ('229', 'Eve', 'White', 'https://example.com/evewhite.jpg', 'https://vimeo.com/921388669', '99692');

    -- Insert sample data into calendar_day table
    INSERT INTO calendar_day (user_id, date, user_video_url)
    VALUES 
    ('223', '2024-05-01', 'https://vimeo.com/926973062'),
    ('224', '2024-05-02', 'https://vimeo.com/921388669'),
    ('225', '2024-05-03', NULL),
    ('226', '2024-05-04', 'https://vimeo.com/926973062'),
    ('227', '2024-05-05', 'https://vimeo.com/921388669');

    -- Insert sample data into attraction table
    INSERT INTO attraction (date, user_from, user_to, romantic_rating, sexual_rating, friendship_rating, long_term_potential, intellectual, emotional, result, first_message_rights)
    VALUES 
    ('2024-01-01', '223', '224', 3, 3, 0, TRUE, TRUE, TRUE, TRUE, TRUE),
    ('2024-01-01', '224', '223', 3, 3, 0, TRUE, TRUE, TRUE, TRUE, TRUE),
    ('2024-01-01', '225', '223', 0, 0, 1, FALSE, FALSE, FALSE, FALSE, FALSE),
    ('2024-01-02', '226', '227', 2, 2, 1, TRUE, TRUE, TRUE, TRUE, TRUE),
    ('2024-01-03', '227', '226', 1, 1, 2, FALSE, TRUE, TRUE, TRUE, FALSE);

    -- Insert sample data into dates table
    INSERT INTO dates (date, time, user_from, user_to, user_from_approved, user_to_approved, location_metadata, status)
    VALUES 
    ('2024-06-01', '12:00:00+00', '223', '224', TRUE, TRUE, '{"location": "Central Park"}', 'completed'),
    ('2024-06-02', '13:00:00+00', '224', '225', FALSE, FALSE, '{"location": "Times Square"}', 'pending');

    -- Insert sample data into transactions table
    INSERT INTO transactions (user_id, transaction_type, token_amount, amount_usd)
    VALUES 
    ('223', 'purchase', 100, 10.0),
    ('224', 'purchase', 200, 20.0),
    ('225', 'purchase', 300, 30.0),
    ('226', 'purchase', 400, 40.0),
    ('227', 'purchase', 500, 50.0);

    -- Insert sample data into advertisements table
    INSERT INTO advertisements (video_url, metadata)
    VALUES 
    ('https://vimeo.com/926973062', '{"advertiser": "Company A"}'),
    ('https://vimeo.com/921388669', '{"advertiser": "Company B"}'),
    (NULL, '{"advertiser": "Company C"}'),
    ('https://vimeo.com/926973062', '{"advertiser": "Company D"}'),
    ('https://vimeo.com/921388669', '{"advertiser": "Company E"}');

    -- Insert sample data into tutorials table
    INSERT INTO tutorials (video_url, description)
    VALUES 
    ('https://vimeo.com/926973062', 'Tutorial 1 Description'),
    ('https://vimeo.com/921388669', 'Tutorial 2 Description'),
    (NULL, 'Tutorial 3 Description'),
    ('https://vimeo.com/926973062', 'Tutorial 4 Description'),
    ('https://vimeo.com/921388669', 'Tutorial 5 Description');

    -- Insert sample data into user_tutorials table
    INSERT INTO user_tutorials (user_id, tutorial_id, shown)
    VALUES 
    ('223', 1, TRUE),
    ('224', 2, FALSE),
    ('225', 3, TRUE),
    ('226', 4, FALSE),
    ('227', 5, TRUE);
    """

    conn = db_conn()
    cursor = conn.cursor()
    
    try:
        cursor.execute(sql_script)
        conn.commit()
        print("Database has been cleared and populated with sample data.")
    except Exception as e:
        conn.rollback()
        print(f"An error occurred: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    clear_and_populate_db()