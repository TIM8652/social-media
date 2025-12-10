"""
My Projects Module
Manages user's image analysis projects from mypostl table
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from psycopg2.extras import RealDictCursor
from database import get_db_connection

router = APIRouter(prefix="/api/my-projects", tags=["my-projects"])

class Project(BaseModel):
    id: int
    post_id: str
    name: str
    status: str
    statusColor: str
    progress: int
    thumbnail: str | None
    creator: str
    createdAt: str
    updatedAt: str
    post_type: str
    script: str | None
    images: List[str] | None
    videoUrl: str | None
    originalVideoUrl: str | None  # 原始视频URL
    tags: List[str]
    hasJianyi4: bool = False  # 是否有分镜头脚本（用于视频项目判断跳转页面）

class UpdateProjectRequest(BaseModel):
    user_id: int
    name: Optional[str] = None

class CreateBlankProjectRequest(BaseModel):
    user_id: int
    post_type: str  # Image, Sidecar, Video

# get_db_connection 已从 database.py 导入，无需重复定义

def format_relative_time(updated_at: datetime) -> str:
    """Format datetime to relative time string"""
    now = datetime.now()
    diff = now - updated_at
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "刚刚"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"{minutes}分钟前"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours}小时前"
    elif seconds < 604800:
        days = int(seconds / 86400)
        return f"{days}天前"
    else:
        return updated_at.strftime("%Y-%m-%d")

def calculate_status(project: dict) -> tuple[str, str]:
    """
    Calculate project status based on available data
    Returns: (status, statusColor)
    """
    # 如果有新生成的图片或视频 -> 已完成
    if project.get('new_display_url_base64') or project.get('new_images_base64') or project.get('new_video_url_base64'):
        return ("已完成", "success")
    # 如果有提示词但没有新图片/视频 -> 草稿
    elif project.get('prompt') or project.get('prompt_array'):
        return ("草稿", "info")
    # 其他 -> 准备中
    else:
        return ("准备中", "warning")

def calculate_progress(project: dict) -> int:
    """Calculate project completion progress"""
    progress = 0
    
    # 有原始图片或视频 +25
    if project.get('display_url_base64') or project.get('images_base64') or project.get('video_url_base64'):
        progress += 25
    
    # 有提示词 +25
    if project.get('prompt') or project.get('prompt_array'):
        progress += 25
    
    # 有推荐脚本 +20
    if project.get('jianyi2'):
        progress += 20
    
    # 有新生成的图片或视频 +30
    if project.get('new_display_url_base64') or project.get('new_images_base64') or project.get('new_video_url_base64'):
        progress += 30
    
    return min(progress, 100)

def get_thumbnail(project: dict) -> str | None:
    """Get project thumbnail based on post type
    
    优先级：
    1. 原图（display_url_base64, images_base64, video_url_base64）
    2. 生成的图片（new_display_url_base64, new_images_base64）
    
    这样新建项目（没有原图）也能显示生成的图片作为封面
    """
    post_type = project.get('post_type')
    
    if post_type == 'Image':
        # Image 类型：优先使用 display_url_base64，其次使用生成的 new_display_url_base64
        original = project.get('display_url_base64')
        if original:
            return original
        # 没有原图，使用生成的图片
        return project.get('new_display_url_base64')
    
    elif post_type == 'Sidecar':
        # Sidecar 类型：优先使用 images_base64 的第一张，其次使用 new_images_base64 的第一张
        original_images = project.get('images_base64')
        if original_images and len(original_images) > 0:
            return original_images[0]
        # 没有原图，使用生成的第一张图片
        new_images = project.get('new_images_base64')
        if new_images and len(new_images) > 0:
            # 找到第一张非空的生成图片
            for img in new_images:
                if img:
                    return img
        return None
    
    elif post_type == 'Video':
        # Video 类型：优先使用 video_url_base64（视频封面），其次使用 new_video_url_base64 的第一帧
        original = project.get('video_url_base64')
        if original:
            return original
        # 视频类型暂时没有生成图片作为封面的逻辑
        return None
    
    return None

def get_project_images(project: dict) -> List[str]:
    """Get generated images based on post type"""
    post_type = project.get('post_type')
    
    if post_type == 'Image':
        # Image 类型：返回 new_display_url_base64
        new_image = project.get('new_display_url_base64')
        if new_image:
            return [new_image]
        return []
    elif post_type == 'Sidecar':
        # Sidecar 类型：返回 new_images_base64 数组
        new_images = project.get('new_images_base64')
        if new_images:
            return new_images
        return []
    elif post_type == 'Video':
        # Video 类型：视频不返回图片素材
        return []
    
    return []

def get_project_name(jianyi2: str | None) -> str:
    """Extract project name from jianyi2 (first 8-9 characters)"""
    if not jianyi2:
        return "未命名项目..."
    
    # 清理文本，移除开头的标记
    text = jianyi2.strip()
    # 移除可能的标题标记
    text = text.replace('**', '').replace('*', '')
    
    # 取前9个字符
    if len(text) > 9:
        return text[:9] + "..."
    return text

def extract_instagram_caption(jianyi4: str | None) -> str | None:
    """Extract Instagram caption from jianyi4"""
    if not jianyi4:
        return None
    
    # 查找 "4. Instagram 帖子文案:" 部分
    import re
    pattern = r'4\.\s*Instagram\s*帖子文案[：:](.*?)(?=\n\n---|\n\*\*\[备选方案\]|$)'
    match = re.search(pattern, jianyi4, re.DOTALL | re.IGNORECASE)
    
    if match:
        caption = match.group(1).strip()
        # 清理文本，移除多余的星号和格式标记
        caption = caption.replace('**文案:**', '').replace('**', '').strip()
        # 移除多余的空行
        caption = re.sub(r'\n\s*\n\s*\n+', '\n\n', caption)
        return caption
    
    return None

def get_username(user_id: int) -> str:
    """Get username from user table"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT username FROM \"user\" WHERE id = %s", (user_id,))
            user = cur.fetchone()
            if user:
                return user['username']
            return "未知用户"
    except Exception as e:
        print(f"Error getting username: {str(e)}")
        return "未知用户"
    finally:
        conn.close()

