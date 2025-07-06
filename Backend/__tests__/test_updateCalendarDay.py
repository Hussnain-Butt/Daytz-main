import pytest
import requests
import sys
from datetime import datetime

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

    # Clear previous calendar day data
    cur.execute(
        "DELETE FROM calendar_day WHERE user_id = '123' AND date = '2024-01-01';"
    )

    # Clear previous user data
    cur.execute("DELETE FROM users WHERE user_id = '123';")

    # Insert test user if it does not exist
    user_data = (
        '123', 'John', 'Doe', 'http://example.com/profile.jpg', 'http://example.com/video.mp4',
        '12345', '{"sticker1": "value1"}', True
    )
    cur.execute(
        """
        INSERT INTO users (user_id, first_name, last_name, profile_picture_url, video_url, zipcode, stickers, enable_notifications)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id) DO NOTHING
        """,
        user_data
    )

    # Insert test calendar day
    calendar_day_data = (
        '123', '2024-01-01', 'http://example.com/video.mp4'
    )
    cur.execute(
        """
        INSERT INTO calendar_day (user_id, date, user_video_url)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id, date) DO NOTHING
        """,
        calendar_day_data
    )

    db_conn.commit()

    yield

    # Clear test data after test
    cur.execute(
        "DELETE FROM calendar_day WHERE user_id = '123' AND date = '2024-01-01';"
    )
    cur.execute("DELETE FROM users WHERE user_id = '123';")
    db_conn.commit()
    cur.close()

# Function to simulate patching data to update a calendar day
def patch_update_calendar_day(url, calendar_day_data, expected_status_code):
    headers = {
        "Authorization": "Bearer test-123"  # Test token for user 123
    }
    response = requests.patch(url, json=calendar_day_data, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

# Test function for updating a calendar day
@pytest.mark.usefixtures("setup_test_data")
def test_update_calendar_day():
    url = "http://localhost:3000/calendarDays"
    # Test data for updating an existing calendar day
    updated_calendar_day = {
        "userId": "123",
        "date": "2024-01-01",
        "userVideoUrl": "http://example.com/updated_video.mp4",
    }

    # Test updating the calendar day entry
    response_data = patch_update_calendar_day(url, updated_calendar_day, 200)
    print("Response Data (Update):", response_data)  # Debugging print statement
    assert response_data['message'] == 'Calendar day updated successfully', "Failed to update calendar day"
    assert response_data['calendarDay']['userVideoUrl'] == updated_calendar_day['userVideoUrl'], "Failed to update calendar day entry with correct userVideoUrl"
    
    # Attempt to update a non-existent calendar day
    non_existent_calendar_day_update = {
        "userId": "123",
        "date": "2024-01-02",  # Different date to ensure it doesn't exist
        "userVideoUrl": "http://example.com/updated_video.mp4",
    }
    response_non_existent_update = patch_update_calendar_day(url, non_existent_calendar_day_update, 404)
    assert response_non_existent_update['message'] == 'Calendar day not found', "Attempt to update a non-existent calendar day should return an error"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([__file__])
