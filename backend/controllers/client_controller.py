from flask import Blueprint, request, jsonify, g

from backend.api.middlewares.auth_middleware import token_required
from backend.services.client_service import ClientService
from backend.core.database import get_db


client_bp = Blueprint('client_controller', __name__)


def serialize_client(client):
    return {
        'id': str(client.id),
        'name': client.name,
        'email': client.email,
        'phone': client.phone,
        'organization_id': str(client.organization_id),
        'created_at': client.created_at.isoformat() if client.created_at else None,
        'updated_at': client.updated_at.isoformat() if client.updated_at else None,
    }


@client_bp.route('/clients', methods=['POST'])
@token_required
def create_client():
    db = get_db()
    service = ClientService(db)
    data = request.get_json() or {}
    data['organization_id'] = str(g.organization_id)
    client = service.create_client(data)
    return jsonify(serialize_client(client)), 201


@client_bp.route('/clients', methods=['GET'])
@token_required
def list_clients():
    db = get_db()
    service = ClientService(db)
    org_id = str(g.organization_id)
    clients = service.list_clients(org_id)
    return jsonify([serialize_client(client) for client in clients])


@client_bp.route('/clients/<id>', methods=['GET'])
@token_required
def get_client(id):
    db = get_db()
    service = ClientService(db)
    org_id = str(g.organization_id)
    client = service.get_client_by_id(id, org_id)
    if not client:
        return jsonify({'error': 'Client not found'}), 404
    return jsonify(serialize_client(client))