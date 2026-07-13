# backend/api/controllers/auth_controller.py

from flask import Blueprint, request, jsonify

from backend.core.database import get_db
from backend.repositories.user_repository import UserRepository
from backend.core.security import verify_password, hash_password, create_access_token


auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email e senha são obrigatórios'}), 400

    with get_db() as db:
        repo = UserRepository(db)
        user = repo.find_by_email(data['email'])
        if not user or not verify_password(data['password'], user['password']):
            return jsonify({'error': 'Credenciais inválidas'}), 401

        token = create_access_token({'user_id': user['id']})

        return jsonify({
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
            }
        })


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email e senha são obrigatórios'}), 400

    with get_db() as db:
        repo = UserRepository(db)
        if repo.find_by_email(data['email']):
            return jsonify({'error': 'Email já cadastrado'}), 409

        hashed_password = hash_password(data['password'])
        user = repo.create(data['email'], hashed_password)

        token = create_access_token({'user_id': user['id']})

        return jsonify({
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
            }
        })