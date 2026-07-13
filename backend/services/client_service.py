# backend/services/client_service.py

from typing import Dict, Any, Optional, List
from uuid import UUID

from backend.core.database import get_db
from backend.repositories.client_repository import ClientRepository
from backend.models.client import Client


class ClientService:
    def create_client(self, data: Dict[str, Any]) -> Client:
        with get_db() as db:
            repo = ClientRepository(db)

            org_id = data.get("organization_id")
            if not org_id:
                raise ValueError("organization_id é obrigatório")

            email = data.get("email")
            if not email:
                raise ValueError("Email é obrigatório")

            existing = repo.find_by_email(email)
            if existing and existing.organization_id == org_id:
                raise ValueError("Já existe um cliente com este email nesta organização")

            return repo.create(data)

    def get_client_by_id(self, client_id: UUID, org_id: UUID) -> Optional[Client]:
        with get_db() as db:
            repo = ClientRepository(db)
            client = repo.find_by_id(client_id)
            if client and client.organization_id == org_id:
                return client
            return None

    def list_clients(self, org_id: UUID) -> List[Client]:
        with get_db() as db:
            repo = ClientRepository(db)
            return repo.list_by_organization(org_id)