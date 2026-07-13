# backend/api/controllers/user_controller.py

from flask import Blueprint, g, jsonify
from backend.api.middlewares.auth_middleware import token_required
from backend.core.database import get_db
from backend.repositories.user_repository import UserRepository

user_bp = Blueprint("users", __name__, url_prefix="/users")


@user_bp.route("/me", methods=["GET"])
@token_required
def get_me():
    with get_db() as db:
        repo = UserRepository(db)
        user = repo.find_by_id(g.user_id)

        if not user:
            return jsonify({"error": "Usuário não encontrado"}), 404

        return jsonify({
            "id": str(user.id),
            "email": user.email,
            "organization_id": str(user.organization_id),
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        })