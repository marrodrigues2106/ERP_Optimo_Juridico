# backend/services/legal_case_service.py

from typing import Optional, List
from uuid import UUID

from backend.core.database import get_db
from backend.repositories.legal_case_repository import LegalCaseRepository
from backend.models.legal_case import LegalCase


class LegalCaseService:
    def create_case(self, data: dict) -> LegalCase:
        with get_db() as db:
            repo = LegalCaseRepository(db)

            required_fields = ["title", "status", "client_id", "organization_id"]
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"Campo obrigatório ausente: {field}")

            case = repo.create(data)
            return case

    def get_case_by_id(self, case_id: UUID, org_id: UUID) -> Optional[LegalCase]:
        with get_db() as db:
            repo = LegalCaseRepository(db)
            case = repo.find_by_id(case_id)

            if case and case.organization_id == org_id:
                return case

            return None

    def list_cases(self, org_id: UUID) -> List[LegalCase]:
        with get_db() as db:
            repo = LegalCaseRepository(db)
            return repo.list_by_organization(org_id)

    def list_cases_by_client(self, client_id: UUID, org_id: UUID) -> List[LegalCase]:
        with get_db() as db:
            repo = LegalCaseRepository(db)
            cases = repo.list_by_client(client_id)

            # Filtra apenas casos da organização, reforçando isolamento multi-tenant
            return [c for c in cases if c.organization_id == org_id]