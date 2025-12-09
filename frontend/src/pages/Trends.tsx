import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { TrendingUp, Eye, Heart, MessageCircle, Plus, Sparkles, ArrowUp, ArrowDown, Users, Video, Image as ImageIcon, X, Globe, ExternalLink, Loader2, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, API_ENDPOINTS } from "@/config/api";

interface Competitor {
  id: number;
  username: string;
  full_name: string;
  full_name_zh: string;
  biography: string;
  biography_zh: string;
  profile_pic_url: string;
  profile_pic_base64: string;
  followers_count: number;
  follows_count: number;
  posts_count: number;
  url: string;
  external_url: string;
  external_urls: string[];
  has_channel: boolean;
  highlight_reel_count: number;
  instagram_id: string;
  created_at: string;
  updated_at: string;
}

interface SearchKeyword {
  id: number;
  keyword: string;
  keyword_zh: string;
  search_count: number;
  total_posts: number;
  created_at: string;
  updated_at: string;
}

interface Post {
  id: number;
  post_id: string;
  post_type: string;
  url: string;
  caption: string;
  caption_zh: string;
  alt: string;
  alt_zh: string;
  hashtags: string[];
  hashtags_zh: string[];
  mentions: string[];
  comments_count: number;
  likes_count: number;
  is_comments_disabled: boolean;
  first_comment: string;
  first_comment_zh: string;
  latest_comments: any[];
  latest_comments_zh: any[];
  display_url: string;
  display_url_base64: string;
  video_url: string;
  video_url_base64: string;
  video_duration: number;
  video_view_count: number;  // 新增：视频观看数
  video_play_count: number;  // 新增：视频播放数
  images: string[];
  images_base64: string[];
  child_posts: any[];
  videos?: string[];  // 新增
  videos_base64?: string[];  // 新增
  child_posts_order?: Array<{  // 新增
    index: number;
    type: "Video" | "Image";
    ref: number;
    short_code?: string;
    video_view_count?: number;
  }>;
  owner_username: string;
  owner_full_name: string;
  owner_full_name_zh: string;
  timestamp: string;
  is_pinned: boolean;
  is_sponsored: boolean;
  dimensions_height: number;
  dimensions_width: number;
}

