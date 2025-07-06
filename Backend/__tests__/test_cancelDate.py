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

    cur.execute(
        """
        INSERT INTO dates (user_from, user_to, date, location_metadata, status)
        VALUES ('user123', 'user456', '2024-01-01', '{"address": "1234 Test St", "city": "Testville", "state": "TS"}', 'unscheduled')
        ON CONFLICT (user_from, user_to, date) DO NOTHING
        """
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

# Function to simulate patching data to cancel a date
def patch_cancel_date(url, headers, expected_status_code):
    response = requests.patch(url, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

# Test function for cancelling a date
@pytest.mark.usefixtures("setup_test_data")
def test_cancel_date():
    user_to = "user456"
    date = "2024-01-01"
    url = f"http://localhost:3000/date/cancel/{user_to}/{date}"
    
    headers = {
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }

    # Test cancelling the date
    response_data = patch_cancel_date(url, headers, 200)
    print("Response Data (Cancel):", response_data)  # Debugging print statement
    assert response_data['status'] == 'cancelled', "Failed to cancel the date"

    # Test cancelling the already cancelled date
    response_data_already_cancelled = patch_cancel_date(url, headers, 400)
    print("Response Data (Already Cancelled):", response_data_already_cancelled)  # Debugging print statement
    assert response_data_already_cancelled['message'] == 'Date is already cancelled', "Failed to handle already cancelled date"

    # Test cancelling a non-existent date
    url_non_existent = f"http://localhost:3000/date/cancel/{user_to}/2024-01-02"
    response_data_non_existent = patch_cancel_date(url_non_existent, headers, 404)
    print("Response Data (Non-Existent):", response_data_non_existent)  # Debugging print statement
    assert response_data_non_existent['message'] == 'Date not found', "Failed to handle non-existent date"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([sys.argv[0]])
