# backend/repositories/user_repository.py
from typing import Optional
from sqlalchemy.orm import Session
from ..models.user import User


class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_by_email(self, email: str) -> Optional[User]:
        return self.session.query(User).filter(User.email == email).first()

    def find_by_id(self, id_: int) -> Optional[User]:
        return self.session.query(User).filter(User.id == id_).first()

    def create(self, email: str, hashed_password: str) -> User:
        user = User(email=email, password=hashed_password)
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user