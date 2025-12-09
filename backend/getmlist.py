"""
Get Popular Scripts List Module
Fetches user's analyzed scripts from popular table
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter(prefix="/api/popular-scripts", tags=["popular-scripts"])

class UpdateSuccessRequest(BaseModel):
    user_id: int
    success: str

class PopularScript(BaseModel):
    id: int
    post_id: str
    title: str
    description: str
    thumbnail: Optional[str]
    contentType: str  # "video" or "image"
    date: str
    tags: List[str]
    successFactors: List[str]
    hookAnalysis: Optional[str]
    structureAnalysis: Optional[str]
    visualAnalysis: Optional[str]
    display_url_base64: Optional[str]
    video_url_base64: Optional[str]
    images_base64: Optional[List[str]]
    jianyi1: Optional[str]
    jianyi1_5: Optional[str]  # 新增：jianyi1.5
    jianyi2: Optional[str]
    jianyi3: Optional[str]
    success: Optional[str]  # 新增：成功归因原始文本
    prompt: Optional[str]  # 新增：单图提示词
    prompt_array: Optional[List[str]]  # 新增：多图提示词数组

def extract_tags_from_jianyi(jianyi1: str) -> List[str]:
    """Extract tags from jianyi1 analysis"""
    if not jianyi1:
        return []
    
    # Simple tag extraction based on keywords
    tags = []
    keywords = {
        "钩子": "吸引力强",
        "情感": "情感共鸣",
        "痛点": "痛点明确",
        "解决方案": "实用方案",
        "教育": "教育启蒙",
        "家长": "家庭教育",
        "孩子": "儿童教育",
        "英语": "英语学习",
        "学习": "学习方法"
    }
    
    for keyword, tag in keywords.items():
        if keyword in jianyi1:
            tags.append(tag)
    
    return tags[:3] if tags else ["内容分析"]

def extract_success_factors(jianyi1: str) -> List[str]:
    """Extract success factors from jianyi1"""
    if not jianyi1:
        return []
    
    factors = []
    
    # Check for common success indicators
    if "开头" in jianyi1 or "钩子" in jianyi1:
        factors.append("开场吸引力")
    if "结构" in jianyi1 or "逻辑" in jianyi1:
        factors.append("内容结构清晰")
    if "情感" in jianyi1 or "共鸣" in jianyi1:
        factors.append("情感共鸣")
    if "行动" in jianyi1 or "号召" in jianyi1:
        factors.append("行动号召")
    
    return factors[:3] if factors else ["AI分析"]

@router.get("/", response_model=List[PopularScript])
async def get_user_popular_scripts(user_id: int):
    """
    Get all popular scripts for a specific user
    
    Args:
        user_id: User ID
    
    Returns:
        List of popular scripts with analysis
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Query popular table and join with post_data for additional info
            cur.execute("""
                SELECT 
                    p.id,
                    p.post_id,
                    p.post_type,
                    p.display_url_base64,
                    p.video_url_base64,
                    p.images_base64,
                    p.jianyi1,
                    p."jianyi1.5",
                    p.jianyi2,
                    p.jianyi3,
                    p.success,
                    p.prompt,
                    p.prompt_array,
                    p.created_at,
                    p.updated_at,
                    pd.caption,
                    pd.caption_zh,
                    pd.url
                FROM popular p
                LEFT JOIN post_data pd ON p.post_id = pd.post_id
                WHERE p.user_id = %s
                ORDER BY p.updated_at DESC
            """, (user_id,))
            
            results = cur.fetchall()
            
            scripts = []
            for row in results:
                # Use post_type from database if available, otherwise determine from media
                if row['post_type']:
                    content_type = "video" if row['post_type'] == "Video" else "image"
                elif row['video_url_base64']:
                    content_type = "video"
                else:
                    content_type = "image"
                
                # Determine thumbnail based on content type
                if content_type == "video":
                    thumbnail = row['video_url_base64']
                elif row['images_base64'] and len(row['images_base64']) > 1:
                    thumbnail = row['images_base64'][0]
                else:
                    thumbnail = row['display_url_base64']
                
                # Extract title and description from caption
                caption = row['caption_zh'] or row['caption'] or "无标题"
                title = caption[:50] + "..." if len(caption) > 50 else caption
                description = row['jianyi1.5'][:100] + "..." if row['jianyi1.5'] and len(row['jianyi1.5']) > 100 else (row['jianyi1.5'] or row['jianyi2'][:100] + "..." if row['jianyi2'] and len(row['jianyi2']) > 100 else (row['jianyi2'] or caption))
                
                # 解析成功归因为列表（从 success 字段）
                success_factors = []
                if row['success']:
                    import re
                    factors_text = row['success'].strip()
                    
                    # 首先清理前缀（如 "**成功归因 (Success factors):** "）
                    factors_text = re.sub(r'^[\*\s]*(?:成功归因|Success factors)[\*\s]*[:：]\s*', '', factors_text)
                    
                    # 按分隔符分割
                    factors = re.split(r'[,，、\n；;]', factors_text)
                    
                    # 清理每个因素：去除 Markdown 标记、空格，只保留中文核心词
                    for f in factors:
                        cleaned = f.strip()
                        # 去除所有 Markdown 标记
                        cleaned = re.sub(r'\*+', '', cleaned)
                        # 去除括号内容
                        cleaned = re.sub(r'\([^)]*\)', '', cleaned)
                        # 去除多余空格
                        cleaned = re.sub(r'\s+', '', cleaned)
                        # 只保留中文字符（4个字左右）
                        cleaned = re.sub(r'[^\u4e00-\u9fff]', '', cleaned)
                        
                        if cleaned:
                            # 如果超过4个字，只取前4个
                            success_factors.append(cleaned[:4] if len(cleaned) > 4 else cleaned)
                
                # 如果没有 success 字段，回退到从 jianyi1 提取
                if not success_factors:
                    success_factors = extract_success_factors(row['jianyi1'])
                
                # Extract tags from jianyi1
                tags = extract_tags_from_jianyi(row['jianyi1'])
                
                # Parse jianyi3 for video analysis (hookAnalysis, structureAnalysis, visualAnalysis)
                hook_analysis = None
                structure_analysis = None
                visual_analysis = None
                
                if row['jianyi3']:
                    jianyi3_text = row['jianyi3']
                    
                    # Try to split by sections
                    if "【黄金三秒钩子分析】" in jianyi3_text:
                        parts = jianyi3_text.split("【")
                        for part in parts:
                            if "黄金三秒钩子分析】" in part:
                                hook_analysis = part.split("】", 1)[1].strip() if "】" in part else None
                            elif "内容结构分析】" in part:
                                structure_analysis = part.split("】", 1)[1].strip() if "】" in part else None
                            elif "视觉元素分析】" in part:
                                visual_analysis = part.split("】", 1)[1].strip() if "】" in part else None
                    else:
                        # If no clear structure, use the whole text
                        hook_analysis = jianyi3_text
                
                # If no jianyi3 (image/multi-image), use jianyi1 as analysis
                if not hook_analysis and row['jianyi1']:
                    hook_analysis = row['jianyi1']
                
                script = PopularScript(
                    id=row['id'],
                    post_id=row['post_id'],
                    title=title,
                    description=description,
                    thumbnail=thumbnail,
                    contentType=content_type,
                    date=row['updated_at'].strftime('%Y-%m-%d'),
                    tags=tags,
                    successFactors=success_factors,
                    hookAnalysis=hook_analysis,
                    structureAnalysis=structure_analysis or row['jianyi1'],
                    visualAnalysis=visual_analysis or "视觉分析：请查看原始内容",
                    display_url_base64=row['display_url_base64'],
                    video_url_base64=row['video_url_base64'],
                    images_base64=row['images_base64'],
                    jianyi1=row['jianyi1'],
                    jianyi1_5=row['jianyi1.5'],
                    jianyi2=row['jianyi2'],
                    jianyi3=row['jianyi3'],
                    success=row['success'],
                    prompt=row['prompt'],
                    prompt_array=row['prompt_array']
                )
                
                scripts.append(script)
            
            return scripts
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()


@router.put("/{script_id}/success")
async def update_script_success(script_id: int, request: UpdateSuccessRequest):
    """
    Update success factors for a script
    
    Args:
        script_id: Script ID (popular table id)
        request: Update request with user_id and success text
    
    Returns:
        Success message
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # Verify ownership
            cur.execute("""
                SELECT id FROM popular 
                WHERE id = %s AND user_id = %s
            """, (script_id, request.user_id))
            
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Script not found or access denied")
            
            # Update success field
            cur.execute("""
                UPDATE popular 
                SET success = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (request.success, script_id))
            
            conn.commit()
            
            return {"success": True, "message": "成功归因已更新"}
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
    finally:
        conn.close()
