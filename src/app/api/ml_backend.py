"""
FraudGuard ML Backend - Complete Flask Application
Features:
- Model loaded once at startup (not per request)
- Batch processing (250-500 rows)
- Comprehensive logging
- Optimized for larger datasets
- Authentication with role-based access control
- Admin user management
"""

import os
import logging
import time
import uuid
from datetime import datetime
import hashlib
from functools import wraps
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Allow requests from the Vercel frontend and local dev.
# The proxy on Vercel eliminates browser CORS, but keeping explicit CORS
# config here ensures direct API calls also work during development.
CORS(
    app,
    resources={r"/*": {"origins": [
        "https://fraud-detector-b.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
    ]}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
)


@app.before_request
def handle_preflight():
    """Return 200 immediately for all OPTIONS preflight requests."""
    if request.method == "OPTIONS":
        return "", 200

# Secret key for sessions (in production, use environment variable)
app.secret_key = os.environ.get('SECRET_KEY', 'fraudguard-secret-key-change-in-production')

# Global variables for model and feature columns (loaded once at startup)
MODEL = None
FEATURE_COLUMNS = None
MODEL_LOADED = False

# Batch size for processing
BATCH_SIZE = 250

# ============== IN-MEMORY USER DATABASE ==============
# In production, use a real database (PostgreSQL, MySQL, etc.)
# This is a simplified in-memory store for demonstration
USERS_DB = {
    1: {
        'id': 1,
        'email': 'admin@fraudguard.com',
        'name': 'Admin User',
        'password_hash': hashlib.sha256('admin123'.encode()).hexdigest(),
        'role': 'admin',
        'is_active': True,
        'created_at': '2024-01-01T00:00:00'
    },
    2: {
        'id': 2,
        'email': 'user@fraudguard.com',
        'name': 'Regular User',
        'password_hash': hashlib.sha256('user123'.encode()).hexdigest(),
        'role': 'user',
        'is_active': True,
        'created_at': '2024-01-01T00:00:00'
    },
    3: {
        'id': 3,
        'email': 'braightonjeremy@gmail.com',
        'name': 'Braighton Jeremy',
        'password_hash': hashlib.sha256('admin123'.encode()).hexdigest(),
        'role': 'admin',
        'is_active': True,
        'created_at': '2024-01-01T00:00:00'
    }
}

# Next user ID
NEXT_USER_ID = 4

# In-memory session store (in production, use Redis or database)
SESSIONS = {}

# In-memory transactions store
TRANSACTIONS_DB = []

# In-memory logs store
ADMIN_LOGS = []


# ============== AUTHENTICATION HELPERS ==============

def hash_password(password):
    """Hash a password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()


def create_session(user):
    """Create a session for a user."""
    session_token = str(uuid.uuid4())
    SESSIONS[session_token] = {
        'user_id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'name': user['name'],
        'created_at': time.time()
    }
    return session_token


def get_session(token):
    """Get session by token."""
    if token in SESSIONS:
        session = SESSIONS[token]
        # Check if session is not expired (24 hours)
        if time.time() - session['created_at'] < 86400:
            return session
        else:
            # Expired - remove
            del SESSIONS[token]
    return None


def get_user_from_session():
    """Get current user from Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    # Check for Bearer token
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        return get_session(token)
    
    return None


def require_auth(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_user_from_session()
        if not user:
            return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """Decorator to require admin role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_user_from_session()
        if not user:
            return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
        if user.get('role') != 'admin':
            return jsonify({'error': 'Forbidden', 'message': 'Admin access required'}), 403
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def log_admin_action(action, target_type=None, target_id=None, details=None):
    """Log an admin action."""
    log_entry = {
        'id': len(ADMIN_LOGS) + 1,
        'admin_id': g.current_user.get('id') if hasattr(g, 'current_user') else None,
        'action': action,
        'target_type': target_type,
        'target_id': str(target_id) if target_id else None,
        'details': details,
        'created_at': time.strftime('%Y-%m-%dT%H:%M:%S')
    }
    ADMIN_LOGS.append(log_entry)
    return log_entry


# ============== MODEL LOADING ==============

def load_model():
    """
    Load the ML model once at startup.
    This is called when the app starts, not on every request.
    """
    global MODEL, FEATURE_COLUMNS, MODEL_LOADED
    
    if MODEL_LOADED:
        logger.info("Model already loaded, skipping...")
        return
    
    try:
        logger.info("Loading ML model...")
        start_time = time.time()
        
        # Import sklearn components
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.preprocessing import StandardScaler
        
        # Create a mock model for demonstration
        # In production, load from file: joblib.load('model.pkl')
        MODEL = {
            'classifier': RandomForestClassifier(n_estimators=100, random_state=42),
            'scaler': StandardScaler()
        }
        
        # Define feature columns expected by the model
        FEATURE_COLUMNS = [
            'step', 'amount', 'oldbalanceOrg', 'newbalanceOrig',
            'oldbalanceDest', 'newbalanceDest'
        ]
        
        # Train on dummy data for demonstration
        # In production, this would load pre-trained model
        X_train = np.random.randn(10000, len(FEATURE_COLUMNS))
        y_train = (np.random.random(10000) > 0.9).astype(int)
        MODEL['scaler'].fit(X_train)
        X_scaled = MODEL['scaler'].transform(X_train)
        MODEL['classifier'].fit(X_scaled, y_train)
        
        MODEL_LOADED = True
        load_time = time.time() - start_time
        logger.info(f"ML model loaded successfully in {load_time:.2f}s")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        MODEL = None
        FEATURE_COLUMNS = None
        MODEL_LOADED = False


def preprocess_transaction(tx_data):
    """
    Preprocess a single transaction for prediction.
    Uses vectorized pandas operations where possible.
    """
    try:
        # Extract features
        features = []
        for col in FEATURE_COLUMNS:
            val = tx_data.get(col, 0)
            try:
                features.append(float(val) if val is not None else 0)
            except (ValueError, TypeError):
                features.append(0)
        
        return np.array(features).reshape(1, -1)
    except Exception as e:
        logger.error(f"Error preprocessing transaction: {e}")
        return None


def preprocess_batch(transactions_df):
    """
    Preprocess a batch of transactions using vectorized operations.
    More efficient than row-by-row processing.
    """
    try:
        # Extract features as numpy array
        features = transactions_df[FEATURE_COLUMNS].fillna(0).values
        
        # Scale using the fitted scaler
        features_scaled = MODEL['scaler'].transform(features)
        
        return features_scaled
    except Exception as e:
        logger.error(f"Error preprocessing batch: {e}")
        return None


def predict_batch(features_scaled):
    """
    Make predictions on a batch of transactions.
    Uses vectorized operations for efficiency.
    """
    try:
        # Get prediction probabilities
        probabilities = MODEL['classifier'].predict_proba(features_scaled)[:, 1]
        
        # Get class predictions
        predictions = (probabilities > 0.5).astype(int)
        
        return predictions, probabilities
    except Exception as e:
        logger.error(f"Error making batch predictions: {e}")
        return None, None


# ============== ROUTES ==============

@app.route('/', methods=['GET'])
def index():
    """Health check endpoint - returns basic info."""
    return jsonify({
        'status': 'ok',
        'service': 'FraudGuard ML API',
        'version': '2.0.0',
        'model_loaded': MODEL_LOADED
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy' if MODEL_LOADED else 'model_not_loaded',
        'model_loaded': MODEL_LOADED,
        'batch_size': BATCH_SIZE
    })


@app.route('/setup', methods=['POST'])
def setup():
    """
    Setup endpoint - initializes admin user if not exists.
    This is a one-time setup endpoint for demo purposes.
    """
    global USERS_DB, NEXT_USER_ID
    
    # Check if admin already exists
    admin_exists = any(u.get('role') == 'admin' for u in USERS_DB.values())
    
    if admin_exists:
        return jsonify({
            'message': 'Admin user already exists',
            'users': [{'id': u['id'], 'email': u['email'], 'role': u['role']} for u in USERS_DB.values()]
        })
    
    # Create admin user
    admin_user = {
        'id': 1,
        'email': 'admin@fraudguard.com',
        'name': 'Admin User',
        'password_hash': hashlib.sha256('admin123'.encode()).hexdigest(),
        'role': 'admin',
        'is_active': True,
        'created_at': '2024-01-01T00:00:00'
    }
    
    # Create regular user
    regular_user = {
        'id': 2,
        'email': 'user@fraudguard.com',
        'name': 'Regular User',
        'password_hash': hashlib.sha256('user123'.encode()).hexdigest(),
        'role': 'user',
        'is_active': True,
        'created_at': '2024-01-01T00:00:00'
    }
    
    USERS_DB = {
        1: admin_user,
        2: regular_user
    }
    NEXT_USER_ID = 3
    
    logger.info("Setup: Created default users")
    
    return jsonify({
        'message': 'Setup complete - admin user created',
        'admin_email': 'admin@fraudguard.com',
        'admin_password': 'admin123',
        'users': [{'id': u['id'], 'email': u['email'], 'role': u['role']} for u in USERS_DB.values()]
    })


# ============== AUTHENTICATION ROUTES ==============

@app.route('/login', methods=['POST'])
def login():
    """
    Login endpoint.
    Request: { "email": "...", "password": "..." }
    Response: { "message": "Login successful", "user": { "id": 1, "email": "...", "name": "...", "role": "admin" } }
    """
    global USERS_DB, NEXT_USER_ID
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Auto-create admin user if no users exist or admin doesn't exist
        admin_exists = any(u.get('role') == 'admin' for u in USERS_DB.values())
        if not USERS_DB or not admin_exists:
            logger.info("No admin user found - creating default admin user")
            admin_user = {
                'id': 1,
                'email': 'admin@fraudguard.com',
                'name': 'Admin User',
                'password_hash': hashlib.sha256('admin123'.encode()).hexdigest(),
                'role': 'admin',
                'is_active': True,
                'created_at': '2024-01-01T00:00:00'
            }
            USERS_DB = {1: admin_user}
            NEXT_USER_ID = 2
        
        # Also ensure default users exist for testing
        if len(USERS_DB) < 3:
            logger.info("Adding default test users")
            users_to_add = [
                {'email': 'user@fraudguard.com', 'name': 'Regular User', 'password': 'user123', 'role': 'user'},
                {'email': 'braightonjeremy@gmail.com', 'name': 'Braighton Jeremy', 'password': 'admin123', 'role': 'admin'}
            ]
            for user_data in users_to_add:
                # Check if user already exists
                exists = any(u['email'].lower() == user_data['email'].lower() for u in USERS_DB.values())
                if not exists:
                    USERS_DB[NEXT_USER_ID] = {
                        'id': NEXT_USER_ID,
                        'email': user_data['email'],
                        'name': user_data['name'],
                        'password_hash': hashlib.sha256(user_data['password'].encode()).hexdigest(),
                        'role': user_data['role'],
                        'is_active': True,
                        'created_at': '2024-01-01T00:00:00'
                    }
                    NEXT_USER_ID += 1
        
        # Find user by email
        user = None
        for u in USERS_DB.values():
            if u['email'].lower() == email:
                user = u
                break
        
        # Auto-create admin user if trying to login as admin and user doesn't exist
        # This handles the case where the deployed backend doesn't have the admin seeded
        if not user and email == 'admin@fraudguard.com':
            logger.info("Admin user not found - auto-creating on login attempt")
            admin_user = {
                'id': NEXT_USER_ID,
                'email': 'admin@fraudguard.com',
                'name': 'Admin User',
                'password_hash': hashlib.sha256('admin123'.encode()).hexdigest(),
                'role': 'admin',
                'is_active': True,
                'created_at': time.strftime('%Y-%m-%dT%H:%M:%S')
            }
            USERS_DB[NEXT_USER_ID] = admin_user
            user = admin_user
            NEXT_USER_ID += 1
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check password
        password_hash = hash_password(password)
        if user['password_hash'] != password_hash:
            logger.warning(f"Failed login attempt for email: {email}")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if user is active
        if not user.get('is_active', True):
            logger.warning(f"Login attempt for disabled account: {email}")
            return jsonify({'error': 'Account is disabled'}), 403
        
        # Create session
        session_token = create_session(user)
        
        # Log successful login
        logger.info(f"USER LOGIN: {user['email']} | Role: {user['role']} | ID: {user['id']}")
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'role': user['role'],
                'is_active': user.get('is_active', True)
            },
            'session_token': session_token
        })
        
    except Exception as e:
        logger.error(f"Error in /login: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/logout', methods=['POST'])
@require_auth
def logout():
    """Logout endpoint - invalidates the session."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        if token in SESSIONS:
            del SESSIONS[token]
    
    return jsonify({'message': 'Logged out successfully'})


@app.route('/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current user info."""
    user = g.current_user
    return jsonify({
        'user': {
            'id': user.get('id'),
            'email': user.get('email'),
            'name': user.get('name'),
            'role': user.get('role'),
            'is_active': user.get('is_active', True)
        }
    })


# ============== ML PREDICTION ROUTES ==============

@app.route('/predict', methods=['POST'])
@require_auth
def predict():
    """
    Main prediction endpoint.
    Accepts JSON with 'transactions' array.
    Processes in batches for better performance.
    """
    request_start = time.time()
    
    # Log request received
    logger.info("=" * 60)
    logger.info("REQUEST RECEIVED: /predict")
    logger.info(f"User: {g.current_user.get('email')} ({g.current_user.get('role')})")
    logger.info("=" * 60)
    
    try:
        # Parse request
        data = request.get_json()
        
        if not data or 'transactions' not in data:
            logger.warning("Invalid request: missing 'transactions' field")
            return jsonify({'error': 'Missing transactions array'}), 400
        
        transactions = data['transactions']
        total_count = len(transactions)
        
        logger.info(f"CSV parsing time: {time.time() - request_start:.2f}s")
        logger.info(f"Processing {total_count} transactions in batches of {BATCH_SIZE}")
        
        if not MODEL_LOADED:
            logger.error("Model not loaded!")
            return jsonify({'error': 'Model not loaded'}), 500
        
        # Convert to DataFrame for efficient batch processing
        preprocess_start = time.time()
        
        try:
            df = pd.DataFrame(transactions)
            logger.info(f"DataFrame created with {len(df)} rows")
            
            # Handle missing columns
            for col in FEATURE_COLUMNS:
                if col not in df.columns:
                    df[col] = 0
            
            logger.info(f"Preprocessing time: {time.time() - preprocess_start:.2f}s")
            
        except Exception as e:
            logger.error(f"Error creating DataFrame: {e}")
            return jsonify({'error': f'Failed to process transactions: {str(e)}'}), 400
        
        # Process in batches
        prediction_start = time.time()
        all_predictions = []
        all_probabilities = []
        
        num_batches = (len(df) + BATCH_SIZE - 1) // BATCH_SIZE
        logger.info(f"Processing in {num_batches} batches...")
        
        for i in range(0, len(df), BATCH_SIZE):
            batch_df = df.iloc[i:i+BATCH_SIZE]
            batch_num = (i // BATCH_SIZE) + 1
            
            logger.info(f"Processing batch {batch_num}/{num_batches} ({len(batch_df)} rows)")
            
            # Preprocess batch
            features_scaled = preprocess_batch(batch_df)
            
            if features_scaled is not None:
                # Get predictions
                preds, probs = predict_batch(features_scaled)
                
                if preds is not None:
                    all_predictions.extend(preds.tolist())
                    all_probabilities.extend(probs.tolist())
        
        logger.info(f"Prediction time: {time.time() - prediction_start:.2f}s")
        
        # Build results - only return necessary fields
        results = []
        for i, tx in enumerate(transactions):
            tx_result = {
                'transaction_id': tx.get('transaction_id', tx.get('nameOrig', f'TXN_{i+1}')),
                'prediction': float(all_probabilities[i]) if i < len(all_probabilities) else 0,
                'is_fraud': bool(all_predictions[i]) if i < len(all_predictions) else False,
            }
            results.append(tx_result)
            
            # Also store to TRANSACTIONS_DB for admin page consistency
            TRANSACTIONS_DB.append({
                'id': len(TRANSACTIONS_DB) + 1,
                'transaction_id': tx_result['transaction_id'],
                'amount': float(tx.get('amount', 0)),
                'fraud_score': float(all_probabilities[i] * 100) if i < len(all_probabilities) else 0,
                'is_fraud': tx_result['is_fraud'],
                'type': tx.get('type', ''),
                'nameOrig': tx.get('nameOrig', ''),
                'nameDest': tx.get('nameDest', ''),
                'channel': tx.get('channel', ''),
                'region': tx.get('region', ''),
                'created_at': datetime.now().isoformat()
            })
        
        total_time = time.time() - request_start
        logger.info(f"TOTAL RESPONSE TIME: {total_time:.2f}s")
        logger.info(f"Fraud detected: {sum(all_predictions)}/{len(all_predictions)}")
        
        return jsonify({
            'predictions': results,
            'summary': {
                'total_transactions': len(results),
                'fraud_detected': sum(all_predictions),
                'fraud_rate': float(sum(all_predictions) / len(results) * 100) if results else 0,
                'processing_time_seconds': round(total_time, 2)
            }
        })
        
    except Exception as e:
        logger.error(f"Error in /predict: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/process-dataset', methods=['POST'])
@require_auth
def process_dataset():
    """
    Alternative endpoint for processing CSV content directly.
    This is kept for backward compatibility but uses the same optimized logic.
    """
    request_start = time.time()
    
    logger.info(f"REQUEST RECEIVED: /process-dataset (User: {g.current_user.get('email')})")
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        csv_content = data.get('csv_content', '')
        file_name = data.get('file_name', 'data.csv')
        
        if not csv_content:
            return jsonify({'error': 'No csv_content provided'}), 400
        
        parse_start = time.time()
        
        # Parse CSV
        from io import StringIO
        df = pd.read_csv(StringIO(csv_content))
        
        logger.info(f"CSV parsing time: {time.time() - parse_start:.2f}s")
        logger.info(f"Processing {len(df)} rows")
        
        # Convert to transactions list
        transactions = df.to_dict('records')
        
        # Use /predict logic
        # We'll call predict directly by setting up the request
        request.json = {'transactions': transactions}
        
        return predict()
        
    except Exception as e:
        logger.error(f"Error in /process-dataset: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# ============== ADMIN ROUTES (PROTECTED) ==============

@app.route('/admin/users', methods=['GET'])
@require_admin
def admin_get_users():
    """
    Get all users (admin only).
    Requires admin role.
    """
    log_admin_action('view_users', 'system', None, 'Viewed user list')
    
    users = []
    for u in USERS_DB.values():
        users.append({
            'id': u['id'],
            'email': u['email'],
            'name': u['name'],
            'role': u['role'],
            'is_active': u.get('is_active', True),
            'created_at': u.get('created_at')
        })
    
    return jsonify({'users': users})


@app.route('/admin/users', methods=['POST'])
@require_admin
def admin_create_user():
    """
    Create a new user (admin only).
    Requires admin role.
    """
    global NEXT_USER_ID
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        name = data.get('name', '')
        role = data.get('role', 'user')  # Default to 'user', not 'admin'
        
        if not email or not password or not name:
            return jsonify({'error': 'Email, name, and password are required'}), 400
        
        # Validate role
        if role not in ['admin', 'user', 'analyst', 'viewer']:
            return jsonify({'error': 'Invalid role'}), 400
        
        # Check if email already exists
        for u in USERS_DB.values():
            if u['email'].lower() == email:
                return jsonify({'error': 'Email already exists'}), 400
        
        # Create user
        new_user = {
            'id': NEXT_USER_ID,
            'email': email,
            'name': name,
            'password_hash': hash_password(password),
            'role': role,
            'is_active': True,
            'created_at': time.strftime('%Y-%m-%dT%H:%M:%S')
        }
        
        USERS_DB[NEXT_USER_ID] = new_user
        NEXT_USER_ID += 1
        
        log_admin_action('create_user', 'user', new_user['id'], f'Created user: {email} with role: {role}')
        
        return jsonify({
            'message': 'User created successfully',
            'user': {
                'id': new_user['id'],
                'email': new_user['email'],
                'name': new_user['name'],
                'role': new_user['role']
            }
        })
        
    except Exception as e:
        logger.error(f"Error creating user: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
@require_admin
def admin_delete_user(user_id):
    """
    Delete a user (admin only).
    Requires admin role.
    Cannot delete yourself.
    """
    # Get current admin user
    admin_user = g.current_user
    
    # Check if trying to delete yourself
    if user_id == admin_user.get('user_id'):
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    if user_id not in USERS_DB:
        return jsonify({'error': 'User not found'}), 404
    
    user = USERS_DB[user_id]
    user_email = user['email']
    
    del USERS_DB[user_id]
    
    log_admin_action('delete_user', 'user', user_id, f'Deleted user: {user_email}')
    
    return jsonify({'message': 'User deleted successfully'})


@app.route('/admin/users/<int:user_id>/status', methods=['PUT'])
@require_admin
def admin_toggle_user_status(user_id):
    """
    Toggle user active status (admin only).
    Requires admin role.
    """
    try:
        data = request.get_json()
        is_active = data.get('is_active', True)
        
        if user_id not in USERS_DB:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if trying to deactivate yourself
        admin_user = g.current_user
        if user_id == admin_user.get('user_id'):
            return jsonify({'error': 'Cannot deactivate your own account'}), 400
        
        USERS_DB[user_id]['is_active'] = is_active
        
        log_admin_action('toggle_user_status', 'user', user_id, 
                        f'Set active={is_active} for user ID: {user_id}')
        
        return jsonify({'message': 'User status updated successfully'})
        
    except Exception as e:
        logger.error(f"Error toggling user status: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/admin/transactions', methods=['GET'])
@require_admin
def admin_get_transactions():
    """
    Get all transactions (admin only).
    Requires admin role.
    """
    # Return in-memory transactions or mock data
    transactions = TRANSACTIONS_DB if TRANSACTIONS_DB else []
    
    log_admin_action('view_transactions', 'system', None, 'Viewed transaction list')
    
    return jsonify({'transactions': transactions})


@app.route('/admin/stats', methods=['GET'])
@require_admin
def admin_get_stats():
    """
    Get admin statistics (admin only).
    Requires admin role.
    """
    stats = {
        'total_users': len(USERS_DB),
        'total_transactions': len(TRANSACTIONS_DB),
        'total_logs': len(ADMIN_LOGS),
        'flagged_transactions': len([t for t in TRANSACTIONS_DB if t.get('is_fraud', False)])
    }
    
    return jsonify({'stats': stats})


@app.route('/admin/logs', methods=['GET'])
@require_admin
def admin_get_logs():
    """
    Get admin logs (admin only).
    Requires admin role.
    """
    logs = ADMIN_LOGS[-100:]  # Last 100 logs
    
    return jsonify({'logs': logs})


# ============== ANALYST AI ASSISTANT ENDPOINTS ==============

CASES_DB = []
CASE_REVIEWS = []
CASE_ID_COUNTER = 1

def generate_case_id():
    global CASE_ID_COUNTER
    case_id = f"FG-2026-{CASE_ID_COUNTER:05d}"
    CASE_ID_COUNTER += 1
    return case_id


@app.route('/analyst/cases', methods=['GET', 'POST', 'OPTIONS'])
def analyst_cases_endpoint():
    """GET: list all cases. POST: create a new case."""
    if request.method == 'OPTIONS':
        return "", 200

    user = get_user_from_session()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    if request.method == 'GET':
        cases = [c for c in CASES_DB if c.get('status') != 'resolved']
        return jsonify({'cases': cases})

    # POST — create case
    return _create_case_logic(user)


@app.route('/analyst/cases/<case_id>', methods=['GET', 'OPTIONS'])
def analyst_case_detail(case_id):
    """Get detailed case information."""
    if request.method == 'OPTIONS':
        return "", 200

    user = get_user_from_session()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    case = next((c for c in CASES_DB if c.get('case_id') == case_id), None)
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    return jsonify({'case': case})


def _create_case_logic(user):
    """Internal: create an analyst case from a transaction."""
    global CASES_DB

    data = request.get_json() or {}
    transaction_id = data.get('transaction_id')
    transaction_data = data.get('transaction', {})
    
    if not transaction_id:
        return jsonify({'error': 'Transaction ID required'}), 400
    
    case_id = generate_case_id()
    
    fraud_score = transaction_data.get('fraud_score', 0)
    risk_level = "HIGH" if fraud_score >= 70 else "SUSPICIOUS" if fraud_score >= 50 else "MEDIUM" if fraud_score >= 30 else "LOW"
    
    case_type = "suspicious_transaction"
    if fraud_score >= 70:
        case_type = "criminal_fraud"
    elif "new device" in str(transaction_data).lower() or "failed otp" in str(transaction_data).lower():
        case_type = "account_takeover"
    
    reasons = []
    if fraud_score >= 50:
        reasons.append(f"High fraud model score ({fraud_score:.1f}%)")
    if transaction_data.get('amount', 0) > 50000:
        reasons.append("Transaction amount significantly above customer baseline")
    if transaction_data.get('channel') == 'M-PESA':
        reasons.append("M-PESA/Bank transfer channel flagged")
    if not transaction_data.get('channel'):
        reasons.append("No transaction channel information")
    
    recommended_authorities = []
    if fraud_score >= 70:
        recommended_authorities.append("DCI")
    if fraud_score >= 50:
        recommended_authorities.append("FRC")
    if not recommended_authorities:
        recommended_authorities.append("Internal Review Only")
    
    case = {
        'case_id': case_id,
        'transaction_id': transaction_id,
        'customer_reference': transaction_data.get('nameOrig', transaction_data.get('sender', 'Unknown')),
        'risk_score': fraud_score,
        'risk_level': risk_level,
        'case_type': case_type,
        'status': 'pending_review',
        'recommended_authorities': recommended_authorities,
        'human_review_required': True,
        'created_at': datetime.now().isoformat(),
        'last_action': 'Case created - awaiting analyst review',
        'confidence_note': 'AI-generated draft based on available evidence; analyst confirmation required before any external submission.',
        
        'summary': f"This transaction was flagged as {risk_level} risk with a fraud score of {fraud_score:.1f}%. "
                   f"The system detected indicators consistent with possible fraud. "
                   f"Human review is required before any external reporting.",
        
        'reasons': reasons,
        
        'evidence': [
            {'type': 'model_score', 'label': 'Fraud Model Score', 'value': f"{fraud_score:.1f}%"},
            {'type': 'amount', 'label': 'Transaction Amount', 'value': f"KES {transaction_data.get('amount', 0):,.0f}"},
            {'type': 'channel', 'label': 'Channel', 'value': transaction_data.get('channel', 'Unknown')},
            {'type': 'transaction_type', 'label': 'Transaction Type', 'value': transaction_data.get('type', 'Unknown')},
            {'type': 'sender', 'label': 'Sender Account', 'value': transaction_data.get('nameOrig', 'Unknown')},
            {'type': 'recipient', 'label': 'Recipient Account', 'value': transaction_data.get('nameDest', 'Unknown')},
        ],
        
        'timeline': [
            {'timestamp': datetime.now().isoformat(), 'event': 'transaction_flagged', 'description': 'Transaction flagged by fraud model'},
            {'timestamp': datetime.now().isoformat(), 'event': 'case_created', 'description': 'Case created for analyst review'},
        ],
        
        'narrative_report': f"""CASE SUMMARY REPORT
============================
Case ID: {case_id}
Transaction ID: {transaction_id}
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

RISK ASSESSMENT
---------------
Risk Score: {fraud_score:.1f}%
Risk Level: {risk_level}
Case Type: {case_type}

SUMMARY
-------
This transaction was flagged as {risk_level} risk. The fraud model detected patterns that warrant analyst investigation. 
Key indicators include: {', '.join(reasons) if reasons else 'Standard fraud model alert'}.

RECOMMENDATION
--------------
This case is recommended for analyst review. {"External reporting to " + ", ".join(recommended_authorities) + " should only occur after analyst and compliance approval." if recommended_authorities != ["Internal Review Only"] else "Case appears suitable for internal review only."}

CONFIDENTIALITY NOTICE
----------------------
This is an AI-assisted draft. All findings must be verified by qualified analyst personnel before external submission.
""",
        
        'structured_report': {
            'case_id': case_id,
            'transaction_id': transaction_id,
            'report_type': case_type,
            'risk_score': fraud_score,
            'risk_level': risk_level,
            'report_to': recommended_authorities,
            'analyst_verification_required': True,
        },
        
        'audit': {
            'model_version': 'v3.2.1',
            'prompt_version': 'fraud-report-prompt-v2',
            'report_timestamp': datetime.now().isoformat(),
            'reviewer_decision': '',
            'reviewer_notes': '',
            'review_timestamp': '',
        },
    }
    
    CASES_DB.append(case)
    log_admin_action('create_case', user.get('email', 'unknown'), case_id, f'Created case for transaction {transaction_id}')

    return jsonify({'case': case, 'success': True})


@app.route('/analyst/chat', methods=['POST', 'OPTIONS'])
def analyst_chat():
    """
    Analyst copilot chat - ask questions about a specific case.
    """
    if request.method == 'OPTIONS':
        return "", 200
    user = get_user_from_session()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    case_id = data.get('case_id')
    question = data.get('question')
    
    if not case_id or not question:
        return jsonify({'error': 'Case ID and question required'}), 400
    
    case = next((c for c in CASES_DB if c.get('case_id') == case_id), None)
    
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    
    risk_score = case.get('risk_score', 0)
    risk_level = case.get('risk_level', 'UNKNOWN')
    reasons = case.get('reasons', [])
    evidence = case.get('evidence', [])
    
    response = generate_analyst_response(question, case)
    
    return jsonify({
        'case_id': case_id,
        'question': question,
        'response': response,
        'timestamp': datetime.now().isoformat()
    })


def generate_analyst_response(question: str, case: dict) -> str:
    """Generate professional analyst-focused responses."""
    question_lower = question.lower()
    risk_score = case.get('risk_score', 0)
    risk_level = case.get('risk_level', 'UNKNOWN')
    reasons = case.get('reasons', [])
    evidence = case.get('evidence', [])
    recommended_authorities = case.get('recommended_authorities', [])
    
    if 'dci' in question_lower and 'route' in question_lower:
        return f"""Authority Routing Analysis:
        
The case is recommended for DCI (Directorate of Criminal Investigations) because:
- High risk score ({risk_score:.1f}%) indicates serious fraud indicators
- Transaction patterns suggest possible cyber-enabled fraud
- Amount and channel characteristics are consistent with electronic fraud

DCI routing is appropriate when there is evidence of criminal activity that may require criminal investigation powers."""
    
    if 'frc' in question_lower and 'route' in question_lower:
        return f"""Authority Routing Analysis:
        
The case is recommended for FRC (Financial Reporting Centre) because:
- Suspicious transaction monitoring flagged this case
- Transaction patterns align with AML-style suspicious activity
- Financial channel indicators warrant FIU attention

FRC routing is appropriate for suspicious transaction reports as required by AML regulations."""
    
    if 'evidence' in question_lower and 'strongest' in question_lower:
        evidence_str = "\n".join([f"- {e.get('label')}: {e.get('value')}" for e in evidence[:5]])
        return f"""Strongest Evidence:
        
{evidence_str}

The fraud model score is the primary indicator. Additional supporting evidence includes transaction channel, amount, and account information."""
    
    if 'evidence' in question_lower and 'missing' in question_lower:
        return f"""Potentially Missing Evidence:
        
- Device metadata (device ID, browser fingerprint)
- IP address geolocation data
- Login attempt history
- OTP attempt logs
- Account age and history
- Previous transaction patterns for this customer

Analyst should request additional evidence from IT/security team before final determination."""
    
    if 'account takeover' in question_lower or 'ato' in question_lower:
        return f"""Account Takeover Analysis:
        
The available indicators {'are consistent with' if risk_score >= 50 else 'partially suggest'} possible account takeover:
- {'High fraud score suggests credential compromise' if risk_score >= 50 else 'Moderate score - investigation needed'}
- Evidence suggests investigation into authentication events
- Recommend checking login history and device fingerprints

This assessment is based on available data. Analyst should verify with authentication logs."""
    
    if 'confidence' in question_lower or 'reliable' in question_lower:
        return f"""Confidence Assessment:
        
Current confidence level: {'HIGH' if risk_score >= 70 else 'MEDIUM' if risk_score >= 40 else 'LOW'}

This assessment is based on:
- Model score reliability
- Available evidence completeness
- Rule trigger confidence

Analyst judgment is required for final determination."""
    
    if 'action' in question_lower or 'next' in question_lower:
        return f"""Recommended Next Actions:
        
1. Review all available evidence in the Evidence Viewer
2. Check timeline for authentication anomalies
3. Verify customer recent activity patterns
4. Document analyst observations
5. Make human review decision (Approve/Reject/Escalate)

External reporting should only proceed after analyst approval."""
    
    if 'structur' in question_lower or 'smurf' in question_lower:
        return f"""Structuring/Smurfing Analysis:
        
Available data does not show clear structuring patterns. 
To assess structuring:
- Review multiple transactions from same source
- Check for just-below-threshold amounts
- Verify frequency patterns

Recommend detailed transaction history analysis."""
    
    if 'internal' in question_lower and 'review' in question_lower:
        return f"""Internal Review Assessment:
        
This case is suitable for internal review because:
- {'Evidence is insufficient for external escalation' if risk_score < 50 else 'Evidence supports escalation but analyst verification needed'}
- Standard monitoring case
- No clear criminal activity indicators

Analyst should document decision rationale."""
    
    return f"""Analyst Guidance:

This case has a risk score of {risk_score:.1f}% ({risk_level}).
Primary reasons for flagging:
{chr(10).join([f"- {r}" for r in reasons[:3]]) if reasons else "- Standard fraud model alert"}

For specific questions about this case, please ask about:
- Why it was routed to a specific authority
- What evidence is strongest or missing
- Whether it resembles known fraud patterns
- What action to take next
- Confidence level of the assessment"""


@app.route('/analyst/review', methods=['POST', 'OPTIONS'])
def submit_case_review():
    """Submit human review decision for a case."""
    if request.method == 'OPTIONS':
        return "", 200
    user = get_user_from_session()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    global CASES_DB, CASE_REVIEWS

    data = request.get_json() or {}
    case_id = data.get('case_id')
    decision = data.get('decision')
    reviewer_notes = data.get('reviewer_notes', '')

    if not case_id or not decision:
        return jsonify({'error': 'Case ID and decision required'}), 400

    case = next((c for c in CASES_DB if c.get('case_id') == case_id), None)
    if not case:
        return jsonify({'error': 'Case not found'}), 404

    valid_decisions = ['approve', 'reject', 'escalate', 'hold_internal', 'request_evidence', 'mark_reviewed']
    if decision not in valid_decisions:
        return jsonify({'error': f'Invalid decision. Must be one of: {valid_decisions}'}), 400

    reviewer_name = user.get('name', user.get('email', 'Unknown'))

    review = {
        'case_id': case_id,
        'decision': decision,
        'reviewer_name': reviewer_name,
        'reviewer_notes': reviewer_notes,
        'review_timestamp': datetime.now().isoformat(),
    }

    CASE_REVIEWS.append(review)

    case['status'] = 'reviewed' if decision == 'mark_reviewed' else 'escalated' if decision == 'escalate' else case['status']
    case['last_action'] = f'Reviewed by {reviewer_name}: {decision}'
    case['audit']['reviewer_decision'] = decision
    case['audit']['reviewer_notes'] = reviewer_notes
    case['audit']['review_timestamp'] = datetime.now().isoformat()

    status_messages = {
        'approve': f'Case approved for external reporting by {reviewer_name}',
        'reject': f'Case rejected by {reviewer_name}. No further action.',
        'escalate': f'Case escalated by {reviewer_name}. Awaiting compliance approval.',
        'hold_internal': f'Case held for internal review only by {reviewer_name}',
        'request_evidence': f'Additional evidence requested by {reviewer_name}',
        'mark_reviewed': f'Case marked as reviewed by {reviewer_name}',
    }

    log_admin_action('case_review', user.get('email', 'unknown'), case_id, status_messages.get(decision, f'Decision: {decision}'))

    return jsonify({
        'success': True,
        'review': review,
        'message': status_messages.get(decision),
        'case': case
    })


@app.route('/analyst/reviews/<case_id>', methods=['GET', 'OPTIONS'])
def get_case_reviews(case_id):
    """Get review history for a case."""
    if request.method == 'OPTIONS':
        return "", 200
    user = get_user_from_session()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    reviews = [r for r in CASE_REVIEWS if r.get('case_id') == case_id]
    return jsonify({'reviews': reviews})


@app.route('/analyst/cases/<case_id>/export', methods=['POST', 'OPTIONS'])
@app.route('/analyst/cases/<case_id>/request-evidence', methods=['POST', 'OPTIONS'])
@app.route('/analyst/cases/<case_id>/send-review', methods=['POST', 'OPTIONS'])
def analyst_case_actions(case_id):
    """Generic handler for case action endpoints."""
    if request.method == 'OPTIONS':
        return "", 200
    user = get_user_from_session()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    case = next((c for c in CASES_DB if c.get('case_id') == case_id), None)
    if not case:
        return jsonify({'error': 'Case not found'}), 404
    return jsonify({'success': True, 'message': 'Action recorded', 'case_id': case_id})


# ============== MAIN ==============

# Load model when app starts
if __name__ == '__main__':
    load_model()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