@router.post("/create-blank")
async def create_blank_project(request: CreateBlankProjectRequest):
    """
    Create a blank project in mypostl table
    
    Args:
        request: Contains user_id and post_type
    
    Returns:
        Created project data with post_id
    """
    import time
    
    # 验证 post_type
    valid_types = ["Image", "Sidecar", "Video"]
    if request.post_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid post_type. Must be one of: {valid_types}")
    
    # 生成唯一的 post_id
    timestamp = int(time.time() * 1000)
    post_id = f"custom_{request.user_id}_{timestamp}"
    
    conn = get_db_connection()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 根据类型设置默认值
            if request.post_type == "Sidecar":
                # 多图类型：初始化 prompt_array 为 10 个空字符串
                cur.execute("""
                    INSERT INTO mypostl (
                        user_id, post_id, post_type, 
                        prompt_array, jianyi2
                    ) VALUES (
                        %s, %s, %s, %s::jsonb, %s
                    )
                    RETURNING id, user_id, post_id, post_type, created_at, updated_at
                """, (
                    request.user_id,
                    post_id,
                    request.post_type,
                    '["", "", "", "", "", "", "", "", "", ""]',  # 默认 10 个空提示词
                    ""  # 空白文案
                ))
            else:
                # Image 或 Video 类型
                cur.execute("""
                    INSERT INTO mypostl (
                        user_id, post_id, post_type, 
                        prompt, jianyi2
                    ) VALUES (
                        %s, %s, %s, %s, %s
                    )
                    RETURNING id, user_id, post_id, post_type, created_at, updated_at
                """, (
                    request.user_id,
                    post_id,
                    request.post_type,
                    "",  # 空白提示词
                    ""   # 空白文案
                ))
            
            result = cur.fetchone()
            conn.commit()
            
            return {
                "id": result["id"],
                "user_id": result["user_id"],
                "post_id": result["post_id"],
                "post_type": result["post_type"],
                "created_at": result["created_at"].isoformat(),
                "updated_at": result["updated_at"].isoformat(),
            }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")
    finally:
        conn.close()

