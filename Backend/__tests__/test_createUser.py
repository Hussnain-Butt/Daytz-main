import pytest
import requests
import sys

@pytest.fixture(scope="function")
def setup_test_user_data(db_conn):
    """Setup and teardown for test user data"""
    cur = db_conn.cursor()

    # Clear previous user data
    cur.execute("SELECT delete_user_cascade('123');")

    db_conn.commit()

    yield

    # Clear test user data after test
    cur.execute("SELECT delete_user_cascade('123');")
    db_conn.commit()
    cur.close()

# Function to simulate posting data to create a user
def post_create_user(url, user_data, expected_status_code):
    headers = {
        'Content-Type': 'application/json',
        "Authorization": "Bearer test-123"  # Test token for user
    }
    response = requests.post(url, json=user_data, headers=headers)
    assert response.status_code == expected_status_code
    
    try:
        response_json = response.json()
    except requests.exceptions.JSONDecodeError:
        print("Response Text:", response.text)  # Debugging print statement
        raise
    
    return response_json

# Test function for creating a user
@pytest.mark.usefixtures("setup_test_user_data")
def test_create_user():
    url = "http://localhost:3000/users"
    # Test data for a user that does not exist yet
    new_user = {
        "firstName": "Test",
        "lastName": "User",
        "profilePictureUrl": "http://example.com/profile.jpg",
        "videoUrl": "http://example.com/video.mp4",
        "zipcode": "12345",
        "stickers": {"sticker1": "value1"},
        "enableNotifications": True
    }
    
    # Test creating a new user
    response_data = post_create_user(url, new_user, 201)
    print("Response Data (Create):", response_data)  # Debugging print statement
    assert response_data['firstName'] == new_user['firstName'], "Failed to create new user"
    assert response_data['lastName'] == new_user['lastName'], "Failed to create new user"
    assert response_data['profilePictureUrl'] == new_user['profilePictureUrl'], "Failed to create new user"
    assert response_data['videoUrl'] == new_user['videoUrl'], "Failed to create new user"
    assert response_data['zipcode'] == new_user['zipcode'], "Failed to create new user"
    assert response_data['stickers'] == new_user['stickers'], "Failed to create new user"
    assert response_data['enableNotifications'] == new_user['enableNotifications'], "Failed to create new user"

    # Attempt to create the same user again
    response_duplicate = post_create_user(url, new_user, 400)
    print("Response Data (Duplicate):", response_duplicate)  # Debugging print statement
    assert response_duplicate['message'] == 'User already exists', "Duplicate user creation should be blocked"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([sys.argv[0]])
