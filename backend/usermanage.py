"""
User Data Management Module
Provides user-based data isolation for multiple tables
Currently supports: popular table
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import json

router = APIRouter(prefix="/api/user-data", tags=["user-data"])

# Database configuration
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "social_media",
    "user": "postgres",
    "password": "1234qwer"
}

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


# ============================================
# Popular Table Models and Endpoints
# ============================================

class PopularCreate(BaseModel):
    post_id: str
    post_type: Optional[str] = None
    display_url_base64: Optional[str] = None
    video_url_base64: Optional[str] = None
    images_base64: Optional[List[str]] = None
    jianyi1: Optional[str] = None
    jianyi2: Optional[str] = None
    jianyi3: Optional[str] = None

class PopularUpdate(BaseModel):
    post_type: Optional[str] = None
    display_url_base64: Optional[str] = None
    video_url_base64: Optional[str] = None
    images_base64: Optional[List[str]] = None
    jianyi1: Optional[str] = None
    jianyi2: Optional[str] = None
    jianyi3: Optional[str] = None

class PopularResponse(BaseModel):
    id: int
    user_id: int
    post_id: str
    post_type: Optional[str]
    display_url_base64: Optional[str]
    video_url_base64: Optional[str]
    images_base64: Optional[List[str]]
    jianyi1: Optional[str]
    jianyi2: Optional[str]
    jianyi3: Optional[str]
    created_at: str
    updated_at: str


@router.get("/popular", response_model=List[PopularResponse])
async def get_user_popular_data(user_id: int):
    """
    Get all popular data for a specific user
    Data isolation: Only returns data belonging to the specified user_id
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                       images_base64, jianyi1, jianyi2, jianyi3, created_at, updated_at
                FROM popular
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (user_id,))
            results = cur.fetchall()
            
            popular_list = []
            for row in results:
                row_dict = dict(row)
                row_dict['created_at'] = row_dict['created_at'].isoformat()
                row_dict['updated_at'] = row_dict['updated_at'].isoformat()
                popular_list.append(row_dict)
            
            return popular_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()


@router.get("/popular/{post_id}", response_model=PopularResponse)
async def get_popular_by_id(user_id: int, post_id: str):
    """
    Get specific post data for a user
    Data isolation: Only returns data if it belongs to the specified user_id
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                       images_base64, jianyi1, jianyi2, jianyi3, created_at, updated_at
                FROM popular
                WHERE user_id = %s AND post_id = %s
            """, (user_id, post_id))
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Data not found")
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            return result_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()


