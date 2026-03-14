# Active Context: FraudGuard AI - Fraud Detection Frontend

## Current State

**Application Status**: ✅ Built and ready for deployment

FraudGuard is a fintech web application for real-time fraud detection. The frontend is built with Next.js 16 and connects to a Python ML service running on Render.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] Complete FraudGuard Dashboard with fraud analytics
- [x] CSV Dataset Upload feature
- [x] Transaction Explainability page with SHAP features
- [x] ML API Test Console
- [x] Professional fintech-themed UI
- [x] Enhanced UI with polished fintech aesthetic
- [x] Dark theme with blue accents
- [x] Cleaner, refined dashboard styling matching reference design
- [x] Fix hallucinating dashboard - use real data from uploads
- [x] Add Clear Data button to dashboard header
- [x] Add "Save to Database" button on Explain page
- [x] Link transaction data from Explain page to dashboard
- [x] Fix: Show actual CSV columns dynamically on upload page
- [x] Fix: Show actual transaction count (100k) instead of sample count (5)
- [x] Fix: Process more transactions (up to 1000) from uploaded CSV
- [x] Fix: Use actual isFraud column from CSV instead of random scores
- [x] Fix: Generate transaction IDs using step and row index
- [x] Fix: Display more transactions in dashboard table (20 instead of 10)
- [x] Fix: Handle null/undefined fraud scores properly in UI
- [x] Fix: Clear button now clears all saved fraud cases from database
- [x] Add "Save to Database" button on dashboard to save high-risk transactions (>50% fraud probability)
- [x] Add display section showing saved fraud cases from database
- [x] Enhanced API Test Console with demo mode, latency display, and settings
- [x] Remove all Demo Mode - system now only shows real ML API results
- [x] Add ML API status indicator to all pages (Dashboard, Upload, Explain, API Test)
- [x] Disable all prediction buttons when ML API is offline
- [x] Show "ML Processing Offline" warning when service unavailable
- [x] Add Clear button to Explain page to clear current result
- [x] Add Clear button to Upload page to clear current upload and results
- [x] Fix: Convert admin page to Server Actions to avoid node:fs client bundle issue (build now succeeds)
- [x] Fix ML processing flow: use /health endpoint for health checks (more reliable)
- [x] Fix upload handler to properly process ML response and store in localStorage
- [x] Fix dashboard to read ML-processed transactions from localStorage
- [x] Fix explain page to search localStorage for transactions before calling ML backend
- [x] Update API test endpoints to show correct request format for CSV data
- [x] Remove random fraud score generation - use actual ML scores
- [x] Fix upload to use /predict endpoint instead of /process-dataset (more reliable)
- [x] Add timeout (30s) and better error handling for upload
- [x] Increase ML upload timeout to 180s (3 minutes) for slower ML processing
- [x] Add proper processing messages during upload ("Analyzing dataset...", "ML model is processing your file, please wait...")
- [x] Show spinner/loading indicator during analysis
- [x] Distinguish between offline/timeout/api_error messages
- [x] Create optimized Flask backend with batch processing (250 rows per batch)
- [x] Flask model loaded once at startup, not per request
- [x] Add comprehensive logging to Flask backend (request, CSV parsing, preprocessing, prediction, total time)
- [x] Flask returns only necessary result fields

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Main dashboard with premium components | ✅ Complete |
| `src/app/upload/page.tsx` | CSV dataset upload | ✅ Complete |
| `src/app/explain/page.tsx` | Transaction explainability | ✅ Complete |
| `src/app/api-test/page.tsx` | API test console | ✅ Complete |
| `src/app/admin/login/page.tsx` | Admin login page with password protection | ✅ Complete |
| `src/app/admin/page.tsx` | Admin module with user management, transactions, reports | ✅ Complete |
| `src/app/api/ml_backend.py` | Optimized Flask ML backend | ✅ Complete |
| `src/db/schema.ts` | Database schema (users, transactions, admin_logs, datasets) | ✅ Complete |
| `src/app/layout.tsx` | Root layout | ✅ Complete |
| `src/app/globals.css` | Custom styling | ✅ Complete |
| `.kilocode/` | AI context & recipes | ✅ Ready |
| `src/components/dashboard/Sidebar.tsx` | Navigation sidebar with ML status | ✅ Complete |
| `src/components/dashboard/KPIGrid.tsx` | KPI cards with icons and colors | ✅ Complete |
| `src/components/dashboard/RiskGauge.tsx` | Animated semicircular gauge | ✅ Complete |
| `src/components/dashboard/SecurityAlerts.tsx` | Expandable security alerts panel | ✅ Complete |
| `src/components/dashboard/ActivityFeed.tsx` | Real-time activity timeline | ✅ Complete |
| `src/components/dashboard/FraudTrendChart.tsx` | 14-day fraud trend bars | ✅ Complete |
| `src/components/dashboard/SuspiciousTransactionsTable.tsx` | Sortable table with pagination | ✅ Complete |

## How to Use the Application

