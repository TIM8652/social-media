import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

load_dotenv()

# 数据库配置
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "social_media",
    "user": "postgres",
    "password": "1234qwer"
}

# DeepSeek API配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

def get_db_connection():
    """获取数据库连接"""
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

def translate_text(text, target_lang="中文", context=""):
    """使用DeepSeek API翻译文本"""
    if not text or not text.strip():
        return ""
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    system_prompt = f"你是一个专业的翻译助手。请将用户提供的文本翻译成简体{target_lang}。无论源语言是英语、阿拉伯语、日语还是其他任何语言，都请翻译成简体{target_lang}。只返回翻译结果，不要添加任何解释、引号或额外内容。"
    if context:
        system_prompt += f" {context}"
    
    data = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": text
            }
        ],
        "temperature": 0.3,
        "max_tokens": 2000
    }
    
    try:
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            translated = result['choices'][0]['message']['content'].strip()
            # 移除可能的引号
            translated = translated.strip('"').strip("'")
            return translated
        else:
            print(f"翻译失败: {response.status_code}, {response.text}")
            return ""
    except Exception as e:
        print(f"翻译错误: {e}")
        return ""

def translate_competitor(competitor_id):
    """翻译竞品信息"""
    print(f"开始翻译竞品信息，ID: {competitor_id}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 获取竞品数据
    cursor.execute('SELECT * FROM competitor WHERE id = %s', (competitor_id,))
    competitor = cursor.fetchone()
    
    if not competitor:
        print("竞品不存在")
        cursor.close()
        conn.close()
        return
    
    # 并发翻译
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {}
        
        if competitor['full_name']:
            futures['full_name_zh'] = executor.submit(translate_text, competitor['full_name'])
        
        if competitor['biography']:
            futures['biography_zh'] = executor.submit(translate_text, competitor['biography'])
        
        # 等待所有翻译完成
        translations = {}
        for field, future in futures.items():
            try:
                translations[field] = future.result()
            except Exception as e:
                print(f"翻译 {field} 失败: {e}")
                translations[field] = ""
    
    # 更新数据库
    cursor.execute('''
        UPDATE competitor 
        SET full_name_zh = %s, biography_zh = %s, updated_at = NOW()
        WHERE id = %s
    ''', (
        translations.get('full_name_zh', ''),
        translations.get('biography_zh', ''),
        competitor_id
    ))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"✅ 竞品信息翻译完成")

