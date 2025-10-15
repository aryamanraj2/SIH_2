from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import uuid
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import traceback
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database modules
from database import (
    db, init_database, Upload, AnalysisResult, ArchivedFile,
    get_upload_by_id, get_results_by_upload_id, get_all_uploads,
    get_archived_files, archive_upload, restore_upload, update_archive_access
)

# Import DPR analysis modules
try:
    from dpr_risk_analyzer import DPRRiskAnalyzer
    RISK_ANALYZER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Risk analyzer not available: {e}")
    RISK_ANALYZER_AVAILABLE = False

try:
    from integrated_dpr_analysis import create_dpr_analyzer
    INTEGRATED_ANALYSIS_AVAILABLE = True
    print("✅ Enhanced DPR Analysis System available")
except ImportError as e:
    print(f"Warning: Enhanced analysis not available: {e}")
    INTEGRATED_ANALYSIS_AVAILABLE = False
    try:
        from dpr_scorer import DPRScorer
        SCORER_AVAILABLE = True
        print("📊 Basic DPR Scorer available")
    except ImportError as e2:
        print(f"Warning: DPR scorer not available: {e2}")
        SCORER_AVAILABLE = False

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize database
init_database(app)

# Configuration
UPLOAD_FOLDER = 'Uploads'
RESULTS_FOLDER = 'Results'
ALLOWED_EXTENSIONS = {'pdf'}
MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULTS_FOLDER'] = RESULTS_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Ensure upload and results directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# Initialize analyzers
risk_analyzer = None
dpr_scorer = None

if RISK_ANALYZER_AVAILABLE:
    try:
        risk_analyzer = DPRRiskAnalyzer()
        print("Risk analyzer initialized successfully")
    except Exception as e:
        print(f"Failed to initialize risk analyzer: {e}")

# Initialize the best available DPR analysis system
dpr_analyzer = None
if INTEGRATED_ANALYSIS_AVAILABLE:
    try:
        dpr_analyzer = create_dpr_analyzer()
        capabilities = dpr_analyzer.get_capabilities()
        print(f"✅ {capabilities['analysis_type'].title()} DPR Analysis System initialized")
        print("Available features:")
        for feature in capabilities['features'][:3]:  # Show first 3 features
            print(f"  • {feature}")
    except Exception as e:
        print(f"Failed to initialize integrated analysis: {e}")
        INTEGRATED_ANALYSIS_AVAILABLE = False

if not INTEGRATED_ANALYSIS_AVAILABLE and SCORER_AVAILABLE:
    try:
        from dpr_scorer import DPRScorer
        dpr_scorer = DPRScorer()
        print("📊 Basic DPR scorer initialized successfully")
    except Exception as e:
        print(f"Failed to initialize DPR scorer: {e}")
elif not INTEGRATED_ANALYSIS_AVAILABLE:
    print("⚠️ No DPR analysis system available")

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def find_uploaded_file(upload_id):
    """Find uploaded file by upload ID using database"""
    upload = get_upload_by_id(upload_id)
    if upload and os.path.exists(upload.file_path):
        return upload.file_path
    return None

