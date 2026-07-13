import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configurações básicas
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-do-not-use-in-prod')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
    }
    
    # Inicializa SQLAlchemy
    db = SQLAlchemy()
    db.init_app(app)
    
    # Suporte a CORS
    CORS(app)
    
    # Registro de blueprints (descomente e ajuste conforme estrutura)
    # from api import bp as api_bp
    # app.register_blueprint(api_bp, url_prefix='/api')
    
    # Tratamento de erros
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Endpoint não encontrado'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Erro interno do servidor'}), 500
    
    # Rota de health check mínima e funcional
    @app.route('/health')
    def health():
        return jsonify({'status': 'OK'})
    
    return app, db

app, db = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    with app.app_context():
        # Para desenvolvimento: crie tabelas (importe models antes)
        # db.create_all()
        pass
    
    app.run(debug=debug, host='0.0.0.0', port=port)