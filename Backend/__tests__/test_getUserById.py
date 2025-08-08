import pytest
import requests
import json
import sys

@pytest.fixture(scope="function")
def setup_test_user_data(db_conn):
    """Setup and teardown for test user data"""
    cur = db_conn.cursor()

    # Clear previous user data
    cur.execute("DELETE FROM users WHERE (user_id = 'testUser123' OR user_id = 'nonExistantUser');")

    # Insert a test user
    cur.execute("""
        INSERT INTO users (user_id, first_name, last_name, profile_picture_url, video_url, zipcode, stickers, enable_notifications)
        VALUES ('testUser123', 'Initial', 'User', 'http://example.com/initial.jpg', 'http://example.com/initial.mp4', '54321', '{"sticker1": "initialValue"}', True)
    """)

    db_conn.commit()

    yield

    # Clear test user data after test
    cur.execute("DELETE FROM users WHERE (user_id = 'testUser123' OR user_id = 'nonExistantUser');")
    db_conn.commit()
    cur.close()

# Function to simulate GET request to retrieve a user
def get_user_by_id(url, user_id):
    headers = {
        'Content-Type': 'application/json',
        "Authorization": "Bearer test-123"  # Test token for generic user
    }
    response = requests.get(f"{url}/{user_id}", headers=headers)
    return response

# Test for retrieving a user by ID
@pytest.mark.usefixtures("setup_test_user_data")
def test_get_user_by_id():
    base_url = "http://localhost:3000/users"
    valid_user_id = "testUser123"
    invalid_user_id = "nonExistentUser"

    # Test getting an existing user
    response = get_user_by_id(base_url, valid_user_id)
    assert response.status_code == 200, "Should return 200 for existing user"
    user_data = response.json()
    assert user_data['userId'] == valid_user_id, "The user ID should match the request"
    print("User data:", json.dumps(user_data, indent=4))

    # Test getting a non-existent user
    response = get_user_by_id(base_url, invalid_user_id)
    assert response.status_code == 404, "Should return 404 for non-existent user"
    assert response.text == "User not found", "Response should indicate user not found"

# If the file is executed directly, run the tests
if __name__ == "__main__":
    pytest.main([sys.argv[0]])
