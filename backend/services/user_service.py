# backend/services/user_service.py

from typing import Optional

from backend.repositories.user_repository import UserRepository
from backend.models.user import User, UserCreate
from backend.security import hash_password


class UserService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return self.user_repo.get_by_id(user_id)

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.user_repo.get_by_email(email)

    def create_user(self, user_data: UserCreate) -> User:
        if existing_user := self.user_repo.get_by_email(user_data.email):
            raise ValueError("Usuário com este email já existe")
        user_dict = user_data.dict()
        password = user_dict.pop("password")
        user_dict["password"] = hash_password(password)
        user = User(**user_dict)
        return self.user_repo.create(user)
