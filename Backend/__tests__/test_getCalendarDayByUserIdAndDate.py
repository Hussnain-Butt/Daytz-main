import pytest
import requests
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
    cur.execute("DELETE FROM users WHERE user_id IN ('123', '124');")

    # Insert test users if they do not exist
    users_to_insert = [
        (
            '123', 'John', 'Doe', 'http://example.com/profile.jpg', 'http://example.com/video.mp4',
            '12345', '{"sticker1": "value1"}', True
        ),
        (
            '124', 'Jane', 'Doe', 'http://example.com/profile2.jpg', 'http://example.com/video2.mp4',
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

    # Insert test calendar day
    calendar_day_data = (
        '123', '2024-01-01', 'http://example.com/calendar_video.mp4'
    )
    cur.execute(
        """
        INSERT INTO calendar_day (user_id, date, user_video_url)
        VALUES (%s, %s, %s)
        """,
        calendar_day_data
    )

    db_conn.commit()

    yield

    # Clear test data after test
    cur.execute(
        "DELETE FROM calendar_day WHERE user_id = '123' AND date = '2024-01-01';"
    )
    cur.execute("DELETE FROM users WHERE user_id IN ('123', '124');")
    db_conn.commit()
    cur.close()

# Function to simulate getting data for a calendar day by userId and date
def get_calendar_day_by_user_id_and_date(url, headers, expected_status_code):
    response = requests.get(url, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

# Test function for getting a calendar day by userId and date
@pytest.mark.usefixtures("setup_test_data")
def test_get_calendar_day_by_user_id_and_date():
    url = "http://localhost:3000/calendarDays/123/2024-01-01"
    headers = {
        "Authorization": "Bearer test-123"  # Test token for user 123
    }

    # Test getting the calendar day
    response_data = get_calendar_day_by_user_id_and_date(url, headers, 200)
    print("Response Data (Get Calendar Day):", response_data)  # Debugging print statement

    assert response_data['calendarDay']['userId'] == '123', "Failed to retrieve calendar day entry with correct userId"
    response_date = datetime.fromisoformat(response_data['calendarDay']['date']).date().isoformat()
    assert response_date == '2024-01-01', "Failed to retrieve calendar day entry with correct date"
    assert response_data['calendarDay']['userVideoUrl'] == 'http://example.com/calendar_video.mp4', "Failed to retrieve calendar day entry with correct userVideoUrl"

    # Test getting a non-existent calendar day
    non_existent_url = "http://localhost:3000/calendarDays/123/2024-01-02"  # Different date to ensure it doesn't exist
    response_non_existent = get_calendar_day_by_user_id_and_date(non_existent_url, headers, 404)
    assert response_non_existent['message'] == 'Calendar day not found', "Attempt to get a non-existent calendar day should return an error"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([__file__])
