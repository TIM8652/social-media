"""
数据库初始化脚本
用于 Railway 首次部署时创建所有表结构并插入初始管理员账号
"""
import os
import sys
from database import get_db_connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database():
    """
    初始化数据库：
    1. 创建所有表结构
    2. 创建索引
    3. 插入两个管理员账号
    """
    
    conn = None
    cursor = None
    
    try:
        logger.info("开始初始化数据库...")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # ==================== 创建表 ====================
        
        logger.info("创建 user 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS "user" (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL
            )
        """)
        
        logger.info("创建 competitor 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS competitor (
                id SERIAL PRIMARY KEY,
                input_url VARCHAR(500),
                instagram_id VARCHAR(100) NOT NULL UNIQUE,
                username VARCHAR(100) NOT NULL,
                url VARCHAR(500),
                full_name VARCHAR(200),
                full_name_zh VARCHAR(200),
                biography TEXT,
                biography_zh TEXT,
                profile_pic_url TEXT,
                profile_pic_base64 TEXT,
                external_urls JSONB,
                external_url TEXT,
                external_url_shimmed TEXT,
                followers_count INTEGER DEFAULT 0,
                follows_count INTEGER DEFAULT 0,
                posts_count INTEGER DEFAULT 0,
                has_channel BOOLEAN DEFAULT false,
                highlight_reel_count INTEGER DEFAULT 0,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        logger.info("创建 search 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS search (
                id SERIAL PRIMARY KEY,
                keyword VARCHAR(200) NOT NULL UNIQUE,
                search_count INTEGER DEFAULT 0,
                total_posts INTEGER DEFAULT 0,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                keyword_zh TEXT
            )
        """)
        
        logger.info("创建 mypost 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mypost (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                post_id VARCHAR(255) NOT NULL,
                display_url_base64 TEXT,
                video_url_base64 TEXT,
                images_base64 JSONB,
                jianyi1 TEXT,
                jianyi2 TEXT,
                jianyi3 TEXT,
                post_type VARCHAR(50),
                prompt TEXT,
                new_display_url_base64 TEXT,
                new_images_base64 JSONB,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                prompt_array JSONB,
                UNIQUE(user_id, post_id)
            )
        """)
        
        logger.info("创建 mypostl 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mypostl (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                post_id VARCHAR(255) NOT NULL,
                display_url_base64 TEXT,
                video_url_base64 TEXT,
                images_base64 JSONB,
                jianyi1 TEXT,
                jianyi2 TEXT,
                jianyi3 TEXT,
                post_type VARCHAR(50),
                prompt TEXT,
                new_display_url_base64 TEXT,
                new_images_base64 JSONB,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                prompt_array JSONB,
                new_video_url_base64 TEXT,
                jianyi4 TEXT,
                UNIQUE(user_id, post_id)
            )
        """)
        
        logger.info("创建 popular 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS popular (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                post_id VARCHAR(255) NOT NULL,
                images_base64 JSONB,
                jianyi1 TEXT,
                jianyi2 TEXT,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                jianyi3 TEXT,
                post_type VARCHAR(50),
                "jianyi1.5" TEXT,
                success TEXT,
                display_url_base64 JSONB,
                video_url_base64 JSONB,
                prompt TEXT,
                prompt_array JSONB,
                UNIQUE(user_id, post_id)
            )
        """)
        
        logger.info("创建 post_data 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS post_data (
                id SERIAL PRIMARY KEY,
                post_id VARCHAR(100) NOT NULL UNIQUE,
                post_type VARCHAR(50),
                short_code VARCHAR(50),
                url TEXT,
                input_url TEXT,
                caption TEXT,
                caption_zh TEXT,
                alt TEXT,
                alt_zh TEXT,
                hashtags JSONB,
                hashtags_zh JSONB,
                mentions JSONB,
                comments_count INTEGER DEFAULT 0,
                likes_count INTEGER DEFAULT 0,
                is_comments_disabled BOOLEAN DEFAULT false,
                first_comment TEXT,
                first_comment_zh TEXT,
                latest_comments JSONB,
                latest_comments_zh JSONB,
                dimensions_height INTEGER,
                dimensions_width INTEGER,
                display_url TEXT,
                display_url_base64 TEXT,
                video_url TEXT,
                video_url_base64 TEXT,
                video_duration NUMERIC(10,3),
                images JSONB,
                images_base64 JSONB,
                child_posts JSONB,
                owner_id VARCHAR(100),
                owner_username VARCHAR(100),
                owner_full_name VARCHAR(200),
                owner_full_name_zh VARCHAR(200),
                "timestamp" TIMESTAMP WITHOUT TIME ZONE,
                is_pinned BOOLEAN DEFAULT false,
                is_sponsored BOOLEAN DEFAULT false,
                product_type VARCHAR(50),
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                videos JSONB,
                videos_base64 JSONB,
                child_posts_order JSONB,
                video_view_count BIGINT DEFAULT 0,
                video_play_count BIGINT DEFAULT 0,
                competitor_id INTEGER,
                search_id INTEGER,
                CONSTRAINT check_data_source CHECK (
                    (competitor_id IS NOT NULL AND search_id IS NULL) OR 
                    (competitor_id IS NULL AND search_id IS NOT NULL)
                )
            )
        """)
        
        logger.info("创建 api_config 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_config (
                id SERIAL PRIMARY KEY,
                key_name VARCHAR(100) UNIQUE NOT NULL,
                key_value TEXT NOT NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # ==================== 创建外键约束 ====================
        
        logger.info("创建外键约束...")
        
        cursor.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'mypost_user_id_fkey'
                ) THEN
                    ALTER TABLE mypost 
                    ADD CONSTRAINT mypost_user_id_fkey 
                    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
                END IF;
            END $$;
        """)
        
        cursor.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'mypostl_user_id_fkey'
                ) THEN
                    ALTER TABLE mypostl 
                    ADD CONSTRAINT mypostl_user_id_fkey 
                    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
                END IF;
            END $$;
        """)
        
        cursor.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user'
                ) THEN
                    ALTER TABLE popular 
                    ADD CONSTRAINT fk_user 
                    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
                END IF;
            END $$;
        """)
        
        cursor.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'post_data_competitor_id_fkey'
                ) THEN
                    ALTER TABLE post_data 
                    ADD CONSTRAINT post_data_competitor_id_fkey 
                    FOREIGN KEY (competitor_id) REFERENCES competitor(id) ON DELETE CASCADE;
                END IF;
            END $$;
        """)
        
        cursor.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'post_data_search_id_fkey'
                ) THEN
                    ALTER TABLE post_data 
                    ADD CONSTRAINT post_data_search_id_fkey 
                    FOREIGN KEY (search_id) REFERENCES search(id) ON DELETE CASCADE;
                END IF;
            END $$;
        """)
        
        # ==================== 创建索引 ====================
        
        logger.info("创建索引...")
        
        # competitor 索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_competitor_instagram_id ON competitor(instagram_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_competitor_username ON competitor(username)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_competitor_followers ON competitor(followers_count DESC)")
        
        # search 索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_search_keyword ON search(keyword)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_search_created_at ON search(created_at DESC)")
        
        # mypost 索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mypost_user_id ON mypost(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mypost_post_id ON mypost(post_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mypost_created_at ON mypost(created_at DESC)")
        
        # mypostl 索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mypostl_user_id ON mypostl(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mypostl_post_id ON mypostl(post_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mypostl_created_at ON mypostl(created_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mypostl_prompt_array ON mypostl USING gin(prompt_array)")
        
        # popular 索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_popular_user_id ON popular(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_popular_post_id ON popular(post_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_popular_post_type ON popular(post_type)")
        
        # post_data 索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_post_data_post_id ON post_data(post_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_post_data_post_type ON post_data(post_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_post_data_owner_username ON post_data(owner_username)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_post_data_timestamp ON post_data(\"timestamp\" DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_post_data_likes ON post_data(likes_count DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_post_data_competitor_id ON post_data(competitor_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_post_data_search_id ON post_data(search_id)")
        
        # api_config 索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_config_key_name ON api_config(key_name)")
        
        # ==================== 插入初始管理员账号 ====================
        
        logger.info("插入管理员账号...")
        
        # 检查是否已存在管理员账号
        cursor.execute('SELECT COUNT(*) FROM "user" WHERE username IN (%s, %s)', ('admin1', 'admin2'))
        existing_count = cursor.fetchone()['count']
        
        if existing_count == 0:
            cursor.execute("""
                INSERT INTO "user" (username, password, role) 
                VALUES 
                    ('admin1', 'admin1', 'admin'),
                    ('admin2', 'admin2', 'admin')
            """)
            logger.info("✅ 成功插入两个管理员账号")
            logger.info("   - 账号1: admin1 / admin1")
            logger.info("   - 账号2: admin2 / admin2")
        else:
            logger.info("⚠️  管理员账号已存在，跳过插入")
        
        # ==================== 提交事务 ====================
        
        conn.commit()
        logger.info("=" * 60)
        logger.info("🎉 数据库初始化完成！")
        logger.info("=" * 60)
        logger.info("表结构:")
        logger.info("  ✅ user (用户表)")
        logger.info("  ✅ competitor (竞品表)")
        logger.info("  ✅ search (搜索关键词表)")
        logger.info("  ✅ mypost (我的帖子表)")
        logger.info("  ✅ mypostl (我的项目表)")
        logger.info("  ✅ popular (爆款脚本表)")
        logger.info("  ✅ post_data (帖子数据表)")
        logger.info("  ✅ api_config (API密钥配置表)")
        logger.info("")
        logger.info("索引和外键约束已创建")
        logger.info("")
        logger.info("管理员账号:")
        logger.info("  👤 admin1 / admin1")
        logger.info("  👤 admin2 / admin2")
        logger.info("")
        logger.info("API密钥:")
        logger.info("  🔑 用户可在系统管理页面配置")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error("=" * 60)
        logger.error(f"❌ 数据库初始化失败: {e}")
        logger.error("=" * 60)
        return False
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 Railway 数据库初始化脚本")
    print("=" * 60)
    print("")
    
    # 检查是否在 Railway 环境
    if os.getenv('DATABASE_URL'):
        print("📍 检测到 Railway 环境")
        print(f"📊 数据库: {os.getenv('DATABASE_URL', '').split('@')[1].split('/')[0] if '@' in os.getenv('DATABASE_URL', '') else 'Railway PostgreSQL'}")
    else:
        print("📍 本地开发环境")
        print("⚠️  确保本地 PostgreSQL 正在运行")
    
    print("")
    response = input("确认要初始化数据库吗? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        success = init_database()
        sys.exit(0 if success else 1)
    else:
        print("❌ 已取消")
        sys.exit(0)

