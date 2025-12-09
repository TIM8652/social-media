from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from auth import router as auth_router
from cpostscrape import scrape_competitor_data
from ksearch import scrape_by_keyword
from getclist import router as competitor_router
from getslist import router as search_router
from usermanage import router as usermanage_router
from analysis import router as analysis_router
from getmlist import router as popular_scripts_router
from imageanalysis import router as imageanalysis_router
from videoanalysis import router as videoanalysis_router
from myproject import router as myproject_router
from apiconfig import router as apiconfig_router
import threading
import schedule
import time
from datetime import datetime

app = FastAPI(title="社媒视频生成平台")

# 导入调度器功能
from scheduler import daily_competitor_scrape

def run_scheduler():
    """在后台线程中运行调度器"""
    print("🚀 调度器后台线程已启动")
    print(f"⏰ 每天北京时间 16:30 执行竞品抓取任务")
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}\n")
    
    # 设置每天 16:30 执行
    schedule.every().day.at("16:30").do(daily_competitor_scrape)
    
    # 持续运行
    while True:
        schedule.run_pending()
        time.sleep(60)  # 每分钟检查一次

# 在 FastAPI 启动时启动调度器后台线程
@app.on_event("startup")
def startup_event():
    """应用启动时的事件"""
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    print("✅ FastAPI 应用已启动，调度器后台线程已启动")

# CORS配置
# 支持本地开发、服务器部署和 Railway 部署
import os

# 获取允许的源列表
allowed_origins = [
    "http://localhost:5173",          # 本地开发（Vite 默认端口）
    "http://127.0.0.1:5173",
    "http://localhost:8080",          # 本地开发（备用端口）
    "http://127.0.0.1:8080",
    "http://170.106.108.96:8080",     # 服务器前端地址
    "http://170.106.108.96:5173",     # 服务器备用端口
]

# Railway 前端域名（从环境变量读取）
railway_frontend_url = os.getenv("FRONTEND_URL")
if railway_frontend_url:
    allowed_origins.append(railway_frontend_url)
    # 同时支持 http 和 https
    if railway_frontend_url.startswith("https://"):
        allowed_origins.append(railway_frontend_url.replace("https://", "http://"))
    elif railway_frontend_url.startswith("http://"):
        allowed_origins.append(railway_frontend_url.replace("http://", "https://"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 注册auth路由
app.include_router(auth_router, prefix="/api", tags=["认证"])

# 注册竞品路由
app.include_router(competitor_router, prefix="/api", tags=["竞品"])

# 注册搜索路由
app.include_router(search_router, prefix="/api", tags=["搜索"])

# 注册用户数据管理路由（支持多表数据隔离）
app.include_router(usermanage_router, tags=["用户数据管理"])

# 注册内容分析路由
app.include_router(analysis_router, tags=["内容分析"])

# 注册爆款脚本列表路由
app.include_router(popular_scripts_router, tags=["爆款脚本"])

# 注册图文分析路由
app.include_router(imageanalysis_router, tags=["图文分析"])

# 注册视频分析路由
app.include_router(videoanalysis_router, tags=["视频分析"])

# 注册我的项目路由
app.include_router(myproject_router, tags=["我的项目"])

# 注册API配置路由
app.include_router(apiconfig_router, tags=["API配置"])

class ScrapeRequest(BaseModel):
    username: str
    post_count: int
    scrape_type: str = "both"  # "posts" / "stories" / "both"

class SearchScrapeRequest(BaseModel):
    keyword: str
    post_count: int
    scrape_type: str  # "posts" / "stories" / "both"

@app.get("/")
def read_root():
    return {"message": "社媒视频生成平台API"}

@app.get("/health")
def health_check():
    """
    健康检查端点
    Railway 使用此端点检查服务是否正常运行
    """
    try:
        # 测试数据库连接
        from database import test_connection
        db_status = "connected" if test_connection() else "disconnected"
        
        return {
            "status": "healthy",
            "database": db_status,
            "service": "FastAPI Backend"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "service": "FastAPI Backend"
        }

@app.post("/api/scrape")
def scrape_data(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """竞品数据抓取接口"""
    try:
        # 在后台任务中执行抓取
        background_tasks.add_task(
            scrape_competitor_data, 
            request.username, 
            request.post_count,
            request.scrape_type
        )
        
        return {
            "success": True,
            "message": f"开始抓取用户 {request.username} 的数据，请稍后查看结果"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"抓取失败: {str(e)}"
        }

@app.post("/api/search-scrape")
def search_scrape_data(request: SearchScrapeRequest, background_tasks: BackgroundTasks):
    """搜索标签数据抓取接口"""
    try:
        # 在后台任务中执行抓取
        background_tasks.add_task(
            scrape_by_keyword, 
            request.keyword, 
            request.post_count,
            request.scrape_type
        )
        
        return {
            "success": True,
            "message": f"开始抓取标签 #{request.keyword} 的数据，请稍后查看结果"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"抓取失败: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
