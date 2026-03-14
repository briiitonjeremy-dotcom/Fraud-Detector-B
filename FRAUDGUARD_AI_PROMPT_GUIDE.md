# FraudGuard AI Prompt Guide - Complete Step-by-Step

> **Status**: Your ML service is already live at https://ml-file-for-url.onrender.com with MongoDB Atlas connection. Use this guide to build the Laravel web application.

---

## Pre-Project Context

Before starting Step 1, provide this context to the AI:

```
I have an existing ML fraud detection service deployed at:
- URL: https://ml-file-for-url.onrender.com
- MongoDB: mongodb+srv://[username]:[password]@[cluster].mongodb.net/fraud_detection

The ML service exposes these endpoints:
- GET /health - Service health check
- POST /predict - Single transaction fraud prediction
- POST /process-dataset - Batch CSV processing
- GET /explain/<transaction_id> - SHAP-based explanation

Now I want to build a Laravel web application to orchestrate this ML service.
```

---

## Step 0: Project Architecture Overview (Day 1)

**Prompt:**

```
I want to build a fintech-oriented web app called "FraudGuard" for real-time fraud detection. The goal is to create a professional, secure, and interactive system for monitoring financial transactions and detecting fraudulent behavior.

Here are the technical requirements and features:

**Tech Stack:**
- Backend: Laravel (PHP 8+, MySQL) for authentication, dataset uploads, job queue management, metadata storage, and API orchestration.
- ML Service: Python microservice using Flask or FastAPI for fraud prediction. Must expose REST endpoints (/health, /predict, /process-dataset, /explain/<transaction_id>).
- Frontend: Laravel Blade templates for dashboard views with Chart.js or Plotly for interactive charts.
- File uploads: CSV transaction datasets
- API communication: REST between Laravel backend and Python ML service.
- Features:
    - Dashboard showing system status, fraud trends, high-risk vendors, geographic risk, alerts, and real-time risk scores.
    - CSV Upload for transaction datasets with validation.
    - Transaction explainability page (SHAP-based feature importance and narrative for flagged transactions).
    - API Test page for developers to check ML microservice endpoints.
    - Admin Controls: user management, vendor management, settings, logs.
    - General Settings: ML endpoints, fraud thresholds, system configuration.
- ML Model:
    - Fraud detection, returns fraud scores, anomaly flags, SHAP-based feature explanations.

**Requirements for the AI response:**
1. Explain the overall **project architecture**:
   - How Laravel backend, Python ML microservice, and frontend interact.
   - Data flow from CSV upload → ML prediction → database storage → dashboard visualization.
   - Background job handling and asynchronous processing between Laravel and Python.
2. Explain **roles of each module**:
   - Backend responsibilities vs ML microservice vs frontend.
3. Suggest **database schema** for users, transactions, vendors, ML results, logs, and system events.
4. Recommend **best practices** for:
   - Secure API communication
   - Role-based access control
   - Error handling
   - Scalability
5. Include a **diagram or stepwise explanation** showing how components interact.
```

**Expected AI Output:**
- Textual architecture overview
- Data flow diagram (textual or pseudo-diagram)
- Database schema suggestion
- Security & best practices

---

## Step 1: Laravel Backend Skeleton (Days 2-4)

**Prompt:**

```
I want to generate a Laravel 10 backend for my fintech app "FraudGuard." The backend should be professional, secure, and ready to handle asynchronous ML processing. Please generate code and instructions for the following:

**1. Authentication & Role-Based Access Control:**
- Full authentication module: login, logout, password reset, email verification.
- Role-based access control:
    - Admin: full access to all modules
    - Analyst: read-only access to dashboards and fraud data
- Admin can manage users (create, read, update, delete) and assign roles.

**2. User Management:**
- CRUD operations for admin to manage users.
- Validation rules for email, password, and role assignment.

**3. Dataset Upload:**
- CSV upload interface for transaction datasets.
- Validation for required columns: transaction_id, amount, vendor_id, vendor_name, region, timestamp.
- Store CSV metadata in database (file name, upload date, uploader, number of rows).
- Trigger a Laravel background job (queue) to call the Python ML service asynchronously for processing.

**4. Background Jobs / Queue:**
- Use Laravel Queues (database driver) for asynchronous tasks.
- Example: Queue job triggers Python ML API for dataset processing.
- Logging of job success/failure.

**5. Database Migrations & Seeders:**
- Tables needed:
    - `users` (id, name, email, password, role, timestamps)
    - `datasets` (id, file_name, uploader_id, row_count, status, timestamps)
    - `transactions` (id, transaction_id, vendor_id, amount, region, timestamp, fraud_score, is_fraud, is_anomaly)
    - `vendors` (id, vendor_name, risk_score, total_transactions, fraud_count, timestamps)
    - `settings` (id, key, value)
    - `logs` (id, type, message, created_at)
- Include example seeders for admin user and sample dataset metadata.

**6. API Orchestration:**
- Backend should be ready to communicate with Python ML service via REST API.
- Include placeholder service class for calling ML endpoints (`/predict`, `/process-dataset`, `/explain/<transaction_id>`).

**7. Instructions:**
- Step-by-step instructions to:
    1. Install dependencies
    2. Configure `.env` (DB connection, queue driver, ML API endpoint)
    3. Run migrations and seeders
    4. Start Laravel server
    5. Test authentication and dataset upload

**8. Optional Enhancements:**
- Use Laravel Breeze or Jetstream for authentication scaffolding.
- Ensure CSRF protection for all forms.
- Prepare code for future integration with frontend dashboards.

**ML Service Endpoint:**
- Base URL: https://ml-file-for-url.onrender.com
- The service is already deployed and running
```

**Expected AI Output:**
- Laravel folder structure via artisan commands
- Controllers, Models, Migrations, Seeders, Jobs, Routes
- Service class for ML API communication
- Setup instructions

---

## Step 2: Python ML Microservice (SKIP - Already Done ✓)

Your ML service is already live at https://ml-file-for-url.onrender.com with:
- `/health` - Health check
- `/predict` - Fraud prediction
- `/process-dataset` - Batch processing
- `/explain/<transaction_id>` - SHAP explanations
- MongoDB Atlas connection

---

## Step 3: CSV Dataset Upload Feature (Days 5-6)

**Prompt:**

```
Generate a Laravel feature for the "FraudGuard" app to upload CSV transaction datasets and trigger the Python ML microservice on Render. Include all backend and frontend components.

**Requirements:**

**1. Blade View (Frontend):**
- Page title: "Upload Transaction Dataset"
- File picker for CSV file.
- Submit button.
- Validation message area for success/failure.
- Must instruct users: "CSV must include columns: transaction_id, amount, vendor_id, vendor_name, region, timestamp."

**2. Controller (Backend):**
- Handle CSV upload POST request.
- Validate:
  - File exists
  - File is CSV
  - Required columns are present
- Store CSV file in `storage/app/uploads`.
- Save CSV metadata to database (`datasets` table) including:
  - file_name
  - uploader_id
  - upload_date
  - row_count
  - status (`pending` by default)
- Trigger **background job** to call Python ML service `/process-dataset` endpoint asynchronously.

**3. Job Class (Queue Worker):**
- Use Laravel Queue to process CSV asynchronously.
- Job should:
  1. Read CSV file.
  2. Convert CSV to JSON payload.
  3. POST to `https://ml-file-for-url.onrender.com/process-dataset`.
  4. Handle API response:
     - Update `datasets` status to `completed` on success.
     - Log any errors in `logs` table.

**4. Routes:**
- GET `/upload` → shows upload Blade page.
- POST `/upload` → handles CSV upload and triggers job.

**5. Frontend Feedback:**
- Display success message: "CSV uploaded and sent for ML processing."
- Display error messages for invalid file or API errors.

**6. Best Practices:**
- Include CSRF protection.
- Validate CSV columns on backend, not just frontend.
- Log API response and errors to database logs.
- Make job retries configurable in case ML service is temporarily unavailable.
```

**Expected AI Output:**
- Blade view (`resources/views/upload.blade.php`)
- Controller (`app/Http/Controllers/DatasetController.php`)
- Job class (`app/Jobs/ProcessDatasetJob.php`)
- Routes in `routes/web.php`
- Database migration for datasets table

---

## Step 4: Dashboard with Charts (Days 7-9)

**Prompt:**

```
Generate a **Laravel Blade dashboard** for the "FraudGuard" app that visualizes fraud detection analytics. The dashboard should be professional, fintech-themed, and interactive. Use **Chart.js** for charts.

