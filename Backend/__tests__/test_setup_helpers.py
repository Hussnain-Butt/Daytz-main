# test_setup_helpers.py
import pytest
import logging

default_users_data = [
    {
        'user_id': '123',
        'first_name': 'John',
        'last_name': 'Doe',
        'profile_picture_url': 'http://example.com/profile.jpg',
        'video_url': 'http://example.com/video.mp4',
        'zipcode': '12345',
        'stickers': '{"sticker1": "value1"}',
        'enable_notifications': True,
    },
    {
        'user_id': '124',
        'first_name': 'Jane',
        'last_name': 'Doe',
        'profile_picture_url': 'http://example.com/profile2.jpg',
        'video_url': 'http://example.com/video2.mp4',
        'zipcode': '54321',
        'stickers': '{"sticker2": "value2"}',
        'enable_notifications': True,
    }
]

default_calendar_days_data = [
    {'user_id': '123', 'date': '2024-05-01', 'user_video_url': 'https://vimeo.com/926973062'},
    {'user_id': '124', 'date': '2024-05-01', 'user_video_url': 'https://vimeo.com/921388669'}
]

def delete_user_cascade(cur, user_id):
    cur.execute(f"SELECT delete_user_cascade('{user_id}');")

def insert_initial_transaction(cur, user_id='123', transaction_type='replenishment', token_amount=50, amount_usd=0, description='Initial tokens'):
    cur.execute(
        """
        INSERT INTO transactions (user_id, transaction_type, token_amount, amount_usd, description)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (user_id, transaction_type, token_amount, amount_usd, description)
    )

def insert_test_user(cur, user_id='123', first_name='John', last_name='Doe', profile_picture_url='http://example.com/profile.jpg', video_url='http://example.com/video.mp4', zipcode='12345', stickers='{"sticker1": "value1"}', enable_notifications=True, initial_token_amount=50):
    cur.execute(
        """
        INSERT INTO users (user_id, first_name, last_name, profile_picture_url, video_url, zipcode, stickers, enable_notifications)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id) DO NOTHING
        """,
        (user_id, first_name, last_name, profile_picture_url, video_url, zipcode, stickers, enable_notifications)
    )
    insert_initial_transaction(cur, user_id=user_id, token_amount=initial_token_amount)

def insert_calendar_day(cur, user_id='123', date='2024-01-01', user_video_url='http://example.com/video.mp4'):
    cur.execute(
        """
        INSERT INTO calendar_day (user_id, date, user_video_url)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id, date) DO NOTHING
        """,
        (user_id, date, user_video_url)
    )

def insert_attraction(cur, user_from='123', user_to='456', date='2024-01-01', romantic_rating=1, sexual_rating=1, friendship_rating=1):
    logging.info("Inserting attraction data into test database...")
    logging.info(user_from, user_to, date, romantic_rating, sexual_rating, friendship_rating)
    cur.execute(
        """
        INSERT INTO attraction (user_from, user_to, date, romantic_rating, sexual_rating, friendship_rating)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_from, user_to, date) DO NOTHING
        """,
        (user_from, user_to, date, romantic_rating, sexual_rating, friendship_rating)
    )

def insert_date(cur, user_from='123', user_to='456', date='2024-01-01', location_metadata='{"address": "123 street", "city": "Cityville", "state": "CA"}', status='pending', user_from_approved=True, user_to_approved=False):
    cur.execute(
        """
        INSERT INTO dates (user_from, user_to, date, location_metadata, status, user_from_approved, user_to_approved)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_from, user_to, date) DO NOTHING
        """,
        (user_from, user_to, date, location_metadata, status, user_from_approved, user_to_approved)
    )

def setup_test_data(db_conn, users_data=None, calendar_days_data=None, attraction_data=None, dates_data=None):
    cur = db_conn.cursor()
    if users_data is None:
        print("No users data provided")
        return
    
    # Delete users before insertion
    for user_data in users_data:
        delete_user_cascade(cur, user_data['user_id'])

    # Insert data
    for user_data in users_data:
        insert_test_user(cur, **user_data)

    if calendar_days_data:
        for calendar_day_data in calendar_days_data:
            insert_calendar_day(cur, **calendar_day_data)

    if attraction_data:
        for attraction in attraction_data:
            insert_attraction(cur, **attraction)

    if dates_data:
        for date_data in dates_data:
            insert_date(cur, **date_data)

    db_conn.commit()

def teardown_test_data(db_conn, users_data):
    cur = db_conn.cursor()
    for user_data in users_data:
        delete_user_cascade(cur, user_data['user_id'])
    db_conn.commit()
    cur.close()

def get_user_tokens(db_conn, user_id):
    cur = db_conn.cursor()
    cur.execute("SELECT SUM(token_amount) as total_tokens FROM transactions WHERE user_id = %s", (user_id,))
    return cur.fetchone()[0]
