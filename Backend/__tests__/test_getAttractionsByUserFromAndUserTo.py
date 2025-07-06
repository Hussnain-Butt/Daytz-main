import pytest
import requests

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

    # Clear previous attraction data
    cur.execute(
        "DELETE FROM attraction WHERE (user_from = '123' AND user_to = '124') "
        "OR (user_from = '124' AND user_to = '123');"
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

    # Insert test attraction
    attraction_data = (
        '123', '124', '2024-01-01', 0, 3, 2, True, True, True, True, True
    )
    cur.execute(
        """
        INSERT INTO attraction (user_from, user_to, date, romantic_rating, sexual_rating, friendship_rating, long_term_potential, intellectual, emotional, result, first_message_rights)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        attraction_data
    )

    db_conn.commit()

    yield

    # Clear test data after test
    cur.execute(
        "DELETE FROM attraction WHERE (user_from = '123' AND user_to = '124') "
        "OR (user_from = '124' AND user_to = '123');"
    )
    cur.execute("DELETE FROM users WHERE user_id IN ('123', '124');")
    db_conn.commit()
    cur.close()

# Function to simulate getting data for attractions by userFrom and userTo
def get_attractions_by_user(url, headers, expected_status_code):
    response = requests.get(url, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

# Test function for getting attractions by userFrom and userTo
@pytest.mark.usefixtures("setup_test_data")
def test_get_attractions_by_user():
    url = "http://localhost:3000/attraction/123/124"
    headers = {
        "Authorization": "Bearer test-123"  # Test token for user 123
    }

    # Test getting the attraction
    response_data = get_attractions_by_user(url, headers, 200)
    print("Response Data (Get Attraction):", response_data)  # Debugging print statement

    assert len(response_data) > 0, "No attractions found"

    for attraction in response_data:
        assert attraction['userFrom'] == '123', "Failed to retrieve attraction entry with correct userFrom"
        assert attraction['userTo'] == '124', "Failed to retrieve attraction entry with correct userTo"
        assert attraction['date'] == '2024-01-01T08:00:00.000Z', "Failed to retrieve attraction entry with correct date"
        assert attraction['romanticRating'] == 0, "Failed to retrieve attraction entry with correct romanticRating"
        assert attraction['sexualRating'] == 3, "Failed to retrieve attraction entry with correct sexualRating"
        assert attraction['friendshipRating'] == 2, "Failed to retrieve attraction entry with correct friendshipRating"
        assert attraction['longTermPotential'] is True, "Failed to retrieve attraction entry with correct longTermPotential"
        assert attraction['intellectual'] is True, "Failed to retrieve attraction entry with correct intellectual"
        assert attraction['emotional'] is True, "Failed to retrieve attraction entry with correct emotional"
        assert attraction['result'] is True, "Failed to retrieve attraction entry with correct result"
        assert attraction['firstMessageRights'] is True, "Failed to retrieve attraction entry with correct firstMessageRights"

    # Test getting a non-existent attraction
    non_existent_url = "http://localhost:3000/attraction/123/125"  # Different userTo to ensure it doesn't exist
    response_non_existent = get_attractions_by_user(non_existent_url, headers, 404)
    assert response_non_existent['message'] == 'Attraction not found', "Attempt to get a non-existent attraction should return an error"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([__file__])
