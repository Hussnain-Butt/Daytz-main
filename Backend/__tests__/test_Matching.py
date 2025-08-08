import pytest
import psycopg2
import requests
import os
from dotenv import load_dotenv
import sys
from test_setup_helpers import setup_test_data, teardown_test_data, default_users_data, default_calendar_days_data

@pytest.fixture()
def setup_and_teardown(db_conn):
    setup_test_data(db_conn, users_data=default_users_data, calendar_days_data=default_calendar_days_data)
    print("Setting up test data from test file...")
    yield
    print("Tearing down test data from test file...")
    teardown_test_data(db_conn, users_data=default_users_data)

# Load environment variables from .env file
load_dotenv()

# # Database setup
# def setup_module(module):
#     """ Setup for the entire module """
#     global conn
#     conn = psycopg2.connect(
#         dbname=os.getenv("DB_NAME"),
#         user=os.getenv("DB_USER"),
#         password=os.getenv("DB_PASSWORD"),
#         host=os.getenv("DB_HOST"),
#         port=os.getenv("DB_PORT"),
#     )
#     cur = conn.cursor()
#     # Clear previous data
#     cur.execute("SELECT delete_user_cascade('123');")
#     cur.execute("SELECT delete_user_cascade('124');")
#     # insert records for user 123 and user 124
#     cur.execute("INSERT INTO users (user_id, first_name, last_name, profile_picture_url, video_url, zipcode, stickers, enable_notifications) "
#                 "VALUES ('123', 'Tester', 'Testtest', 'http://example.com/profile.jpg', 'http://example.com/video.mp4', '12345', '{}', true);")
#     cur.execute("INSERT INTO users (user_id, first_name, last_name, profile_picture_url, video_url, zipcode, stickers, enable_notifications) "
#                 "VALUES ('124', 'Testera', 'Testa', 'http://example.com/profile2.jpg', 'http://example.com/video2.mp4', '54321', '{}', true);")
#     # Insert a calendar_day record
#     cur.execute("INSERT INTO calendar_day (date, user_id) VALUES ('2024-01-01', '123');")
#     cur.execute("INSERT INTO calendar_day (date, user_id) VALUES ('2024-01-01', '124');")
#     conn.commit()

# def teardown_module(module):
#     """ Teardown for the entire module """
#     cur = conn.cursor()
#     # Clear test data
#     cur.execute("SELECT delete_user_cascade('123');")
#     cur.execute("SELECT delete_user_cascade('124');")
#     conn.commit()
#     conn.close()

def post_create_attraction(url, attraction_data, headers, expected_status_code):
    response = requests.post(url, json=attraction_data, headers=headers)
    print("Response Status Code:", response.status_code)  # Debugging print statement
    print("Response JSON:", response.json())  # Debugging print statement
    assert response.status_code == expected_status_code
    return response.json()

@pytest.mark.usefixtures("setup_and_teardown")
def test_full_matching(db_conn):
    """ Test the full matching process """
    url = "http://localhost:3000/attraction"
    headers_user_123 = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-123"  # Test token for user 123
    }
    headers_user_124 = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-124"  # Test token for user 124
    }

    # User 123 sends an attraction to User 124
    attraction1 = {
        "userFrom": "123",
        "userTo": "124",
        "date": "2024-05-01",
        "romanticRating": 3,
        "sexualRating": 3,
        "friendshipRating": 0
    }
    response1 = post_create_attraction(url, attraction1, headers_user_123, 201)

    # User 124 sends an attraction to User 123
    attraction2 = {
        "userFrom": "124",
        "userTo": "123",
        "date": "2024-05-01",
        "romanticRating": 3,
        "sexualRating": 3,
        "friendshipRating": 0
    }
    response2 = post_create_attraction(url, attraction2, headers_user_124, 201)

    # Verify that the attractions are matched correctly
    cur = db_conn.cursor()
    # the attraction from the original user should update once the other user sends an attraction
    cur.execute("SELECT result FROM attraction WHERE user_from = '123' AND user_to = '124'")
    result1 = cur.fetchone()[0]
    result2 = response2['result']

    assert result1 == result2, "Matching results do not align"
    assert result1 is not None, "No result computed, expected matching results"

if __name__ == "__main__":
    pytest.main([sys.argv[0]])