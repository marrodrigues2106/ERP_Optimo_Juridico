# backend/services/task_service.py

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from backend.core.database import get_db
from backend.repositories.task_repository import TaskRepository
from backend.repositories.client_repository import ClientRepository
from backend.repositories.legal_case_repository import LegalCaseRepository
from backend.repositories.user_repository import UserRepository
from backend.models.task import Task


class TaskService:
    VALID_STATUSES = {"open", "in_progress", "done"}
    VALID_PRIORITIES = {"low", "medium", "high", "urgent"}

    def _validate_status(self, status: str):
        if status not in self.VALID_STATUSES:
            raise ValueError("Status inválido.")

    def _validate_priority(self, priority: str):
        if priority not in self.VALID_PRIORITIES:
            raise ValueError("Prioridade inválida.")

    def _validate_deadline(self, deadline):
        if deadline and deadline < datetime.utcnow():
            raise ValueError("Deadline não pode ser no passado.")

    def create_task(self, data: Dict[str, Any]) -> Task:
        with get_db() as db:
            repo = TaskRepository(db)

            required = ["title", "responsible_user_id", "organization_id"]
            for field in required:
                if field not in data:
                    raise ValueError(f"Campo obrigatório ausente: {field}")

            # Validations
            status = data.get("status", "open")
            self._validate_status(status)

            priority = data.get("priority", "medium")
            self._validate_priority(priority)

            deadline = data.get("deadline")
            if isinstance(deadline, str):
                deadline = datetime.fromisoformat(deadline)
            self._validate_deadline(deadline)

            # Multi-tenant validation
            org_id = data["organization_id"]

            user_repo = UserRepository(db)
            user = user_repo.find_by_id(data["responsible_user_id"])
            if not user or user.organization_id != org_id:
                raise ValueError("Responsável não pertence à organização.")

            if data.get("client_id"):
                client_repo = ClientRepository(db)
                client = client_repo.get_client_by_id(data["client_id"], org_id)
                if not client:
                    raise ValueError("Cliente não encontrado na organização.")

            if data.get("legal_case_id"):
                case_repo = LegalCaseRepository(db)
                case = case_repo.find_by_id(data["legal_case_id"])
                if not case or case.organization_id != org_id:
                    raise ValueError("Caso jurídico não encontrado na organização.")

            return repo.create(data)

    def get_task_by_id(self, task_id: UUID, org_id: UUID) -> Optional[Task]:
        with get_db() as db:
            repo = TaskRepository(db)
            task = repo.find_by_id(task_id)

            if task and task.organization_id == org_id:
                return task

            return None

    def list_tasks(self, org_id: UUID) -> List[Task]:
        with get_db() as db:
            repo = TaskRepository(db)
            return repo.list_by_organization(org_id)

    def list_tasks_by_responsible(self, user_id: UUID, org_id: UUID) -> List[Task]:
        with get_db() as db:
            repo = TaskRepository(db)
            return repo.list_by_responsible(user_id, org_id)

    def list_tasks_by_client(self, client_id: UUID, org_id: UUID) -> List[Task]:
        with get_db() as db:
            repo = TaskRepository(db)
            return repo.list_by_client(client_id, org_id)

    def list_tasks_by_legal_case(self, legal_case_id: UUID, org_id: UUID) -> List[Task]:
        with get_db() as db:
            repo = TaskRepository(db)
            return repo.list_by_legal_case(legal_case_id, org_id)