@router.post("/popular", response_model=PopularResponse)
async def create_popular_data(user_id: int, data: PopularCreate):
    """
    Create popular data for a specific user
    Data isolation: Data is automatically bound to the specified user_id
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if user exists
            cur.execute('SELECT id FROM "user" WHERE id = %s', (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")
            
            # Convert images_base64 to JSON
            images_json = json.dumps(data.images_base64) if data.images_base64 else None
            
            # Insert data with user_id binding
            cur.execute("""
                INSERT INTO popular (user_id, post_id, post_type, display_url_base64, video_url_base64, 
                                   images_base64, jianyi1, jianyi2, jianyi3)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                RETURNING id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                          images_base64, jianyi1, jianyi2, jianyi3, created_at, updated_at
            """, (user_id, data.post_id, data.post_type, data.display_url_base64, data.video_url_base64,
                  images_json, data.jianyi1, data.jianyi2, data.jianyi3))
            
            result = cur.fetchone()
            conn.commit()
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            return result_dict
    except HTTPException:
        raise
    except psycopg2.IntegrityError as e:
        conn.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(status_code=409, detail="Post already exists")
        raise HTTPException(status_code=400, detail=f"Data integrity error: {str(e)}")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Create failed: {str(e)}")
    finally:
        conn.close()


@router.put("/popular/{post_id}", response_model=PopularResponse)
async def update_popular_data(user_id: int, post_id: str, data: PopularUpdate):
    """
    Update popular data for a specific user
    Data isolation: Only updates data if it belongs to the specified user_id
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if data exists and belongs to the user
            cur.execute("""
                SELECT id FROM popular WHERE user_id = %s AND post_id = %s
            """, (user_id, post_id))
            
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Data not found or no permission")
            
            # Build update statement
            update_fields = []
            update_values = []
            
            if data.display_url_base64 is not None:
                update_fields.append("display_url_base64 = %s")
                update_values.append(data.display_url_base64)
            
            if data.video_url_base64 is not None:
                update_fields.append("video_url_base64 = %s")
                update_values.append(data.video_url_base64)
            
            if data.images_base64 is not None:
                update_fields.append("images_base64 = %s::jsonb")
                update_values.append(json.dumps(data.images_base64))
            
            if data.jianyi1 is not None:
                update_fields.append("jianyi1 = %s")
                update_values.append(data.jianyi1)
            
            if data.jianyi2 is not None:
                update_fields.append("jianyi2 = %s")
                update_values.append(data.jianyi2)
            
            if data.jianyi3 is not None:
                update_fields.append("jianyi3 = %s")
                update_values.append(data.jianyi3)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No update data provided")
            
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            update_values.extend([user_id, post_id])
            
            # Execute update
            cur.execute(f"""
                UPDATE popular 
                SET {', '.join(update_fields)}
                WHERE user_id = %s AND post_id = %s
                RETURNING id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                          images_base64, jianyi1, jianyi2, jianyi3, created_at, updated_at
            """, update_values)
            
            result = cur.fetchone()
            conn.commit()
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            return result_dict
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
    finally:
        conn.close()


@router.delete("/popular/{post_id}")
async def delete_popular_data(user_id: int, post_id: str):
    """
    Delete popular data for a specific user
    Data isolation: Only deletes data if it belongs to the specified user_id
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM popular 
                WHERE user_id = %s AND post_id = %s
                RETURNING id
            """, (user_id, post_id))
            
            result = cur.fetchone()
            conn.commit()
            
            if not result:
                raise HTTPException(status_code=404, detail="Data not found or no permission")
            
            return {"message": "Delete successful", "post_id": post_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
    finally:
        conn.close()


# ============================================
# MyPostl Table Models and Endpoints (Temporary Data)
# ============================================

class MyPostlCreate(BaseModel):
    post_id: str
    post_type: Optional[str] = None
    display_url_base64: Optional[str] = None
    video_url_base64: Optional[str] = None
    images_base64: Optional[List[str]] = None
    jianyi1: Optional[str] = None
    jianyi2: Optional[str] = None
    jianyi3: Optional[str] = None
    prompt: Optional[str] = None
    new_display_url_base64: Optional[str] = None
    new_images_base64: Optional[List[str]] = None

class MyPostlUpdate(BaseModel):
    post_type: Optional[str] = None
    display_url_base64: Optional[str] = None
    video_url_base64: Optional[str] = None
    images_base64: Optional[List[str]] = None
    jianyi1: Optional[str] = None
    jianyi2: Optional[str] = None
    jianyi3: Optional[str] = None
    prompt: Optional[str] = None
    new_display_url_base64: Optional[str] = None
    new_images_base64: Optional[List[str]] = None

class MyPostlResponse(BaseModel):
    id: int
    user_id: int
    post_id: str
    post_type: Optional[str]
    display_url_base64: Optional[str]
    video_url_base64: Optional[str]
    images_base64: Optional[List[str]]
    jianyi1: Optional[str]
    jianyi2: Optional[str]
    jianyi3: Optional[str]
    prompt: Optional[str]
    new_display_url_base64: Optional[str]
    new_images_base64: Optional[List[str]]
    created_at: str
    updated_at: str


@router.get("/mypostl", response_model=List[MyPostlResponse])
async def get_user_mypostl_data(user_id: int):
    """Get all mypostl data for a specific user"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                       images_base64, jianyi1, jianyi2, jianyi3, prompt, 
                       new_display_url_base64, new_images_base64, created_at, updated_at
                FROM mypostl
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (user_id,))
            results = cur.fetchall()
            
            mypostl_list = []
            for row in results:
                row_dict = dict(row)
                row_dict['created_at'] = row_dict['created_at'].isoformat()
                row_dict['updated_at'] = row_dict['updated_at'].isoformat()
                mypostl_list.append(row_dict)
            
            return mypostl_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()


@router.get("/mypostl/{post_id}", response_model=MyPostlResponse)
async def get_mypostl_by_id(user_id: int, post_id: str):
    """Get specific mypostl data for a user"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                       images_base64, jianyi1, jianyi2, jianyi3, prompt, 
                       new_display_url_base64, new_images_base64, created_at, updated_at
                FROM mypostl
                WHERE user_id = %s AND post_id = %s
            """, (user_id, post_id))
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Data not found")
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            return result_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()


@router.post("/mypostl", response_model=MyPostlResponse)
async def create_mypostl_data(user_id: int, data: MyPostlCreate):
    """Create mypostl data for a specific user"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('SELECT id FROM "user" WHERE id = %s', (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")
            
            images_json = json.dumps(data.images_base64) if data.images_base64 else None
            new_images_json = json.dumps(data.new_images_base64) if data.new_images_base64 else None
            
            cur.execute("""
                INSERT INTO mypostl (user_id, post_id, post_type, display_url_base64, video_url_base64, 
                                    images_base64, jianyi1, jianyi2, jianyi3, prompt, 
                                    new_display_url_base64, new_images_base64)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s::jsonb)
                RETURNING id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                          images_base64, jianyi1, jianyi2, jianyi3, prompt, 
                          new_display_url_base64, new_images_base64, created_at, updated_at
            """, (user_id, data.post_id, data.post_type, data.display_url_base64, data.video_url_base64,
                  images_json, data.jianyi1, data.jianyi2, data.jianyi3, data.prompt,
                  data.new_display_url_base64, new_images_json))
            
            result = cur.fetchone()
            conn.commit()
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            return result_dict
    except HTTPException:
        raise
    except psycopg2.IntegrityError as e:
        conn.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(status_code=409, detail="Post already exists")
        raise HTTPException(status_code=400, detail=f"Data integrity error: {str(e)}")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Create failed: {str(e)}")
    finally:
        conn.close()


