import pytest
import requests
from test_setup_helpers import setup_test_data, teardown_test_data
from datetime import datetime

API_URL = "http://localhost:3000/attraction"

# Setup the headers to simulate the authorization token
headers_valid_user_123 = {
    "Authorization": "Bearer test-123",
}

headers_valid_user_124 = {
    "Authorization": "Bearer test-124",
}

# Test data for attractions
attraction_data_valid = {
    "userFrom": "123",
    "userTo": "124",
    "date": "2024-05-01",
    "romanticRating": 3,
    "sexualRating": 3,
    "friendshipRating": 2
}

attraction_data_invalid = {
    "userFrom": "123",
    "userTo": "123",  # Invalid scenario: userFrom and userTo cannot be the same
    "date": "2024-05-01",
    "romanticRating": 3,
    "sexualRating": 3,
    "friendshipRating": 2
}

users_data = [
    {
        'user_id': '123',
        'first_name': 'John',
        'last_name': 'Doe',
        'profile_picture_url': 'http://example.com/profile.jpg',
        'video_url': 'http://example.com/video.mp4',
        'zipcode': '12345',
        'stickers': '{"sticker1": "value1"}',
        'enable_notifications': True,
        'initial_token_amount': 50
    },
    {
        'user_id': '124',
        'first_name': 'Jane',
        'last_name': 'Doe',
        'profile_picture_url': 'http://example.com/profile2.jpg',
        'video_url': 'http://example.com/video2.mp4',
        'zipcode': '54321',
        'stickers': '{"sticker2": "value2"}',
        'enable_notifications': True,
        'initial_token_amount': 50
    }
]

calendar_days_data = [
    {'user_id': '123', 'date': '2024-05-01', 'user_video_url': 'https://vimeo.com/926973062'},
    {'user_id': '124', 'date': '2024-05-01', 'user_video_url': 'https://vimeo.com/921388669'}
]

@pytest.fixture()
def setup_and_teardown(db_conn):
    setup_test_data(db_conn, users_data=users_data, calendar_days_data=calendar_days_data)
    print("Setting up test data from test file...")
    yield
    print("Tearing down test data from test file...")
    teardown_test_data(db_conn, users_data=users_data)

# Function to simulate posting an attraction
def post_create_attraction(url, attraction_data, headers, expected_status_code):
    response = requests.post(url, json=attraction_data, headers=headers)
    print("Response Status Code:", response.status_code)  # Debugging print statement
    print("Response JSON:", response.json())  # Debugging print statement
    assert response.status_code == expected_status_code
    return response.json()

@pytest.mark.usefixtures("setup_and_teardown")
def test_create_attraction_valid_data():
    response_data = post_create_attraction(API_URL, attraction_data_valid, headers_valid_user_123, 201)
    print("Response Data (Valid):", response_data)  # Debugging print statement

    # Normalize date format to match expected format
    response_date = datetime.fromisoformat(response_data['date']).date().isoformat()

    assert response_data['userFrom'] == attraction_data_valid['userFrom'], "userFrom field does not match"
    assert response_data['userTo'] == attraction_data_valid['userTo'], "userTo field does not match"
    assert response_date == attraction_data_valid['date'], "date field does not match"
    assert response_data['romanticRating'] == attraction_data_valid['romanticRating'], "romanticRating field does not match"
    assert response_data['sexualRating'] == attraction_data_valid['sexualRating'], "sexualRating field does not match"
    assert response_data['friendshipRating'] == attraction_data_valid['friendshipRating'], "friendshipRating field does not match"
    assert response_data.get('result') is not True, "The match should initially not be True"
    assert response_data.get('firstMessageRights') is not True, "The firstMessageRights should not be True"

@pytest.mark.usefixtures("setup_and_teardown")
def test_create_attraction_invalid_data():
    """Test creating an attraction with invalid data (same userFrom and userTo)."""
    response_data = post_create_attraction(API_URL, attraction_data_invalid, headers_valid_user_123, 400)
    print("Response Data (Invalid):", response_data)  # Debugging print statement
    assert response_data['message'] == 'userFrom and userTo must be different users'

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([__file__])
