"""
Database configuration and models for DPR Analysis System
"""
import os
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON, LargeBinary, Text
import uuid
import json

db = SQLAlchemy()

class Upload(db.Model):
    """Model for storing uploaded file information"""
    __tablename__ = 'uploads'
    
    id = db.Column(db.Integer, primary_key=True)
    upload_id = db.Column(db.String(36), unique=True, nullable=False, index=True)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False)
    language = db.Column(db.String(10), default='EN')
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_archived = db.Column(db.Boolean, default=False)
    mime_type = db.Column(db.String(100), default='application/pdf')
    
    # Relationship with results
    results = db.relationship('AnalysisResult', backref='upload', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'uploadId': self.upload_id,
            'originalFilename': self.original_filename,
            'storedFilename': self.stored_filename,
            'filePath': self.file_path,
            'fileSize': self.file_size,
            'language': self.language,
            'uploadedAt': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'isArchived': self.is_archived,
            'mimeType': self.mime_type
        }
    
    @staticmethod
    def generate_upload_id():
        """Generate a unique upload ID"""
        return str(uuid.uuid4())

class AnalysisResult(db.Model):
    """Model for storing analysis results"""
    __tablename__ = 'analysis_results'
    
    id = db.Column(db.Integer, primary_key=True)
    upload_id = db.Column(db.String(36), db.ForeignKey('uploads.upload_id'), nullable=False, index=True)
    analysis_type = db.Column(db.String(50), nullable=False)  # 'risk', 'score', 'complete'
    status = db.Column(db.String(20), default='pending')  # 'pending', 'completed', 'error'
    processed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Store analysis results as JSON
    risk_analysis = db.Column(JSON)
    score_analysis = db.Column(JSON)
    error_message = db.Column(Text)
    
    # Additional metadata
    processing_time = db.Column(db.Float)  # Time taken for analysis in seconds
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'uploadId': self.upload_id,
            'analysisType': self.analysis_type,
            'status': self.status,
            'processedAt': self.processed_at.isoformat() if self.processed_at else None,
            'riskAnalysis': self.risk_analysis,
            'scoreAnalysis': self.score_analysis,
            'errorMessage': self.error_message,
            'processingTime': self.processing_time
        }

class ArchivedFile(db.Model):
    """Model for tracking archived files and their metadata"""
    __tablename__ = 'archived_files'
    
    id = db.Column(db.Integer, primary_key=True)
    upload_id = db.Column(db.String(36), db.ForeignKey('uploads.upload_id'), nullable=False, index=True)
    archived_at = db.Column(db.DateTime, default=datetime.utcnow)
    archived_by = db.Column(db.String(100))  # For future user management
    archive_reason = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    
    # Archive metadata
    archive_location = db.Column(db.String(500))  # Could be used for different storage locations
    access_count = db.Column(db.Integer, default=0)
    last_accessed = db.Column(db.DateTime)
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'uploadId': self.upload_id,
            'archivedAt': self.archived_at.isoformat() if self.archived_at else None,
            'archivedBy': self.archived_by,
            'archiveReason': self.archive_reason,
            'isActive': self.is_active,
            'archiveLocation': self.archive_location,
            'accessCount': self.access_count,
            'lastAccessed': self.last_accessed.isoformat() if self.last_accessed else None
        }

def init_database(app):
    """Initialize database with Flask app"""
    # Database configuration
    database_url = os.getenv('DATABASE_URL', 'postgresql://username:password@localhost:5432/dpr_analysis')
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    db.init_app(app)
    
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("Database initialized successfully")
        except Exception as e:
            print(f"Database initialization failed: {e}")
            raise

def get_upload_by_id(upload_id):
    """Get upload record by upload_id"""
    return Upload.query.filter_by(upload_id=upload_id).first()

def get_results_by_upload_id(upload_id):
    """Get all analysis results for a specific upload"""
    return AnalysisResult.query.filter_by(upload_id=upload_id).all()

def get_all_uploads(include_archived=True):
    """Get all uploads, optionally excluding archived ones"""
    query = Upload.query
    if not include_archived:
        query = query.filter_by(is_archived=False)
    return query.order_by(Upload.uploaded_at.desc()).all()

def get_archived_files():
    """Get all archived files with their upload information"""
    return db.session.query(ArchivedFile, Upload).join(Upload).filter(ArchivedFile.is_active == True).all()

def archive_upload(upload_id, reason=None, archived_by=None):
    """Archive an upload and create archive record"""
    upload = get_upload_by_id(upload_id)
    if not upload:
        return False, "Upload not found"
    
    try:
        # Mark upload as archived
        upload.is_archived = True
        
        # Create archive record
        archive_record = ArchivedFile(
            upload_id=upload_id,
            archive_reason=reason,
            archived_by=archived_by
        )
        
        db.session.add(archive_record)
        db.session.commit()
        
        return True, "Upload archived successfully"
    except Exception as e:
        db.session.rollback()
        return False, f"Archive failed: {str(e)}"

def restore_upload(upload_id):
    """Restore an archived upload"""
    upload = get_upload_by_id(upload_id)
    if not upload:
        return False, "Upload not found"
    
    try:
        # Mark upload as not archived
        upload.is_archived = False
        
        # Deactivate archive records
        archive_records = ArchivedFile.query.filter_by(upload_id=upload_id, is_active=True).all()
        for record in archive_records:
            record.is_active = False
        
        db.session.commit()
        return True, "Upload restored successfully"
    except Exception as e:
        db.session.rollback()
        return False, f"Restore failed: {str(e)}"

def update_archive_access(upload_id):
    """Update archive access tracking"""
    archive_record = ArchivedFile.query.filter_by(upload_id=upload_id, is_active=True).first()
    if archive_record:
        archive_record.access_count += 1
        archive_record.last_accessed = datetime.utcnow()
        db.session.commit()