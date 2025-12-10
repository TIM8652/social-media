from fastapi import APIRouter, HTTPException
import json
from database import get_db_connection

router = APIRouter()

@router.get("/search/keywords")
def get_search_keywords():
    """获取所有搜索关键词列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, keyword, keyword_zh, search_count, total_posts,
                   created_at, updated_at
            FROM search
            ORDER BY created_at DESC
        ''')
        
        keywords = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": keywords,
            "total": len(keywords)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取关键词列表失败: {str(e)}")

@router.get("/search/keywords/stats")
def get_search_stats():
    """获取搜索统计数据"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                COUNT(*) as total_keywords,
                SUM(total_posts) as total_posts,
                AVG(total_posts) as avg_posts_per_keyword
            FROM search
        ''')
        
        stats = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": {
                "total_keywords": stats['total_keywords'] or 0,
                "total_posts": stats['total_posts'] or 0,
                "avg_posts_per_keyword": round(stats['avg_posts_per_keyword'] or 0, 0)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}")

@router.get("/search/keywords/{keyword}/posts")
def get_keyword_posts(keyword: str, post_type: str = None, page: int = 1, page_size: int = 5):
    """获取指定关键词的帖子（支持分页）
    
    Args:
        keyword: 搜索关键词
        post_type: 可选，按类型筛选 (Image, Video, Sidecar, Sidecar_video)
        page: 页码，从1开始
        page_size: 每页数量，默认5条
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 先获取 search_id
        cursor.execute('''
            SELECT id FROM search WHERE keyword = %s
        ''', (keyword,))
        
        search_result = cursor.fetchone()
        if not search_result:
            raise HTTPException(status_code=404, detail=f"未找到关键词: {keyword}")
        
        search_id = search_result['id']
        
        # 先查询总数
        count_query = "SELECT COUNT(*) as total FROM post_data WHERE search_id = %s"
        count_params = [search_id]
        
        if post_type and post_type != "all":
            count_query += " AND post_type = %s"
            count_params.append(post_type)
        
        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()['total']
        
        # 计算总页数
        import math
        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 构建查询条件
        query = '''
            SELECT id, post_id, post_type, short_code, url, input_url,
                   caption, caption_zh, alt, alt_zh,
                   hashtags, hashtags_zh, mentions,
                   comments_count, likes_count, is_comments_disabled,
                   first_comment, first_comment_zh,
                   latest_comments, latest_comments_zh,
                   dimensions_height, dimensions_width,
                   display_url, display_url_base64,
                   video_url, video_url_base64, video_duration,
                   video_view_count, video_play_count,
                   images, images_base64, child_posts,
                   videos, videos_base64, child_posts_order,
                   owner_id, owner_username, owner_full_name, owner_full_name_zh,
                   timestamp, is_pinned, is_sponsored, product_type,
                   created_at, updated_at
            FROM post_data
            WHERE search_id = %s
        '''
        
        params = [search_id]
        
        # 如果指定了类型，添加筛选条件
        if post_type and post_type != "all":
            query += " AND post_type = %s"
            params.append(post_type)
        
        query += " ORDER BY timestamp DESC LIMIT %s OFFSET %s"
        params.extend([page_size, offset])
        
        cursor.execute(query, params)
        
        posts = cursor.fetchall()
        
        # 转换为字典列表并解析JSON字段
        result = []
        for post in posts:
            post_dict = dict(post)
            
            # 解析JSON字段
            json_fields = ['hashtags', 'hashtags_zh', 'mentions', 
                          'latest_comments', 'latest_comments_zh',
                          'images', 'images_base64', 'child_posts',
                          'videos', 'videos_base64', 'child_posts_order']
            
            for field in json_fields:
                if post_dict.get(field):
                    if isinstance(post_dict[field], str):
                        try:
                            post_dict[field] = json.loads(post_dict[field])
                        except:
                            pass
            
            result.append(post_dict)
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": result,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total_count,
                "total_pages": total_pages
            },
            "keyword": keyword
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取帖子列表失败: {str(e)}")

@router.delete("/posts/{post_id}")
def delete_post(post_id: str):
    """删除帖子（硬删除，仅删除 post_data 表中的记录）
    
    Args:
        post_id: 帖子ID
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 删除 post_data 表中的记录
        cursor.execute('''
            DELETE FROM post_data 
            WHERE post_id = %s
            RETURNING id
        ''', (post_id,))
        
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="帖子不存在")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": "帖子已删除",
            "post_id": post_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")

@router.delete("/search/keywords/{keyword_id}")
def delete_keyword(keyword_id: int):
    """删除搜索关键词（级联删除所有关联帖子）
    
    Args:
        keyword_id: 关键词ID
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 先检查关键词是否存在
        cursor.execute('SELECT id, keyword FROM search WHERE id = %s', (keyword_id,))
        keyword_record = cursor.fetchone()
        
        if not keyword_record:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="关键词不存在")
        
        keyword = keyword_record['keyword']
        
        # 删除关键词（关联帖子会通过 ON DELETE CASCADE 自动删除）
        cursor.execute('''
            DELETE FROM search 
            WHERE id = %s
            RETURNING id
        ''', (keyword_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "message": f"关键词 #{keyword} 及其所有帖子已删除",
            "keyword_id": keyword_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")
