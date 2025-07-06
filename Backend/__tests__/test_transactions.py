import pytest
from datetime import datetime

@pytest.fixture(scope="function")
def setup_test_data(db_conn):
    """Setup and teardown for test data"""
    cur = db_conn.cursor()

    # Clear previous user and token transactions data
    cur.execute("SELECT delete_user_cascade('user123');")
    cur.execute("SELECT delete_user_cascade('user456');")

    # Insert test users
    users_to_insert = [
        (
            'user123', 'John', 'Doe', 'http://example.com/profile.jpg', 'http://example.com/video.mp4',
            '12345', '{"sticker1": "value1"}', True
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

    db_conn.commit()

    yield

    # Clear test data after test
    cur.execute("SELECT delete_user_cascade('user123');")
    cur.execute("SELECT delete_user_cascade('user456');")
    db_conn.commit()
    cur.close()

def get_transaction(db_conn, transaction_id):
    cur = db_conn.cursor()
    query = """
        SELECT transaction_id, user_id, transaction_type, token_amount, amount_usd, description
        FROM transactions
        WHERE transaction_id = %s
    """
    cur.execute(query, (transaction_id,))
    return cur.fetchone()

@pytest.mark.usefixtures("setup_test_data")
def test_create_transaction(db_conn):
    cur = db_conn.cursor()
    transaction_data = {
        "user_id": "user123",
        "transaction_type": "purchase",
        "token_amount": 100,
        "amount_usd": 10.00,
        "description": "Tokens purchased"
    }

    query = """
        INSERT INTO transactions (user_id, transaction_type, token_amount, amount_usd, description)
        VALUES (%(user_id)s, %(transaction_type)s, %(token_amount)s, %(amount_usd)s, %(description)s)
        RETURNING transaction_id
    """
    cur.execute(query, transaction_data)
    transaction_id = cur.fetchone()[0]
    db_conn.commit()

    transaction = get_transaction(db_conn, transaction_id)

    assert transaction is not None
    assert transaction[1] == transaction_data['user_id']
    assert transaction[2] == transaction_data['transaction_type']
    assert transaction[3] == transaction_data['token_amount']
    assert transaction[4] == transaction_data['amount_usd']
    assert transaction[5] == transaction_data['description']

@pytest.mark.usefixtures("setup_test_data")
def test_get_user_tokens(db_conn):
    # Create an initial transaction for user123
    cur = db_conn.cursor()
    transaction_data = {
        "user_id": "user123",
        "transaction_type": "purchase",
        "token_amount": 100,
        "amount_usd": 10.00,
        "description": "Tokens purchased"
    }
    query = """
        INSERT INTO transactions (user_id, transaction_type, token_amount, amount_usd, description)
        VALUES (%(user_id)s, %(transaction_type)s, %(token_amount)s, %(amount_usd)s, %(description)s)
    """
    cur.execute(query, transaction_data)
    db_conn.commit()

    # Test fetching the total tokens for user123
    cur.execute("SELECT SUM(token_amount) as total_tokens FROM transactions WHERE user_id = %s", ('user123',))
    result = cur.fetchone()
    assert result is not None, "No user found with user_id 'user123'"
    tokens = result[0]
    assert tokens == 100, f"Expected 100 tokens, but got {tokens}"

if __name__ == "__main__":
    pytest.main([__file__])