1. **Upload Dataset**: Go to `/upload` to upload a CSV file of transactions
2. **Analyze Transaction**: Go to `/explain`, enter a transaction ID, click "Explain"
3. **Save to Database**: Click "Save to Database" after analyzing to store for future predictions
4. **View Dashboard**: See the latest analyzed transaction on the dashboard
5. **Clear Data**: Click "Clear Data" button to reset all stored data

## ML Backend Integration

The frontend connects to the ML service at:
- **URL**: https://ml-file-for-url.onrender.com
- **Endpoints Used**:
  - GET `/health` - Health check
  - POST `/predict` - Single transaction fraud prediction
  - POST `/process-dataset` - Batch CSV processing
  - GET `/explain/<transaction_id>` - SHAP-based explanation

## Data Flow

1. User uploads CSV dataset on `/upload` page → ML processes it → Results stored in localStorage
2. User analyzes transaction on `/explain` page → Can save to database (localStorage)
3. Dashboard displays: processed dataset stats + latest analyzed transaction
4. Clear Data button resets everything

## Deployment

- **Frontend**: Deploy to Vercel (Next.js)
- **Backend**: ML service already running on Render
- **Flow**: Frontend fetches data from Render ML backend

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-03-06 | Built complete FraudGuard application with dashboard, upload, explain, and API test pages |
| 2026-03-06 | Enhanced UI aesthetic with professional fintech theme (gradients, shadows, glows) |
| 2026-03-06 | Dark theme with blue accents, glassmorphism, and grid overlay |
| 2026-03-06 | Cleaner dashboard styling to match reference design |
| 2026-03-06 | Fixed hallucinating dashboard - removed hardcoded fake data |
| 2026-03-06 | Added Clear Data button and Save to Database features |
| 2026-03-06 | Fixed transaction count (1000), fraud scores (from CSV), and transaction ID generation |
| 2026-03-06 | Fixed Clear button to clear all saved fraud cases + added Save to Database button for >50% fraud probability transactions |
| 2026-03-07 | Enhanced API Test Console with demo mode, latency display, settings, and retry logic |
| 2026-03-07 | Added Admin module with user management, transaction monitoring, explainability, reports, and actions |
| 2026-03-07 | Added Admin login page at /admin/login with password protection |
| 2026-03-07 | Added Admin link in dashboard navigation |
| 2026-03-10 | Fixed ML processing flow - proper health checks, data storage, and explainability |
| 2026-03-13 | Complete redesign of FraudGuard dashboard with premium fintech components |
| 2026-03-13 | Created Sidebar, KPIGrid, RiskGauge, SecurityAlerts, ActivityFeed, FraudTrendChart, SuspiciousTransactionsTable components |
| 2026-03-13 | Integrated all premium components into page.tsx with dark slate theme |

## Latest Dashboard Redesign (2026-03-13)

The dashboard was completely redesigned with a premium enterprise fintech fraud monitoring aesthetic:

### New Components Created:
- `src/components/dashboard/Sidebar.tsx` - Fixed left sidebar with FraudGuard branding, navigation, user info
- `src/components/dashboard/Header.tsx` - Top header with search, notifications, live time, refresh
- `src/components/dashboard/AlertBanner.tsx` - Hero anomaly alert banner with severity badges
- `src/components/dashboard/KPIGrid.tsx` - 6 KPI cards: Total Transactions, Incoming/Outgoing Transfers, Bill Payments, Fraud Flags, High-Risk Recipients
- `src/components/dashboard/FraudTrendChart.tsx` - 14-day fraud trend with stacked bar chart
- `src/components/dashboard/ChannelDistribution.tsx` - Transaction channel breakdown (M-PESA, Bank, Card, E-Wallet, USSD)
- `src/components/dashboard/RiskGauge.tsx` - Animated semicircular risk score gauge (0-100)
- `src/components/dashboard/SecurityAlertsPanel.tsx` - Expandable security alerts with severity levels
- `src/components/dashboard/ActivityFeed.tsx` - Real-time activity log with timeline
- `src/components/dashboard/SuspiciousTransactionsTable.tsx` - Sortable table with Kenyan-specific columns (Ref Code, Channel, Type, Sender, Recipient, Phone, Amount, Fee, DateTime, Risk Score, Alert Reason)
- `src/components/dashboard/HighRiskRecipients.tsx` - Ranked list of high-risk merchants/paybills
- `src/components/dashboard/GeographicRisk.tsx` - Regional risk distribution by Kenya region
- `src/components/dashboard/FraudPatternInsights.tsx` - AI-detected fraud patterns (SIM Swap, Velocity Attack, etc.)

### Design Features:
- Dark slate/charcoal theme with cyan, emerald, amber, red accents
- Premium cards with subtle gradients, borders, and hover effects
- Animated stat counters and risk gauge needle
- Responsive layout for desktop, tablet, mobile
- Kenyan-specific placeholder data (M-PESA references, KES amounts, Safaricom/KCB/Equity)
- Lucide React icons throughout
