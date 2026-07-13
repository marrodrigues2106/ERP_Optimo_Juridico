# backend/models/__init__.py

from sqlalchemy.ext.declarative import declarative_base

from .user import User

Base = declarative_base()