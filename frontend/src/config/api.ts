// API 配置
// 在本地开发时使用 localhost，在生产环境时使用服务器地址

// ============================================
// 🔧 全局配置：自动适应不同环境
// ============================================
// 本地开发：使用 'http://localhost:8000'
// 服务器部署：使用 'http://170.106.108.96:8000'
// Railway 部署：使用环境变量 VITE_API_URL
export const API_BASE_URL = 
  import.meta.env.VITE_API_URL ||           // Railway 环境变量（优先）
  'http://localhost:8000';                  // 本地开发默认值

// ============================================
// 工具函数
// ============================================

// 导出完整的 API URL 构建函数
export const getApiUrl = (path: string) => {
  // 确保 path 以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

// ============================================
// API 端点定义
// ============================================
export const API_ENDPOINTS = {
  // ========== 认证 ==========
  login: '/api/login',
  
  // ========== 竞品管理 ==========
  competitors: '/api/competitors',
  competitorStats: '/api/competitors/stats',
  competitorPosts: (username: string) => `/api/competitors/${username}/posts`,
  competitorScrape: '/api/scrape',
  deleteCompetitor: (competitorId: number) => `/api/competitors/${competitorId}`,
  
  // ========== 搜索/关键词 ==========
  searchKeywords: '/api/search/keywords',
  searchKeywordStats: '/api/search/keywords/stats',
  searchKeywordPosts: (keyword: string) => `/api/search/keywords/${encodeURIComponent(keyword)}/posts`,
  searchScrape: '/api/search/scrape',
  deleteKeyword: (keywordId: number) => `/api/search/keywords/${keywordId}`,
  
  // ========== 帖子管理 ==========
  deletePost: (postId: string) => `/api/posts/${postId}`,
  
  // ========== 内容分析 ==========
  analysisScript: '/api/analysis/script',
  
  // ========== 爆款脚本 ==========
  popularScripts: (userId: number) => `/api/popular-scripts/?user_id=${userId}`,
  popularScriptUpdate: (scriptId: number) => `/api/popular-scripts/${scriptId}/success`,
  popularScriptDelete: (userId: number, postId: string) => `/api/user-data/popular/${postId}?user_id=${userId}`,
  
  // ========== 图文分析 ==========
  imageAnalysisStart: '/api/image-analysis/start',
  imageAnalysisStatus: (postId: string) => `/api/image-analysis/status/${postId}`,
  imageAnalysisData: (userId: number, postId: string) => `/api/image-analysis/data?user_id=${userId}&post_id=${postId}`,
  imageAnalysisUpdatePrompt: '/api/image-analysis/update-prompt',
  imageAnalysisGenerateImages: '/api/image-analysis/generate-image',  // 修正：单数 image
  
  // ========== 视频分析 ==========
  videoAnalysisStart: '/api/video-analysis/start',  // 修正：使用 start 而不是 inherit
  videoAnalysisData: (userId: number, postId: string) => `/api/video-analysis/data?user_id=${userId}&post_id=${postId}`,
  videoAnalysisUpdatePrompt: '/api/video-analysis/update-prompt',
  videoAnalysisUpdateScript: '/api/video-analysis/update-script',
  videoAnalysisUpdateJianyi4: '/api/video-analysis/update-jianyi4',
  videoAnalysisGenerateShotScript: '/api/video-analysis/generate-shot-script',
  videoAnalysisGenerateVideo: '/api/video-analysis/generate-video',
  
  // ========== 我的项目 ==========
  myProjects: (userId: number) => `/api/my-projects/?user_id=${userId}`,
  myProjectUpdate: (projectId: number) => `/api/my-projects/${projectId}`,
  myProjectDelete: (projectId: number) => `/api/my-projects/${projectId}`,
  myProjectDownload: (projectId: number, type: string) => `/api/my-projects/${projectId}/download/${type}`,
  createBlankProject: '/api/my-projects/create-blank',
  
  // ========== 用户数据管理 ==========
  userDataPopular: '/api/user-data/popular',
  userDataPopularList: (userId: number) => `/api/user-data/popular/${userId}`,
  userDataPopularUpdate: (id: number) => `/api/user-data/popular/${id}`,
  userDataPopularDelete: (id: number) => `/api/user-data/popular/${id}`,
  
  // ========== API Key 配置 ==========
  getApiKeysStatus: '/api/config/api-keys',
  updateApiKeys: '/api/config/api-keys',
};