def translate_posts(username):
    """翻译帖子内容"""
    print(f"开始翻译帖子内容，用户: {username}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 获取该用户未翻译的帖子
    cursor.execute('''
        SELECT * FROM post_data 
        WHERE owner_username = %s 
        AND (caption_zh IS NULL OR caption_zh = '')
        ORDER BY timestamp DESC
    ''', (username,))
    
    posts = cursor.fetchall()
    print(f"找到 {len(posts)} 条待翻译帖子")
    
    for post in posts:
        print(f"翻译帖子: {post['post_id']}")
        
        # 并发翻译各个字段
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {}
            
            # 翻译caption
            if post['caption']:
                futures['caption_zh'] = executor.submit(translate_text, post['caption'])
            
            # 翻译alt
            if post['alt']:
                futures['alt_zh'] = executor.submit(translate_text, post['alt'])
            
            # 翻译owner_full_name
            if post['owner_full_name']:
                futures['owner_full_name_zh'] = executor.submit(translate_text, post['owner_full_name'])
            
            # 翻译hashtags
            if post['hashtags']:
                hashtags = json.loads(post['hashtags']) if isinstance(post['hashtags'], str) else post['hashtags']
                if hashtags:
                    for idx, tag in enumerate(hashtags):
                        # 添加上下文说明这是一个标签
                        futures[f'hashtag_{idx}'] = executor.submit(
                            translate_text, 
                            tag, 
                            "中文",
                            "这是一个社交媒体标签(hashtag)，请保持简洁。"
                        )
            
            # 翻译latest_comments
            if post['latest_comments']:
                comments = json.loads(post['latest_comments']) if isinstance(post['latest_comments'], str) else post['latest_comments']
                if comments:
                    for idx, comment in enumerate(comments[:10]):  # 只翻译前10条评论
                        if isinstance(comment, dict) and comment.get('text'):
                            futures[f'comment_{idx}'] = executor.submit(
                                translate_text, 
                                comment['text'],
                                "中文",
                                "这是一条社交媒体评论。"
                            )
                        elif isinstance(comment, str):
                            futures[f'comment_{idx}'] = executor.submit(
                                translate_text,
                                comment,
                                "中文",
                                "这是一条社交媒体评论。"
                            )

            # 翻译first_comment
            if post.get('first_comment'):
                futures['first_comment_zh'] = executor.submit(
                    translate_text,
                    post['first_comment'],
                    "中文",
                    "这是该帖子的第一条评论。"
                )
            
            # 等待所有翻译完成
            translations = {}
            for field, future in futures.items():
                try:
                    translations[field] = future.result()
                except Exception as e:
                    print(f"翻译 {field} 失败: {e}")
                    translations[field] = ""
        
        # 处理hashtags翻译结果
        hashtags_zh = []
        if post['hashtags']:
            hashtags = json.loads(post['hashtags']) if isinstance(post['hashtags'], str) else post['hashtags']
            for idx in range(len(hashtags)):
                hashtags_zh.append(translations.get(f'hashtag_{idx}', ''))
        
        # 处理latest_comments翻译结果
        latest_comments_zh = []
        if post['latest_comments']:
            comments = json.loads(post['latest_comments']) if isinstance(post['latest_comments'], str) else post['latest_comments']
            for idx, comment in enumerate(comments[:10]):
                if isinstance(comment, dict):
                    comment_zh = comment.copy()
                    comment_zh['text'] = translations.get(f'comment_{idx}', '')
                    latest_comments_zh.append(comment_zh)
                else:
                    latest_comments_zh.append(translations.get(f'comment_{idx}', ''))
        
        # 更新数据库
        cursor.execute('''
            UPDATE post_data 
            SET caption_zh = %s, 
                alt_zh = %s, 
                owner_full_name_zh = %s,
                hashtags_zh = %s,
                latest_comments_zh = %s,
                first_comment_zh = %s,
                updated_at = NOW()
            WHERE id = %s
        ''', (
            translations.get('caption_zh', ''),
            translations.get('alt_zh', ''),
            translations.get('owner_full_name_zh', ''),
            json.dumps(hashtags_zh, ensure_ascii=False) if hashtags_zh else None,
            json.dumps(latest_comments_zh, ensure_ascii=False) if latest_comments_zh else None,
            translations.get('first_comment_zh', ''),
            post['id']
        ))
        
        conn.commit()
        print(f"✅ 帖子 {post['post_id']} 翻译完成")
    
    cursor.close()
    conn.close()
    
    print(f"✅ 所有帖子翻译完成")

def translate_post_by_id(post_db_id: int):
    """根据 post_data 表中的 id 强制翻译所有 _zh 字段"""
    print(f"开始翻译单条帖子，DB id: {post_db_id}")
    conn = get_db_connection()
    cursor = conn.cursor()

    # 获取该帖子完整数据
    cursor.execute('SELECT * FROM post_data WHERE id = %s', (post_db_id,))
    post = cursor.fetchone()
    if not post:
        print(f"❌ 未找到帖子 id={post_db_id}")
        cursor.close()
        conn.close()
        return

    # 并发翻译
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {}

        if post.get('caption'):
            futures['caption_zh'] = executor.submit(translate_text, post['caption'])
        if post.get('alt'):
            futures['alt_zh'] = executor.submit(translate_text, post['alt'])
        if post.get('owner_full_name'):
            futures['owner_full_name_zh'] = executor.submit(translate_text, post['owner_full_name'])

        # hashtags
        hashtags = None
        if post.get('hashtags') is not None:
            hashtags = json.loads(post['hashtags']) if isinstance(post['hashtags'], str) else post['hashtags']
            if isinstance(hashtags, list) and hashtags:
                for idx, tag in enumerate(hashtags):
                    futures[f'hashtag_{idx}'] = executor.submit(
                        translate_text,
                        tag,
                        "中文",
                        "这是一个社交媒体标签(hashtag)，请保持简洁。"
                    )

        # latest_comments
        latest_comments = None
        if post.get('latest_comments') is not None:
            latest_comments = json.loads(post['latest_comments']) if isinstance(post['latest_comments'], str) else post['latest_comments']
            if isinstance(latest_comments, list) and latest_comments:
                for idx, comment in enumerate(latest_comments[:10]):
                    if isinstance(comment, dict) and comment.get('text'):
                        futures[f'comment_{idx}'] = executor.submit(
                            translate_text,
                            comment['text'],
                            "中文",
                            "这是一条社交媒体评论。"
                        )
                    elif isinstance(comment, str):
                        futures[f'comment_{idx}'] = executor.submit(
                            translate_text,
                            comment,
                            "中文",
                            "这是一条社交媒体评论。"
                        )

        # first_comment
        if post.get('first_comment'):
            futures['first_comment_zh'] = executor.submit(
                translate_text,
                post['first_comment'],
                "中文",
                "这是该帖子的第一条评论。"
            )

        # 收集结果
        translations = {}
        for field, future in futures.items():
            try:
                translations[field] = future.result()
            except Exception as e:
                print(f"翻译 {field} 失败: {e}")
                translations[field] = ""

    # 构造 hashtags_zh
    hashtags_zh = []
    if isinstance(hashtags, list) and hashtags:
        for idx in range(len(hashtags)):
            hashtags_zh.append(translations.get(f'hashtag_{idx}', ''))

    # 构造 latest_comments_zh
    latest_comments_zh = []
    if isinstance(latest_comments, list) and latest_comments:
        for idx, comment in enumerate(latest_comments[:10]):
            if isinstance(comment, dict):
                comment_zh = comment.copy()
                comment_zh['text'] = translations.get(f'comment_{idx}', '')
                latest_comments_zh.append(comment_zh)
            else:
                latest_comments_zh.append(translations.get(f'comment_{idx}', ''))

    # 更新数据库
    cursor.execute('''
        UPDATE post_data
        SET caption_zh = %s,
            alt_zh = %s,
            owner_full_name_zh = %s,
            hashtags_zh = %s,
            latest_comments_zh = %s,
            first_comment_zh = %s,
            updated_at = NOW()
        WHERE id = %s
    ''', (
        translations.get('caption_zh', ''),
        translations.get('alt_zh', ''),
        translations.get('owner_full_name_zh', ''),
        json.dumps(hashtags_zh, ensure_ascii=False) if hashtags_zh else None,
        json.dumps(latest_comments_zh, ensure_ascii=False) if latest_comments_zh else None,
        translations.get('first_comment_zh', ''),
        post_db_id
    ))

    conn.commit()
    cursor.close()
    conn.close()
    print(f"✅ 单条帖子翻译完成 id={post_db_id}")

if __name__ == "__main__":
    # 测试翻译
    test_text = "Hello, how are you?"
    result = translate_text(test_text)
    print(f"翻译测试: {test_text} -> {result}")

