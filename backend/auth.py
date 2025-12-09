from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(request: LoginRequest):
    """用户登录"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 查询user表
        cursor.execute(
            'SELECT * FROM "user" WHERE username = %s AND password = %s',
            (request.username, request.password)
        )
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        
        # 返回用户信息
        return {
            "success": True,
            "user": {
                "id": user['id'],
                "username": user['username'],
                "role": user['role']
            }
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"登录失败: {str(e)}")

