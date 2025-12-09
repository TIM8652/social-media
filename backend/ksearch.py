import os
import json
import base64
import requests
from datetime import datetime
from apify_client import ApifyClient
from dotenv import load_dotenv
from translate import translate_post_by_id
from database import get_db_connection

load_dotenv()

# Apify客户端
from apiconfig import get_api_key

def get_apify_client():
    token = get_api_key("APIFY_API_TOKEN") or os.getenv("APIFY_API_TOKEN", "")
    return ApifyClient(token)

client = get_apify_client()

# DeepSeek API配置
def get_deepseek_key():
    return get_api_key("get_deepseek_key()") or os.getenv("get_deepseek_key()", "")

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

def translate_keyword(keyword: str) -> str:
    """
    使用 DeepSeek API 翻译关键词到中文
    
    Args:
        keyword: 要翻译的关键词
    
    Returns:
        翻译后的中文关键词
    """
    if not keyword or not keyword.strip():
        return ""
    
    if not get_deepseek_key():
        print("⚠️  get_deepseek_key() not configured, skipping translation")
        return ""
    
    try:
        print(f"  🌐 翻译关键词: {keyword}")
        
        headers = {
            "Authorization": f"Bearer {get_deepseek_key()}",
            "Content-Type": "application/json"
        }
        
        system_prompt = "你是一个专业的翻译助手。请将用户提供的标签/关键词翻译成简体中文。无论源语言是英语、阿拉伯语还是其他语言，都请翻译成简体中文。只返回翻译结果，不要添加任何解释、引号或额外内容。保持简洁。"
        
        data = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": keyword
                }
            ],
            "temperature": 0.3,
            "max_tokens": 100
        }
        
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            translated = result['choices'][0]['message']['content'].strip()
            # 移除可能的引号
            translated = translated.strip('"').strip("'")
            print(f"  ✅ 翻译完成: {keyword} -> {translated}")
            return translated
        else:
            print(f"  ⚠️  翻译失败: {response.status_code}")
            return ""
            
    except Exception as e:
        print(f"  ❌ 翻译错误: {e}")
        return ""

def check_search_exists(keyword):
    """检查搜索标签是否已存在"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM search WHERE keyword = %s', (keyword,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result['id'] if result else None

def create_or_update_search(keyword):
    """创建或更新搜索标签"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 检查是否存在
    cursor.execute('SELECT id, search_count, keyword_zh FROM search WHERE keyword = %s', (keyword,))
    result = cursor.fetchone()
    
    if result:
        # 更新搜索次数
        search_id = result['id']
        cursor.execute('''
            UPDATE search 
            SET search_count = search_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        ''', (search_id,))
        
        # 如果没有中文翻译，则翻译
        if not result.get('keyword_zh'):
            keyword_zh = translate_keyword(keyword)
            if keyword_zh:
                cursor.execute('''
                    UPDATE search 
                    SET keyword_zh = %s
                    WHERE id = %s
                ''', (keyword_zh, search_id))
                print(f"  ✅ 已更新关键词翻译")
    else:
        # 翻译关键词
        keyword_zh = translate_keyword(keyword)
        
        # 创建新记录
        cursor.execute('''
            INSERT INTO search (keyword, keyword_zh, search_count, total_posts)
            VALUES (%s, %s, 1, 0)
            RETURNING id
        ''', (keyword, keyword_zh))
        search_id = cursor.fetchone()['id']
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return search_id

def download_image_to_base64(url):
    """下载图片并转换为Base64（复用逻辑）"""
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
        print(f"  正在下载视频: {url[:80]}...")
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
                    print(f"    已下载: {downloaded_size / 1024 / 1024:.1f}MB")
                
                if downloaded_size > max_size:
                    print(f"    ⚠️ 视频过大(>{max_size/1024/1024}MB)，跳过: {url[:80]}")
                    return None
            
            print(f"    ✅ 视频下载完成: {downloaded_size / 1024 / 1024:.2f}MB")
            return base64.b64encode(video_data).decode('utf-8')
    except Exception as e:
        print(f"    ❌ 下载视频失败: {url[:80]}, 错误: {e}")
    return None

def get_posts_urls_by_hashtag(keyword, limit=10, results_type="posts"):
    """
    第一步：通过标签搜索获取帖子URL列表
    
    Args:
        keyword: 搜索关键词/标签
        limit: 要获取的帖子数量
        results_type: "posts" 或 "stories"
    
    Returns:
        list: 帖子URL列表
    """
    print(f"\n{'='*60}")
    print(f"第一步：搜索标签 #{keyword}，获取 {limit} 条 {results_type} URL...")
    print(f"{'='*60}")
    
    run_input = {
        "hashtags": [keyword],
        "resultsType": results_type,
        "resultsLimit": limit,
        "keywordSearch": False,
    }
    
    try:
        # 调用 Instagram Hashtag Scraper
        run = client.actor("reGe1ST3OBgYZSsZJ").call(
            run_input=run_input,
            timeout_secs=180
        )
        
        # 获取结果
        urls = []
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            if item.get('url'):
                urls.append(item['url'])
                print(f"  ✅ 找到: {item['url']}")
        
        print(f"\n📊 共找到 {len(urls)} 条URL")
        return urls
        
    except Exception as e:
        print(f"  ❌ API调用失败: {e}")
        return []

