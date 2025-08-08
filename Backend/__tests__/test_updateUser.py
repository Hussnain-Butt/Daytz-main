import pytest
import requests
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

# Function to simulate patching data to update a user
def patch_update_user(headers, url, user_data, expected_status_code):
    response = requests.patch(url, json=user_data, headers=headers)
    print(f"Response Status Code: {response.status_code}")  # Debugging print statement
    print(f"Response Text: {response.text}")  # Debugging print statement
    assert response.status_code == expected_status_code

    try:
        response_json = response.json()
    except requests.exceptions.JSONDecodeError:
        print("Failed to decode JSON response")  # Debugging print statement
        raise

    return response_json

# Test function for updating a user
@pytest.mark.usefixtures("setup_test_user_data")
def test_update_user():
    headers = {
        'Content-Type': 'application/json',
        "Authorization": "Bearer test-testUser123"  # Test token for user
    }

    url = "http://localhost:3000/users"
    
    # Full update data for the user
    full_update_user_data = {
        "firstName": "Updated",
        "lastName": "User",
        "profilePictureUrl": "http://example.com/updated.jpg",
        "videoUrl": "http://example.com/updated.mp4",
        "zipcode": "12345",
        "stickers": {"sticker1": "updatedValue"},
        "enableNotifications": False
    }

    # Test updating the existing user with full data
    response_data = patch_update_user(headers, url, full_update_user_data, 200)
    print("Response Data (Full Update):", response_data)  # Debugging print statement
    assert response_data['userId'] == 'testUser123', "User ID should remain the same"
    assert response_data['firstName'] == full_update_user_data['firstName'], "First name should be updated"
    assert response_data['lastName'] == full_update_user_data['lastName'], "Last name should be updated"
    assert response_data['profilePictureUrl'] == full_update_user_data['profilePictureUrl'], "Profile picture URL should be updated"
    assert response_data['videoUrl'] == full_update_user_data['videoUrl'], "Video URL should be updated"
    assert response_data['zipcode'] == full_update_user_data['zipcode'], "Zipcode should be updated"
    assert response_data['stickers'] == full_update_user_data['stickers'], "Stickers should be updated"
    assert response_data['enableNotifications'] == full_update_user_data['enableNotifications'], "Enable notifications should be updated"

    # Partial update data for the user
    partial_update_user_data = {
        "lastName": "PartialUpdate",
    }

    # Test updating the existing user with partial data
    response_data_partial = patch_update_user(headers, url, partial_update_user_data, 200)
    print("Response Data (Partial Update):", response_data_partial)  # Debugging print statement
    assert response_data_partial['userId'] == 'testUser123', "User ID should remain the same"
    assert response_data_partial['firstName'] == full_update_user_data['firstName'], "First name should remain the same from full update"
    assert response_data_partial['lastName'] == partial_update_user_data['lastName'], "Last name should be updated to partial update"
    assert response_data_partial['profilePictureUrl'] == full_update_user_data['profilePictureUrl'], "Profile picture URL should remain the same from full update"
    assert response_data_partial['videoUrl'] == full_update_user_data['videoUrl'], "Video URL should remain the same from full update"
    assert response_data_partial['zipcode'] == full_update_user_data['zipcode'], "Zipcode should remain the same from full update"
    assert response_data_partial['stickers'] == full_update_user_data['stickers'], "Stickers should remain the same from full update"
    assert response_data_partial['enableNotifications'] == full_update_user_data['enableNotifications'], "Enable notifications should remain the same from full update"

    # Test updating a non-existent user
    non_existent_user_data = {
        "firstName": "NonExistent",
        "lastName": "User"
    }
    non_existant_user_headers = {
        'Content-Type': 'application/json',
        "Authorization": "Bearer test-nonExistantUser"  # Test token for user
    }

    response_data_non_existent = patch_update_user(non_existant_user_headers, url, non_existent_user_data, 404)
    print("Response Data (Non-Existent):", response_data_non_existent)  # Debugging print statement
    assert 'message' in response_data_non_existent, "Response should contain 'message' key"
    assert response_data_non_existent['message'] == 'User does not exist', "Should return 'User does not exist' message"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([sys.argv[0]])
