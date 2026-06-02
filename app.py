import os
import bcrypt
import jwt
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from services.gemini_service import check_text_grammar, generate_error_explanation
from models import db, User, ActivityHistory

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend cross-origin requests

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'super-secret-key-for-jwt-and-session' # Should ideally be in Config/env

db.init_app(app)

# Create tables if they don't exist
with app.app_context():
    db.create_all()

# --- Auth Helper ---
def token_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'message': 'Token is missing'}), 401
        token = token.split(" ")[1]
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
        except Exception as e:
            return jsonify({'message': 'Token is invalid'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# --- Endpoints ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name', '').strip()
    birthdate_str = data.get('birthdate', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not name or not birthdate_str or not email or not password:
        return jsonify({'message': 'Faltan campos por llenar'}), 400

    if len(password) < 8:
        return jsonify({'message': 'La contraseña debe tener 8 o más caracteres'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'El usuario ya existe con ese correo'}), 409

    try:
        birthdate_obj = datetime.strptime(birthdate_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Formato de fecha inválido (debe ser YYYY-MM-DD)'}), 400

    # Hash the password
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    new_user = User(name=name, birthdate=birthdate_obj, email=email, password_hash=hashed_pw)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User created successfully', 'status': 'success'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()

    if user and bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        # Generate token valid for 7 days
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({'token': token, 'name': user.name, 'email': user.email, 'status': 'success'})

    return jsonify({'message': 'Credenciales inválidas'}), 401

import json

@app.route('/api/history', methods=['POST'])
@token_required
def save_history(current_user):
    payload = request.get_json() or {}
    module = payload.get('module', '').strip()
    data_str = payload.get('data', '').strip()

    if not module or not data_str:
        return jsonify({'message': 'Faltan campos module o data'}), 400

    # Parse incoming JSON to extract the text
    try:
        new_data = json.loads(data_str)
        new_text = new_data.get('text')
    except Exception:
        new_text = None

    if new_text is not None:
        # Check if we already have a record for this exact text in this module
        existing_records = ActivityHistory.query.filter_by(user_id=current_user.id, module=module).order_by(ActivityHistory.created_at.desc()).all()
        for record in existing_records:
            try:
                record_data = json.loads(record.data)
                if record_data.get('text') == new_text:
                    # Exact text match found! Merge explanations so we don't lose them
                    old_explanations = record_data.get('explanations', {})
                    new_explanations = new_data.get('explanations', {})
                    
                    merged_explanations = old_explanations.copy()
                    merged_explanations.update(new_explanations)
                    
                    new_data['explanations'] = merged_explanations
                    record.data = json.dumps(new_data)
                    db.session.commit()
                    
                    return jsonify({'message': 'History updated (merged)', 'status': 'success', 'id': record.id}), 200
            except Exception:
                continue

    # If no match found, create a new record
    new_history = ActivityHistory(user_id=current_user.id, module=module, data=data_str)
    db.session.add(new_history)
    db.session.commit()

    return jsonify({'message': 'History saved', 'status': 'success', 'id': new_history.id}), 201

@app.route('/api/history', methods=['GET'])
@token_required
def get_history(current_user):
    module = request.args.get('module', None)
    query = ActivityHistory.query.filter_by(user_id=current_user.id)
    
    if module:
        query = query.filter_by(module=module)
        
    records = query.order_by(ActivityHistory.created_at.desc()).all()
    
    result = []
    for r in records:
        result.append({
            'id': r.id,
            'module': r.module,
            'data': r.data,
            'created_at': r.created_at.isoformat()
        })
        
    return jsonify({'status': 'success', 'history': result})

@app.route('/api/history/<int:history_id>', methods=['PUT'])
@token_required
def update_history(current_user, history_id):
    record = ActivityHistory.query.filter_by(id=history_id, user_id=current_user.id).first()
    if not record:
        return jsonify({'message': 'Registro no encontrado'}), 404
        
    payload = request.get_json() or {}
    data_str = payload.get('data', '').strip()
    if data_str:
        record.data = data_str
        db.session.commit()
        
    return jsonify({'message': 'History updated', 'status': 'success'})

@app.route('/api/history/<int:history_id>', methods=['DELETE'])
@token_required
def delete_history(current_user, history_id):
    record = ActivityHistory.query.filter_by(id=history_id, user_id=current_user.id).first()
    
    if not record:
        return jsonify({'message': 'Registro no encontrado o no tienes permiso'}), 404
        
    db.session.delete(record)
    db.session.commit()
    
    return jsonify({'message': 'Registro eliminado exitosamente', 'status': 'success'})

@app.route('/api/check', methods=['POST'])
def check_text():
    data = request.get_json() or {}
    text = data.get('text', '').strip()
    lang = data.get('language', 'en')
    
    if not text:
        return jsonify({
            "text": "",
            "matches": [],
            "status": "success",
            "message": "No text provided"
        })
        
    try:
        result = check_text_grammar(text, lang)
        
        if result.get('status') == 'error' and result.get('is_429'):
            return jsonify({'status': 'error', **result['error_info']}), 429
            
        return jsonify(result)
        
    except Exception as e:
        print(f"Error checking text with Gemini: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Gemini analysis failed: {str(e)}"
        }), 500


@app.route('/api/explain', methods=['POST'])
def explain_error():
    data = request.get_json() or {}
    error_segment = data.get('errorSegment', '').strip()
    message = data.get('message', '').strip()
    phenomenon = data.get('phenomenon', '').strip()
    topic = data.get('topic', '').strip()
    sentence = data.get('sentence', '').strip()
    replacements = data.get('replacements', [])

    if not error_segment:
        return jsonify({"status": "error", "message": "No error segment provided"}), 400

    try:
        result = generate_error_explanation(
            error_segment, message, phenomenon, topic, sentence, replacements
        )
        
        if result.get('status') == 'error' and result.get('is_429'):
            return jsonify({'status': 'error', **result['error_info']}), 429

        return jsonify(result)

    except Exception as e:
        print(f"Error explaining error with Gemini: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Gemini explanation failed: {str(e)}"
        }), 500


from services.gemini_service import generate_practice_sentences, generate_pronunciation_feedback
try:
    from services.pronunciation_service import evaluate_pronunciation, convert_webm_to_wav
except Exception as _e:
    print(f"WARNING: pronunciation_service could not be loaded: {_e}")
    def evaluate_pronunciation(*a, **kw):
        return {"status": "error", "message": "Servicio de pronunciación no disponible."}
    def convert_webm_to_wav(*a, **kw):
        return False
import os
import tempfile

@app.route('/api/generate_sentences', methods=['POST'])
def generate_sentences_route():
    data = request.get_json() or {}
    topic = data.get('topic', '').strip()
    count = data.get('count', 5)
    
    if not topic:
        return jsonify({"status": "error", "message": "No topic provided"}), 400
        
    try:
        result = generate_practice_sentences(topic, count)
        
        if result.get('status') == 'error' and result.get('is_429'):
            return jsonify({'status': 'error', **result['error_info']}), 429
            
        return jsonify(result)
    except Exception as e:
        print(f"Error generating sentences: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/pronunciation', methods=['POST'])
def pronunciation_route():
    if 'audio' not in request.files:
        return jsonify({"status": "error", "message": "No audio file provided"}), 400
        
    audio_file = request.files['audio']
    sentence = request.form.get('sentence', '')
    accuracy = request.form.get('accuracy', '80')
    
    try:
        accuracy_val = int(accuracy)
    except ValueError:
        accuracy_val = 80
    
    if not sentence:
        return jsonify({"status": "error", "message": "No sentence provided"}), 400
        
    try:
        # Create a temporary directory to store and convert audio
        with tempfile.TemporaryDirectory() as temp_dir:
            is_wav = audio_file.filename.endswith('.wav')
            
            if is_wav:
                target_path = os.path.join(temp_dir, 'record.wav')
                audio_file.save(target_path)
            else:
                webm_path = os.path.join(temp_dir, 'record.webm')
                wav_path = os.path.join(temp_dir, 'record.wav')
                
                audio_file.save(webm_path)
                
                # Convierte webm a wav para allosaurus
                converted = convert_webm_to_wav(webm_path, wav_path)
                target_path = wav_path if converted else webm_path
            
            # Evaluar con Allosaurus
            result = evaluate_pronunciation(target_path, sentence, accuracy_val)
            
            return jsonify(result)
    except Exception as e:
        print(f"Error in pronunciation route: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/pronunciation_details', methods=['POST'])
def pronunciation_details_route():
    data = request.get_json() or {}
    word = data.get('word', '')
    expected = data.get('expected_phonemes', '')
    actual = data.get('actual_phonemes', '')
    sentence = data.get('sentence', '')
    
    if not word or not sentence:
        return jsonify({"status": "error", "message": "Missing parameters"}), 400
        
    try:
        result = generate_pronunciation_feedback(word, expected, actual, sentence)
        
        if result.get('status') == 'error' and result.get('is_429'):
            return jsonify({'status': 'error', **result['error_info']}), 429
            
        return jsonify(result)
    except Exception as e:
        print(f"Error generating pronunciation details: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    print("Starting Flask server powered by Gemini on http://localhost:5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