const Trends = () => {
  const { toast } = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [keywords, setKeywords] = useState<SearchKeyword[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<SearchKeyword | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [stats, setStats] = useState({ avg_followers: 0, avg_posts: 0 });
  const [keywordStats, setKeywordStats] = useState({ total_keywords: 0, total_posts: 0, avg_posts_per_keyword: 0 });
  const [showCompetitorDetail, setShowCompetitorDetail] = useState(false);
  const [showPostsView, setShowPostsView] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isZh, setIsZh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("trending");
  const [contentType, setContentType] = useState<"all" | "video" | "image" | "carousel" | "mixed">("all");
  const [sortBy, setSortBy] = useState<"likes" | "comments">("likes");
  const [competitorQuery, setCompetitorQuery] = useState("");
  const [keywordQuery, setKeywordQuery] = useState("");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [analyzingPostId, setAnalyzingPostId] = useState<string | null>(null);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const pageSize = 5;
  
  // 视频懒加载状态：记录正在播放的视频
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  
  // 删除帖子相关状态
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCompetitors();
    loadStats();
    loadKeywords();
    loadKeywordStats();
  }, []);

  const loadCompetitors = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.competitors));
      const data = await response.json();
      if (data.success) {
        setCompetitors(data.data);
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载竞品列表",
        variant: "destructive",
      });
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.competitorStats));
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("加载统计数据失败", error);
    }
  };

  const loadKeywords = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.searchKeywords));
      const data = await response.json();
      if (data.success) {
        setKeywords(data.data);
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载关键词列表",
        variant: "destructive",
      });
    }
  };

  const loadKeywordStats = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.searchKeywordStats));
      const data = await response.json();
      if (data.success) {
        setKeywordStats(data.data);
      }
    } catch (error) {
      console.error("加载关键词统计数据失败", error);
    }
  };

  const loadPosts = async (username: string, page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl(API_ENDPOINTS.competitorPosts(username))}?page=${page}&page_size=${pageSize}`);
      const data = await response.json();
      if (data.success) {
        setPosts(data.data);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.total_pages);
        setTotalPosts(data.pagination.total);
        setShowPostsView(true);
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载帖子列表",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadKeywordPosts = async (keyword: string, page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl(API_ENDPOINTS.searchKeywordPosts(keyword))}?page=${page}&page_size=${pageSize}`);
      const data = await response.json();
      if (data.success) {
        setPosts(data.data);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.total_pages);
        setTotalPosts(data.pagination.total);
        setShowPostsView(true);
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载帖子列表",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitorClick = (competitor: Competitor) => {
    setSelectedCompetitor(competitor);
    setShowCompetitorDetail(true);
  };

  const handleKeywordClick = (keyword: SearchKeyword) => {
    setSelectedKeyword(keyword);
    loadKeywordPosts(keyword.keyword);
  };

  const handleViewPosts = () => {
    if (selectedCompetitor) {
      loadPosts(selectedCompetitor.username);
      setShowCompetitorDetail(false);
    }
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setCurrentCarouselIndex(0);
    setShowPreview(true);
  };
  
  // 处理视频播放（懒加载）
  const handleVideoPlay = (postId: string) => {
    setPlayingVideos(prev => {
      const newSet = new Set(prev);
      newSet.add(postId);
      return newSet;
    });
  };

  // 删除帖子
  const handleDeletePost = async () => {
    if (!postToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.deletePost(postToDelete.post_id)), {
        method: "DELETE",
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 从列表中移除
        setPosts(prev => prev.filter(p => p.post_id !== postToDelete.post_id));
        toast({
          title: "删除成功",
          description: "帖子已删除",
        });
        setShowDeleteConfirm(false);
        setPostToDelete(null);
      } else {
        throw new Error(data.detail || "删除失败");
      }
    } catch (error: any) {
      toast({
        title: "删除失败",
        description: error.message || "无法删除帖子",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleBackToCompetitors = () => {
    setShowPostsView(false);
    setPosts([]);
    setSelectedCompetitor(null);
    setCurrentPage(1);
    setTotalPages(1);
    setTotalPosts(0);
  };

  const handleBackToKeywords = () => {
    setShowPostsView(false);
    setPosts([]);
    setSelectedKeyword(null);
    setCurrentPage(1);
    setTotalPages(1);
    setTotalPosts(0);
  };

  const handleAnalyzeScript = async (post: Post) => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast({
        title: "未登录",
        description: "请先登录后再使用分析功能",
        variant: "destructive",
      });
      return;
    }

    setAnalyzingPostId(post.post_id);
    
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.analysisScript), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: post.post_id,
          user_id: parseInt(userId),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "分析完成",
          description: "脚本分析已完成，数据已保存",
        });
      } else {
        throw new Error(data.message || "分析失败");
      }
    } catch (error: any) {
      toast({
        title: "分析失败",
        description: error.message || "无法完成脚本分析",
        variant: "destructive",
      });
    } finally {
      setAnalyzingPostId(null);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const getDisplayText = (original: string, translated: string) => {
    return isZh && translated ? translated : original;
  };

  // 获取帖子的播放量/浏览量
  const getViewCount = (post: Post): number => {
    // 对于 Video 类型，直接使用 video_view_count
    if (post.post_type === "Video") {
      return post.video_view_count || 0;
    }
    // 对于 Sidecar_video 类型，计算所有视频的播放量总和
    if (post.post_type === "Sidecar_video" && post.child_posts_order) {
      return post.child_posts_order
        .filter(item => item.type === "Video" && item.video_view_count)
        .reduce((sum, item) => sum + (item.video_view_count || 0), 0);
    }
    // 对于 Image 和 Sidecar 类型，返回 0（没有播放量）
    return 0;
  };

  // 获取帖子的播放数
  const getPlayCount = (post: Post): number => {
    // 对于 Video 类型，直接使用 video_play_count
    if (post.post_type === "Video") {
      return post.video_play_count || 0;
    }
    // 对于 Sidecar_video 类型，暂时返回 0（没有存储）
    if (post.post_type === "Sidecar_video") {
      return 0;
    }
    return 0;
  };

  // 计算完播率（观看量/播放量）
  const getCompletionRate = (post: Post): string => {
    const viewCount = getViewCount(post);
    const playCount = getPlayCount(post);
    
    if (playCount === 0 || viewCount === 0) {
      return "-";
    }
    
    const rate = (viewCount / playCount) * 100;
    return rate.toFixed(1) + "%";
  };

  // 时间范围过滤
  const inTimeRange = (post: Post) => {
    if (timeRange === "all") return true;
    const now = Date.now();
    const ts = new Date(post.timestamp).getTime();
    const days = timeRange === "7d" ? 7 : 30;
    return ts >= now - days * 24 * 60 * 60 * 1000;
  };

  // 热门内容数据源（仅在"热门内容排行"标签页且已选择关键词后使用）
  const keywordFilteredPosts = posts.filter((post) => {
    if (!inTimeRange(post)) return false;
    const typeMapping: Record<typeof contentType, string[]> = {
      "all": ["Image", "Video", "Sidecar", "Sidecar_video"],
      "video": ["Video"],
      "image": ["Image"],
      "carousel": ["Sidecar"],
      "mixed": ["Sidecar_video"]
    };
    return typeMapping[contentType]?.includes(post.post_type);
  });
  const keywordSortedPosts = [...keywordFilteredPosts].sort((a, b) => {
    if (sortBy === "likes") return (b.likes_count || 0) - (a.likes_count || 0);
    return (b.comments_count || 0) - (a.comments_count || 0);
  });

  // 竞品列表排序与搜索
  const sortedCompetitors = [...competitors].sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0));
  const filteredCompetitors = sortedCompetitors.filter((c) => {
    const q = competitorQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.username.toLowerCase().includes(q) ||
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.full_name_zh && c.full_name_zh.toLowerCase().includes(q))
    );
  });

  // 关键词列表排序与搜索
  const sortedKeywords = [...keywords].sort((a, b) => (b.total_posts || 0) - (a.total_posts || 0));
  const filteredKeywords = sortedKeywords.filter((k) => {
    const q = keywordQuery.trim().toLowerCase();
    if (!q) return true;
    return k.keyword.toLowerCase().includes(q);
  });

  // 竞品帖子筛选
  const competitorFilteredPosts = posts.filter((post) => {
    if (!inTimeRange(post)) return false;
    const typeMapping: Record<typeof contentType, string[]> = {
      "all": ["Image", "Video", "Sidecar", "Sidecar_video"],
      "video": ["Video"],
      "image": ["Image"],
      "carousel": ["Sidecar"],
      "mixed": ["Sidecar_video"]
    };
    return typeMapping[contentType]?.includes(post.post_type);
  });
  const competitorSortedPosts = [...competitorFilteredPosts].sort((a, b) => {
    if (sortBy === "likes") return (b.likes_count || 0) - (a.likes_count || 0);
    return (b.comments_count || 0) - (a.comments_count || 0);
  });

  // 热门标签（基于当前帖子）
  const topHashtags = (() => {
    const count = new Map<string, number>();
    posts.forEach((p) => {
      const tags = (isZh ? p.hashtags_zh : p.hashtags) || [];
      tags.forEach((t) => count.set(t, (count.get(t) || 0) + 1));
    });
    return Array.from(count.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, cnt]) => ({ name: tag, count: cnt }));
  })();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">趋势洞察</h1>
          <p className="text-muted-foreground mt-1">发现热门内容，把握创作方向</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsZh(!isZh)}>
          <Globe className="h-4 w-4 mr-2" />
          {isZh ? "中文" : "原文"}
        </Button>
      </div>

      {/* Tab 切换 */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="trending">热门内容排行</TabsTrigger>
          <TabsTrigger value="competitors">竞品动态追踪</TabsTrigger>
        </TabsList>

        {/* 热门内容排行 */}
        <TabsContent value="trending" className="space-y-6">
          {!showPostsView ? (
            <>
              {/* 筛选栏 */}
              <Card className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索关键词/标签..."
                    value={keywordQuery}
                    onChange={(e) => setKeywordQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧：关键词标签列表 */}
                <div className="lg:col-span-2">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        热门标签列表
                      </h2>
                      <Badge variant="secondary">共追踪 {keywords.length} 个标签</Badge>
                    </div>

                    {filteredKeywords.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground space-y-3">
                        <p>暂无搜索标签数据。请先在管理后台进行标签抓取。</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredKeywords.map((keyword, index) => (
                          <div
                            key={keyword.id}
                            className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                            onClick={() => handleKeywordClick(keyword)}
                          >
                            <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                              index === 0 ? "bg-warning text-warning-foreground" : "bg-background text-foreground"
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-lg mb-1">
                                #{isZh && keyword.keyword_zh ? keyword.keyword_zh : keyword.keyword}
                              </div>
                              {isZh && keyword.keyword_zh && (
                                <div className="text-xs text-muted-foreground mb-1">
                                  原文: #{keyword.keyword}
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground">
                                <span>帖子数: {keyword.total_posts}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* 右侧：数据洞察 */}
                <div className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">数据概览</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">追踪标签数</span>
                        <span className="font-semibold">{keywordStats.total_keywords}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">总帖子数</span>
                        <span className="font-semibold">{formatNumber(keywordStats.total_posts)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">平均每标签</span>
                        <span className="font-semibold">{formatNumber(keywordStats.avg_posts_per_keyword)}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 标签内容榜单 */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToKeywords}
                    >
                      ← 返回标签列表
                    </Button>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-white font-bold">#</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">
                          {selectedKeyword && (isZh && selectedKeyword.keyword_zh ? selectedKeyword.keyword_zh : selectedKeyword.keyword)}
                        </h2>
                        {selectedKeyword && isZh && selectedKeyword.keyword_zh && (
                          <p className="text-xs text-muted-foreground">
                            原文: {selectedKeyword.keyword}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {selectedKeyword?.total_posts} 个帖子
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsZh(!isZh)}>
                    <Globe className="h-4 w-4 mr-2" />
                    {isZh ? "中文" : "原文"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-4 mb-4">
                  <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="时间范围" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">过去7天</SelectItem>
                      <SelectItem value="30d">过去30天</SelectItem>
                      <SelectItem value="all">所有历史数据</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button
                      variant={contentType === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType("all")}
                    >
                      全部
                    </Button>
                    <Button
                      variant={contentType === "video" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType("video")}
                    >
                      <Video className="w-4 h-4 mr-1" />
                      视频
                    </Button>
                    <Button
                      variant={contentType === "image" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType("image")}
                    >
                      <ImageIcon className="w-4 h-4 mr-1" />
                      单图
                    </Button>
                    <Button
                      variant={contentType === "carousel" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType("carousel")}
                    >
                      <ImageIcon className="w-4 h-4 mr-1" />
                      多图
                    </Button>
                    <Button
                      variant={contentType === "mixed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType("mixed")}
                    >
                      <Video className="w-4 h-4 mr-1" />
                      图文视频
                    </Button>
                  </div>

                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="排序方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="likes">按点赞量</SelectItem>
                      <SelectItem value="comments">按评论量</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：热门内容列表 */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  热门内容排行
                </h2>
                </div>
                {keywordSortedPosts.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground space-y-3">
                    <p>暂无符合条件的帖子数据。</p>
                  </div>
                ) : (
                <div className="space-y-6">
                    {keywordSortedPosts.map((post) => (
                      <div key={post.id} className="rounded-lg border overflow-hidden group/card relative">
                      {/* 删除按钮 */}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 left-2 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPostToDelete(post);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="flex gap-6 p-6">
                        <div 
                          className="w-48 h-64 flex-shrink-0 cursor-pointer group relative"
                            onClick={() => handlePostClick(post)}
                        >
                            {post.display_url_base64 || post.display_url ? (
                          <img
                                src={post.display_url_base64 ? `data:image/jpeg;base64,${post.display_url_base64}` : post.display_url}
                                alt={post.alt || "Post"}
                            className="w-full h-full object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                          />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                              {post.post_type === "Video" || post.video_url ? (
                              <Video className="w-12 h-12 text-white" />
                            ) : (
                              <ImageIcon className="w-12 h-12 text-white" />
                            )}
                          </div>
                          <Badge className="absolute top-2 right-2" variant="secondary">
                              {post.post_type === "Video" ? "视频" : 
                               post.post_type === "Sidecar_video" ? "图文视频" : 
                               post.post_type === "Sidecar" ? "多图" : "单图"}
                          </Badge>
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-3">
                            <h3 className="font-semibold text-lg line-clamp-2">
                              {getDisplayText(post.caption, post.caption_zh) || "无标题"}
                            </h3>
                          
                          <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1" title="观看量">
                              <Eye className="w-4 h-4" />
                              {(() => {
                                const viewCount = getViewCount(post);
                                return viewCount > 0 ? formatNumber(viewCount) : "-";
                              })()}
                            </span>
                            <span className="flex items-center gap-1" title="播放量">
                              <Video className="w-4 h-4" />
                              {(() => {
                                const playCount = getPlayCount(post);
                                return playCount > 0 ? formatNumber(playCount) : "-";
                              })()}
                            </span>
                            <span className="flex items-center gap-1" title="完播率">
                              <TrendingUp className="w-4 h-4" />
                              {getCompletionRate(post)}
                            </span>
                            <span className="flex items-center gap-1" title="点赞数">
                              <Heart className="w-4 h-4" />
                                {formatNumber(post.likes_count)}
                            </span>
                            <span className="flex items-center gap-1" title="评论数">
                              <MessageCircle className="w-4 h-4" />
                                {formatNumber(post.comments_count)}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                              {(post.hashtags || []).slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="secondary">
                                  #{isZh && post.hashtags_zh?.[idx] ? post.hashtags_zh[idx] : tag}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="bg-muted/50 p-3 rounded-lg flex-1">
                              <p className="text-sm line-clamp-2 mb-3">
                                {getDisplayText(post.caption, post.caption_zh) || "无内容"}
                              </p>
                              {post.latest_comments && post.latest_comments.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">热门评论：</p>
                                  {post.latest_comments.slice(0, 2).map((comment: any, idx: number) => (
                                <div key={idx} className="text-xs bg-background/50 p-2 rounded">
                                      <span className="font-medium">{comment.ownerUsername || "用户"}：</span>
                                      <span className="text-muted-foreground">
                                        {isZh && post.latest_comments_zh?.[idx]?.text
                                          ? post.latest_comments_zh[idx].text
                                          : (comment.text || comment)}
                                  </span>
                                </div>
                              ))}
                            </div>
                              )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 px-6 pb-6">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => window.open(post.url, '_blank')}
                          >
                          查看详情
                        </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-gradient-to-r from-primary to-primary-dark"
                            onClick={() => handleAnalyzeScript(post)}
                            disabled={analyzingPostId === post.post_id}
                          >
                            {analyzingPostId === post.post_id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                分析中...
                              </>
                            ) : (
                              <>
                          <Sparkles className="w-4 h-4 mr-1" />
                          AI分析
                              </>
                            )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </Card>
              
              {/* 分页控制 - 关键词帖子 */}
              {keywordSortedPosts.length > 0 && (
                <Card className="p-4">
                  <div className="flex justify-center items-center gap-4">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedKeyword && currentPage > 1) {
                          loadKeywordPosts(selectedKeyword.keyword, currentPage - 1);
                        }
                      }}
                      disabled={currentPage === 1 || loading}
                    >
                      上一页
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      第 {currentPage} / {totalPages} 页（共 {totalPosts} 条）
                    </span>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedKeyword && currentPage < totalPages) {
                          loadKeywordPosts(selectedKeyword.keyword, currentPage + 1);
                        }
                      }}
                      disabled={currentPage === totalPages || loading}
                    >
                      下一页
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* 右侧：数据洞察 */}
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">热门主题标签</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {topHashtags.slice(0, 8).map((tag) => (
                    <Badge key={tag.name} variant="outline" className="text-sm py-1">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-4">选题表现排行</h3>
                <div className="space-y-3">
                  {topHashtags.slice(0, 4).map((tag, index) => (
                    <div key={tag.name} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        index === 0 ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{tag.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{tag.count} 个帖子</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
            </>
          )}
        </TabsContent>

        {/* 竞品动态追踪 */}
        <TabsContent value="competitors" className="space-y-6">
          {!showPostsView ? (
            <>
              {/* 筛选栏 */}
              <Card className="p-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex gap-4">
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="筛选平台" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部平台</SelectItem>
                        <SelectItem value="ins">Instagram</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索竞品账号..."
                        value={competitorQuery}
                        onChange={(e) => setCompetitorQuery(e.target.value)}
                        className="pl-9 w-64"
                      />
                  </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧：竞品账号列表 */}
                <div className="lg:col-span-2">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        竞品账号列表
                      </h2>
                      <Badge variant="secondary">共追踪 {competitors.length} 个账号</Badge>
                    </div>

                    <div className="space-y-3">
                      {filteredCompetitors.map((account, index) => (
                        <div
                          key={account.id}
                          className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                          onClick={() => handleCompetitorClick(account)}
                        >
                          <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            index === 0 ? "bg-warning text-warning-foreground" : "bg-background text-foreground"
                          }`}>
                            {index + 1}
                          </div>
                          <img
                            src={account.profile_pic_base64 ? `data:image/jpeg;base64,${account.profile_pic_base64}` : account.profile_pic_url}
                            alt={account.username}
                            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-lg">
                              {getDisplayText(account.full_name, account.full_name_zh)}
                            </div>
                            <div className="text-sm text-muted-foreground mb-2 truncate">
                              @{account.username}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {formatNumber(account.followers_count)}
                              </span>
                              <span>帖子: {account.posts_count}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* 右侧：数据洞察 */}
                <div className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">市场概览</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">平均粉丝数</span>
                        <span className="font-semibold">{formatNumber(stats.avg_followers)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">平均发帖数</span>
                        <span className="font-semibold">{formatNumber(stats.avg_posts)}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 账号内容榜单 */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                      onClick={handleBackToCompetitors}
                  >
                    ← 返回账号列表
                  </Button>
                  <div className="flex items-center gap-3">
                    <img
                        src={selectedCompetitor?.profile_pic_base64 ? `data:image/jpeg;base64,${selectedCompetitor.profile_pic_base64}` : selectedCompetitor?.profile_pic_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="text-xl font-semibold">
                          {selectedCompetitor && getDisplayText(selectedCompetitor.full_name, selectedCompetitor.full_name_zh)}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                          {selectedCompetitor && formatNumber(selectedCompetitor.followers_count)} 粉丝
                      </p>
                    </div>
                  </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsZh(!isZh)}>
                    <Globe className="h-4 w-4 mr-2" />
                    {isZh ? "中文" : "原文"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-4 mb-4">
                  <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="时间范围" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">过去7天</SelectItem>
                      <SelectItem value="30d">过去30天</SelectItem>
                      <SelectItem value="all">所有历史数据</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button
                      variant={contentType === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType("all")}
                    >
                      全部
                    </Button>
                    <Button
                      variant={contentType === "video" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType("video")}
                    >
                      <Video className="w-4 h-4 mr-1" />
                      视频
                    </Button>
                    <Button
                      variant={contentType === "image" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType("image")}
                    >
                      <ImageIcon className="w-4 h-4 mr-1" />
                      单图
                    </Button>
                    <Button
                      variant={contentType === "carousel" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType("carousel")}
                    >
                      <ImageIcon className="w-4 h-4 mr-1" />
                      多图
                    </Button>
                    <Button
                      variant={contentType === "mixed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setContentType("mixed")}
                    >
                      <Video className="w-4 h-4 mr-1" />
                      图文视频
                    </Button>
                  </div>

                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="排序方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="likes">按点赞量</SelectItem>
                      <SelectItem value="comments">按评论量</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧：内容榜单 */}
                <div className="lg:col-span-2 space-y-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      内容排行榜
                    </h2>
                    </div>
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                    <div className="space-y-6">
                        {competitorSortedPosts.map((post) => (
                          <div key={post.id} className="rounded-lg border overflow-hidden group/card relative">
                          {/* 删除按钮 */}
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 left-2 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPostToDelete(post);
                              setShowDeleteConfirm(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="flex gap-6 p-6">
                            <div 
                              className="w-48 h-64 flex-shrink-0 cursor-pointer group relative"
                                onClick={() => handlePostClick(post)}
                            >
                                {post.display_url_base64 || post.display_url ? (
                              <img
                                    src={post.display_url_base64 ? `data:image/jpeg;base64,${post.display_url_base64}` : post.display_url}
                                    alt={post.alt || "Post"}
                                className="w-full h-full object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                              />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                  </div>
                                )}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                                  {post.post_type === "Video" || post.video_url ? (
                                  <Video className="w-12 h-12 text-white" />
                                ) : (
                                  <ImageIcon className="w-12 h-12 text-white" />
                                )}
                              </div>
                              <Badge className="absolute top-2 right-2" variant="secondary">
                                  {post.post_type === "Video" ? "视频" : 
                                   post.post_type === "Sidecar_video" ? "图文视频" : 
                                   post.post_type === "Sidecar" ? "多图" : "单图"}
                              </Badge>
                            </div>
                            
                            <div className="flex-1 flex flex-col gap-3">
                                <h3 className="font-semibold text-lg line-clamp-2">
                                  {getDisplayText(post.caption, post.caption_zh) || "无标题"}
                                </h3>
                              
                              <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1" title="观看量">
                                  <Eye className="w-4 h-4" />
                                  {(() => {
                                    const viewCount = getViewCount(post);
                                    return viewCount > 0 ? formatNumber(viewCount) : "-";
                                  })()}
                                </span>
                                <span className="flex items-center gap-1" title="播放量">
                                  <Video className="w-4 h-4" />
                                  {(() => {
                                    const playCount = getPlayCount(post);
                                    return playCount > 0 ? formatNumber(playCount) : "-";
                                  })()}
                                </span>
                                <span className="flex items-center gap-1" title="完播率">
                                  <TrendingUp className="w-4 h-4" />
                                  {getCompletionRate(post)}
                                </span>
                                <span className="flex items-center gap-1" title="点赞数">
                                  <Heart className="w-4 h-4" />
                                    {formatNumber(post.likes_count)}
                                </span>
                                <span className="flex items-center gap-1" title="评论数">
                                  <MessageCircle className="w-4 h-4" />
                                    {formatNumber(post.comments_count)}
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                  {(post.hashtags || []).slice(0, 3).map((tag, idx) => (
                                    <Badge key={idx} variant="secondary">
                                      #{isZh && post.hashtags_zh?.[idx] ? post.hashtags_zh[idx] : tag}
                                  </Badge>
                                ))}
                              </div>
                              
                              <div className="bg-muted/50 p-3 rounded-lg flex-1">
                                  <p className="text-sm line-clamp-2 mb-3">
                                    {getDisplayText(post.caption, post.caption_zh) || "无内容"}
                                  </p>
                                  {post.latest_comments && post.latest_comments.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">热门评论：</p>
                                      {post.latest_comments.slice(0, 2).map((comment: any, idx: number) => (
                                    <div key={idx} className="text-xs bg-background/50 p-2 rounded">
                                          <span className="font-medium">{comment.ownerUsername || "用户"}：</span>
                                          <span className="text-muted-foreground">
                                            {isZh && post.latest_comments_zh?.[idx]?.text
                                              ? post.latest_comments_zh[idx].text
                                              : (comment.text || comment)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                  )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 px-6 pb-6">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1"
                                onClick={() => window.open(post.url, '_blank')}
                            >
                              查看详情
                            </Button>
                              <Button 
                                size="sm" 
                                className="flex-1 bg-gradient-to-r from-primary to-primary-dark"
                                onClick={() => handleAnalyzeScript(post)}
                                disabled={analyzingPostId === post.post_id}
                              >
                                {analyzingPostId === post.post_id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    分析中...
                                  </>
                                ) : (
                                  <>
                              <Sparkles className="w-4 h-4 mr-1" />
                              分析脚本
                                  </>
                                )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </Card>
                  
                  {/* 分页控制 - 竞品帖子 */}
                  {competitorSortedPosts.length > 0 && (
                    <Card className="p-4">
                      <div className="flex justify-center items-center gap-4">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedCompetitor && currentPage > 1) {
                              loadPosts(selectedCompetitor.username, currentPage - 1);
                            }
                          }}
                          disabled={currentPage === 1 || loading}
                        >
                          上一页
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          第 {currentPage} / {totalPages} 页（共 {totalPosts} 条）
                        </span>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedCompetitor && currentPage < totalPages) {
                              loadPosts(selectedCompetitor.username, currentPage + 1);
                            }
                          }}
                          disabled={currentPage === totalPages || loading}
                        >
                          下一页
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>

                {/* 右侧：数据洞察 */}
                <div className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">账号数据概览</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">内容总数</span>
                        <span className="font-semibold">{totalPosts || posts.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">平均点赞</span>
                        <span className="font-semibold">
                          {posts.length > 0 ? formatNumber(Math.round(posts.reduce((sum, p) => sum + p.likes_count, 0) / posts.length)) : 0}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">热门内容标签</h3>
                    <div className="flex flex-wrap gap-2">
                      {topHashtags.slice(0, 8).map((tag) => (
                        <Badge key={tag.name} variant="outline">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* 竞品详情弹窗 */}
      <Dialog open={showCompetitorDetail} onOpenChange={setShowCompetitorDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCompetitor && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>竞品详情</span>
                  <Button variant="ghost" size="sm" onClick={() => setIsZh(!isZh)}>
                    <Globe className="h-4 w-4 mr-2" />
                    {isZh ? "中文" : "原文"}
                  </Button>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-start gap-6">
                  <img
                    src={selectedCompetitor.profile_pic_base64 ? `data:image/jpeg;base64,${selectedCompetitor.profile_pic_base64}` : selectedCompetitor.profile_pic_url}
                    alt={selectedCompetitor.username}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1">
                      {getDisplayText(selectedCompetitor.full_name, selectedCompetitor.full_name_zh)}
                    </h3>
                    <p className="text-muted-foreground mb-2">@{selectedCompetitor.username}</p>
                    <p className="text-sm">
                      {getDisplayText(selectedCompetitor.biography, selectedCompetitor.biography_zh)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{formatNumber(selectedCompetitor.followers_count)}</p>
                    <p className="text-sm text-muted-foreground">粉丝数</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{formatNumber(selectedCompetitor.follows_count)}</p>
                    <p className="text-sm text-muted-foreground">关注数</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{selectedCompetitor.posts_count}</p>
                    <p className="text-sm text-muted-foreground">帖子数</p>
                  </Card>
                </div>

                <Button className="w-full" size="lg" onClick={handleViewPosts}>
                  查看帖子详情
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 帖子预览弹窗 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedPost && (getDisplayText(selectedPost.caption, selectedPost.caption_zh) || "帖子详情")}</span>
              <Button variant="ghost" size="sm" onClick={() => setIsZh(!isZh)}>
                <Globe className="h-4 w-4 mr-2" />
                {isZh ? "中文" : "原文"}
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedPost && (
          <div className="space-y-4">
              {/* 媒体预览 */}
              <div className="relative flex items-center justify-center bg-muted rounded-lg">
                {/* Sidecar_video 混合类型：图文视频轮播 */}
                {selectedPost.post_type === "Sidecar_video" && selectedPost.child_posts_order && selectedPost.child_posts_order.length > 0 ? (
                  <div className="w-full">
                    <Carousel className="w-full">
                      <CarouselContent>
                        {selectedPost.child_posts_order.map((item, idx) => {
                          const carouselVideoId = `${selectedPost.post_id}_carousel_${idx}`;
                          return (
                          <CarouselItem key={idx}>
                            <div className="relative">
                              {item.type === "Video" ? (
                                  playingVideos.has(carouselVideoId) ? (
                                <video
                                  controls
                                  className="rounded-lg max-h-[70vh] w-full object-contain"
                                      autoPlay
                                  poster={selectedPost.display_url_base64 ? `data:image/jpeg;base64,${selectedPost.display_url_base64}` : selectedPost.display_url}
                                >
                                  <source
                                    src={
                                      selectedPost.videos_base64 && selectedPost.videos_base64[item.ref]
                                        ? `data:video/mp4;base64,${selectedPost.videos_base64[item.ref]}`
                                        : selectedPost.videos && selectedPost.videos[item.ref]
                                    }
                                    type="video/mp4"
                                  />
                                  您的浏览器不支持视频标签。
                                </video>
                                  ) : (
                                    <div 
                                      className="relative cursor-pointer group"
                                      onClick={() => handleVideoPlay(carouselVideoId)}
                                    >
                                      <img
                                        src={
                                          selectedPost.images_base64 && selectedPost.images_base64[item.ref]
                                            ? `data:image/jpeg;base64,${selectedPost.images_base64[item.ref]}`
                                            : selectedPost.images && selectedPost.images[item.ref]
                                        }
                                        alt={`视频封面 ${idx + 1}`}
                                        className="w-full rounded-lg object-contain max-h-[70vh]"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg group-hover:bg-black/40 transition-colors">
                                        <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                                          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-primary border-b-[15px] border-b-transparent ml-1"></div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                              ) : (
                                <img
                                  src={
                                    selectedPost.images_base64 && selectedPost.images_base64[item.ref]
                                      ? `data:image/jpeg;base64,${selectedPost.images_base64[item.ref]}`
                                      : selectedPost.images && selectedPost.images[item.ref]
                                  }
                                  alt={`媒体 ${idx + 1}`}
                                  className="w-full rounded-lg object-contain max-h-[70vh]"
                                />
                              )}
                              <Badge className="absolute top-2 right-2" variant="secondary">
                                {idx + 1}/{selectedPost.child_posts_order.length} - {item.type === "Video" ? "视频" : "图片"}
                              </Badge>
                            </div>
                          </CarouselItem>
                          );
                        })}
                      </CarouselContent>
                      <CarouselPrevious className="left-4" />
                      <CarouselNext className="right-4" />
                    </Carousel>
                  </div>
                ) : (
                  <>
                {/* 视频优先显示 - 懒加载 */}
                {selectedPost.video_url_base64 || selectedPost.video_url ? (
                  <div className="relative">
                    {playingVideos.has(selectedPost.post_id) ? (
                <video 
                  controls 
                    className="rounded-lg max-h-[70vh] max-w-full"
                  autoPlay
                    poster={selectedPost.display_url_base64 ? `data:image/jpeg;base64,${selectedPost.display_url_base64}` : selectedPost.display_url}
                    style={{
                      width: selectedPost.dimensions_height > selectedPost.dimensions_width ? 'auto' : '100%',
                      height: selectedPost.dimensions_height > selectedPost.dimensions_width ? '70vh' : 'auto'
                    }}
                >
                    <source
                      src={selectedPost.video_url_base64 ? `data:video/mp4;base64,${selectedPost.video_url_base64}` : selectedPost.video_url}
                      type="video/mp4"
                    />
                  您的浏览器不支持视频标签。
                </video>
                    ) : (
                      <div 
                        className="relative cursor-pointer group"
                        onClick={() => handleVideoPlay(selectedPost.post_id)}
                      >
                        <img
                          src={selectedPost.display_url_base64 ? `data:image/jpeg;base64,${selectedPost.display_url_base64}` : selectedPost.display_url}
                          alt="Video thumbnail"
                          className="rounded-lg max-h-[70vh] max-w-full"
                          style={{
                            width: selectedPost.dimensions_height > selectedPost.dimensions_width ? 'auto' : '100%',
                            height: selectedPost.dimensions_height > selectedPost.dimensions_width ? '70vh' : 'auto'
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg group-hover:bg-black/40 transition-colors">
                          <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-primary border-b-[15px] border-b-transparent ml-1"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedPost.images_base64 && selectedPost.images_base64.length > 1 ? (
                  /* 多图轮播 */
                <Carousel className="w-full">
                  <CarouselContent>
                      {selectedPost.images_base64.map((img: string, idx: number) => (
                        <CarouselItem key={idx}>
                          <img
                            src={`data:image/jpeg;base64,${img}`}
                            alt={`图片 ${idx + 1}`}
                            className="w-full rounded-lg object-contain max-h-[60vh]"
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </Carousel>
                ) : selectedPost.images && selectedPost.images.length > 1 ? (
                  /* 多图轮播（URL） */
                  <Carousel className="w-full">
                    <CarouselContent>
                      {selectedPost.images.map((img: string, idx: number) => (
                      <CarouselItem key={idx}>
                        <img 
                          src={img} 
                          alt={`图片 ${idx + 1}`}
                          className="w-full rounded-lg object-contain max-h-[60vh]"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                      <CarouselPrevious className="left-4" />
                      <CarouselNext className="right-4" />
                </Carousel>
                ) : (
                  /* 单图 */
                  <img
                    src={selectedPost.display_url_base64 ? `data:image/jpeg;base64,${selectedPost.display_url_base64}` : selectedPost.display_url}
                    alt="Post"
                    className="w-full rounded-lg object-contain max-h-[60vh]"
                  />
                )}
                  </>
                )}
            </div>
            
            {/* 数据指标 */}
            <div className="flex gap-6 text-sm flex-wrap">
              <span className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {(() => {
                      const viewCount = getViewCount(selectedPost);
                      return viewCount > 0 ? formatNumber(viewCount) : "-";
                    })()}
                  </span>
                  <span className="text-xs text-muted-foreground">观看量</span>
                </div>
              </span>
              <span className="flex items-center gap-2">
                <Video className="w-5 h-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {(() => {
                      const playCount = getPlayCount(selectedPost);
                      return playCount > 0 ? formatNumber(playCount) : "-";
                    })()}
                  </span>
                  <span className="text-xs text-muted-foreground">播放量</span>
                </div>
              </span>
              <span className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-semibold">{getCompletionRate(selectedPost)}</span>
                  <span className="text-xs text-muted-foreground">完播率</span>
                </div>
              </span>
              <span className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-semibold">{formatNumber(selectedPost.likes_count)}</span>
                  <span className="text-xs text-muted-foreground">点赞</span>
                </div>
              </span>
              <span className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-semibold">{formatNumber(selectedPost.comments_count)}</span>
                  <span className="text-xs text-muted-foreground">评论</span>
                </div>
              </span>
            </div>
            
            {/* 标签 */}
              {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
                  {selectedPost.hashtags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      #{isZh && selectedPost.hashtags_zh?.[idx] ? selectedPost.hashtags_zh[idx] : tag}
                </Badge>
              ))}
            </div>
              )}
            
            {/* 文案内容 */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">内容文案</h3>
                <p className="text-sm whitespace-pre-wrap">
                  {getDisplayText(selectedPost.caption, selectedPost.caption_zh) || "无内容"}
                </p>
            </div>
            
            {/* 评论列表 */}
              {selectedPost.latest_comments && selectedPost.latest_comments.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">热门评论</h3>
              <div className="space-y-3">
                    {selectedPost.latest_comments.map((comment: any, idx: number) => (
                  <div key={idx} className="bg-background p-3 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-sm">{comment.ownerUsername || "用户"}</span>
                          {comment.likesCount > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                              {comment.likesCount}
                      </span>
                          )}
                    </div>
                        <p className="text-sm text-muted-foreground">
                          {isZh && selectedPost.latest_comments_zh?.[idx]?.text
                            ? selectedPost.latest_comments_zh[idx].text
                            : (comment.text || comment)}
                        </p>
                  </div>
                ))}
              </div>
            </div>
              )}
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            确定要删除这个帖子吗？此操作不可撤销。
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setPostToDelete(null);
              }}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePost}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trends;