def process_and_store_results(upload_id, pdf_file_path, original_filename):
    """Process PDF with both analyzers and store results in database"""
    start_time = time.time()
    
    try:
        # Create analysis result record
        analysis_result = AnalysisResult(
            upload_id=upload_id,
            analysis_type='complete',
            status='pending'
        )
        db.session.add(analysis_result)
        db.session.commit()
        
        risk_analysis = None
        score_analysis = None
        
        # Risk analysis
        if RISK_ANALYZER_AVAILABLE and risk_analyzer:
            try:
                print(f"Running risk analysis for {original_filename}...")
                risk_analysis = risk_analyzer.analyze_dpr_pdf(pdf_file_path)
                print("Risk analysis completed successfully")
            except Exception as e:
                print(f"Risk analysis failed: {e}")
                risk_analysis = {'error': str(e)}
        else:
            risk_analysis = {'error': 'Risk analyzer not available'}
        
        # Score analysis using enhanced system
        if INTEGRATED_ANALYSIS_AVAILABLE and dpr_analyzer:
            try:
                print(f"Running enhanced DPR analysis for {original_filename}...")
                score_analysis = dpr_analyzer.analyze_dpr(pdf_file_path)
                print(f"Enhanced DPR analysis completed successfully - Score: {score_analysis.get('percentage', 0):.1f}%")
            except Exception as e:
                print(f"Enhanced DPR analysis failed: {e}")
                score_analysis = {'error': str(e)}
        elif hasattr(globals(), 'dpr_scorer') and dpr_scorer:
            try:
                print(f"Running basic DPR scoring for {original_filename}...")
                score_analysis = dpr_scorer.calculate_total_score(pdf_file_path)
                print("Basic DPR scoring completed successfully")
            except Exception as e:
                print(f"Basic DPR scoring failed: {e}")
                score_analysis = {'error': str(e)}
        else:
            score_analysis = {'error': 'No DPR analysis system available'}
        
        # Update analysis result in database
        analysis_result.risk_analysis = risk_analysis
        analysis_result.score_analysis = score_analysis
        analysis_result.status = 'completed'
        analysis_result.processing_time = time.time() - start_time
        analysis_result.processed_at = datetime.utcnow()
        
        db.session.commit()
        
        # Also store in JSON file for backward compatibility
        results = {
            'uploadId': upload_id,
            'originalFilename': original_filename,
            'processedAt': datetime.utcnow().isoformat(),
            'status': 'completed',
            'riskAnalysis': risk_analysis,
            'scoreAnalysis': score_analysis
        }
        
        results_file = os.path.join(app.config['RESULTS_FOLDER'], f"{upload_id}_results.json")
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"Results stored in database and file: {results_file}")
        return results
        
    except Exception as e:
        print(f"Error processing and storing results: {e}")
        
        # Update database with error
        try:
            analysis_result.status = 'error'
            analysis_result.error_message = str(e)
            analysis_result.processing_time = time.time() - start_time
            analysis_result.processed_at = datetime.utcnow()
            db.session.commit()
        except:
            db.session.rollback()
        
        error_results = {
            'uploadId': upload_id,
            'originalFilename': original_filename,
            'processedAt': datetime.utcnow().isoformat(),
            'status': 'error',
            'error': str(e)
        }
        
        # Store error results in file
        try:
            results_file = os.path.join(app.config['RESULTS_FOLDER'], f"{upload_id}_results.json")
            with open(results_file, 'w') as f:
                json.dump(error_results, f, indent=2)
        except:
            pass
        
        return error_results

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
            
            # Generate upload ID
            upload_id = Upload.generate_upload_id()
            
            # Store upload information in database
            upload_record = Upload(
                upload_id=upload_id,
                original_filename=original_filename,
                stored_filename=unique_filename,
                file_path=file_path,
                file_size=os.path.getsize(file_path),
                language=language,
                mime_type='application/pdf'
            )
            
            db.session.add(upload_record)
            db.session.commit()
            
            # Save metadata to JSON file for backward compatibility
            metadata = {
                'uploadId': upload_id,
                'originalFilename': original_filename,
                'storedFilename': unique_filename,
                'uploadedAt': datetime.utcnow().isoformat(),
                'language': language,
                'filePath': file_path,
                'sizeBytes': os.path.getsize(file_path)
            }
            
            metadata_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{unique_filename}.meta.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f)
            
            print(f"Upload stored in database with ID: {upload_id}")
            
            # Automatically process the PDF with both analyzers
            print(f"Starting automatic analysis for {original_filename}...")
            analysis_results = process_and_store_results(upload_id, file_path, original_filename)
            
            response_data = {
                'uploadId': upload_id,
                'dpr': {
                    'id': upload_id,
                    'filename': original_filename,
                    'uploadedAt': upload_record.uploaded_at.isoformat(),
                    'language': language,
                    'status': 'analyzed',
                    'sizeBytes': upload_record.file_size,
                    'storedAs': unique_filename,
                    'filePath': file_path,
                    'isArchived': upload_record.is_archived,
                    'analysisEndpoints': {
                        'risk': f'/api/analyze/risk/{upload_id}',
                        'score': f'/api/analyze/score/{upload_id}',
                        'complete': f'/api/analyze/complete/{upload_id}',
                        'results': f'/api/results/{upload_id}',
                        'archive': f'/api/archive/{upload_id}',
                        'download': f'/api/download/{upload_id}'
                    }
                },
                'analysisResults': analysis_results
            }
            
            return jsonify(response_data), 200
    
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@app.route('/api/files', methods=['GET'])
def list_files():
    """List all uploaded files from database"""
    try:
        include_archived = request.args.get('include_archived', 'true').lower() == 'true'
        uploads = get_all_uploads(include_archived=include_archived)
        
        files = []
        for upload in uploads:
            # Get latest analysis results
            results = get_results_by_upload_id(upload.upload_id)
            latest_result = results[-1] if results else None
            
            file_data = upload.to_dict()
            file_data.update({
                'hasResults': latest_result is not None,
                'analysisStatus': latest_result.status if latest_result else 'pending',
                'processedAt': latest_result.processed_at.isoformat() if latest_result and latest_result.processed_at else None,
                'hasRiskAnalysis': latest_result and latest_result.risk_analysis and 'error' not in latest_result.risk_analysis,
                'hasScoreAnalysis': latest_result and latest_result.score_analysis and 'error' not in latest_result.score_analysis
            })
            
            # Add score percentage if available
            if latest_result and latest_result.score_analysis and 'error' not in latest_result.score_analysis:
                score_data = latest_result.score_analysis
                file_data['scorePercentage'] = score_data.get('percentage', 0)
                file_data['totalScore'] = score_data.get('total_score', 0)
            
            files.append(file_data)
        
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
    """Analyze DPR for completeness and scoring using enhanced system"""
    try:
        # Check availability of analysis systems
        if not INTEGRATED_ANALYSIS_AVAILABLE and not (hasattr(globals(), 'dpr_scorer') and dpr_scorer):
            return jsonify({'error': 'No DPR analysis system available'}), 503
        
        # Find the uploaded file using metadata
        pdf_file = find_uploaded_file(upload_id)
        if not pdf_file or not os.path.exists(pdf_file):
            return jsonify({'error': 'File not found for the given upload ID'}), 404
        
        # Perform scoring analysis with enhanced system
        if INTEGRATED_ANALYSIS_AVAILABLE and dpr_analyzer:
            score_analysis = dpr_analyzer.analyze_dpr(pdf_file)
            analysis_type = "enhanced"
        else:
            score_analysis = dpr_scorer.calculate_total_score(pdf_file)
            analysis_type = "basic"
        
        return jsonify({
            'uploadId': upload_id,
            'scoreAnalysis': score_analysis,
            'analysisType': analysis_type,
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
        
        # Score analysis using enhanced system
        if INTEGRATED_ANALYSIS_AVAILABLE and dpr_analyzer:
            try:
                score_analysis = dpr_analyzer.analyze_dpr(pdf_file)
                results['scoreAnalysis'] = score_analysis
                results['analysisType'] = 'enhanced'
            except Exception as e:
                results['scoreAnalysis'] = {'error': str(e)}
        elif hasattr(globals(), 'dpr_scorer') and dpr_scorer:
            try:
                score_analysis = dpr_scorer.calculate_total_score(pdf_file)
                results['scoreAnalysis'] = score_analysis
                results['analysisType'] = 'basic'
            except Exception as e:
                results['scoreAnalysis'] = {'error': str(e)}
        else:
            results['scoreAnalysis'] = {'error': 'No DPR analysis system available'}
            results['analysisType'] = 'none'
        
        return jsonify(results), 200
        
    except Exception as e:
        print(f"Complete analysis error: {e}")
        print(traceback.format_exc())
        return jsonify({'error': f'Complete analysis failed: {str(e)}'}), 500

@app.route('/api/results/<upload_id>', methods=['GET'])
def get_results(upload_id):
    """Retrieve stored analysis results for a specific upload"""
    try:
        # Get upload information
        upload = get_upload_by_id(upload_id)
        if not upload:
            return jsonify({'error': 'Upload not found for the given upload ID'}), 404
        
        # Get analysis results
        results = get_results_by_upload_id(upload_id)
        if not results:
            return jsonify({'error': 'Results not found for the given upload ID'}), 404
        
        # Get the latest/most complete result
        latest_result = results[-1]
        
        # Update archive access tracking if archived
        if upload.is_archived:
            update_archive_access(upload_id)
        
        response_data = {
            'uploadId': upload_id,
            'originalFilename': upload.original_filename,
            'uploadedAt': upload.uploaded_at.isoformat(),
            'processedAt': latest_result.processed_at.isoformat() if latest_result.processed_at else None,
            'status': latest_result.status,
            'isArchived': upload.is_archived,
            'processingTime': latest_result.processing_time
        }
        
        if latest_result.risk_analysis:
            response_data['riskAnalysis'] = latest_result.risk_analysis
        
        if latest_result.score_analysis:
            response_data['scoreAnalysis'] = latest_result.score_analysis
        
        if latest_result.error_message:
            response_data['error'] = latest_result.error_message
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Error retrieving results: {e}")
        return jsonify({'error': f'Failed to retrieve results: {str(e)}'}), 500

@app.route('/api/results', methods=['GET'])
def list_all_results():
    """List all stored analysis results from database"""
    try:
        include_archived = request.args.get('include_archived', 'true').lower() == 'true'
        uploads = get_all_uploads(include_archived=include_archived)
        
        results_list = []
        for upload in uploads:
            # Get latest analysis results
            results = get_results_by_upload_id(upload.upload_id)
            if not results:
                continue
                
            latest_result = results[-1]
            
            summary = {
                'uploadId': upload.upload_id,
                'originalFilename': upload.original_filename,
                'uploadedAt': upload.uploaded_at.isoformat(),
                'processedAt': latest_result.processed_at.isoformat() if latest_result.processed_at else None,
                'status': latest_result.status,
                'isArchived': upload.is_archived,
                'hasRiskAnalysis': latest_result.risk_analysis and 'error' not in latest_result.risk_analysis,
                'hasScoreAnalysis': latest_result.score_analysis and 'error' not in latest_result.score_analysis,
                'processingTime': latest_result.processing_time
            }
            
            # Add score percentage if available
            if summary['hasScoreAnalysis']:
                score_data = latest_result.score_analysis
                summary['scorePercentage'] = score_data.get('percentage', 0)
                summary['totalScore'] = score_data.get('total_score', 0)
            
            results_list.append(summary)
        
        # Sort by processed date (newest first)
        results_list.sort(key=lambda x: x.get('processedAt', ''), reverse=True)
        
        return jsonify({'results': results_list}), 200
        
    except Exception as e:
        print(f"Error listing results: {e}")
        return jsonify({'error': f'Failed to list results: {str(e)}'}), 500

# Archive Management Endpoints

@app.route('/api/archive/<upload_id>', methods=['POST'])
def archive_file(upload_id):
    """Archive an uploaded file and its results"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'User archived')
        archived_by = data.get('archivedBy', 'system')
        
        success, message = archive_upload(upload_id, reason, archived_by)
        
        if success:
            return jsonify({'message': message}), 200
        else:
            return jsonify({'error': message}), 404
        
    except Exception as e:
        print(f"Error archiving file: {e}")
        return jsonify({'error': f'Failed to archive file: {str(e)}'}), 500

@app.route('/api/archive/<upload_id>', methods=['DELETE'])
def restore_file(upload_id):
    """Restore an archived file"""
    try:
        success, message = restore_upload(upload_id)
        
        if success:
            return jsonify({'message': message}), 200
        else:
            return jsonify({'error': message}), 404
        
    except Exception as e:
        print(f"Error restoring file: {e}")
        return jsonify({'error': f'Failed to restore file: {str(e)}'}), 500

@app.route('/api/archives', methods=['GET'])
def list_archived_files():
    """List all archived files"""
    try:
        archived_data = get_archived_files()
        
        archives = []
        for archive_record, upload in archived_data:
            # Get analysis results
            results = get_results_by_upload_id(upload.upload_id)
            latest_result = results[-1] if results else None
            
            archive_info = archive_record.to_dict()
            archive_info.update({
                'originalFilename': upload.original_filename,
                'fileSize': upload.file_size,
                'uploadedAt': upload.uploaded_at.isoformat(),
                'hasResults': latest_result is not None,
                'analysisStatus': latest_result.status if latest_result else 'pending'
            })
            
            archives.append(archive_info)
        
        # Sort by archived date (newest first)
        archives.sort(key=lambda x: x.get('archivedAt', ''), reverse=True)
        
        return jsonify({'archives': archives}), 200
        
    except Exception as e:
        print(f"Error listing archived files: {e}")
        return jsonify({'error': f'Failed to list archived files: {str(e)}'}), 500

@app.route('/api/download/<upload_id>', methods=['GET'])
def download_file(upload_id):
    """Download the original uploaded PDF file"""
    try:
        upload = get_upload_by_id(upload_id)
        if not upload:
            return jsonify({'error': 'File not found'}), 404
        
        if not os.path.exists(upload.file_path):
            return jsonify({'error': 'Physical file not found'}), 404
        
        # Update archive access tracking if archived
        if upload.is_archived:
            update_archive_access(upload_id)
        
        return send_file(
            upload.file_path,
            as_attachment=True,
            download_name=upload.original_filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error downloading file: {e}")
        return jsonify({'error': f'Failed to download file: {str(e)}'}), 500

@app.route('/api/results/<upload_id>', methods=['DELETE'])
def delete_results(upload_id):
    """Delete upload and all associated data"""
    try:
        upload = get_upload_by_id(upload_id)
        if not upload:
            return jsonify({'error': 'Upload not found'}), 404
        
        # Delete physical files
        try:
            if os.path.exists(upload.file_path):
                os.remove(upload.file_path)
            
            # Delete metadata file
            metadata_file = f"{upload.file_path}.meta.json"
            if os.path.exists(metadata_file):
                os.remove(metadata_file)
            
            # Delete results file
            results_file = os.path.join(app.config['RESULTS_FOLDER'], f"{upload_id}_results.json")
            if os.path.exists(results_file):
                os.remove(results_file)
        except Exception as e:
            print(f"Warning: Error deleting physical files: {e}")
        
        # Delete from database (cascade will handle related records including archived_files)
        db.session.delete(upload)
        db.session.commit()
        
        return jsonify({'message': 'Upload and all associated data deleted successfully'}), 200
        
    except Exception as e:
        print(f"Error deleting upload: {e}")
        db.session.rollback()
        return jsonify({'error': f'Failed to delete upload: {str(e)}'}), 500

@app.route('/api/system/capabilities', methods=['GET'])
def get_system_capabilities():
    """Get information about available analysis capabilities"""
    try:
        capabilities = {
            'risk_analysis': {
                'available': RISK_ANALYZER_AVAILABLE,
                'type': 'gemini_powered',
                'features': ['Cost Overrun Risk', 'Delay Risk', 'Implementation Risk', 'Sustainability Risk']
            },
            'score_analysis': {
                'available': INTEGRATED_ANALYSIS_AVAILABLE or (hasattr(globals(), 'dpr_scorer') and dpr_scorer is not None),
                'type': 'enhanced' if INTEGRATED_ANALYSIS_AVAILABLE else 'basic',
                'features': []
            }
        }
        
        if INTEGRATED_ANALYSIS_AVAILABLE and dpr_analyzer:
            analysis_caps = dpr_analyzer.get_capabilities()
            capabilities['score_analysis']['features'] = analysis_caps.get('features', [])
            capabilities['score_analysis']['enhanced_features'] = {
                'nlp_available': True,
                'semantic_analysis': True,
                'gatishakti_alignment': True,
                'compliance_qa': True,
                'comprehensive_reporting': True
            }
        elif hasattr(globals(), 'dpr_scorer') and dpr_scorer:
            capabilities['score_analysis']['features'] = [
                'Basic completeness checking',
                'Simple technical scoring',
                'Keyword-based analysis'
            ]
        
        return jsonify({
            'system': 'Enhanced DPR Analysis System',
            'version': '2.0',
            'capabilities': capabilities,
            'status': 'operational'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get capabilities: {str(e)}'}), 500

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