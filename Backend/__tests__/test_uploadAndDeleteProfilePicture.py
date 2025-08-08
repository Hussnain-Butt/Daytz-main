import pytest
import requests
import os

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

    # Clear previous user data
    cur.execute("DELETE FROM users WHERE user_id = 'user123';")

    # Insert test user if it does not exist
    user_data = (
        'user123', 'John', 'Doe', None, None,
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
    cur.execute("DELETE FROM users WHERE user_id = 'user123';")
    db_conn.commit()
    cur.close()

# Function to simulate posting an image file
def post_profile_picture(url, image_path, form_data, expected_status_code):
    headers = {
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }
    files = {
        'image': open(image_path, 'rb')
    }
    try:
        response = requests.post(url, files=files, data=form_data, headers=headers)
        assert response.status_code == expected_status_code
        return response.json()
    finally:
        files['image'].close()

# Function to simulate deleting a profile picture
def delete_profile_picture(url, data, expected_status_code):
    headers = {
        'Content-Type': 'application/json',
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }
    response = requests.delete(url, json=data, headers=headers)
    assert response.status_code == expected_status_code
    return response.json()

# Test function for uploading and then deleting a profile picture
@pytest.mark.usefixtures("setup_test_data")
def test_upload_and_delete_profile_picture():
    upload_url = "http://localhost:3000/users/profilePicture"
    delete_url = "http://localhost:3000/users/profilePicture"
    
    # Upload a test image
    image_path = os.path.join('BE-Daytz', '__tests__', 'testimages', 'testImage1.jpg')
    form_data = {}
    response_upload = post_profile_picture(upload_url, image_path, form_data, 201)
    print("Response Data (Upload):", response_upload)  # Debugging print statement
    assert response_upload['message'] == 'Image uploaded successfully', "Failed to upload image"
    
    # Delete the uploaded image
    delete_data = {}
    response_delete = delete_profile_picture(delete_url, delete_data, 200)
    print("Response Data (Delete):", response_delete)  # Debugging print statement
    assert response_delete['message'] == 'Profile picture deleted successfully', "Failed to delete profile picture"

    # Verify the profile picture URL is set to null
    user_url = "http://localhost:3000/users/user123"
    response_user = requests.get(user_url, headers={
        'Content-Type': 'application/json',
        "Authorization": "Bearer test-user123"  # Test token for user 123
    })
    assert response_user.status_code == 200, f"Failed to get user, status code: {response_user.status_code}"
    user_data = response_user.json()
    print("User Data:", user_data)  # Debugging print statement

    # Check if 'profilePictureUrl' is in the response and is set to null
    assert 'profilePictureUrl' in user_data, "Response does not contain 'profilePictureUrl'"
    assert user_data['profilePictureUrl'] is None, "Failed to set profilePictureUrl to null"

# Ensures that if pytest is run directly, it processes the tests in this file
if __name__ == "__main__":
    pytest.main([__file__])
