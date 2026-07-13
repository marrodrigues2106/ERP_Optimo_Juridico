# backend/repositories/client_repository.py

from sqlalchemy.orm import Session
from uuid import UUID
from typing import Dict, Any
from backend.models.client import Client


class ClientRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def find_by_id(self, id_: UUID) -> Client | None:
        return self.session.get(Client, id_)

    def find_by_email(self, email: str) -> Client | None:
        return self.session.query(Client).filter(Client.email == email).first()

    def list_by_organization(self, org_id: UUID) -> list[Client]:
        return self.session.query(Client).filter(Client.organization_id == org_id).all()

    def create(self, data: Dict[str, Any]) -> Client:
        client = Client(
            name=data['name'],
            email=data['email'],
            phone=data['phone'],
            organization_id=data['organization_id'],
        )
        self.session.add(client)
        self.session.commit()
        self.session.refresh(client)
        return client