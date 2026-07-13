import uuid

from sqlalchemy import Column, Date, DateTime, String, Text, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class AgendaEvent(Base):
    __tablename__ = 'agenda_events'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    datetime_start = Column(DateTime, nullable=False)
    datetime_end = Column(DateTime, nullable=False)
    event_type = Column(String, nullable=False)
    location = Column(String, nullable=True)
    client_id = Column(UUID(as_uuid=True), nullable=True)
    legal_case_id = Column(UUID(as_uuid=True), nullable=True)
    organization_id = Column(UUID(as_uuid=True), nullable=False)
    responsible_user_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)