def get_post_details(urls):
    """
    第二步：根据URL列表获取完整的帖子详情
    
    Args:
        urls: 帖子URL列表
    
    Returns:
        list: 完整的帖子数据列表
    """
    if not urls:
        return []
    
    print(f"\n{'='*60}")
    print(f"第二步：获取 {len(urls)} 条帖子的完整详情...")
    print(f"{'='*60}")
    
    run_input = {
        "directUrls": urls,
        "resultsType": "posts",
        "resultsLimit": len(urls),
        "searchType": "hashtag",
        "searchLimit": 1,
        "addParentData": False,
    }
    
    try:
        # 调用 Instagram Scraper
        run = client.actor("shu8hvrXbJbY3Eb9W").call(
            run_input=run_input,
            timeout_secs=180
        )
        
        # 获取完整数据
        posts_data = []
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            posts_data.append(item)
            post_type = item.get('type', 'Unknown')
            caption = item.get('caption', '')[:50] + '...' if item.get('caption') else 'No caption'
            print(f"  ✅ 类型: {post_type:10s} | {caption}")
        
        print(f"\n📊 共获取 {len(posts_data)} 条完整帖子数据")
        return posts_data
        
    except Exception as e:
        print(f"  ❌ API调用失败: {e}")
        return []

def save_posts_to_db(posts, search_id):
    """
    保存帖子到数据库（与 cpostscrape.py 保持高度一致）
    
    Args:
        posts: 帖子数据列表
        search_id: 搜索标签ID
    
    Returns:
        int: 成功保存的帖子数量
    """
    if not posts:
        return 0
    
    print(f"\n{'='*60}")
    print(f"保存 {len(posts)} 条帖子到数据库...")
    print(f"{'='*60}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    saved_count = 0
    
    for post in posts:
        try:
            post_id = post.get('id')
            post_type = post.get('type')  # 原始类型：Image, Video, Sidecar
            
            # 初始化所有媒体相关变量
            display_url_base64 = None
            images_base64 = []
            video_url_base64 = None
            videos = []
            videos_base64 = []
            child_posts_order = []
            video_view_count = 0
            video_play_count = 0
            
            # 下载封面图（displayUrl）
            if post.get('displayUrl'):
                print(f"  📥 下载封面图: {post['displayUrl'][:50]}...")
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
                    print(f"  📥 下载视频: {video_url[:50]}...")
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
            
            # 插入或更新数据（使用 ON CONFLICT 覆盖）
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
                    search_id, competitor_id
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, NULL
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
                    search_id = EXCLUDED.search_id,
                    updated_at = NOW()
                RETURNING id
            ''', (
                post_id,
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
                post.get('ownerUsername'),
                post.get('ownerFullName'),
                post.get('timestamp'),
                post.get('isPinned', False),
                post.get('isSponsored', False),
                post.get('productType'),
                search_id
            ))
            
            # 获取插入/更新后的数据库ID
            db_id = cursor.fetchone()['id']
            
            conn.commit()
            saved_count += 1
            
            print(f"  ✅ 保存成功: {post_id} (DB ID: {db_id})")
            
            # 触发翻译（使用数据库ID）
            print(f"  🌐 触发翻译: DB ID {db_id}")
            translate_post_by_id(db_id)
            
        except Exception as e:
            print(f"  ❌ 保存失败: {post.get('id', 'Unknown')}, 错误: {e}")
            import traceback
            traceback.print_exc()
            conn.rollback()
            continue
    
    # 更新 search 表的 total_posts 计数
    cursor.execute('''
        UPDATE search 
        SET total_posts = (
            SELECT COUNT(*) FROM post_data WHERE search_id = %s
        )
        WHERE id = %s
    ''', (search_id, search_id))
    conn.commit()
    
    cursor.close()
    conn.close()
    
    print(f"\n✅ 成功保存 {saved_count} 条帖子")
    return saved_count

def scrape_by_keyword(keyword, post_count, scrape_type="posts"):
    """
    主函数：根据关键词抓取数据
    
    Args:
        keyword: 搜索关键词/标签
        post_count: 要抓取的数量
        scrape_type: "posts" / "stories" / "both"
    
    Returns:
        dict: 抓取结果
    """
    print(f"\n{'='*60}")
    print(f"开始搜索抓取")
    print(f"关键词: {keyword}")
    print(f"数量: {post_count}")
    print(f"类型: {scrape_type}")
    print(f"{'='*60}\n")
    
    try:
        # 创建或更新搜索记录
        search_id = create_or_update_search(keyword)
        print(f"✅ 搜索标签ID: {search_id}")
        
        all_posts = []
        
        # 根据类型抓取
        if scrape_type in ["posts", "both"]:
            print(f"\n📝 抓取 posts 类型...")
            posts_urls = get_posts_urls_by_hashtag(keyword, post_count, "posts")
            if posts_urls:
                posts_data = get_post_details(posts_urls)
                all_posts.extend(posts_data)
        
        if scrape_type in ["stories", "both"]:
            print(f"\n🎥 抓取 stories 类型...")
            stories_urls = get_posts_urls_by_hashtag(keyword, post_count, "stories")
            if stories_urls:
                stories_data = get_post_details(stories_urls)
                all_posts.extend(stories_data)
        
        if not all_posts:
            return {
                "success": False,
                "message": "未抓取到任何数据"
            }
        
        # 保存到数据库
        saved_count = save_posts_to_db(all_posts, search_id)
        
        return {
            "success": True,
            "message": f"成功抓取并保存 {saved_count} 条帖子",
            "post_count": saved_count,
            "search_id": search_id
        }
        
    except Exception as e:
        print(f"\n❌ 抓取失败: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"抓取失败: {str(e)}"
        }

if __name__ == "__main__":
    # 测试
    result = scrape_by_keyword("تعلم_الانجليزية", 2, "posts")
    print(f"\n最终结果: {result}")

