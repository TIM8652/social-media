"""
API Key 配置管理模块
允许从前端动态配置 API Keys，无需重启服务
支持数据库持久化存储，重启后自动恢复
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import logging
from database import get_db_connection

router = APIRouter(prefix="/api/config", tags=["config"])
logger = logging.getLogger(__name__)

# 全局 API Key 存储（运行时缓存）
# 优先从数据库加载，如果数据库没有则使用环境变量
_api_keys = {
    "APIFY_API_TOKEN": os.getenv("APIFY_API_TOKEN", ""),
    "GOOGLE_API_KEY": os.getenv("GOOGLE_API_KEY", ""),
    "AISONNET_API_KEY": os.getenv("AISONNET_API_KEY", ""),
    "DEEPSEEK_API_KEY": os.getenv("DEEPSEEK_API_KEY", ""),
    "SORA2_API_KEY": os.getenv("SORA2_API_KEY", ""),
}

def load_api_keys_from_db():
    """
    从数据库加载 API Keys 到内存
    启动时自动调用一次
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT key_name, key_value FROM api_config")
        rows = cursor.fetchall()
        
        for row in rows:
            _api_keys[row['key_name']] = row['key_value']
            logger.info(f"Loaded API key from database: {row['key_name']}")
        
        cursor.close()
        conn.close()
        
        if rows:
            logger.info(f"Successfully loaded {len(rows)} API keys from database")
        else:
            logger.info("No API keys found in database, using environment variables")
            
    except Exception as e:
        logger.warning(f"Failed to load API keys from database: {e}")
        logger.info("Using environment variables for API keys")
        # 如果数据库还没初始化或出错，不报错，继续使用环境变量

# 启动时自动从数据库加载 API Keys
try:
    load_api_keys_from_db()
except Exception as e:
    logger.warning(f"Initial API keys loading failed: {e}")

class APIKeysRequest(BaseModel):
    apify_token: Optional[str] = None
    google_key: Optional[str] = None
    aisonnet_key: Optional[str] = None
    deepseek_key: Optional[str] = None
    sora2_key: Optional[str] = None

class APIKeysResponse(BaseModel):
    apify_token_set: bool
    google_key_set: bool
    aisonnet_key_set: bool
    deepseek_key_set: bool
    sora2_key_set: bool

def get_api_key(key_name: str) -> str:
    """
    获取 API Key
    优先从运行时缓存获取，如果没有则从环境变量获取
    """
    return _api_keys.get(key_name, "")

def set_api_key(key_name: str, value: str):
    """
    设置 API Key（同时更新内存缓存和数据库）
    
    Args:
        key_name: API Key 名称
        value: API Key 值
    """
    # 1. 更新内存缓存（快速访问）
    _api_keys[key_name] = value
    
    # 2. 持久化到数据库（重启后不丢失）
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 使用 UPSERT（插入或更新）
        cursor.execute("""
            INSERT INTO api_config (key_name, key_value, updated_at) 
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (key_name) 
            DO UPDATE SET 
                key_value = EXCLUDED.key_value, 
                updated_at = CURRENT_TIMESTAMP
        """, (key_name, value))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"API key saved to database: {key_name}")
        
    except Exception as e:
        logger.error(f"Failed to save API key to database: {e}")
        # 即使数据库保存失败，内存中的值也已更新，不影响当前使用
        # 但会在下次重启时丢失
        raise HTTPException(status_code=500, detail=f"Failed to save API key: {str(e)}")

@router.post("/api-keys")
async def update_api_keys(request: APIKeysRequest):
    """
    更新 API Keys
    """
    try:
        if request.apify_token is not None:
            set_api_key("APIFY_API_TOKEN", request.apify_token)
        
        if request.google_key is not None:
            set_api_key("GOOGLE_API_KEY", request.google_key)
        
        if request.aisonnet_key is not None:
            set_api_key("AISONNET_API_KEY", request.aisonnet_key)
        
        if request.deepseek_key is not None:
            set_api_key("DEEPSEEK_API_KEY", request.deepseek_key)
        
        if request.sora2_key is not None:
            set_api_key("SORA2_API_KEY", request.sora2_key)
        
        return {
            "success": True,
            "message": "API Keys 更新成功"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")

@router.get("/api-keys", response_model=APIKeysResponse)
async def get_api_keys_status():
    """
    获取 API Keys 配置状态（不返回实际密钥，只返回是否已配置）
    """
    return APIKeysResponse(
        apify_token_set=len(get_api_key("APIFY_API_TOKEN")) > 0,
        google_key_set=len(get_api_key("GOOGLE_API_KEY")) > 0,
        aisonnet_key_set=len(get_api_key("AISONNET_API_KEY")) > 0,
        deepseek_key_set=len(get_api_key("DEEPSEEK_API_KEY")) > 0,
        sora2_key_set=len(get_api_key("SORA2_API_KEY")) > 0,
    )

