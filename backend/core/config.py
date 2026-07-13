# backend/core/config.py
from dotenv import load_dotenv
import os

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    DATABASE_URL = os.environ.get('DATABASE_URL')
    CORS_ALLOWED_ORIGINS = [
        origin.strip() for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
        if origin.strip()
    ]
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 't')
    PORT = int(os.environ.get('PORT', 5000))