# DPR Analysis System - Smart India Hackathon 2024

A comprehensive AI-powered system for analyzing Detailed Project Reports (DPRs) with automated scoring, risk assessment, and compliance checking.

## 🚀 Project Overview

The DPR Analysis System is an intelligent platform designed to automate the evaluation of Detailed Project Reports for government projects. It combines advanced NLP, machine learning, and AI techniques to provide comprehensive scoring, risk analysis, and compliance verification.

### Key Features

- **📊 Smart DPR Scoring**: Automated evaluation based on completeness, technical quality, and compliance
- **⚠️ Risk Assessment**: AI-powered risk prediction for cost overruns, delays, and implementation challenges  
- **🔍 Compliance Checking**: Verification against government guidelines and mandatory requirements
- **📈 Interactive Dashboard**: Real-time visualization of analysis results and insights
- **📱 Modern UI**: Responsive React/Next.js dashboard with intuitive user experience
- **🔗 RESTful API**: Comprehensive backend API for all analysis operations

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI/ML Core    │
│   (Next.js)     │◄──►│   (Flask)       │◄──►│   (Python)      │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • DPR Scorer    │
│ • File Upload   │    │ • File Handler  │    │ • Risk Analyzer │
│ • Results View  │    │ • Database      │    │ • NLP Engine    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 15+ with React 18+
- TypeScript for type safety
- Tailwind CSS + shadcn/ui components
- Radix UI primitives
- Recharts for data visualization

**Backend:**
- Flask 3.0+ web framework
- SQLAlchemy ORM with PostgreSQL
- Flask-CORS for cross-origin requests
- RESTful API design

**AI/ML Core:**
- Google Gemini AI for advanced analysis
- Sentence Transformers for semantic similarity
- spaCy for NLP processing
- PyTorch for deep learning models
- RapidFuzz for fuzzy text matching

**Document Processing:**
- PyMuPDF for PDF text extraction
- pdfplumber for structured data extraction
- OCR with pytesseract + pdf2image
- ReportLab for PDF generation

## 📋 Prerequisites

- Python 3.8+
- Node.js 18+
- PostgreSQL (optional, SQLite supported)
- Git

## 🛠️ Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/aryamanraj2/SIH_2.git
cd SIH_2
```

### 2. Backend Setup

```bash
cd Backend

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

The backend will be available at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../Dashboard

# Install dependencies
npm install
# or
pnpm install

# Run development server
npm run dev
# or
pnpm dev
```

The frontend will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the Backend directory:

```env
# Required: Gemini AI API Key
GEMINI_KEY_STRING=your_gemini_api_key_here

# Database Configuration
DATABASE_URL=sqlite:///dpr_analysis.db
# For PostgreSQL: postgresql://username:password@localhost/dbname

# Optional Settings
MAX_CONTENT_LENGTH=104857600  # 100MB file upload limit
UPLOAD_FOLDER=Uploads
RESULTS_FOLDER=Results
```

### Getting Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

## 📚 API Documentation

### Core Endpoints

#### Upload DPR for Analysis
```http
POST /api/upload
Content-Type: multipart/form-data

Parameters:
- file: PDF file (required)
- language: Language code (default: EN)
```

#### Get Analysis Results
```http
GET /api/results/{upload_id}

Response:
{
  "uploadId": "uuid",
  "status": "completed|pending|error",
  "scoreAnalysis": {
    "total_score": 85.4,
    "percentage": 51.8,
    "breakdown": {...}
  },
  "riskAnalysis": {
    "overall_risk": "medium",
    "risk_factors": [...]
  }
}
```

#### List All Uploads
```http
GET /api/uploads

Response:
{
  "uploads": [
    {
      "uploadId": "uuid",
      "originalFilename": "project.pdf",
      "uploadedAt": "2024-01-15T10:30:00Z",
      "status": "completed"
    }
  ]
}
```

### Additional Endpoints

- `GET /api/health` - System health check
- `DELETE /api/uploads/{upload_id}` - Delete upload and results
- `POST /api/archive/{upload_id}` - Archive processed files
- `GET /api/export/{upload_id}` - Export results (PDF/Excel)

## 🧠 Analysis Components

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

## 🧪 Development

### Project Structure

```
SIH_2/
├── Backend/                 # Flask API server
│   ├── app.py              # Main application entry point
│   ├── database.py         # Database models and operations
│   ├── dpr_scorer.py       # Basic scoring algorithm
│   ├── enhanced_dpr_scorer.py  # Advanced AI-powered scorer
│   ├── dpr_risk_analyzer.py    # Risk assessment engine
│   ├── integrated_dpr_analysis.py  # Unified analysis interface
│   ├── requirements.txt    # Python dependencies
│   └── Uploads/           # File storage directory
├── Dashboard/              # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities and API clients
│   ├── providers/        # Context providers
│   └── package.json      # Node dependencies
├── DPR_score/             # Jupyter notebooks for scoring research
└── DPR_risk/              # Risk analysis research notebooks
```

### Running Tests

```bash
# Backend tests
cd Backend
python -m pytest tests/

# Frontend tests  
cd Dashboard
npm test
```

### Development Workflow

1. **Backend Development**: Use Flask development server with auto-reload
2. **Frontend Development**: Next.js hot reload for instant updates
3. **API Testing**: Use Postman collection or curl commands
4. **Database Changes**: Run migrations with Flask-Migrate

## 🚀 Deployment

### Production Setup

1. **Backend Deployment**:
   ```bash
   # Use production WSGI server
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

2. **Frontend Deployment**:
   ```bash
   npm run build
   npm start
   ```

3. **Environment Configuration**:
   - Set production environment variables
   - Configure PostgreSQL database
   - Set up reverse proxy (nginx)
   - Enable HTTPS/SSL

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build -d
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use TypeScript for all React components
- Add comprehensive docstrings and comments
- Write unit tests for new features
- Update documentation for API changes

## 📄 License

This project is developed for Smart India Hackathon 2024. All rights reserved.

## 👥 Team

**Team Members:**
- [Your Team Members Here]

**Mentors:**
- [Mentor Names Here]

## 🆘 Support

For issues and questions:

1. Check existing [Issues](https://github.com/aryamanraj2/SIH_2/issues)
2. Create new issue with detailed description
3. Contact team members for urgent support

## 🏆 Acknowledgments

- Smart India Hackathon 2024 organizers
- Google AI for Gemini API access
- Open source community for excellent tools and libraries

---

**Built with ❤️ for Smart India Hackathon 2024**