# backend/models/legal_case.py

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from datetime import datetime
from backend.database import Base


class LegalCase(Base):
    __tablename__ = "legal_cases"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), nullable=False)

    client_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("clients.id"),
        nullable=False
    )
    organization_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )