import os
import json
import base64
import requests
from datetime import datetime
from apify_client import ApifyClient
from dotenv import load_dotenv
from translate import translate_competitor, translate_post_by_id
from database import get_db_connection

load_dotenv()

# Apify客户端
from apiconfig import get_api_key

def get_apify_client():
    token = get_api_key("APIFY_API_TOKEN") or os.getenv("APIFY_API_TOKEN", "")
    return ApifyClient(token)

client = get_apify_client()

def check_competitor_exists(username):
    """检查竞品是否已存在"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM competitor WHERE username = %s', (username,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result is not None

def download_image_to_base64(url):
    """下载图片并转换为Base64"""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return base64.b64encode(response.content).decode('utf-8')
    except Exception as e:
        print(f"下载图片失败: {url}, 错误: {e}")
    return None

def download_video_to_base64(url):
    """下载视频并转换为Base64（带超时和大小限制）"""
    try:
        print(f"正在下载视频: {url[:80]}...")
        # 设置较长的超时时间（视频文件较大）
        response = requests.get(url, timeout=120, stream=True)
        if response.status_code == 200:
            # 限制视频大小（例如最大100MB）
            max_size = 100 * 1024 * 1024  # 100MB
            video_data = b""
            downloaded_size = 0
            
            for chunk in response.iter_content(chunk_size=8192):
                video_data += chunk
                downloaded_size += len(chunk)
                
                # 显示下载进度
                if downloaded_size % (1024 * 1024) == 0:  # 每1MB显示一次
                    print(f"  已下载: {downloaded_size / 1024 / 1024:.1f}MB")
                
                if downloaded_size > max_size:
                    print(f"  ⚠️ 视频过大(>{max_size/1024/1024}MB)，跳过: {url[:80]}")
                    return None
            
            print(f"  ✅ 视频下载完成: {downloaded_size / 1024 / 1024:.2f}MB")
            return base64.b64encode(video_data).decode('utf-8')
    except Exception as e:
        print(f"  ❌ 下载视频失败: {url[:80]}, 错误: {e}")
    return None

def scrape_details(username):
    """抓取账号详情数据"""
    print(f"正在抓取账号详情: {username}")
    
    run_input = {
        "directUrls": [f"https://www.instagram.com/{username}/"],
        "resultsType": "details",
        "resultsLimit": 1,
        "searchType": "hashtag",
        "searchLimit": 1,
        "addParentData": False,
    }
    
    try:
        run = client.actor("RB9HEZitC8hIUXAha").call(run_input=run_input)
        results = list(client.dataset(run["defaultDatasetId"]).iterate_items())
        
        if results:
            return results[0]
        return None
    except Exception as e:
        print(f"抓取详情失败: {e}")
        return None

def save_competitor_to_db(data):
    """保存竞品数据到数据库"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 下载头像
    profile_pic_base64 = None
    if data.get('profilePicUrl'):
        profile_pic_base64 = download_image_to_base64(data['profilePicUrl'])
    
    # 准备外部链接JSON
    external_urls_json = json.dumps(data.get('externalUrls', []))
    
    cursor.execute('''
        INSERT INTO competitor (
            input_url, instagram_id, username, url, full_name, biography,
            profile_pic_url, profile_pic_base64,
            external_urls, external_url, external_url_shimmed,
            followers_count, follows_count,
            posts_count, has_channel, highlight_reel_count
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    ''', (
        data.get('inputUrl'),
        data.get('id'),
        data.get('username'),
        data.get('url'),
        data.get('fullName'),
        data.get('biography'),
        data.get('profilePicUrl'),
        profile_pic_base64,
        external_urls_json,
        data.get('externalUrl'),
        data.get('externalUrlShimmed'),
        data.get('followersCount', 0),
        data.get('followsCount', 0),
        data.get('postsCount', 0),
        data.get('hasChannel', False),
        data.get('highlightReelCount', 0)
    ))
    
    competitor_id = cursor.fetchone()['id']
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"✅ 竞品数据已保存，ID: {competitor_id}")
    return competitor_id

def scrape_posts(username, count, scrape_type="both"):
    """
    抓取帖子数据
    
    Args:
        username: 用户名
        count: 抓取数量
        scrape_type: 抓取类型 "posts"(图文) / "stories"(视频) / "both"(两者)
    
    Returns:
        list: 帖子数据列表
    """
    print(f"正在抓取帖子: {username}, 数量: {count}, 类型: {scrape_type}")
    
    all_posts = []
    
    # 根据类型抓取
    if scrape_type in ["posts", "both"]:
    # 抓取图文帖子
        print(f"📝 抓取 {count} 条图文帖子...")
    posts_input = {
        "directUrls": [f"https://www.instagram.com/{username}/"],
        "resultsType": "posts",
        "resultsLimit": count,
        "searchType": "hashtag",
        "searchLimit": 1,
        "addParentData": False,
    }
    
    try:
        run = client.actor("RB9HEZitC8hIUXAha").call(run_input=posts_input)
        posts = list(client.dataset(run["defaultDatasetId"]).iterate_items())
        all_posts.extend(posts)
        print(f"✅ 获取到 {len(posts)} 条图文帖子")
    except Exception as e:
        print(f"❌ 抓取图文帖子失败: {e}")
    
    if scrape_type in ["stories", "both"]:
    # 抓取视频帖子
        print(f"🎥 抓取 {count} 条视频帖子...")
    stories_input = {
        "directUrls": [f"https://www.instagram.com/{username}/"],
        "resultsType": "stories",
        "resultsLimit": count,
        "searchType": "hashtag",
        "searchLimit": 1,
        "addParentData": False,
    }
    
    try:
        run = client.actor("RB9HEZitC8hIUXAha").call(run_input=stories_input)
        stories = list(client.dataset(run["defaultDatasetId"]).iterate_items())
        all_posts.extend(stories)
        print(f"✅ 获取到 {len(stories)} 条视频帖子")
    except Exception as e:
        print(f"❌ 抓取视频帖子失败: {e}")
    
    return all_posts

