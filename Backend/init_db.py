#!/usr/bin/env python3
"""
Database initialization script for DPR Analysis System
Run this script to set up the PostgreSQL database and tables
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_database():
    """Create the PostgreSQL database if it doesn't exist"""
    
    # Parse database URL
    database_url = os.getenv('DATABASE_URL', 'postgresql://dpr_user:dpr_password@localhost:5432/dpr_analysis')
    
    # Extract connection details
    try:
        # Format: postgresql://user:password@host:port/database
        url_parts = database_url.replace('postgresql://', '').split('/')
        db_name = url_parts[1] if len(url_parts) > 1 else 'dpr_analysis'
        user_host_port = url_parts[0].split('@')
        host_port = user_host_port[1].split(':')
        user_pass = user_host_port[0].split(':')
        
        host = host_port[0]
        port = int(host_port[1]) if len(host_port) > 1 else 5432
        user = user_pass[0]
        password = user_pass[1] if len(user_pass) > 1 else ''
        
    except Exception as e:
        print(f"Error parsing DATABASE_URL: {e}")
        print("Please check your DATABASE_URL format in .env file")
        sys.exit(1)
    
    try:
        # Connect to PostgreSQL server (without database)
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database='postgres'  # Connect to default postgres database
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Creating database '{db_name}'...")
            cursor.execute(f'CREATE DATABASE "{db_name}"')
            print(f"Database '{db_name}' created successfully!")
        else:
            print(f"Database '{db_name}' already exists.")
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.Error as e:
        print(f"Error creating database: {e}")
        print("\nPlease ensure:")
        print("1. PostgreSQL is running")
        print("2. User credentials are correct")
        print("3. User has permission to create databases")
        return False

def init_tables():
    """Initialize database tables"""
    try:
        # Import Flask and database components separately
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from flask import Flask
        from database import db, Upload, AnalysisResult, ArchivedFile
        
        # Create a simple Flask app just for database initialization
        app = Flask(__name__)
        
        # Database configuration
        database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:parth1485@localhost:5432/dpr_analysis')
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_pre_ping': True,
            'pool_recycle': 300,
        }
        
        db.init_app(app)
        
        print("Initializing database tables...")
        with app.app_context():
            db.create_all()
            print("Database tables created successfully!")
        
        return True
        
    except Exception as e:
        print(f"Error initializing tables: {e}")
        return False

def main():
    """Main initialization function"""
    print("=== DPR Analysis System Database Setup ===\n")
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("No .env file found. Please create one based on .env.example")
        print("Copy .env.example to .env and update the database credentials.")
        sys.exit(1)
    
    # Step 1: Create database
    print("Step 1: Creating database...")
    if not create_database():
        print("Failed to create database. Exiting.")
        sys.exit(1)
    
    # Step 2: Initialize tables
    print("\nStep 2: Initializing tables...")
    if not init_tables():
        print("Failed to initialize tables. Exiting.")
        sys.exit(1)
    
    print("\n=== Database setup completed successfully! ===")
    print("\nYou can now run the Flask application with:")
    print("python app.py")

if __name__ == "__main__":
    main()