#!/usr/bin/env python3
"""
Migration script to fix foreign key constraints for archived_files table
This script adds CASCADE DELETE to the foreign key constraint
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_database_connection():
    """Get database connection from environment or default"""
    database_url = os.getenv('DATABASE_URL', 'postgresql://username:password@localhost:5432/dpr_analysis')
    
    # Parse the database URL
    if database_url.startswith('postgresql://'):
        # Extract connection parameters from URL
        from urllib.parse import urlparse
        result = urlparse(database_url)
        
        return psycopg2.connect(
            host=result.hostname,
            port=result.port,
            database=result.path[1:],
            user=result.username,
            password=result.password
        )
    else:
        raise ValueError("Invalid DATABASE_URL format")

def fix_foreign_key_constraint():
    """Fix the foreign key constraint to include CASCADE DELETE"""
    try:
        conn = get_database_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("Fixing foreign key constraint for archived_files table...")
        
        # First, check if the constraint exists
        cursor.execute("""
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'archived_files' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name = 'archived_files_upload_id_fkey';
        """)
        
        constraint_exists = cursor.fetchone()
        
        if constraint_exists:
            print("Dropping existing foreign key constraint...")
            cursor.execute("""
                ALTER TABLE archived_files 
                DROP CONSTRAINT archived_files_upload_id_fkey;
            """)
        
        print("Adding new foreign key constraint with CASCADE DELETE...")
        cursor.execute("""
            ALTER TABLE archived_files 
            ADD CONSTRAINT archived_files_upload_id_fkey 
            FOREIGN KEY (upload_id) 
            REFERENCES uploads(upload_id) 
            ON DELETE CASCADE;
        """)
        
        print("Foreign key constraint fixed successfully!")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"Error fixing foreign key constraint: {e}")
        return False

if __name__ == "__main__":
    print("Starting foreign key constraint migration...")
    
    if fix_foreign_key_constraint():
        print("Migration completed successfully!")
        sys.exit(0)
    else:
        print("Migration failed!")
        sys.exit(1)