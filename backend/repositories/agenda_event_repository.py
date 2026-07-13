from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID
from backend.models.agenda_event import AgendaEvent

class AgendaEventRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, event_id: UUID, organization_id: UUID) -> Optional[AgendaEvent]:
        return (
            self.db.query(AgendaEvent)
            .filter(AgendaEvent.id == event_id, AgendaEvent.organization_id == organization_id)
            .first()
        )

    def list_by_organization(self, organization_id: UUID) -> List[AgendaEvent]:
        return (
            self.db.query(AgendaEvent)
            .filter(AgendaEvent.organization_id == organization_id)
            .all()
        )

    def list_by_client(self, client_id: UUID, organization_id: UUID) -> List[AgendaEvent]:
        return (
            self.db.query(AgendaEvent)
            .filter(AgendaEvent.client_id == client_id, AgendaEvent.organization_id == organization_id)
            .all()
        )

    def list_by_legal_case(self, legal_case_id: UUID, organization_id: UUID) -> List[AgendaEvent]:
        return (
            self.db.query(AgendaEvent)
            .filter(AgendaEvent.legal_case_id == legal_case_id, AgendaEvent.organization_id == organization_id)
            .all()
        )

    def list_by_responsible(self, user_id: UUID, organization_id: UUID) -> List[AgendaEvent]:
        return (
            self.db.query(AgendaEvent)
            .filter(AgendaEvent.responsible_user_id == user_id, AgendaEvent.organization_id == organization_id)
            .all()
        )

    def create(self, data: Dict[str, Any]) -> AgendaEvent:
        event = AgendaEvent(**data)
        self.db.add(event)
        self.db.flush()
        return event