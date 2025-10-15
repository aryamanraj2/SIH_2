# DPR Analysis System - PostgreSQL Setup Guide

This guide will help you set up the PostgreSQL database for the DPR Analysis System with full archive functionality.

## Prerequisites

1. **PostgreSQL** installed and running
2. **Python 3.8+** with pip
3. **Node.js 16+** with npm/yarn/pnpm
4. **Git** (if cloning from repository)

## Backend Setup

### 1. Install Dependencies

```bash
cd Backend
pip install -r requirements.txt
```

### 2. Database Configuration

1. Create a `.env` file in the Backend directory:
```bash
cp .env.example .env
```

2. Edit `.env` with your PostgreSQL credentials:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/dpr_analysis
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
MAX_CONTENT_LENGTH=104857600
UPLOAD_FOLDER=Uploads
RESULTS_FOLDER=Results
```

### 3. Database Setup

1. **Initialize the database:**
```bash
python init_db.py
```

This script will:
- Create the PostgreSQL database if it doesn't exist
- Create all required tables (uploads, analysis_results, archived_files)
- Set up proper relationships and indexes

2. **Migrate existing data (optional):**
If you have existing files in the Uploads and Results folders:
```bash
python migrate_data.py
```

This will import all existing uploads and analysis results into the database.

### 4. Run the Backend

```bash
python app.py
```

The backend will run on `http://localhost:5001`

## Frontend Setup

### 1. Install Dependencies

```bash
cd Dashboard
npm install
# or
pnpm install
```

### 2. Environment Configuration

Create a `.env.local` file in the Dashboard directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### 3. Run the Frontend

```bash
npm run dev
# or
pnpm dev
```

The dashboard will run on `http://localhost:3000`

## Database Schema

The system uses three main tables:

### `uploads`
- `id` (Primary Key)
- `upload_id` (Unique UUID)
- `original_filename`
- `stored_filename` 
- `file_path`
- `file_size`
- `language`
- `uploaded_at`
- `is_archived`
- `mime_type`

### `analysis_results`
- `id` (Primary Key)
- `upload_id` (Foreign Key to uploads)
- `analysis_type`
- `status`
- `processed_at`
- `risk_analysis` (JSON)
- `score_analysis` (JSON)
- `error_message`
- `processing_time`

### `archived_files`
- `id` (Primary Key)
- `upload_id` (Foreign Key to uploads)
- `archived_at`
- `archived_by`
- `archive_reason`
- `is_active`
- `archive_location`
- `access_count`
- `last_accessed`

## Archive Functionality

The system now includes comprehensive archive functionality:

### Backend API Endpoints

- `POST /api/archive/{upload_id}` - Archive a file
- `DELETE /api/archive/{upload_id}` - Restore an archived file
- `GET /api/archives` - List all archived files
- `GET /api/download/{upload_id}` - Download original PDF
- `GET /api/files?include_archived=true/false` - List files with archive filter
- `DELETE /api/results/{upload_id}` - Permanently delete file and data

### Frontend Features

- **Archive Tab**: Separate views for active and archived files
- **Archive Management**: Archive, restore, and permanently delete files
- **Search**: Search across both active and archived files
- **Download**: Download original PDF files from archive
- **Access Tracking**: Track how often archived files are accessed
- **Metadata Display**: Show file sizes, upload dates, processing status

## Usage

### Archiving Files

1. Go to the Archive tab in the dashboard
2. In the "Active Files" tab, click the menu (⋯) on any file
3. Select "Archive" to move the file to archive
4. Files remain accessible but are moved to the "Archived Files" tab

### Restoring Files

1. Go to the "Archived Files" tab
2. Click the menu (⋯) on any archived file
3. Select "Restore" to move it back to active files

### Downloading Files

1. Click the menu (⋯) on any file (active or archived)
2. Select "Download PDF" to download the original file
3. The system tracks access for archived files

### Permanent Deletion

1. Click the menu (⋯) on any file
2. Select "Delete" or "Delete Permanently"
3. Confirm the deletion - this cannot be undone
4. This removes the file, database records, and all analysis results

## Production Deployment

### Database

1. Set up PostgreSQL with proper user permissions
2. Update DATABASE_URL in production environment
3. Run database initialization scripts
4. Set up regular backups

### Backend

1. Set FLASK_ENV=production
2. Use a proper WSGI server (gunicorn, uWSGI)
3. Set up reverse proxy (nginx)
4. Configure proper logging

### Frontend

1. Build the application: `npm run build`
2. Deploy to hosting platform
3. Set proper NEXT_PUBLIC_API_URL

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check DATABASE_URL format
3. Ensure user has proper permissions
4. Check firewall settings

### Migration Issues

1. Backup existing files before migration
2. Check file permissions in Uploads/Results folders
3. Verify JSON file formats are valid
4. Run migration with --verify-only first

### Archive Issues

1. Check file system permissions
2. Verify database relationships are intact
3. Ensure upload_id consistency between tables

## Backup and Recovery

### Database Backup

```bash
pg_dump -U username -h localhost dpr_analysis > backup.sql
```

### File Backup

```bash
tar -czf files_backup.tar.gz Backend/Uploads Backend/Results
```

### Restore

```bash
psql -U username -h localhost dpr_analysis < backup.sql
tar -xzf files_backup.tar.gz
```

## Security Considerations

1. Use strong database passwords
2. Limit database user permissions
3. Set up SSL for database connections
4. Implement proper file upload validation
5. Set up rate limiting for API endpoints
6. Use HTTPS in production
7. Regular security updates

## Support

For issues or questions:
1. Check the logs in Backend and Frontend
2. Verify database connectivity
3. Check file permissions
4. Review environment variables
5. Ensure all dependencies are installed