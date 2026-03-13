import os
import psycopg2


def get_connection():
    # connection parameters from environment
    return psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB", "misinfo"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "postgres"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5432"),
    )
