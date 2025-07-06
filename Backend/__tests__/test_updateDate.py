import pytest
import requests
import sys
from datetime import datetime

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

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

    # Clear previous date data
    cur.execute(
        "DELETE FROM dates WHERE (user_from = 'user123' AND user_to = 'user456') "
        "OR (user_from = 'user456' AND user_to = 'user123') AND date IN ('2024-01-01', '2024-01-02');"
    )

    # Insert test dates if they do not exist
    dates_to_insert = [
        ('user123', 'user456', '2024-01-01', '{"address": "1234 Test St", "city": "Testville", "state": "TS"}', 'pending'),
        ('user123', 'user456', '2024-01-02', '{"address": "1234 Test St", "city": "Testville", "state": "TS"}', 'pending')
    ]
    for user_from, user_to, date, location_metadata, status in dates_to_insert:
        cur.execute(
            """
            INSERT INTO dates (user_from, user_to, date, location_metadata, status)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_from, user_to, date) DO NOTHING
            """,
            (user_from, user_to, date, location_metadata, status)
        )

    db_conn.commit()

    yield

    # Clear test date data after test
    cur.execute(
        "DELETE FROM dates WHERE (user_from = 'user123' AND user_to = 'user456') "
        "OR (user_from = 'user456' AND user_to = 'user123') AND date IN ('2024-01-01', '2024-01-02');"
    )
    # Remove test users
    cur.execute("DELETE FROM users WHERE user_id IN ('user123', 'user456');")
    db_conn.commit()
    cur.close()

# Function to simulate patching data to update or create a date
def patch_update_date(url, date_data, expected_status_code):
    headers = {
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }
    response = requests.patch(url, json=date_data, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

# Test function for updating a date
@pytest.mark.usefixtures("setup_test_data")
def test_update_date():
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
        },
        "userFromApproved": True,
        "userToApproved": False
    }
    
    # Test creating a new date entry
    response_data = patch_update_date(url, new_date, 200)
    print("Response Data (Update1):", response_data)  # Debugging print statement
    response_date = datetime.fromisoformat(response_data['date']).date().isoformat()
    assert response_date == new_date['date'], "Failed to update date entry with correct date"
    assert response_data['userFrom'] == new_date['userFrom'], "Failed to update date entry with correct userFrom"
    assert response_data['userTo'] == new_date['userTo'], "Failed to update date entry with correct userTo"
    assert response_data['locationMetadata'] == new_date['locationMetadata'], "Failed to update date entry with correct locationMetadata"
    assert response_data['userFromApproved'] == new_date['userFromApproved'], "Failed to update date entry with correct userFromApproved"
    assert response_data['userToApproved'] == new_date['userToApproved'], "Failed to update date entry with correct userToApproved"
    assert response_data['status'] == 'pending', "Failed to update date entry with correct status"

    # Test updating the existing date entry to complete it
    update_date = {
        "dateId": response_data['dateId'],
        "time": "20:00",
        "userFrom": "user123",
        "userTo": "user456",
        "locationMetadata": {
            "address": "5678 Test Ave",
            "city": "Newville",
            "state": "NV"
        },
        "userFromApproved": True,
        "userToApproved": True
    }
    response_update = patch_update_date(url, update_date, 200)
    print("Response Data (Update2):", response_update)  # Debugging print statement
    response_time = response_update['time'][:5]  # Extract just the HH:MM part
    assert response_update['dateId'] == response_data['dateId'], "Failed to update date entry with correct dateId"
    assert response_time == update_date['time'], "Failed to update date entry with correct time"
    assert response_update['locationMetadata'] == update_date['locationMetadata'], "Failed to update date entry with correct locationMetadata"
    assert response_update['userFromApproved'] == update_date['userFromApproved'], "Failed to update date entry with correct userFromApproved"
    assert response_update['userToApproved'] == update_date['userToApproved'], "Failed to update date entry with correct userToApproved"
    assert response_update['status'] == 'completed', "Failed to update date entry with correct status"

    # Test updating the existing date entry to change the status to pending
    update_pending = {
        "dateId": response_data['dateId'],
        "userFrom": "user123",
        "userTo": "user456",
        "userFromApproved": False,
    }
    response_pending = patch_update_date(url, update_pending, 200)
    print("Response Data (Pending):", response_pending)
    assert response_pending['dateId'] == response_data['dateId'], "Failed to update date entry with correct dateId"
    assert response_pending['status'] == 'pending', "Failed to update date entry with correct status"

    # Attempt to update a non-existent date
    non_existent_date_update = {
        "dateId": 99999,
        "time": "20:00",
        "userFrom": "user123",
        "userTo": "user456",
        "locationMetadata": {
            "address": "5678 Test Ave",
            "city": "Newville",
            "state": "NV"
        }
    }
    response_non_existent_update = patch_update_date(url, non_existent_date_update, 404)
    assert response_non_existent_update['message'] == 'No existing date found', "Attempt to update a non-existent date should return an error"

    # Update date to cancelled using '/date/cancel/:userTo/:date' for following test
    url_cancel = f"http://localhost:3000/date/cancel/{new_date['userTo']}/{new_date['date']}"
    patch_update_date(url_cancel, {}, 200)

    # Attempt to change a cancelled date
    update_cancelled = {
        "dateId": response_data['dateId'],
        "time": "20:00",
        "userFrom": "user123",
        "userTo": "user456",
        "locationMetadata": {
            "address": "5678 Test Ave",
            "city": "Newville",
            "state": "NV"
        }
    }
    response_cancelled_update = patch_update_date(url, update_cancelled, 400)
    assert response_cancelled_update['message'] == 'Cannot update a cancelled date', "Attempt to update a cancelled date should return an error"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([__file__])