@router.get("/", response_model=List[Project])
async def get_my_projects(user_id: int):
    """
    Get all projects for a specific user from mypostl table
    
    Args:
        user_id: User ID
    
    Returns:
        List of projects
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 查询 Image、Sidecar 和 Video 类型的项目
            cur.execute("""
                SELECT 
                    id, user_id, post_id, 
                    display_url_base64, images_base64, video_url_base64,
                    new_display_url_base64, new_images_base64, new_video_url_base64,
                    jianyi1, jianyi2, jianyi3, jianyi4,
                    post_type, prompt, prompt_array,
                    created_at, updated_at
                FROM mypostl
                WHERE user_id = %s AND post_type IN ('Image', 'Sidecar', 'Video')
                ORDER BY updated_at DESC
            """, (user_id,))
            
            results = cur.fetchall()
            
            # Get username once
            username = get_username(user_id)
            
            projects = []
            for row in results:
                # Calculate status and progress
                status, status_color = calculate_status(row)
                progress = calculate_progress(row)
                
                # Get thumbnail
                thumbnail = get_thumbnail(row)
                
                # Get project name from jianyi2
                project_name = get_project_name(row.get('jianyi2'))
                
                # Get generated images
                images = get_project_images(row)
                
                # Get video URL for Video type
                video_url = row.get('new_video_url_base64') if row['post_type'] == 'Video' else None
                
                # Get original video URL for all types (用于概览页显示)
                original_video_url = row.get('video_url_base64')
                
                # Extract Instagram caption from jianyi4
                instagram_caption = extract_instagram_caption(row.get('jianyi4'))
                
                # Use Instagram caption as script if available, otherwise use jianyi2
                script = instagram_caption if instagram_caption else row.get('jianyi2')
                
                # Format dates
                created_at = row['created_at'].strftime("%Y-%m-%d")
                updated_at = format_relative_time(row['updated_at'])
                
                # 检查是否有 jianyi4（分镜头脚本）
                has_jianyi4 = bool(row.get('jianyi4') and row.get('jianyi4').strip())
                
                project = Project(
                    id=row['id'],
                    post_id=row['post_id'],
                    name=project_name,
                    status=status,
                    statusColor=status_color,
                    progress=progress,
                    thumbnail=thumbnail,
                    creator=username,
                    createdAt=created_at,
                    updatedAt=updated_at,
                    post_type=row['post_type'],
                    script=script,
                    images=images,
                    videoUrl=video_url,
                    originalVideoUrl=original_video_url,
                    tags=[],  # 暂时不提取标签
                    hasJianyi4=has_jianyi4
                )
                
                projects.append(project)
            
            return projects
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()

@router.get("/{project_id}", response_model=Project)
async def get_project_detail(project_id: int, user_id: int):
    """
    Get detailed information for a specific project
    
    Args:
        project_id: Project ID (mypostl.id)
        user_id: User ID for verification
    
    Returns:
        Project details
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    id, user_id, post_id, 
                    display_url_base64, images_base64, video_url_base64,
                    new_display_url_base64, new_images_base64, new_video_url_base64,
                    jianyi1, jianyi2, jianyi3, jianyi4,
                    post_type, prompt, prompt_array,
                    created_at, updated_at
                FROM mypostl
                WHERE id = %s AND user_id = %s
            """, (project_id, user_id))
            
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Project not found")
            
            # Get username
            username = get_username(user_id)
            
            # Calculate status and progress
            status, status_color = calculate_status(row)
            progress = calculate_progress(row)
            
            # Get thumbnail
            thumbnail = get_thumbnail(row)
            
            # Get project name from jianyi2
            project_name = get_project_name(row.get('jianyi2'))
            
            # Get generated images
            images = get_project_images(row)
            
            # Get video URL for Video type
            video_url = row.get('new_video_url_base64') if row['post_type'] == 'Video' else None
            
            # Get original video URL for all types (用于概览页显示)
            original_video_url = row.get('video_url_base64')
            
            # Extract Instagram caption from jianyi4
            instagram_caption = extract_instagram_caption(row.get('jianyi4'))
            
            # Use Instagram caption as script if available, otherwise use jianyi2
            script = instagram_caption if instagram_caption else row.get('jianyi2')
            
            # Format dates
            created_at = row['created_at'].strftime("%Y-%m-%d")
            updated_at = format_relative_time(row['updated_at'])
            
            project = Project(
                id=row['id'],
                post_id=row['post_id'],
                name=project_name,
                status=status,
                statusColor=status_color,
                progress=progress,
                thumbnail=thumbnail,
                creator=username,
                createdAt=created_at,
                updatedAt=updated_at,
                post_type=row['post_type'],
                script=script,
                images=images,
                videoUrl=video_url,
                originalVideoUrl=original_video_url,
                tags=[]
            )
            
            return project
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()

@router.delete("/{project_id}")
async def delete_project(project_id: int, user_id: int = Query(..., description="User ID for verification")):
    """
    Delete a project
    
    Args:
        project_id: Project ID (mypostl.id)
        user_id: User ID for verification
    
    Returns:
        Success message
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("""
                SELECT id FROM mypostl 
                WHERE id = %s AND user_id = %s
            """, (project_id, user_id))
            
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Project not found or access denied")
            
            # Delete project
            cur.execute("""
                DELETE FROM mypostl
                WHERE id = %s AND user_id = %s
            """, (project_id, user_id))
            
            conn.commit()
            
            return {"success": True, "message": "项目已删除"}
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
    finally:
        conn.close()