**Requirements:**

**1. System Status Panel:**
- Show ML service status: Active / Offline
- Show last update timestamp.

**2. Real-Time Fraud Summary:**
- Display:
  - Total transactions
  - Fraud detected
  - Fraud rate (%)
- Fetch data from database.

**3. High-Risk Vendors Table:**
- Columns: Vendor Name, Transactions, Fraud Count, Fraud Rate
- Sort by fraud rate descending
- Highlight top 3 vendors with highest risk

**4. Fraud Trend Over Last 14 Days:**
- Time-series line chart showing:
  - Fraud count per day
  - Flagged transactions per day
- Include tooltip showing exact numbers
- Use Chart.js

**5. Geographic Risk Map:**
- Show fraud risk per region or city.
- Example: color-coded (green=low, yellow=medium, red=high)

**6. Risk Score Gauge:**
- Show overall real-time risk score (0–100)
- Low (0–40), Medium (41–70), High (71–100)

**7. Security Alerts Panel:**
- List recent alerts from `logs` table:
  - Timestamp, Severity, Description

**8. Design & UI:**
- Fintech-inspired color palette:
  - Primary: deep blue / navy
  - Accent: gold / green / red for risk indicators

**9. Data Integration:**
- All dashboard metrics must fetch live data from database.
- Use Laravel controllers to aggregate data for frontend charts.
```

**Expected AI Output:**
- Blade view (`resources/views/dashboard.blade.php`)
- Controller with data aggregation queries
- Chart.js integration for line charts, gauge, map
- Sample database queries

---

## Step 5: Transaction Explainability (Days 10-11)

**Prompt:**

```
Generate a **Laravel Blade page and controller** for the "FraudGuard" app to provide **transaction-level explainability** using SHAP feature importance from the Python ML microservice.

**Requirements:**

**1. Blade View (Frontend):**
- Page title: "Transaction Explainability"
- Input field: transaction ID
- Submit button: "Explain"
- Area to display results:
  - Fraud score (0–1)
  - Fraud decision: flagged / not flagged
  - Narrative: human-readable explanation
  - Top contributing features (name, value, impact) as horizontal bar charts
  - Base value
- Demo mode button to load example transaction data.
- Fintech-style layout: professional, clean, color-coded feature impacts.

**2. Controller (Backend):**
- Accept transaction ID from frontend.
- Make GET request to Python ML service:
  `https://ml-file-for-url.onrender.com/explain/<transaction_id>`
- Parse JSON response and pass to Blade view.

**3. Visual Representation:**
- Horizontal bar chart for top features
- Red-to-green gradient based on impact magnitude

**4. Error Handling:**
- Show message if transaction ID not found or ML service unavailable.
```

**Expected AI Output:**
- Blade view (`resources/views/explain.blade.php`)
- Controller (`app/Http/Controllers/ExplainController.php`)
- Horizontal bar chart implementation

---

## Step 6: API Test Console (Days 12)

**Prompt:**

```
Generate a **Laravel Blade page and controller** for the "FraudGuard" app to allow developers to test the Python ML microservice API endpoints directly from the frontend.

**Requirements:**

**1. Blade View (Frontend):**
- Page title: "ML API Test Console"
- Sections:
  1. **Health Check**
     - Button: "Check Health"
     - Display API status
  2. **Fraud Prediction Test**
     - Textarea for sample transactions JSON
     - Button: "Run Prediction"
     - Display formatted JSON response
  3. **Multiple Test Runs**
     - Allow running multiple requests without page refresh

**2. Controller (Backend):**
- Make HTTP requests to:
  - `GET https://ml-file-for-url.onrender.com/health`
  - `POST https://ml-file-for-url.onrender.com/predict`
- Parse and return API responses

**3. Additional Features:**
- Syntax highlighting for JSON responses
- Error handling for unreachable service
```

**Expected AI Output:**
- Blade view (`resources/views/api-test.blade.php`)
- Controller (`app/Http/Controllers/ApiTestController.php`)
- AJAX for multiple test runs

---

## Step 7: Admin Module (Days 13-15)

**Prompt:**

```
Generate a **Laravel admin module** for the "FraudGuard" app, accessible only to **admin role** users.

