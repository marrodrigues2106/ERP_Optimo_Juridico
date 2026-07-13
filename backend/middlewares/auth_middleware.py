# backend/api/middlewares/auth_middleware.py

from flask import g, request, jsonify
from functools import wraps
from backend.core.auth import decode_token


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'message': 'Token ausente ou formato inválido!'}), 401
        else:
            return jsonify({'message': 'Header Authorization ausente!'}), 401

        try:
            data = decode_token(token)
            g.user_id = data['user_id']
            g.organization_id = data['organization_id']
        except Exception:
            return jsonify({'message': 'Token inválido!'}), 401

        return f(*args, **kwargs)
    return decorated