@router.put("/mypostl/{post_id}", response_model=MyPostlResponse)
async def update_mypostl_data(user_id: int, post_id: str, data: MyPostlUpdate):
    """Update mypostl data for a specific user"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id FROM mypostl WHERE user_id = %s AND post_id = %s
            """, (user_id, post_id))
            
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Data not found or no permission")
            
            update_fields = []
            update_values = []
            
            if data.post_type is not None:
                update_fields.append("post_type = %s")
                update_values.append(data.post_type)
            
            if data.display_url_base64 is not None:
                update_fields.append("display_url_base64 = %s")
                update_values.append(data.display_url_base64)
            
            if data.video_url_base64 is not None:
                update_fields.append("video_url_base64 = %s")
                update_values.append(data.video_url_base64)
            
            if data.images_base64 is not None:
                update_fields.append("images_base64 = %s::jsonb")
                update_values.append(json.dumps(data.images_base64))
            
            if data.jianyi1 is not None:
                update_fields.append("jianyi1 = %s")
                update_values.append(data.jianyi1)
            
            if data.jianyi2 is not None:
                update_fields.append("jianyi2 = %s")
                update_values.append(data.jianyi2)
            
            if data.jianyi3 is not None:
                update_fields.append("jianyi3 = %s")
                update_values.append(data.jianyi3)
            
            if data.prompt is not None:
                update_fields.append("prompt = %s")
                update_values.append(data.prompt)
            
            if data.new_display_url_base64 is not None:
                update_fields.append("new_display_url_base64 = %s")
                update_values.append(data.new_display_url_base64)
            
            if data.new_images_base64 is not None:
                update_fields.append("new_images_base64 = %s::jsonb")
                update_values.append(json.dumps(data.new_images_base64))
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No update data provided")
            
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            update_values.extend([user_id, post_id])
            
            cur.execute(f"""
                UPDATE mypostl 
                SET {', '.join(update_fields)}
                WHERE user_id = %s AND post_id = %s
                RETURNING id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                          images_base64, jianyi1, jianyi2, jianyi3, prompt, 
                          new_display_url_base64, new_images_base64, created_at, updated_at
            """, update_values)
            
            result = cur.fetchone()
            conn.commit()
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            return result_dict
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
    finally:
        conn.close()


