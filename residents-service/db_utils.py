"""
Database utilities for residents service
"""

from sqlalchemy import event
from sqlalchemy.engine import Engine
import logging

logger = logging.getLogger(__name__)


@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    if logger.isEnabledFor(logging.DEBUG):
        logger.debug("SQL: %s", statement)


def verify_database_connection(engine):
    """Verify database connection is working"""
    try:
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False
