# Flask Backend for DPR Upload System

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the Flask application:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

## API Endpoints

- `POST /api/upload` - Upload files
- `GET /api/files` - List uploaded files
- `GET /api/health` - Health check

## File Storage

Uploaded files are stored in the `Uploads/` directory with unique filenames to prevent conflicts.