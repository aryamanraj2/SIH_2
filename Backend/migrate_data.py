#!/usr/bin/env python3
"""
Migration script to import existing file-based data into PostgreSQL database
"""

import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from database import db, Upload, AnalysisResult

def migrate_existing_data():
    """Migrate existing uploads and results to database"""
    
    upload_folder = 'Uploads'
    results_folder = 'Results'
    
    if not os.path.exists(upload_folder):
        print(f"Upload folder '{upload_folder}' not found. Nothing to migrate.")
        return
    
    with app.app_context():
        print("Starting data migration...")
        
        migrated_uploads = 0
        migrated_results = 0
        errors = 0
        
        # Migrate uploads from metadata files
        print("\n1. Migrating uploads...")
        for filename in os.listdir(upload_folder):
            if filename.endswith('.meta.json'):
                try:
                    filepath = os.path.join(upload_folder, filename)
                    with open(filepath, 'r') as f:
                        metadata = json.load(f)
                    
                    upload_id = metadata.get('uploadId')
                    
                    # Check if already exists
                    if Upload.query.filter_by(upload_id=upload_id).first():
                        print(f"  Skip: Upload {upload_id} already exists")
                        continue
                    
                    # Create upload record
                    upload = Upload(
                        upload_id=upload_id,
                        original_filename=metadata.get('originalFilename', 'unknown.pdf'),
                        stored_filename=metadata.get('storedFilename', filename.replace('.meta.json', '')),
                        file_path=metadata.get('filePath', f"Uploads/{metadata.get('storedFilename', '')}"),
                        file_size=metadata.get('sizeBytes', 0),
                        language=metadata.get('language', 'EN'),
                        mime_type='application/pdf'
                    )
                    
                    # Parse upload date
                    if 'uploadedAt' in metadata:
                        try:
                            upload.uploaded_at = datetime.fromisoformat(metadata['uploadedAt'].replace('Z', '+00:00'))
                        except:
                            upload.uploaded_at = datetime.utcnow()
                    
                    db.session.add(upload)
                    migrated_uploads += 1
                    print(f"  Migrated: {metadata.get('originalFilename')} ({upload_id})")
                    
                except Exception as e:
                    print(f"  Error migrating {filename}: {e}")
                    errors += 1
        
        # Commit uploads
        try:
            db.session.commit()
            print(f"  Committed {migrated_uploads} uploads to database")
        except Exception as e:
            print(f"  Error committing uploads: {e}")
            db.session.rollback()
            return
        
        # Migrate results
        print("\n2. Migrating analysis results...")
        if os.path.exists(results_folder):
            for filename in os.listdir(results_folder):
                if filename.endswith('_results.json'):
                    try:
                        filepath = os.path.join(results_folder, filename)
                        with open(filepath, 'r') as f:
                            result_data = json.load(f)
                        
                        upload_id = result_data.get('uploadId')
                        
                        # Check if upload exists
                        upload = Upload.query.filter_by(upload_id=upload_id).first()
                        if not upload:
                            print(f"  Skip: No upload found for result {upload_id}")
                            continue
                        
                        # Check if result already exists
                        if AnalysisResult.query.filter_by(upload_id=upload_id).first():
                            print(f"  Skip: Result for {upload_id} already exists")
                            continue
                        
                        # Create analysis result
                        analysis_result = AnalysisResult(
                            upload_id=upload_id,
                            analysis_type='complete',
                            status=result_data.get('status', 'completed'),
                            risk_analysis=result_data.get('riskAnalysis'),
                            score_analysis=result_data.get('scoreAnalysis')
                        )
                        
                        # Parse processed date
                        if 'processedAt' in result_data:
                            try:
                                analysis_result.processed_at = datetime.fromisoformat(result_data['processedAt'].replace('Z', '+00:00'))
                            except:
                                analysis_result.processed_at = datetime.utcnow()
                        
                        # Handle error cases
                        if result_data.get('error'):
                            analysis_result.error_message = result_data['error']
                            analysis_result.status = 'error'
                        
                        db.session.add(analysis_result)
                        migrated_results += 1
                        print(f"  Migrated: Result for {result_data.get('originalFilename', upload_id)}")
                        
                    except Exception as e:
                        print(f"  Error migrating {filename}: {e}")
                        errors += 1
        
        # Commit results
        try:
            db.session.commit()
            print(f"  Committed {migrated_results} results to database")
        except Exception as e:
            print(f"  Error committing results: {e}")
            db.session.rollback()
            return
        
        print(f"\n=== Migration Summary ===")
        print(f"Uploads migrated: {migrated_uploads}")
        print(f"Results migrated: {migrated_results}")
        print(f"Errors: {errors}")
        
        if errors == 0:
            print("\n✅ Migration completed successfully!")
        else:
            print(f"\n⚠️  Migration completed with {errors} errors. Check the logs above.")

def verify_migration():
    """Verify the migrated data"""
    with app.app_context():
        print("\n=== Migration Verification ===")
        
        uploads_count = Upload.query.count()
        results_count = AnalysisResult.query.count()
        archived_count = Upload.query.filter_by(is_archived=True).count()
        
        print(f"Total uploads in database: {uploads_count}")
        print(f"Total results in database: {results_count}")
        print(f"Archived uploads: {archived_count}")
        
        # Show recent uploads
        recent_uploads = Upload.query.order_by(Upload.uploaded_at.desc()).limit(5).all()
        if recent_uploads:
            print(f"\nRecent uploads:")
            for upload in recent_uploads:
                print(f"  - {upload.original_filename} ({upload.upload_id[:8]}...)")

def main():
    """Main migration function"""
    print("=== DPR Analysis System Data Migration ===\n")
    
    if len(sys.argv) > 1 and sys.argv[1] == '--verify-only':
        verify_migration()
        return
    
    try:
        migrate_existing_data()
        verify_migration()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()