@router.delete("/mypostl/{post_id}")
async def delete_mypostl_data(user_id: int, post_id: str):
    """Delete mypostl data for a specific user"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM mypostl 
                WHERE user_id = %s AND post_id = %s
                RETURNING id
            """, (user_id, post_id))
            
            result = cur.fetchone()
            conn.commit()
            
            if not result:
                raise HTTPException(status_code=404, detail="Data not found or no permission")
            
            return {"message": "Delete successful", "post_id": post_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
    finally:
        conn.close()


# ============================================
# MyPost Table Models and Endpoints
# ============================================

class MyPostCreate(BaseModel):
    post_id: str
    post_type: Optional[str] = None
    display_url_base64: Optional[str] = None
    video_url_base64: Optional[str] = None
    images_base64: Optional[List[str]] = None
    jianyi1: Optional[str] = None
    jianyi2: Optional[str] = None
    jianyi3: Optional[str] = None
    prompt: Optional[str] = None
    new_display_url_base64: Optional[str] = None
    new_images_base64: Optional[List[str]] = None

class MyPostUpdate(BaseModel):
    post_type: Optional[str] = None
    display_url_base64: Optional[str] = None
    video_url_base64: Optional[str] = None
    images_base64: Optional[List[str]] = None
    jianyi1: Optional[str] = None
    jianyi2: Optional[str] = None
    jianyi3: Optional[str] = None
    prompt: Optional[str] = None
    new_display_url_base64: Optional[str] = None
    new_images_base64: Optional[List[str]] = None

class MyPostResponse(BaseModel):
    id: int
    user_id: int
    post_id: str
    post_type: Optional[str]
    display_url_base64: Optional[str]
    video_url_base64: Optional[str]
    images_base64: Optional[List[str]]
    jianyi1: Optional[str]
    jianyi2: Optional[str]
    jianyi3: Optional[str]
    prompt: Optional[str]
    new_display_url_base64: Optional[str]
    new_images_base64: Optional[List[str]]
    created_at: str
    updated_at: str


@router.get("/mypost", response_model=List[MyPostResponse])
async def get_user_mypost_data(user_id: int):
    """Get all mypost data for a specific user"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                       images_base64, jianyi1, jianyi2, jianyi3, prompt, 
                       new_display_url_base64, new_images_base64, created_at, updated_at
                FROM mypost
                WHERE user_id = %s
                ORDER BY created_at DESC
            """, (user_id,))
            results = cur.fetchall()
            
            mypost_list = []
            for row in results:
                row_dict = dict(row)
                row_dict['created_at'] = row_dict['created_at'].isoformat()
                row_dict['updated_at'] = row_dict['updated_at'].isoformat()
                mypost_list.append(row_dict)
            
            return mypost_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()


@router.get("/mypost/{post_id}", response_model=MyPostResponse)
async def get_mypost_by_id(user_id: int, post_id: str):
    """Get specific mypost data for a user"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                       images_base64, jianyi1, jianyi2, jianyi3, prompt, 
                       new_display_url_base64, new_images_base64, created_at, updated_at
                FROM mypost
                WHERE user_id = %s AND post_id = %s
            """, (user_id, post_id))
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Data not found")
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            return result_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()


