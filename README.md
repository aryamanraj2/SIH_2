# DPR Analysis System - Smart India Hackathon 2025

A comprehensive AI-powered system for analyzing Detailed Project Reports (DPRs) with automated scoring, risk assessment, and compliance checking.

## System Architecture

The system consists of 3 main components:

- **Dashbooard** - An interactive dashboard for file uploads and visualization of analysis results.
- **Flask Backend API** - Core server for handling file processing, orchestrating AI/ML tasks, and managing the database.
- **AI/ML Core** - The engine for DPR analysis, utilizing Google Gemini for scoring, risk assessment, and NLP tasks.

## Quick Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- Git

### 1. Backend Setup
```bash
git clone https://github.com/aryamanraj2/SIH_2.git
cd SIH_2/Backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables (create .env file)
echo "GEMINI_KEY_STRING=your_gemini_api_key_here" > .env
echo "DATABASE_URL=sqlite:///dpr_analysis.db" >> .env

# Initialize database
python init_db.py

# Run backend server
python app.py
```
Backend runs on `http://localhost:5000`

### 2. Frontend Dashboard Setup
```bash
cd ../Dashboard

# Install dependencies
npm install

# Run development server
npm run dev
```
Dashboard runs on `http://localhost:3000`

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI/ML Core    │
│                 │◄──►│   (Flask)       │◄──►│   (Python)      │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • DPR Scorer    │
│ • File Upload   │    │ • File Handler  │    │ • Risk Analyzer │
│ • Results View  │    │ • Database      │    │ • NLP Engine    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## System Flow

### User Journey
1. **Upload** → User uploads a DPR file (PDF) via the web dashboard.
2. **Analysis** → The system processes the file, performs scoring, risk assessment, and compliance checks.
3. **Visualization** → User views detailed results, scores, and risk factors on an interactive dashboard.

### Data Flow
```
Next.js Dashboard → Flask API → AI/ML Core (Gemini) → Database → Next.js Dashboard
       ↓                 ↓               ↓                 ↓              ↓
   DPR PDF Upload → File Handling → Analysis & Scoring → Results → Visualization
```

## AI/ML Components

### 1. DPR Scoring Engine
The system evaluates DPRs across multiple dimensions:
- **Completeness (50 points)**: Mandatory sections and information
- **Technical Quality (30 points)**: Technical specifications and design
- **Financial Details (20 points)**: Cost estimates and funding sources
- **Compliance (15 points)**: Regulatory and statutory requirements
- **Sustainability (10 points)**: Long-term viability and maintenance

### 2. Risk Assessment Module
AI-powered risk prediction covering:
- **Cost Overrun Risk**: Budget estimation accuracy, contingency provisions
- **Delay Risk**: Timeline feasibility, statutory clearances
- **Implementation Risk**: Monitoring mechanisms, technical complexity
- **Operational Risk**: Maintenance planning, sustainability measures

### 3. Compliance Checker
Automated verification of:
- Mandatory sections per government guidelines
- Non-Duplication Certificate (NDC) requirements
- Statutory clearances and approvals
- Technical standard compliance
- Financial documentation completeness

## API Endpoints

### Core APIs
```http
POST /api/upload
# Uploads a DPR for analysis.
# Body: multipart/form-data with 'file' key.

GET /api/results/{upload_id}
# Retrieves analysis results for a specific upload.

GET /api/uploads
# Lists all previous uploads and their status.
```

### Additional Endpoints
```http
GET /api/health
# System health check.

DELETE /api/uploads/{upload_id}
# Deletes an upload and its associated results.

GET /api/export/{upload_id}
# Exports results in PDF or Excel format.
```

## Database Schema

The backend uses **SQLAlchemy ORM** with a PostgreSQL. Key models are defined in `Backend/database.py` and manage:
- `Uploads`: Metadata for each uploaded DPR file.
- `AnalysisResults`: Stores the detailed scoring, risk, and compliance data.
- `Users`: (If authentication is implemented) User profiles.

## Security Features

- **API Key Management**: Secure handling of the Google Gemini API key.
- **File Validation**: Checks on uploaded file types and sizes to prevent abuse.
- **CORS Protection**: Flask-CORS is configured to restrict cross-origin requests.
- **Environment Variables**: Sensitive keys and configuration are stored in a `.env` file, not in the codebase.

## 📊 Dashboard Features

### Interactive Components

- **Score Overview**: Visual representation of overall DPR performance
- **Risk Analysis**: Heat maps and detailed risk breakdowns
- **Compliance Status**: Traffic light system for requirement tracking
- **Evidence Panel**: Detailed findings and recommendations
- **Export Options**: PDF reports and Excel data exports

### Navigation

- **Upload Interface**: Drag-and-drop file upload with progress tracking
- **Results Gallery**: Grid view of all analyzed DPRs
- **Search & Filter**: Advanced filtering by score, risk level, date
- **Settings Panel**: Configuration and preferences

### Project Structure
```
SIH_2/
├── Backend/                 # Flask API server
│   ├── app.py               # Main application entry point
│   ├── database.py          # Database models and operations
│   ├── dpr_scorer.py        # Basic scoring algorithm
│   ├── enhanced_dpr_scorer.py # Advanced AI-powered scorer
│   ├── dpr_risk_analyzer.py   # Risk assessment engine
│   ├── integrated_dpr_analysis.py # Unified analysis interface
│   ├── requirements.txt     # Python dependencies
│   └── Uploads/           # File storage directory
├── Dashboard/             # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/               # Utilities and API clients
│   ├── providers/         # Context providers
│   └── package.json       # Node dependencies
├── DPR_score/             # Jupyter notebooks for scoring research
└── DPR_risk/              # Jupyter notebooks for risk analysis research
```

## Testing

```bash
# Backend API tests
cd Backend
python -m pytest tests/

# Frontend tests
cd Dashboard
npm test
```

---
## Team Details

**Team Name:** !Sober

**Team Leader:** [@yuvrajshr](https://github.com/yuvrajshr)

**Team Members:**

- 2024UCA1824 - [@yuvrajshr](https://github.com/yuvrajshr)
- 2024UCA1831 - [@Mannat00](https://github.com/Mannat00)
- 2024UCA1859 - [@AshishSinsinwal](https://github.com/AshishSinsinwal)
- 2024UCA1820 - [@molecule2117](https://github.com/molecule2117)
- 2024UEV2815 - [@Parthvats13](https://github.com/Parthvats13)
- 2024UEC2658 - [@aryamanraj2](https://github.com/aryamanraj2)
