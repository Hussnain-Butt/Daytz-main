import pytest
import requests
from datetime import datetime

API_URL = "http://localhost:3000/calendarDays"

# Setup the headers to simulate the authorization token
headers_valid_user_123 = {
    "Authorization": "Bearer test-123",
    "Content-Type": "application/json"
}

# Test data for a calendar day
calendar_day_data_valid = {
    "date": "2024-01-01",
    "userVideoUrl": "http://example.com/video.mp4",
}

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

    # Clear previous calendar day data
    cur.execute(
        "DELETE FROM calendar_day WHERE user_id = '123' AND date = '2024-01-01';"
    )

    # Clear previous user data
    cur.execute("DELETE FROM users WHERE user_id IN ('123');")

    # Insert test users if they do not exist
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

    db_conn.commit()

    yield

    # Clear test data after test
    cur.execute(
        "DELETE FROM calendar_day WHERE user_id = '123' AND date = '2024-01-01';"
    )
    cur.execute("DELETE FROM users WHERE user_id = '123';")
    db_conn.commit()
    cur.close()

# Function to simulate posting data to create a calendar day
def post_create_calendar_day(url, calendar_day_data, expected_status_code):
    headers = {
        "Authorization": "Bearer test-123"  # Test token for user 123
    }
    response = requests.post(url, json=calendar_day_data, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

# Test function for creating a calendar day
@pytest.mark.usefixtures("setup_test_data")
def test_create_calendar_day():
    url = API_URL
    # Test creating a new calendar day entry
    response_data = post_create_calendar_day(url, calendar_day_data_valid, 201)
    print("Response Data (Create):", response_data)  # Debugging print statement
    
    # Normalize date format to match expected format
    response_date = datetime.fromisoformat(response_data['date']).date().isoformat()
    
    assert response_date == calendar_day_data_valid['date'], "Failed to create new calendar day entry with correct date"
    assert response_data['userId'] == '123', "Failed to create new calendar day entry with correct userId"
    assert response_data['userVideoUrl'] == calendar_day_data_valid['userVideoUrl'], "Failed to create new calendar day entry with correct userVideoUrl"

    # Test creating a calendar day that already exists
    response_data_existing = post_create_calendar_day(url, calendar_day_data_valid, 400)
    print("Response Data (Existing):", response_data_existing)  # Debugging print statement
    assert response_data_existing['message'] == 'Calendar day already exists', "Failed to handle existing calendar day creation correctly"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([__file__])