def save_posts_to_db(posts, username):
    """保存帖子数据到数据库"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 获取竞品ID
    cursor.execute('SELECT id FROM competitor WHERE username = %s', (username,))
    competitor_result = cursor.fetchone()
    if not competitor_result:
        print(f"❌ 未找到竞品: {username}")
        cursor.close()
        conn.close()
        return 0
    
    competitor_id = competitor_result['id']
    print(f"✅ 找到竞品ID: {competitor_id}")
    
    saved_count = 0
    inserted_ids = []
    for post in posts:
        try:
            post_type = post.get('type')  # 原始类型：Image, Video, Sidecar
            
            # 初始化所有媒体相关变量
            display_url_base64 = None
            images_base64 = []
            video_url_base64 = None
            videos = []
            videos_base64 = []
            child_posts_order = []
            video_view_count = 0  # 视频观看数
            video_play_count = 0  # 视频播放数
            
            # 下载封面图（displayUrl）
            if post.get('displayUrl'):
                display_url_base64 = download_image_to_base64(post['displayUrl'])
            
            # 处理 Sidecar 类型（多图/混合类型）
            if post_type == "Sidecar":
                child_posts = post.get('childPosts', [])
                has_video = False
                
                print(f"  处理 Sidecar 帖子，包含 {len(child_posts)} 个子帖子")
                
                for idx, child in enumerate(child_posts):
                    child_type = child.get('type')
                    print(f"    子帖子 {idx + 1}/{len(child_posts)}: 类型 = {child_type}")
                    
                    if child_type == "Video":
                        has_video = True
                        video_url = child.get('videoUrl')
                        if video_url:
                            videos.append(video_url)
                            # 下载视频转Base64
                            video_base64 = download_video_to_base64(video_url)
                            if video_base64:
                                videos_base64.append(video_base64)
                            else:
                                videos_base64.append(None)  # 下载失败，占位
                            
                            # 记录顺序
                            child_posts_order.append({
                                "index": idx,
                                "type": "Video",
                                "ref": len(videos) - 1,
                                "short_code": child.get('shortCode'),
                                "video_view_count": child.get('videoViewCount'),
                                "video_duration": child.get('videoDuration')
                            })
                    
                    elif child_type == "Image":
                        img_url = child.get('displayUrl')
                        if img_url:
                            img_base64 = download_image_to_base64(img_url)
                            if img_base64:
                                images_base64.append(img_base64)
                            else:
                                images_base64.append(None)  # 下载失败，占位
                            
                            # 记录顺序
                            child_posts_order.append({
                                "index": idx,
                                "type": "Image",
                                "ref": len(images_base64) - 1,
                                "short_code": child.get('shortCode')
                            })
                
                # 如果包含视频，修改post_type为 Sidecar_video
                if has_video:
                    post_type = "Sidecar_video"
                    print(f"  ✅ 检测到混合类型，post_type 更改为: Sidecar_video")
            
            # 处理纯 Video 类型（单视频）
            elif post_type == "Video":
                video_url = post.get('videoUrl')
                if video_url:
                    video_url_base64 = download_video_to_base64(video_url)
                # 获取视频观看数和播放数
                video_view_count = post.get('videoViewCount', 0)
                video_play_count = post.get('videoPlayCount', 0)
            
            # 处理纯 Image 类型（不需要额外处理，只有封面图）
            # displayUrl 已经在上面处理了
            
            # 处理评论数据
            latest_comments = post.get('latestComments', [])
            # 优先使用抓取的 firstComment 字段，其次回退到 latestComments 的第一条
            first_comment_text = post.get('firstComment') or None
            try:
                if not first_comment_text and isinstance(latest_comments, list) and latest_comments:
                    first = latest_comments[0]
                    if isinstance(first, dict):
                        first_comment_text = first.get('text')
                    elif isinstance(first, str):
                        first_comment_text = first
            except Exception:
                first_comment_text = None

            cursor.execute('''
                INSERT INTO post_data (
                    post_id, post_type, short_code, url, input_url,
                    caption, alt,
                    hashtags, mentions,
                    comments_count, likes_count, is_comments_disabled,
                    latest_comments, first_comment,
                    dimensions_height, dimensions_width,
                    display_url, display_url_base64,
                    video_url, video_url_base64, video_duration,
                    video_view_count, video_play_count,
                    images, images_base64, child_posts,
                    videos, videos_base64, child_posts_order,
                    owner_id, owner_username, owner_full_name,
                    timestamp, is_pinned, is_sponsored, product_type,
                    competitor_id
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (post_id) DO UPDATE SET
                    post_type = EXCLUDED.post_type,
                    short_code = EXCLUDED.short_code,
                    url = EXCLUDED.url,
                    input_url = EXCLUDED.input_url,
                    caption = EXCLUDED.caption,
                    alt = EXCLUDED.alt,
                    hashtags = EXCLUDED.hashtags,
                    mentions = EXCLUDED.mentions,
                    comments_count = EXCLUDED.comments_count,
                    likes_count = EXCLUDED.likes_count,
                    is_comments_disabled = EXCLUDED.is_comments_disabled,
                    latest_comments = EXCLUDED.latest_comments,
                    first_comment = EXCLUDED.first_comment,
                    dimensions_height = EXCLUDED.dimensions_height,
                    dimensions_width = EXCLUDED.dimensions_width,
                    display_url = EXCLUDED.display_url,
                    display_url_base64 = EXCLUDED.display_url_base64,
                    video_url = EXCLUDED.video_url,
                    video_url_base64 = EXCLUDED.video_url_base64,
                    video_duration = EXCLUDED.video_duration,
                    video_view_count = EXCLUDED.video_view_count,
                    video_play_count = EXCLUDED.video_play_count,
                    images = EXCLUDED.images,
                    images_base64 = EXCLUDED.images_base64,
                    child_posts = EXCLUDED.child_posts,
                    videos = EXCLUDED.videos,
                    videos_base64 = EXCLUDED.videos_base64,
                    child_posts_order = EXCLUDED.child_posts_order,
                    owner_id = EXCLUDED.owner_id,
                    owner_username = EXCLUDED.owner_username,
                    owner_full_name = EXCLUDED.owner_full_name,
                    timestamp = EXCLUDED.timestamp,
                    is_pinned = EXCLUDED.is_pinned,
                    is_sponsored = EXCLUDED.is_sponsored,
                    product_type = EXCLUDED.product_type,
                    competitor_id = EXCLUDED.competitor_id,
                    updated_at = NOW()
                RETURNING id
            ''', (
                post.get('id'),
                post_type,  # 可能是 "Sidecar_video"
                post.get('shortCode'),
                post.get('url'),
                post.get('inputUrl'),
                post.get('caption'),
                post.get('alt'),
                json.dumps(post.get('hashtags', [])),
                json.dumps(post.get('mentions', [])),
                post.get('commentsCount', 0),
                post.get('likesCount', 0),
                post.get('isCommentsDisabled', False),
                json.dumps(latest_comments),
                first_comment_text,
                post.get('dimensionsHeight'),
                post.get('dimensionsWidth'),
                post.get('displayUrl'),
                display_url_base64,
                post.get('videoUrl'),
                video_url_base64,
                post.get('videoDuration'),
                video_view_count,
                video_play_count,
                json.dumps(post.get('images', [])),
                json.dumps(images_base64) if images_base64 else None,
                json.dumps(post.get('childPosts', [])),
                json.dumps(videos) if videos else None,
                json.dumps(videos_base64) if videos_base64 else None,
                json.dumps(child_posts_order) if child_posts_order else None,
                post.get('ownerId'),
                username,
                post.get('ownerFullName'),
                post.get('timestamp'),
                post.get('isPinned', False),
                post.get('isSponsored', False),
                post.get('productType'),
                competitor_id
            ))
            
            row = cursor.fetchone()
            if row:
                saved_count += 1
                inserted_ids.append(row['id'])
                
        except Exception as e:
            print(f"保存帖子失败 {post.get('id')}: {e}")
            continue
    
    conn.commit()
    cursor.close()
    conn.close()
    
    # 入库后强制翻译所有 _zh 字段
    for db_id in inserted_ids:
        try:
            translate_post_by_id(db_id)
        except Exception as e:
            print(f"翻译帖子失败 id={db_id}: {e}")
    
    print(f"✅ 成功保存 {saved_count} 条帖子到数据库")
    return saved_count

def scrape_competitor_data(username, post_count, scrape_type="both"):
    """
    主函数：抓取竞品数据
    
    Args:
        username: 用户名
        post_count: 帖子数量
        scrape_type: 抓取类型 "posts"(图文) / "stories"(视频) / "both"(两者)
    
    Returns:
        dict: 抓取结果
    """
    print(f"\n{'='*60}")
    print(f"开始抓取竞品数据")
    print(f"用户名: {username}")
    print(f"帖子数量: {post_count}")
    print(f"抓取类型: {scrape_type}")
    print(f"{'='*60}\n")
    
    # 检查竞品是否存在
    exists = check_competitor_exists(username)
    
    if not exists:
        print("竞品不存在，开始抓取详情...")
        # 抓取详情
        details = scrape_details(username)
        if details:
            # 保存到数据库
            competitor_id = save_competitor_to_db(details)
            # 触发翻译
            print("触发翻译竞品信息...")
            translate_competitor(competitor_id)
        else:
            print("❌ 抓取详情失败")
            return {"success": False, "message": "抓取账号详情失败"}
    else:
        print("竞品已存在，跳过详情抓取")
    
    # 抓取帖子
    posts = scrape_posts(username, post_count, scrape_type)
    if posts:
        # 保存到数据库
        saved_count = save_posts_to_db(posts, username)
        # 已在保存后按条翻译，这里不再按用户名触发批量翻译
        
        return {
            "success": True,
            "message": f"成功抓取并保存 {saved_count} 条帖子",
            "post_count": saved_count
        }
    else:
        return {"success": False, "message": "未抓取到帖子数据"}

if __name__ == "__main__":
    # 测试
    result = scrape_competitor_data("camblyk", 2)
    print(f"\n最终结果: {result}")

