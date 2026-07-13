# backend/core/database.py

from contextlib import contextmanager
from typing import Generator

import uuid
from sqlalchemy import create_engine, event, pool
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import sessionmaker

from backend.core.config import settings

# Configuração da engine com pooling avançado para produção
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=pool.QueuePool,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    connect_args={"connect_timeout": 10},
    echo=False,  # Ative para DEBUG=True em desenvolvimento
)

# Session maker
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Função get_db como gerenciador de contexto
@contextmanager
def get_db() -> Generator:
    db = None
    try:
        db = SessionLocal()
        yield db
    except Exception:
        if db:
            db.rollback()
        raise
    finally:
        if db:
            db.close()

# Suporte a UUID no PostgreSQL (use PG_UUID(as_uuid=True) nos modelos)
# Exemplo de uso em modelos: id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

# Opcional: Listener para garantir compatibilidade UUID (produção)
@event.listens_for(engine, "connect", retval=True)
def _set_sqlalchemy_continuum(dbapi_con, con_record):
    if "postgresql" in settings.DATABASE_URL:
        # Habilita suporte nativo UUID se necessário
        pass  # SQLAlchemy 2.0+ lida nativamente
    return dbapi_con
