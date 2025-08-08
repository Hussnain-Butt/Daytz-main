import pytest
import requests
import json
from datetime import datetime

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

    # Clear previous user and date data
    cur.execute("SELECT delete_user_cascade('user123');")
    cur.execute("SELECT delete_user_cascade('user456');")

    # Insert test users
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

    # Insert test date
    cur.execute(
        """
        INSERT INTO dates (user_from, user_to, date, location_metadata, status, user_from_approved, user_to_approved)
        VALUES ('user123', 'user456', '2024-01-01', '{"address": "456 first ave", "city": "Originaville", "state": "CA"}', 'pending', true, false)
        ON CONFLICT (user_from, user_to, date) DO NOTHING
        """
    )

    db_conn.commit()

    yield

    # Clear test data after test
    cur.execute("SELECT delete_user_cascade('user123');")
    cur.execute("SELECT delete_user_cascade('user456');")
    db_conn.commit()
    cur.close()

def get_date(url, headers, expected_status_code):
    response = requests.get(url, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

@pytest.mark.usefixtures("setup_test_data")
def test_get_date():
    base_url = "http://localhost:3000/date"
    user_from = "user123"
    user_to = "user456"
    date = "2024-01-01"
    url = f"{base_url}/{user_from}/{user_to}/{date}"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }

    # Test getting the date
    response_data = get_date(url, headers, 200)
    print("Response Data (Get Date):", response_data)  # Debugging print statement
    response_date = datetime.fromisoformat(response_data['date']).date().isoformat()
    assert response_date == date, "Failed to get date entry with correct date"
    assert response_data['userFrom'] == user_from, "Failed to get date entry with correct userFrom"
    assert response_data['userTo'] == user_to, "Failed to get date entry with correct userTo"
    assert response_data['locationMetadata'] == {"address": "456 first ave", "city": "Originaville", "state": "CA"}, "Failed to get date entry with correct locationMetadata"
    assert response_data['status'] == 'pending', "Failed to get date entry with correct status"

    # Test unauthorized access
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-user789"  # Test token for a different user
    }
    unauthorized_response_data = get_date(url, headers, 403)
    assert unauthorized_response_data['message'] == "Unauthorized to get another user's date", "Unauthorized access not handled correctly"

    # Test non-existent date
    url_non_existent = f"{base_url}/{user_from}/{user_to}/2024-01-02"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }
    non_existent_response_data = get_date(url_non_existent, headers, 404)
    assert non_existent_response_data['message'] == "Date not found", "Non-existent date not handled correctly"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([__file__])
