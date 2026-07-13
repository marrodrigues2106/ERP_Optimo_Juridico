# backend/api/controllers/task_controller.py

from flask import Blueprint, request, jsonify, g
from uuid import UUID

from backend.api.middlewares.auth_middleware import token_required
from backend.services.task_service import TaskService


task_bp = Blueprint("task_controller", __name__, url_prefix="/tasks")
service = TaskService()


def serialize_task(task):
    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "deadline": task.deadline.isoformat() if task.deadline else None,
        "responsible_user_id": str(task.responsible_user_id),
        "client_id": str(task.client_id) if task.client_id else None,
        "legal_case_id": str(task.legal_case_id) if task.legal_case_id else None,
        "organization_id": str(task.organization_id),
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }


@task_bp.route("", methods=["POST"])
@token_required
def create_task():
    data = request.get_json() or {}
    data["organization_id"] = g.organization_id
    task = service.create_task(data)
    return jsonify(serialize_task(task)), 201


@task_bp.route("", methods=["GET"])
@token_required
def list_tasks():
    org_id = g.organization_id
    tasks = service.list_tasks(org_id)
    return jsonify([serialize_task(t) for t in tasks])


@task_bp.route("/<task_id>", methods=["GET"])
@token_required
def get_task(task_id):
    org_id = g.organization_id
    task = service.get_task_by_id(task_id, org_id)

    if not task:
        return jsonify({"error": "task_not_found"}), 404

    return jsonify(serialize_task(task))


@task_bp.route("/responsible/<user_id>", methods=["GET"])
@token_required
def list_tasks_by_responsible(user_id):
    org_id = g.organization_id
    tasks = service.list_tasks_by_responsible(user_id, org_id)
    return jsonify([serialize_task(t) for t in tasks])


@task_bp.route("/client/<client_id>", methods=["GET"])
@token_required
def list_tasks_by_client(client_id):
    org_id = g.organization_id
    tasks = service.list_tasks_by_client(client_id, org_id)
    return jsonify([serialize_task(t) for t in tasks])


@task_bp.route("/legal-case/<case_id>", methods=["GET"])
@token_required
def list_tasks_by_legal_case(case_id):
    org_id = g.organization_id
    tasks = service.list_tasks_by_legal_case(case_id, org_id)
    return jsonify([serialize_task(t) for t in tasks])