@router.post("/mypost", response_model=MyPostResponse)
async def create_mypost_data(user_id: int, data: MyPostCreate):
    """Create mypost data for a specific user"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('SELECT id FROM "user" WHERE id = %s', (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")
            
            images_json = json.dumps(data.images_base64) if data.images_base64 else None
            new_images_json = json.dumps(data.new_images_base64) if data.new_images_base64 else None
            
            cur.execute("""
                INSERT INTO mypost (user_id, post_id, post_type, display_url_base64, video_url_base64, 
                                   images_base64, jianyi1, jianyi2, jianyi3, prompt, 
                                   new_display_url_base64, new_images_base64)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s::jsonb)
                RETURNING id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                          images_base64, jianyi1, jianyi2, jianyi3, prompt, 
                          new_display_url_base64, new_images_base64, created_at, updated_at
            """, (user_id, data.post_id, data.post_type, data.display_url_base64, data.video_url_base64,
                  images_json, data.jianyi1, data.jianyi2, data.jianyi3, data.prompt,
                  data.new_display_url_base64, new_images_json))
            
            result = cur.fetchone()
            conn.commit()
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            return result_dict
    except HTTPException:
        raise
    except psycopg2.IntegrityError as e:
        conn.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(status_code=409, detail="Post already exists")
        raise HTTPException(status_code=400, detail=f"Data integrity error: {str(e)}")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Create failed: {str(e)}")
    finally:
        conn.close()


@router.put("/mypost/{post_id}", response_model=MyPostResponse)
async def update_mypost_data(user_id: int, post_id: str, data: MyPostUpdate):
    """Update mypost data for a specific user"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id FROM mypost WHERE user_id = %s AND post_id = %s
            """, (user_id, post_id))
            
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Data not found or no permission")
            
            update_fields = []
            update_values = []
            
            if data.post_type is not None:
                update_fields.append("post_type = %s")
                update_values.append(data.post_type)
            
            if data.display_url_base64 is not None:
                update_fields.append("display_url_base64 = %s")
                update_values.append(data.display_url_base64)
            
            if data.video_url_base64 is not None:
                update_fields.append("video_url_base64 = %s")
                update_values.append(data.video_url_base64)
            
            if data.images_base64 is not None:
                update_fields.append("images_base64 = %s::jsonb")
                update_values.append(json.dumps(data.images_base64))
            
            if data.jianyi1 is not None:
                update_fields.append("jianyi1 = %s")
                update_values.append(data.jianyi1)
            
            if data.jianyi2 is not None:
                update_fields.append("jianyi2 = %s")
                update_values.append(data.jianyi2)
            
            if data.jianyi3 is not None:
                update_fields.append("jianyi3 = %s")
                update_values.append(data.jianyi3)
            
            if data.prompt is not None:
                update_fields.append("prompt = %s")
                update_values.append(data.prompt)
            
            if data.new_display_url_base64 is not None:
                update_fields.append("new_display_url_base64 = %s")
                update_values.append(data.new_display_url_base64)
            
            if data.new_images_base64 is not None:
                update_fields.append("new_images_base64 = %s::jsonb")
                update_values.append(json.dumps(data.new_images_base64))
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No update data provided")
            
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            update_values.extend([user_id, post_id])
            
            cur.execute(f"""
                UPDATE mypost 
                SET {', '.join(update_fields)}
                WHERE user_id = %s AND post_id = %s
                RETURNING id, user_id, post_id, post_type, display_url_base64, video_url_base64, 
                          images_base64, jianyi1, jianyi2, jianyi3, prompt, 
                          new_display_url_base64, new_images_base64, created_at, updated_at
            """, update_values)
            
            result = cur.fetchone()
            conn.commit()
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            return result_dict
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
    finally:
        conn.close()


@router.delete("/mypost/{post_id}")
async def delete_mypost_data(user_id: int, post_id: str):
    """Delete mypost data for a specific user"""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM mypost 
                WHERE user_id = %s AND post_id = %s
                RETURNING id
            """, (user_id, post_id))
            
            result = cur.fetchone()
            conn.commit()
            
            if not result:
                raise HTTPException(status_code=404, detail="Data not found or no permission")
            
            return {"message": "Delete successful", "post_id": post_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
    finally:
        conn.close()


# ============================================
# Future tables will be added here
# ============================================
# Add more table endpoints following the same pattern:
# - All queries include WHERE user_id = %s
# - All inserts bind user_id
# - All updates/deletes check user_id first

