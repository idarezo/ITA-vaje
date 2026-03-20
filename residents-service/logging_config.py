"""
Logging configuration for residents service
"""

import logging
import os
from logging.handlers import RotatingFileHandler

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_DIR = "logs"

# Create logs directory if it doesn't exist
os.makedirs(LOG_DIR, exist_ok=True)


def setup_logging():
    """Set up application logging"""
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(LOG_LEVEL)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(LOG_LEVEL)
    
    # File handler
    file_handler = RotatingFileHandler(
        os.path.join(LOG_DIR, "residents_service.log"),
        maxBytes=10485760,  # 10MB
        backupCount=10,
    )
    file_handler.setLevel(LOG_LEVEL)
    
    # Formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)
    
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    return root_logger


logger = setup_logging()
