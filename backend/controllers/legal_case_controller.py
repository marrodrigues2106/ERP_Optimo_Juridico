# backend/api/controllers/legal_case_controller.py

from flask import Blueprint, request, jsonify, g

from backend.api.middlewares.auth_middleware import token_required
from backend.services.legal_case_service import LegalCaseService


legal_case_bp = Blueprint("legal_case_controller", __name__, url_prefix="/legal-cases")
service = LegalCaseService()


def serialize_case(case):
    return {
        "id": str(case.id),
        "title": case.title,
        "description": case.description,
        "status": case.status,
        "client_id": str(case.client_id),
        "organization_id": str(case.organization_id),
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "updated_at": case.updated_at.isoformat() if case.updated_at else None,
    }


@legal_case_bp.route("", methods=["POST"])
@token_required
def create_legal_case():
    data = request.get_json() or {}
    data["organization_id"] = g.organization_id

    legal_case = service.create_case(data)
    return jsonify(serialize_case(legal_case)), 201


@legal_case_bp.route("", methods=["GET"])
@token_required
def list_legal_cases():
    org_id = g.organization_id
    cases = service.list_cases(org_id)
    return jsonify([serialize_case(c) for c in cases])


@legal_case_bp.route("/<case_id>", methods=["GET"])
@token_required
def get_legal_case(case_id):
    org_id = g.organization_id
    case = service.get_case_by_id(case_id, org_id)

    if not case:
        return jsonify({"error": "case_not_found"}), 404

    return jsonify(serialize_case(case))