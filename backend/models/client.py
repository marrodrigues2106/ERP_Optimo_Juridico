# backend/models/client.py
import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
from sqlalchemy_utils.types.pg_uuid import PG_UUID

Base = declarative_base()

class Client(Base):
    __tablename__ = 'clients'

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50))
    organization_id = Column(PG_UUID(as_uuid=True), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )