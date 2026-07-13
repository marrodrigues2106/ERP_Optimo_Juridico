# backend/repositories/legal_case_repository.py

from typing import List, Optional

import sqlalchemy.orm as _orm

from backend.models.legal_case import LegalCase
from backend.schemas.legal_case import LegalCaseCreate


def find_by_id(db: _orm.Session, id: int) -> Optional[LegalCase]:
    return db.query(LegalCase).filter(LegalCase.id == id).first()


def list_by_organization(db: _orm.Session, org_id: int) -> List[LegalCase]:
    return db.query(LegalCase).filter(LegalCase.organization_id == org_id).all()


def list_by_client(db: _orm.Session, client_id: int) -> List[LegalCase]:
    return db.query(LegalCase).filter(LegalCase.client_id == client_id).all()


def create(db: _orm.Session, data: LegalCaseCreate) -> LegalCase:
    db_obj = LegalCase(**data.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
