import schedule
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from cpostscrape import scrape_posts, save_posts_to_db, get_db_connection
from translate import translate_competitor

# 数据库配置
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "social_media",
    "user": "postgres",
    "password": "1234qwer"
}

def get_all_competitors():
    """获取所有竞品用户名"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, username FROM competitor ORDER BY id')
    competitors = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return competitors

def check_post_exists(post_id):
    """检查帖子是否已存在"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM post_data WHERE post_id = %s', (post_id,))
    result = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    return result is not None

def incremental_scrape_competitor(username):
    """
    增量抓取竞品数据
    
    逻辑：
    1. 第一次抓取 1 条 posts
    2. 检查 post_id 是否已存在
    3. 如果已存在：覆盖帖子并停止
    4. 如果不存在：保存帖子，再抓取 1 条，重复步骤 2-3
    5. 直到找到已存在的帖子为止
    
    Args:
        username: 竞品用户名
    
    Returns:
        dict: 抓取结果统计
    """
    print(f"\n{'='*60}")
    print(f"开始增量抓取竞品: {username}")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    total_new_posts = 0
    total_updated_posts = 0
    batch_size = 1  # 每次抓取 1 条
    max_batches = 50  # 最多抓取 50 次（防止无限循环）
    
    for batch_num in range(1, max_batches + 1):
        print(f"\n📥 第 {batch_num} 轮抓取...")
        
        # 抓取 1 条 posts 类型的帖子
        posts = scrape_posts(username, batch_size, scrape_type="posts")
        
        if not posts:
            print(f"  ⚠️  未获取到帖子，停止抓取")
            break
        
        # 检查这条帖子是否已存在
        post = posts[0]
        post_id = post.get('id')
        exists = check_post_exists(post_id)
        
        if exists:
            print(f"  ✅ 发现已存在的帖子: {post_id}")
            print(f"  🔄 覆盖更新并停止抓取...")
            
            # 保存（会自动覆盖）
            saved = save_posts_to_db(posts, username)
            if saved > 0:
                total_updated_posts += saved
            
            print(f"  ✅ 已覆盖帖子，停止抓取")
            break
        else:
            print(f"  🆕 发现新帖子: {post_id}")
            print(f"  💾 保存并继续抓取...")
            
            # 保存新帖子
            saved = save_posts_to_db(posts, username)
            if saved > 0:
                total_new_posts += saved
            
            # 继续下一轮抓取
            continue
    
    print(f"\n{'='*60}")
    print(f"抓取完成: {username}")
    print(f"新增帖子: {total_new_posts} 条")
    print(f"更新帖子: {total_updated_posts} 条")
    print(f"{'='*60}\n")
    
    return {
        "username": username,
        "new_posts": total_new_posts,
        "updated_posts": total_updated_posts,
        "total": total_new_posts + total_updated_posts
    }

def daily_competitor_scrape():
    """每日定时抓取所有竞品"""
    print(f"\n🕒 开始每日竞品抓取任务")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}\n")
    
    try:
        # 获取所有竞品
        competitors = get_all_competitors()
        
        if not competitors:
            print("⚠️  没有找到竞品，跳过抓取")
            return
        
        print(f"📊 共找到 {len(competitors)} 个竞品")
        print(f"{'='*80}\n")
        
        results = []
        
        # 逐个抓取
        for idx, competitor in enumerate(competitors, 1):
            competitor_id = competitor['id']
            username = competitor['username']
            
            print(f"\n[{idx}/{len(competitors)}] 处理竞品: {username} (ID: {competitor_id})")
            
            try:
                result = incremental_scrape_competitor(username)
                results.append(result)
                
                # 休息 5 秒，避免请求过快
                if idx < len(competitors):
                    print(f"⏳ 等待 5 秒...")
                    time.sleep(5)
                    
            except Exception as e:
                print(f"❌ 抓取失败: {username}, 错误: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        # 统计总结
        total_new = sum(r['new_posts'] for r in results)
        total_updated = sum(r['updated_posts'] for r in results)
        
        print(f"\n{'='*80}")
        print(f"✅ 每日抓取任务完成！")
        print(f"{'='*80}")
        print(f"处理竞品数: {len(results)}/{len(competitors)}")
        print(f"新增帖子: {total_new} 条")
        print(f"更新帖子: {total_updated} 条")
        print(f"总计: {total_new + total_updated} 条")
        print(f"{'='*80}\n")
        
    except Exception as e:
        print(f"❌ 每日抓取任务失败: {e}")
        import traceback
        traceback.print_exc()

def start_scheduler():
    """启动定时任务调度器"""
    print("🚀 竞品自动抓取调度器已启动")
    print(f"⏰ 每天北京时间 16:30 执行抓取任务")
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}\n")
    
    # 设置每天 16:30 执行
    schedule.every().day.at("16:30").do(daily_competitor_scrape)
    
    # 可选：立即执行一次（用于测试）
    # print("🧪 测试模式：立即执行一次抓取任务\n")
    # daily_competitor_scrape()
    
    # 持续运行
    while True:
        schedule.run_pending()
        time.sleep(60)  # 每分钟检查一次

if __name__ == "__main__":
    # 直接运行时启动调度器
    start_scheduler()

