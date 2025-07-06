import pytest
import requests
import sys

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

    # Clear previous date data
    cur.execute(
        "DELETE FROM dates WHERE (user_from = 'user123' AND user_to = 'user456') "
        "OR (user_from = 'user456' AND user_to = 'user123') AND date = '2024-01-01';"
    )

    # Clear previous user data
    cur.execute("DELETE FROM users WHERE user_id IN ('user123', 'user456');")

    # Insert test users if they do not exist
    users_to_insert = [
        (
            'user123', 'John', 'Doe', 'http://example.com/profile.jpg', 'http://example.com/video.mp4',
            '12345', '{"sticker1": "value1"}', True
        ),
        (
            'user456', 'Jane', 'Doe', 'http://example.com/profile2.jpg', 'http://example.com/video2.mp4',
            '54321', '{"sticker2": "value2"}', True
        )
    ]
    for user_id, first_name, last_name, profile_picture_url, video_url, zipcode, stickers, enable_notifications in users_to_insert:
        cur.execute(
            """
            INSERT INTO users (user_id, first_name, last_name, profile_picture_url, video_url, zipcode, stickers, enable_notifications)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id) DO NOTHING
            """,
            (user_id, first_name, last_name, profile_picture_url, video_url, zipcode, stickers, enable_notifications)
        )

    db_conn.commit()

    yield

    # Clear test date data after test
    cur.execute(
        "DELETE FROM dates WHERE (user_from = 'user123' AND user_to = 'user456') "
        "OR (user_from = 'user456' AND user_to = 'user123') AND date = '2024-01-01';"
    )
    # Remove test users
    cur.execute("DELETE FROM users WHERE user_id IN ('user123', 'user456');")
    db_conn.commit()
    cur.close()

# Function to simulate patching data to update or create a date
def post_create_date(url, date_data, expected_status_code):
    headers = {
        'Content-Type': 'application/json',
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }
    response = requests.post(url, json=date_data, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

# Test function for updating a date
@pytest.mark.usefixtures("setup_test_data")
def test_create_date():
    url = "http://localhost:3000/date"
    # Test data for a date that does not exist yet
    new_date = {
        "date": "2024-01-01",
        "time": "18:00",
        "userFrom": "user123",
        "userTo": "user456",
        "locationMetadata": {
            "address": "1234 Test St",
            "city": "Testville",
            "state": "TS"
        }
    }
    
    # Test creating a new date entry
    response_data = post_create_date(url, new_date, 201)
    # Update assertion to reflect the actual response
    print("Response Data (Create):", response_data)  # Debugging print statement
    assert response_data['date'] == new_date['date'], "Failed to create new date entry"
    assert response_data['userFrom'] == new_date['userFrom'], "Failed to create new date entry"
    assert response_data['userTo'] == new_date['userTo'], "Failed to create new date entry"
    assert response_data['locationMetadata'] == new_date['locationMetadata'], "Failed to create new date entry"
    assert response_data['status'] == 'unscheduled', "Failed to create new date entry"
    assert response_data['userFromApproved'] == False, "Failed to create new date entry"
    assert response_data['userToApproved'] == False, "Failed to create new date entry"

    # Update the existing date entry
    created_date = new_date.copy()
    created_date['time'] = "20:00"  # Change the time for the update
    response_update = post_create_date(url, created_date, 400)
    assert response_update['message'] == 'Date already exists', "Attempt to create an already existing date should have been stopped"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([sys.argv[0]])
