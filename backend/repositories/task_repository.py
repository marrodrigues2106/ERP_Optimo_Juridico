# backend/repositories/task_repository.py

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

from backend.models.task import Task


class TaskRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def find_by_id(self, task_id: UUID) -> Optional[Task]:
        return self.session.get(Task, task_id)

    def list_by_organization(self, org_id: UUID) -> List[Task]:
        return (
            self.session.query(Task)
            .filter(Task.organization_id == org_id)
            .all()
        )

    def list_by_responsible(self, user_id: UUID, org_id: UUID) -> List[Task]:
        return (
            self.session.query(Task)
            .filter(
                Task.responsible_user_id == user_id,
                Task.organization_id == org_id
            )
            .all()
        )

    def list_by_client(self, client_id: UUID, org_id: UUID) -> List[Task]:
        return (
            self.session.query(Task)
            .filter(
                Task.client_id == client_id,
                Task.organization_id == org_id
            )
            .all()
        )

    def list_by_legal_case(self, legal_case_id: UUID, org_id: UUID) -> List[Task]:
        return (
            self.session.query(Task)
            .filter(
                Task.legal_case_id == legal_case_id,
                Task.organization_id == org_id
            )
            .all()
        )

    def create(self, data: Dict[str, Any]) -> Task:
        task = Task(
            title=data["title"],
            description=data.get("description"),
            status=data.get("status", "open"),
            priority=data.get("priority", "medium"),
            deadline=data.get("deadline"),
            responsible_user_id=data["responsible_user_id"],
            client_id=data.get("client_id"),
            legal_case_id=data.get("legal_case_id"),
            organization_id=data["organization_id"]
        )

        self.session.add(task)
        self.session.commit()
        self.session.refresh(task)

        return task