import pytest
import requests
import os

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

    # Clear previous calendar day data
    cur.execute(
        "DELETE FROM calendar_day WHERE user_id = 'user123' AND date = '2024-01-01';"
    )

    # Clear previous user data
    cur.execute("DELETE FROM users WHERE user_id = 'user123';")

    # Insert test user if it does not exist
    user_data = (
        'user123', 'John', 'Doe', 'http://example.com/profile.jpg', 'http://example.com/video.mp4',
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

    # Insert test calendar day if it does not exist
    calendar_day_to_insert = (
        'user123', '2024-01-01', None
    )
    cur.execute(
        """
        INSERT INTO calendar_day (user_id, date, user_video_url)
        VALUES (%s, %s, %s)
        ON CONFLICT (user_id, date) DO NOTHING
        """,
        calendar_day_to_insert
    )

    db_conn.commit()

    yield

    # Clear test data after test
    cur.execute(
        "DELETE FROM calendar_day WHERE user_id = 'user123' AND date = '2024-01-01';"
    )
    cur.execute("DELETE FROM users WHERE user_id = 'user123';")
    db_conn.commit()
    cur.close()

# Function to simulate posting a video file
def post_calendar_video(url, video_path, form_data, expected_status_code):
    headers = {
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }
    files = {
        'video': open(video_path, 'rb')
    }
    try:
        response = requests.post(url, files=files, data=form_data, headers=headers)
        assert response.status_code == expected_status_code
        return response.json()
    finally:
        files['video'].close()

# Function to simulate deleting a calendar video
def delete_calendar_video(url, data, expected_status_code):
    headers = {
        'Content-Type': 'application/json',
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }
    response = requests.delete(url, json=data, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

# Test function for uploading and then deleting a calendar video
@pytest.mark.usefixtures("setup_test_data")
def test_upload_and_delete_calendar_video():
    upload_url = "http://localhost:3000/users/calendarVideos"
    delete_url = "http://localhost:3000/users/calendarVideos/2024-01-01"
    date = "2024-01-01"

    # Upload a test video
    video_path = os.path.join('BE-Daytz', '__tests__', 'testvideos', 'testVideo1.mp4')
    form_data = {"date": date}
    response_upload = post_calendar_video(upload_url, video_path, form_data, 200)
    print("Response Data (Upload):", response_upload)  # Debugging print statement
    assert response_upload['message'] == 'Video uploaded successfully', "Failed to upload video"
    assert 'videoUrl' in response_upload, "Response should contain video URL"

    # Delete the uploaded video
    delete_data = {"date": date}
    response_delete = delete_calendar_video(delete_url, delete_data, 200)
    print("Response Data (Delete):", response_delete)  # Debugging print statement
    assert response_delete['message'] == 'Calendar day updated successfully', "Failed to delete calendar video"

    # Verify the video URL is set to null
    calendar_day_url = f"http://localhost:3000/calendarDays/user123/{date}"
    response_calendar_day = requests.get(calendar_day_url, headers={
        'Content-Type': 'application/json',
        "Authorization": "Bearer test-user123"  # Test token for user 123
    })
    assert response_calendar_day.status_code == 200, f"Failed to get calendar day, status code: {response_calendar_day.status_code}"
    calendar_day_data = response_calendar_day.json()
    print("Calendar Day Data:", calendar_day_data)  # Debugging print statement

    # Check if 'userVideoUrl' is in the response and is set to null
    assert 'calendarDay' in calendar_day_data, "Response does not contain 'calendarDay'"
    assert calendar_day_data['calendarDay']['userVideoUrl'] is None, "Failed to set userVideoUrl to null"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([__file__])
