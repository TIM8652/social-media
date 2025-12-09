from fastapi import APIRouter, HTTPException
import json
from database import get_db_connection

router = APIRouter()

@router.get("/competitors")
def get_competitors():
    """获取所有竞品列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, input_url, instagram_id, username, url, 
                   full_name, full_name_zh, biography, biography_zh,
                   profile_pic_url, profile_pic_base64,
                   external_urls, external_url, external_url_shimmed,
                   followers_count, follows_count, posts_count,
                   has_channel, highlight_reel_count,
                   created_at, updated_at
            FROM competitor
            ORDER BY created_at DESC
        ''')
        
        competitors = cursor.fetchall()
        
        # 转换为字典列表
        result = []
        for comp in competitors:
            comp_dict = dict(comp)
            # 解析 external_urls JSON
            if comp_dict.get('external_urls'):
                if isinstance(comp_dict['external_urls'], str):
                    comp_dict['external_urls'] = json.loads(comp_dict['external_urls'])
            result.append(comp_dict)
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": result,
            "total": len(result)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取竞品列表失败: {str(e)}")

@router.get("/competitors/{username}/posts")
def get_competitor_posts(username: str, post_type: str = None, page: int = 1, page_size: int = 5):
    """获取指定竞品的帖子（支持分页）
    
    Args:
        username: 竞品用户名
        post_type: 可选，按类型筛选 (Image, Video, Sidecar, Sidecar_video)
        page: 页码，从1开始
        page_size: 每页数量，默认5条
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 先查询总数
        count_query = "SELECT COUNT(*) as total FROM post_data WHERE owner_username = %s"
        count_params = [username]
        
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
            WHERE owner_username = %s
        '''
        
        params = [username]
        
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
            "username": username
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取帖子列表失败: {str(e)}")

@router.get("/competitors/stats")
def get_competitors_stats():
    """获取竞品统计数据"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                COUNT(*) as total_competitors,
                AVG(followers_count) as avg_followers,
                AVG(posts_count) as avg_posts
            FROM competitor
        ''')
        
        stats = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": {
                "total_competitors": stats['total_competitors'],
                "avg_followers": round(stats['avg_followers'] or 0, 0),
                "avg_posts": round(stats['avg_posts'] or 0, 0)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}")

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


