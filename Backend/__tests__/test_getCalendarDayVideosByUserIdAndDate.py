import pytest
import requests

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

    # Clear previous calendar day data
    cur.execute(
        "DELETE FROM calendar_day WHERE user_id IN ('123', '124', '125', '126') AND date IN ('2024-01-01', '2024-01-02');"
    )

    # Clear previous user data
    cur.execute("DELETE FROM users WHERE user_id IN ('123', '124', '125', '126');")

    # Insert test users if they do not exist
    users_to_insert = [
        (
            '123', 'John', 'Doe', 'http://example.com/profile.jpg', 'http://example.com/video.mp4',
            '96701', '{"sticker1": "value1"}', True
        ),
        (
            '124', 'Jane', 'Doe', 'http://example.com/profile2.jpg', 'http://example.com/video2.mp4',
            '96701', '{"sticker2": "value2"}', True
        ),
        (
            '125', 'Alice', 'Smith', 'http://example.com/profile3.jpg', 'http://example.com/video3.mp4',
            '96782', '{"sticker3": "value3"}', True
        ),
        (
            '126', 'Bob', 'Brown', 'http://example.com/profile4.jpg', 'http://example.com/video4.mp4',
            '95950', '{"sticker4": "value4"}', True
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

    # Insert test calendar day videos
    calendar_day_videos = [
        ('123', '2024-01-01', 'http://example.com/calendar_video_123.mp4'),
        ('124', '2024-01-01', 'http://example.com/calendar_video_124.mp4'),
        ('125', '2024-01-01', 'http://example.com/calendar_video_125.mp4'),
        ('126', '2024-01-01', 'http://example.com/calendar_video_126.mp4'),  # Different zip code
        ('124', '2024-01-02', 'http://example.com/calendar_video_124_2024-01-02.mp4')  # Different date
    ]
    for user_id, date, user_video_url in calendar_day_videos:
        cur.execute(
            """
            INSERT INTO calendar_day (user_id, date, user_video_url)
            VALUES (%s, %s, %s)
            """,
            (user_id, date, user_video_url)
        )

    db_conn.commit()

    yield

    # Clear test data after test
    cur.execute(
        "DELETE FROM calendar_day WHERE user_id IN ('123', '124', '125', '126') AND date IN ('2024-01-01', '2024-01-02');"
    )
    cur.execute("DELETE FROM users WHERE user_id IN ('123', '124', '125', '126');")
    db_conn.commit()
    cur.close()

# Function to simulate getting videos for a calendar day by userId and date
def get_calendar_day_videos_by_user_id_and_date(url, headers, expected_status_code):
    response = requests.get(url, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

# Test function for getting calendar day videos by userId and date
@pytest.mark.usefixtures("setup_test_data")
def test_get_calendar_day_videos_by_user_id_and_date():
    url = "http://localhost:3000/calendarDays/videos/123/2024-01-01"
    headers = {
        "Authorization": "Bearer test-123"  # Test token for user 123
    }

    # Test getting the calendar day videos
    response_data = get_calendar_day_videos_by_user_id_and_date(url, headers, 200)
    print("Response Data (Get Calendar Day Videos):", response_data)  # Debugging print statement

    assert 'filteredUserVideos' in response_data, "Filtered user videos not found in response"
    assert response_data['message'] == 'User videos found', "Failed to retrieve user videos"
    
    filtered_user_videos = response_data['filteredUserVideos']
    
    # Check that user's own video is not in the response
    assert 'http://example.com/calendar_video_123.mp4' not in filtered_user_videos, "User's own video should not be in the response"
    
    # Check that videos for the correct date and within the same zipcode range are returned
    assert 'http://example.com/calendar_video_124.mp4' in filtered_user_videos, "User 124's video should be in the response"
    assert 'http://example.com/calendar_video_125.mp4' in filtered_user_videos, "User 125's video should be in the response"
    
    # Check that videos for the wrong zipcode are not returned
    assert 'http://example.com/calendar_video_126.mp4' not in filtered_user_videos, "User 126's video should not be in the response"
    
    # Check that videos for the wrong date are not returned
    assert 'http://example.com/calendar_video_124_2024-01-02.mp4' not in filtered_user_videos, "User 124's video for a different date should not be in the response"

    # Test getting videos for a non-existent user
    non_existent_user_url = "http://localhost:3000/calendarDays/videos/999/2024-01-01"
    get_calendar_day_videos_by_user_id_and_date(non_existent_user_url, headers, 404)

    # Test getting videos for a non-existent date
    non_existent_date_url = "http://localhost:3000/calendarDays/videos/123/2024-01-03"  # Different date to ensure it doesn't exist
    get_calendar_day_videos_by_user_id_and_date(non_existent_date_url, headers, 404)

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([__file__])
