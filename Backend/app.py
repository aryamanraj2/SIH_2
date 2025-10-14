from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import traceback

# Import DPR analysis modules
try:
    from dpr_risk_analyzer import DPRRiskAnalyzer
    RISK_ANALYZER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Risk analyzer not available: {e}")
    RISK_ANALYZER_AVAILABLE = False

try:
    from dpr_scorer import DPRScorer
    SCORER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: DPR scorer not available: {e}")
    SCORER_AVAILABLE = False

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = 'Uploads'
ALLOWED_EXTENSIONS = {'pdf'}
MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize analyzers
risk_analyzer = None
dpr_scorer = None

if RISK_ANALYZER_AVAILABLE:
    try:
        risk_analyzer = DPRRiskAnalyzer()
        print("Risk analyzer initialized successfully")
    except Exception as e:
        print(f"Failed to initialize risk analyzer: {e}")

if SCORER_AVAILABLE:
    try:
        dpr_scorer = DPRScorer()
        print("DPR scorer initialized successfully")
    except Exception as e:
        print(f"Failed to initialize DPR scorer: {e}")

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def find_uploaded_file(upload_id):
    """Find uploaded file by upload ID using metadata"""
    for filename in os.listdir(UPLOAD_FOLDER):
        if filename.endswith('.meta.json'):
            try:
                with open(os.path.join(UPLOAD_FOLDER, filename), 'r') as f:
                    metadata = json.load(f)
                    if metadata.get('uploadId') == upload_id:
                        return metadata.get('filePath')
            except:
                continue
    return None

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload from frontend"""
    try:
        # Check if file is present in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        language = request.form.get('language', 'EN')
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check if file type is allowed
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        if file:
            # Generate unique filename while preserving extension
            original_filename = secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
            
            # Save file
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            
            # Generate upload ID and response
            upload_id = str(uuid.uuid4())
            
            # Store metadata for easier lookup
            metadata = {
                'uploadId': upload_id,
                'originalFilename': original_filename,
                'storedFilename': unique_filename,
                'uploadedAt': datetime.now().isoformat(),
                'language': language,
                'filePath': file_path,
                'sizeBytes': os.path.getsize(file_path)
            }
            
            # Save metadata to a JSON file for tracking
            metadata_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{unique_filename}.meta.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f)
            
            response_data = {
                'uploadId': upload_id,
                'dpr': {
                    'id': upload_id,
                    'filename': original_filename,
                    'uploadedAt': datetime.now().isoformat(),
                    'language': language,
                    'status': 'uploaded',
                    'sizeBytes': os.path.getsize(file_path),
                    'storedAs': unique_filename,
                    'filePath': file_path,
                    'analysisEndpoints': {
                        'risk': f'/api/analyze/risk/{upload_id}',
                        'score': f'/api/analyze/score/{upload_id}',
                        'complete': f'/api/analyze/complete/{upload_id}'
                    }
                }
            }
            
            return jsonify(response_data), 200
    
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@app.route('/api/files', methods=['GET'])
def list_files():
    """List all uploaded files"""
    try:
        files = []
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append({
                    'filename': filename,
                    'size': stat.st_size,
                    'uploadedAt': datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        return jsonify({'files': files}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to list files: {str(e)}'}), 500

@app.route('/api/analyze/risk/<upload_id>', methods=['POST'])
def analyze_risk(upload_id):
    """Analyze DPR for risk assessment"""
    try:
        if not RISK_ANALYZER_AVAILABLE or not risk_analyzer:
            return jsonify({'error': 'Risk analyzer not available'}), 503
        
        # Find the uploaded file using metadata
        pdf_file = find_uploaded_file(upload_id)
        if not pdf_file or not os.path.exists(pdf_file):
            return jsonify({'error': 'File not found for the given upload ID'}), 404
        
        # Perform risk analysis
        risk_analysis = risk_analyzer.analyze_dpr_pdf(pdf_file)
        
        return jsonify({
            'uploadId': upload_id,
            'riskAnalysis': risk_analysis,
            'analyzedAt': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        print(f"Risk analysis error: {e}")
        print(traceback.format_exc())
        return jsonify({'error': f'Risk analysis failed: {str(e)}'}), 500

@app.route('/api/analyze/score/<upload_id>', methods=['POST'])
def analyze_score(upload_id):
    """Analyze DPR for completeness and scoring"""
    try:
        if not SCORER_AVAILABLE or not dpr_scorer:
            return jsonify({'error': 'DPR scorer not available'}), 503
        
        # Find the uploaded file using metadata
        pdf_file = find_uploaded_file(upload_id)
        if not pdf_file or not os.path.exists(pdf_file):
            return jsonify({'error': 'File not found for the given upload ID'}), 404
        
        # Perform scoring analysis
        score_analysis = dpr_scorer.calculate_total_score(pdf_file)
        
        return jsonify({
            'uploadId': upload_id,
            'scoreAnalysis': score_analysis,
            'analyzedAt': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        print(f"Score analysis error: {e}")
        print(traceback.format_exc())
        return jsonify({'error': f'Score analysis failed: {str(e)}'}), 500

@app.route('/api/analyze/complete/<upload_id>', methods=['POST'])
def analyze_complete(upload_id):
    """Perform complete DPR analysis (both risk and score)"""
    try:
        # Find the uploaded file using metadata
        pdf_file = find_uploaded_file(upload_id)
        if not pdf_file or not os.path.exists(pdf_file):
            return jsonify({'error': 'File not found for the given upload ID'}), 404
        
        results = {
            'uploadId': upload_id,
            'analyzedAt': datetime.now().isoformat()
        }
        
        # Risk analysis
        if RISK_ANALYZER_AVAILABLE and risk_analyzer:
            try:
                risk_analysis = risk_analyzer.analyze_dpr_pdf(pdf_file)
                results['riskAnalysis'] = risk_analysis
            except Exception as e:
                results['riskAnalysis'] = {'error': str(e)}
        else:
            results['riskAnalysis'] = {'error': 'Risk analyzer not available'}
        
        # Score analysis
        if SCORER_AVAILABLE and dpr_scorer:
            try:
                score_analysis = dpr_scorer.calculate_total_score(pdf_file)
                results['scoreAnalysis'] = score_analysis
            except Exception as e:
                results['scoreAnalysis'] = {'error': str(e)}
        else:
            results['scoreAnalysis'] = {'error': 'DPR scorer not available'}
        
        return jsonify(results), 200
        
    except Exception as e:
        print(f"Complete analysis error: {e}")
        print(traceback.format_exc())
        return jsonify({'error': f'Complete analysis failed: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy', 
        'message': 'Flask backend is running',
        'modules': {
            'risk_analyzer': RISK_ANALYZER_AVAILABLE,
            'dpr_scorer': SCORER_AVAILABLE
        }
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)