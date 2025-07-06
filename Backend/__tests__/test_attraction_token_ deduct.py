import pytest
import requests
import json
from datetime import datetime

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

    # Clear previous user and date data
    cur.execute("SELECT delete_user_cascade('user123');")
    cur.execute("SELECT delete_user_cascade('user456');")

    # Insert test users
    users_to_insert = [
        (
            'user123', 'John', 'Doe', 'http://example.com/profile.jpg', 'http://example.com/video.mp4',
            '12345', '{"sticker1": "value1"}', True  # Set initial tokens to 8 for testing
        ),
        (
            'user456', 'Jane', 'Doe', 'http://example.com/profile2.jpg', 'http://example.com/video2.mp4',
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

    # Add tokens to user123 and user456
    cur.execute(
        """
        INSERT INTO transactions (user_id, transaction_type, token_amount, description)
        VALUES ('user123', 'replenishment', 8, 'Initial tokens for testing')
        """
    )

    cur.execute(
        """
        INSERT INTO transactions (user_id, transaction_type, token_amount, description)
        VALUES ('user456', 'replenishment', 30, 'Initial tokens for testing')
        """
    )

    # Insert calendar day for user456
    cur.execute(
        """
        INSERT INTO calendar_day (user_id, date, user_video_url)
        VALUES ('user456', '2024-01-01', 'http://example.com/video2.mp4')
        ON CONFLICT (user_id, date) DO NOTHING
        """
    )

    # Insert calendar day for user123
    cur.execute(
        """
        INSERT INTO calendar_day (user_id, date, user_video_url)
        VALUES ('user123', '2024-01-01', 'http://example.com/video2.mp4')
        ON CONFLICT (user_id, date) DO NOTHING
        """
    )

    db_conn.commit()

    yield

    # Clear test data after test
    cur.execute("SELECT delete_user_cascade('user123');")
    cur.execute("SELECT delete_user_cascade('user456');")
    db_conn.commit()
    cur.close()

def alter_setup_to_add_match():
    base_url = "http://localhost:3000/attraction"
    setup_headers = {
        "Authorization":"Bearer test-user456"  # Test token for user 123
    }

    setup_attraction_data = {
        "userFrom": "user456",
        "userTo": "user123",
        "date": "2024-01-01",
        "romanticRating": 3,
        "sexualRating": 3,
        "friendshipRating": 3 
    }
    
    return requests.post(base_url, json=setup_attraction_data, headers=setup_headers)

def get_user_tokens(db_conn, user_id):
    cur = db_conn.cursor()
    cur.execute("SELECT SUM(token_amount) as total_tokens FROM transactions WHERE user_id = %s", (user_id,))
    return cur.fetchone()[0]

@pytest.mark.usefixtures("setup_test_data")
def test_attraction_submission_deducts_tokens(db_conn):
    base_url = "http://localhost:3000/attraction"
    user_from = "user123"
    user_to = "user456"
    date = "2024-01-01"
    headers = {
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }
    
    attraction_data = {
        "userFrom": user_from,
        "userTo": user_to,
        "date": date,
        "romanticRating": 1,
        "sexualRating": 1,
        "friendshipRating": 0
    }

    initial_tokens = get_user_tokens(db_conn, user_from)
    total_cost = attraction_data["romanticRating"] + attraction_data["sexualRating"] + attraction_data["friendshipRating"]

    # Test submitting the attraction
    response = requests.post(base_url, json=attraction_data, headers=headers)
    response_data = response.json()
    print("Response Data:", response_data)  # Debugging print statement
    assert response_data['userFrom'] == user_from
    assert response_data['userTo'] == user_to
    # Normalize date format to match expected format
    response_data['date'] = datetime.fromisoformat(response_data['date']).date().isoformat()
    assert response_data['date'] == date
    assert response_data['romanticRating'] == attraction_data['romanticRating']
    assert response_data['sexualRating'] == attraction_data['sexualRating']
    assert response_data['friendshipRating'] == attraction_data['friendshipRating']
    
    assert response.status_code == 201

    # Check the tokens after submission
    final_tokens = get_user_tokens(db_conn, user_from)
    assert final_tokens == initial_tokens - total_cost, "Tokens were not deducted correctly"

@pytest.mark.usefixtures("setup_test_data")
def test_attraction_submission_insufficient_tokens_without_match_single_transaction(db_conn):
    base_url = "http://localhost:3000/attraction"
    user_from = "user123"
    user_to = "user456"
    date = "2024-01-01"
    headers = {
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }
    
    attraction_data = {
        "userFrom": user_from,
        "userTo": user_to,
        "date": date,
        "romanticRating": 3,
        "sexualRating": 3,
        "friendshipRating": 3  # Total rating is 9, more than initial 8 tokens
    }

    initial_tokens = get_user_tokens(db_conn, user_from)

    # Test submitting the attraction with insufficient tokens
    response = requests.post(base_url, json=attraction_data, headers=headers)
    response_data = response.json()
    assert response.status_code == 400
    assert response_data['message'] == "Insufficient tokens"

    # Check the tokens after failed submission
    final_tokens = get_user_tokens(db_conn, user_from)
    assert final_tokens == initial_tokens, "Tokens should not be deducted on failure"

    # Check that the attraction was not created
    cur = db_conn.cursor()
    cur.execute(
        """
        SELECT * FROM attraction
        WHERE user_from = %s AND user_to = %s AND date = %s
        """,
        (user_from, user_to, date)
    )
    assert cur.fetchone() is None, "Attraction should not be created on failure"

@pytest.mark.usefixtures("setup_test_data")
def test_attraction_submission_insufficient_tokens_without_match_multiple_transactions(db_conn):
    base_url = "http://localhost:3000/attraction"
    user_from = "user123"
    user_to = "user456"
    date = "2024-01-01"
    headers = {
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }
    
    attraction_data = {
        "userFrom": user_from,
        "userTo": user_to,
        "date": date,
        "romanticRating": 1,
        "sexualRating": 1,
        "friendshipRating": 0 # Total rating is 2, less than initial 8 tokens but more than 1 token
    }

    # Add transaction to remove 7 tokens from user123
    cur = db_conn.cursor()
    cur.execute(
        """
        INSERT INTO transactions (user_id, transaction_type, token_amount, description)
        VALUES ('user123', 'purchase', -7, 'Attraction deduction')
        """
    )
    db_conn.commit()

    initial_tokens = get_user_tokens(db_conn, user_from)

    # Test submitting the attraction with insufficient tokens
    response = requests.post(base_url, json=attraction_data, headers=headers)
    response_data = response.json()
    assert response.status_code == 400
    assert response_data['message'] == "Insufficient tokens"

    # Check the tokens after failed submission
    final_tokens = get_user_tokens(db_conn, user_from)
    assert final_tokens == initial_tokens, "Tokens should not be deducted on failure"

    # Check that the attraction was not created
    cur = db_conn.cursor()
    cur.execute(
        """
        SELECT * FROM attraction
        WHERE user_from = %s AND user_to = %s AND date = %s
        """,
        (user_from, user_to, date)
    )
    assert cur.fetchone() is None, "Attraction should not be created on failure"



@pytest.mark.usefixtures("setup_test_data")
def test_attraction_submission_insufficient_tokens_with_match(db_conn):
    corresponding_attraction = alter_setup_to_add_match()
    assert corresponding_attraction.status_code == 201, "Attraction should be created successfully, but got message: " + corresponding_attraction.json()['message']
    initial_user_to_tokens = get_user_tokens(db_conn, "user456")
    base_url = "http://localhost:3000/attraction"
    user_from = "user123"
    user_to = "user456"
    date = "2024-01-01"
    headers = {
        "Authorization": "Bearer test-user123"  # Test token for user 123
    }

    initial_user_from_tokens = get_user_tokens(db_conn, user_from)
    attraction_data = {
        "userFrom": user_from,
        "userTo": user_to,
        "date": date,
        "romanticRating": 3,
        "sexualRating": 3,
        "friendshipRating": 3  # Total rating is 9, more than initial 8 tokens
    }

        # Test submitting the attraction with insufficient tokens
    response = requests.post(base_url, json=attraction_data, headers=headers)
    response_data = response.json()
    assert response.status_code == 400
    assert response_data['message'] == "Insufficient tokens"

    # Check the tokens after failed submission
    final_tokens = get_user_tokens(db_conn, user_from)
    assert final_tokens == initial_user_from_tokens, "user from tokens should not be deducted on failure"

    # Check that the attraction of the corresponding match was not altered
    final_user_to_tokens = get_user_tokens(db_conn, user_to)
    assert final_user_to_tokens == initial_user_to_tokens, "user to tokens should not be deducted on failure"
    assert corresponding_attraction.json()['result'] is None, "The result of the user to attraction should remain None"
    assert corresponding_attraction.json()['firstMessageRights'] is None, "The firstMessageRights of the user to attraction should remain None"

if __name__ == "__main__":
    pytest.main([__file__])
