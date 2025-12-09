"""
数据库连接统一管理模块
支持本地开发环境和 Railway 生产环境
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_db_connection(cursor_factory=RealDictCursor):
    """
    获取数据库连接
    
    Args:
        cursor_factory: 游标工厂，默认返回字典格式结果
        
    Returns:
        psycopg2.connection: 数据库连接对象
        
    环境变量：
        DATABASE_URL: Railway 提供的完整数据库连接字符串
                     格式：postgresql://user:password@host:port/database
        
    本地开发环境：
        如果没有 DATABASE_URL，使用本地 PostgreSQL 配置
    """
    database_url = os.getenv('DATABASE_URL')
    
    try:
        if database_url:
            # Railway 生产环境
            logger.info("Using Railway database connection")
            conn = psycopg2.connect(
                database_url,
                cursor_factory=cursor_factory
            )
        else:
            # 本地开发环境
            db_host = os.getenv('DB_HOST', 'localhost')
            db_port = os.getenv('DB_PORT', '5432')
            db_name = os.getenv('DB_NAME', 'social_media')
            db_user = os.getenv('DB_USER', 'postgres')
            db_password = os.getenv('DB_PASSWORD', '1234qwer')
            
            logger.info(f"Using local database: {db_user}@{db_host}:{db_port}/{db_name}")
            conn = psycopg2.connect(
                host=db_host,
                port=db_port,
                database=db_name,
                user=db_user,
                password=db_password,
                cursor_factory=cursor_factory
            )
        
        logger.info("Database connected successfully")
        return conn
        
    except psycopg2.Error as e:
        logger.error(f"Database connection failed: {str(e)}")
        raise


def test_connection() -> bool:
    """
    测试数据库连接是否正常
    
    Returns:
        bool: 连接成功返回 True，失败返回 False
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {str(e)}")
        return False


def get_db_info() -> dict:
    """
    获取数据库信息（用于调试）
    
    Returns:
        dict: 数据库版本和连接信息
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        
        cursor.execute("SELECT current_database()")
        database = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return {
            "version": version,
            "database": database,
            "connection_type": "Railway" if os.getenv('DATABASE_URL') else "Local"
        }
    except Exception as e:
        logger.error(f"Failed to get database info: {str(e)}")
        return {"error": str(e)}


if __name__ == "__main__":
    # 测试数据库连接
    print("=" * 50)
    print("Database Connection Test")
    print("=" * 50)
    print()
    
    if test_connection():
        print("[SUCCESS] Database connected successfully!")
        print()
        info = get_db_info()
        print(f"Database Info:")
        print(f"  - Type: {info.get('connection_type', 'Unknown')}")
        print(f"  - Database: {info.get('database', 'Unknown')}")
        if info.get('version'):
            version_str = str(info['version'][0]) if isinstance(info['version'], tuple) else str(info['version'])
            print(f"  - Version: {version_str[:50]}...")
    else:
        print("[FAILED] Database connection failed!")
        print()
        print("Please check:")
        print("  1. PostgreSQL is running")
        print("  2. Database 'social_media' exists")
        print("  3. Username/password is correct (default: postgres/1234qwer)")
        print("  4. Or set environment variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD")