**Requirements:**

**1. User Management (CRUD):**
- Admin can create, read, update, delete users
- Assign roles: `admin` or `analyst`
- Reset passwords
- Table with pagination, search/filter

**2. Vendor Management (CRUD):**
- Add/edit/remove vendors
- Assign vendors to regions
- Update vendor risk score
- Table: Vendor name, Region, Total transactions, Fraud count, Fraud rate

**3. Regions Management:**
- CRUD for regions/cities

**4. System Settings Page:**
- ML API endpoint: https://ml-file-for-url.onrender.com
- Fraud score threshold
- Anomaly threshold
- Job queue settings
- Stored in `settings` table

**5. Logs Panel:**
- Display system events
- Columns: timestamp, type, description, severity
- Sort/filter by type or severity

**6. Access Control:**
- Routes protected via middleware
- Only admin role can access

**7. Routes:**
- `/admin/users`, `/admin/vendors`, `/admin/regions`, `/admin/settings`, `/admin/logs`
```

**Expected AI Output:**
- Blade views for all admin modules
- Controllers with CRUD
- Route definitions with admin middleware
- Database migrations & seeders

---

## Step 8: Production Deployment (Days 16-18)

**Prompt:**

```
Generate **step-by-step production deployment instructions** for the "FraudGuard" app.

**1. Laravel Backend:**
- Deploy on VPS or Docker
- Configure `.env`:
  - DB credentials
  - ML_API_URL = https://ml-file-for-url.onrender.com
- Run migrations: `php artisan migrate`
- Set up queue workers: `php artisan queue:work`
- Configure supervisor for queue

**2. Python ML Microservice:**
- Already deployed at https://ml-file-for-url.onrender.com
- MongoDB: mongodb+srv://[username]:[password]@[cluster].mongodb.net/fraud_detection

**3. Secure REST Communication:**
- HTTPS for all API calls
- Optional: API token for Laravel → ML authentication

**4. Database Configuration:**
- MySQL for Laravel (users, datasets, logs)
- MongoDB Atlas for transactions and ML results

**5. Domain & SSL:**
- Configure domain
- Enable HTTPS

**6. Cron Jobs:**
- Laravel scheduler for periodic tasks

**7. Logging & Monitoring:**
- Laravel error logs
- ML API request logs

**8. Troubleshooting:**
- ML API unreachable
- Queue job failures
- Database connection issues
```

**Expected AI Output:**
- Step-by-step deployment commands
- Security configuration
- Monitoring recommendations

---

## Step 9: AI Assistant Module (Optional - Days 19-20)

**Prompt:**

```
Generate an AI Assistant module for Laravel-based "FraudGuard" app using OpenAI GPT.

**1. Frontend Blade Page:**
- Chat window with:
  - Left panel: fraud context tips
  - Right panel: conversation panel
- Input field for queries
- Submit button
- Display chat history
- Prompt for OpenAI API key in settings

**2. Backend Controller:**
- Endpoint: `POST /ai-assistant/query`
- Forward query to OpenAI GPT API
- Include transaction-specific context
- Return AI response to frontend

**3. Fraud-aware Context:**
- System prompt: "You are an expert fraud detection assistant..."
- Include transaction ID, fraud score, top features in prompt

**4. Frontend AJAX:**
- Send query with transaction context
- Display responses in chat window
- Maintain conversation history
```

---

## Quick Reference: ML Service Details

| Item | Value |
|------|-------|
| **ML Service URL** | https://ml-file-for-url.onrender.com |
| **MongoDB URI** | mongodb+srv://[username]:[password]@[cluster].mongodb.net/fraud_detection |
| **Endpoints** | `/health`, `/predict`, `/process-dataset`, `/explain/<transaction_id>` |

---

## Implementation Order Recommendation

1. **Week 1**: Steps 0-1 (Architecture + Laravel skeleton)
2. **Week 2**: Steps 3-4 (Upload + Dashboard)
3. **Week 3**: Steps 5-6 (Explainability + API Test)
4. **Week 4**: Step 7 (Admin Module)
5. **Week 5**: Step 8 (Deployment)

**Total Estimated Time**: 5-6 weeks

---

*This guide consolidates all your detailed prompts into a structured workflow for building FraudGuard with AI assistance.*
