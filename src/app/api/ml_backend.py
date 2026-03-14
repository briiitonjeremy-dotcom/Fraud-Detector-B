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
CORS(app)

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
        Expired - else:
            # remove
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


# ============== MAIN ==============

# Load model when app starts
if __name__ == '__main__':
    load_model()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
