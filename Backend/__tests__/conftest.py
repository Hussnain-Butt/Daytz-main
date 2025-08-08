import subprocess
import sys
import pytest
import time
import requests
import psycopg2
import os
from dotenv import load_dotenv

# wait_for_server_to_start does not currently work, leaving it here for future reference
def wait_for_server_to_start(timeout=6):
    """Wait for the server to start by polling a URL until it returns a successful response or the timeout expires."""
    time.sleep(1)  # Wait a bit for the server to start
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                print("http://localhost:3000/health")
                return
        except requests.ConnectionError:
            print("Server not ready, waiting...")
            time.sleep(1)
    raise RuntimeError("Server did not start within {} seconds".format(timeout))

# TODO (optional): Get server to log to separate terminal window
@pytest.fixture(scope="session", autouse=True)
def server():
    # Open a log file where server outputs will be redirected
    with open('server.log', 'w') as f:
        try:
            response = requests.get("http://localhost:3000/health")
            if response.status_code == 200:
                print("Server is already running!")
                yield
                return
        except requests.ConnectionError:
            pass
        
        # Start the server as a subprocess, redirecting stdout and stderr to the log file
        proc = subprocess.Popen(
            ["npx", "ts-node", "daytz-app/BE-Daytz/src/index.ts"],
            stdout=f,
            stderr=f,
        )
        
        # Wait for the server to start
        # time.sleep(4)
        wait_for_server_to_start()
        
        # Let pytest run tests while the server is running
        yield
        
        # After tests complete, terminate the server and wait for it to finish
        proc.terminate()
        proc.wait()


load_dotenv()

@pytest.fixture(scope="session")
def db_conn():
    """Setup for the database connection"""
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
    )
    yield conn
    conn.close()