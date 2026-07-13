from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import date, time, datetime
from backend.core.database import get_db
from backend.models.agenda_event import AgendaEvent
from backend.repositories.agenda_event_repository import AgendaEventRepository
from backend.repositories.client_repository import ClientRepository
from backend.repositories.legal_case_repository import LegalCaseRepository
from backend.repositories.user_repository import UserRepository


class AgendaEventService:

    def create_event(self, data: Dict[str, Any]) -> AgendaEvent:
        required_fields = ['title', 'organization_id', 'responsible_user_id', 'date', 'time', 'event_type']
        for field in required_fields:
            if not data.get(field):
                raise ValueError(f"{field.replace('_', ' ').title()} is required")

        data['date'] = date.fromisoformat(data['date'])
        data['time'] = time.fromisoformat(data['time'])

        datetime_start = data.get('datetime_start')
        if datetime_start:
            data['datetime_start'] = datetime.fromisoformat(datetime_start)

        datetime_end = data.get('datetime_end')
        if datetime_end:
            data['datetime_end'] = datetime.fromisoformat(datetime_end)

        if data.get('datetime_start') and data.get('datetime_end') and data['datetime_start'] > data['datetime_end']:
            raise ValueError("Start datetime cannot be after end datetime")

        with get_db() as db:
            repo = AgendaEventRepository(db)
            user_repo = UserRepository(db)
            client_repo = ClientRepository(db)
            legal_repo = LegalCaseRepository(db)

            org_id = UUID(data['organization_id'])
            user_id = UUID(data['responsible_user_id'])
            user = user_repo.find_by_id(user_id)
            if not user or user.organization_id != org_id:
                raise ValueError("Invalid responsible user: must exist and belong to the organization")

            client_id_str = data.get('client_id')
            if client_id_str:
                client_id = UUID(client_id_str)
                client = client_repo.find_by_id(client_id)
                if not client or client.organization_id != org_id:
                    raise ValueError("Invalid client: must exist and belong to the organization")

            legal_case_id_str = data.get('legal_case_id')
            if legal_case_id_str:
                legal_case_id = UUID(legal_case_id_str)
                legal_case = legal_repo.find_by_id(legal_case_id)
                if not legal_case or legal_case.organization_id != org_id:
                    raise ValueError("Invalid legal case: must exist and belong to the organization")

            return repo.create(data)

    def get_event_by_id(self, event_id: UUID, org_id: UUID) -> Optional[AgendaEvent]:
        with get_db() as db:
            repo = AgendaEventRepository(db)
            return repo.find_by_id(event_id, org_id)

    def list_events(self, org_id: UUID) -> List[AgendaEvent]:
        with get_db() as db:
            repo = AgendaEventRepository(db)
            return repo.list_by_organization(org_id)

    def list_events_by_client(self, client_id: UUID, org_id: UUID) -> List[AgendaEvent]:
        with get_db() as db:
            repo = AgendaEventRepository(db)
            return repo.list_by_client(client_id, org_id)

    def list_events_by_legal_case(self, case_id: UUID, org_id: UUID) -> List[AgendaEvent]:
        with get_db() as db:
            repo = AgendaEventRepository(db)
            return repo.list_by_legal_case(case_id, org_id)

    def list_events_by_responsible(self, user_id: UUID, org_id: UUID) -> List[AgendaEvent]:
        with get_db() as db:
            repo = AgendaEventRepository(db)
            return repo.list_by_responsible(user_id, org_id)