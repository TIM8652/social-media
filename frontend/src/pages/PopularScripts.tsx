import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Video, Image as ImageIcon, Clock, Tag, Eye, Sparkles, Loader2, FileText, Lightbulb, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, API_ENDPOINTS } from "@/config/api";

interface Script {
  id: number;
  post_id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  contentType: "video" | "image";
  date: string;
  tags: string[];
  successFactors: string[];
  hookAnalysis: string | null;
  structureAnalysis: string | null;
  visualAnalysis: string | null;
  display_url_base64?: string | null;
  video_url_base64?: string | null;
  images_base64?: string[] | null;
  jianyi1?: string | null;
  jianyi1_5?: string | null;
  jianyi2?: string | null;
  jianyi3?: string | null;
  success?: string | null;
  prompt?: string | null;  // 新增：单图提示词
  prompt_array?: string[] | null;  // 新增：多图提示词数组
}

const PopularScripts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [contentType, setContentType] = useState<"all" | "video" | "image">("all");
  const [sortBy, setSortBy] = useState("date");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [newSuccessFactor, setNewSuccessFactor] = useState("");
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);  // 新增：用于图片轮播
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();  // Carousel API
  
  // 删除功能状态
  const [scriptToDelete, setScriptToDelete] = useState<Script | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 监听 Carousel 的选择变化
  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.on("select", () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  // 解析 jianyi1 的各个部分（竞品策略分析 - 从 jianyi1 中提取）
  const parseJianyi1 = (text: string | null | undefined) => {
    if (!text) return { contentPosition: "", visualStrategy: "", copyStrategy: "", targetAudience: "" };
    
    const parts = {
      contentPosition: "",
      visualStrategy: "",
      copyStrategy: "",
      targetAudience: ""
    };
    
    // 提取内容定位
    const contentMatch = text.match(/内容定位:\s*\*?\*?.*?[:：]\*?\*?\s*(.*?)(?=\n\s*视觉策略:|$)/s);
    if (contentMatch) parts.contentPosition = contentMatch[1].trim();
    
    // 提取视觉策略
    const visualMatch = text.match(/视觉策略:\s*\*?\*?.*?[:：]\*?\*?\s*(.*?)(?=\n\s*文案策略:|$)/s);
    if (visualMatch) parts.visualStrategy = visualMatch[1].trim();
    
    // 提取文案策略
    const copyMatch = text.match(/文案策略:\s*\*?\*?.*?[:：]\*?\*?\s*(.*?)(?=\n\s*目标受众:|$)/s);
    if (copyMatch) parts.copyStrategy = copyMatch[1].trim();
    
    // 提取目标受众
    const targetMatch = text.match(/目标受众:\s*\*?\*?.*?[:：]\*?\*?\s*(.*?)$/s);
    if (targetMatch) parts.targetAudience = targetMatch[1].trim();
    
    return parts;
  };

  // 解析 jianyi1.5 的各个部分（我方爆款参照脚本）
  const parseJianyi15 = (text: string | null | undefined) => {
    if (!text) return { strategyInsight: "", postCopy: "", hashtags: "" };
    
    const parts = {
      strategyInsight: ""
    };
    
    // 提取策略适配洞察 (1. **策略适配洞察:**)
    const insightMatch = text.match(/1\.\s*\*?\*?策略适配洞察.*?[:：]\*?\*?\s*(.*?)$/s);
    if (insightMatch) parts.strategyInsight = insightMatch[1].trim();
    
    return parts;
  };

  // 解析 jianyi2 的各个部分（帖子文案 + 推荐标签）
  const parseJianyi2 = (text: string | null | undefined) => {
    if (!text) return { postCopy: "", hashtags: "" };
    
    const parts = {
      postCopy: "",
      hashtags: ""
    };
    
    // 提取帖子文案 (2. **帖子文案 (Post Copy):**) 或直接从开头提取
    const copyMatch = text.match(/(?:2\.\s*\*?\*?帖子文案.*?[:：]\*?\*?\s*)?(.*?)(?=\n\s*\*?推荐标签|$)/s);
    if (copyMatch) parts.postCopy = copyMatch[1].trim();
    
    // 提取推荐标签
    const hashtagMatch = text.match(/\*?推荐标签.*?[:：]\*?\s*(.*?)$/s);
    if (hashtagMatch) parts.hashtags = hashtagMatch[1].trim();
    
    return parts;
  };

  // 解析 jianyi3 的各个部分（Video类型）
  const parseJianyi3 = (text: string | null | undefined) => {
    if (!text) return { captionAnalysis: "", hashtagAnalysis: "", videoAnalysis: "" };
    
    const parts = {
      captionAnalysis: "",
      hashtagAnalysis: "",
      videoAnalysis: ""
    };
    
    // 提取【一、 帖子文案分析 (Caption Analysis)】
    const captionMatch = text.match(/\*?\*?【一、.*?帖子文案分析.*?】\*?\*?\s*(.*?)(?=\n\s*\*?\*?【二、|$)/s);
    if (captionMatch) parts.captionAnalysis = captionMatch[1].trim();
    
    // 提取【二、 标签分析 (Hashtag Analysis)】
    const hashtagMatch = text.match(/\*?\*?【二、.*?标签分析.*?】\*?\*?\s*(.*?)(?=\n\s*\*?\*?【三、|$)/s);
    if (hashtagMatch) parts.hashtagAnalysis = hashtagMatch[1].trim();
    
    // 提取【三、 视频内容分析 (Video Content Analysis)】
    const videoMatch = text.match(/\*?\*?【三、.*?视频内容分析.*?】\*?\*?\s*(.*?)$/s);
    if (videoMatch) parts.videoAnalysis = videoMatch[1].trim();
    
    return parts;
  };

  // 清理文本中的 Markdown 标记
  const cleanMarkdown = (text: string | null | undefined): string => {
    if (!text) return "";
    return text
      .replace(/\*\*/g, '')  // 移除加粗标记
      .replace(/\*/g, '')    // 移除斜体标记
      .replace(/^#+\s*/gm, '')  // 移除标题标记
      .trim();
  };

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast({
        title: "未登录",
        description: "请先登录后查看爆款脚本",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.popularScripts(parseInt(userId))));
      const data = await response.json();
      
      if (response.ok) {
        setScripts(data);
      } else {
        throw new Error("加载失败");
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载爆款脚本列表",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const allTags = Array.from(new Set(scripts.flatMap((s) => s.tags)));

  const filteredScripts = scripts
    .filter((script) => {
      if (contentType !== "all" && script.contentType !== contentType) return false;
      if (selectedTag && !script.tags.includes(selectedTag)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.date).getTime() - new Date(a.date).getTime();
      return 0;
    });

  const handleAddSuccessFactor = async () => {
    if (selectedScript && newSuccessFactor.trim()) {
      // 添加到本地状态
      const updatedFactors = [...selectedScript.successFactors, newSuccessFactor.trim()];
      selectedScript.successFactors = updatedFactors;
      
      // 保存到后端
      try {
        const userId = localStorage.getItem("userId");
        const response = await fetch(getApiUrl(API_ENDPOINTS.popularScriptUpdate(selectedScript.id)), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: parseInt(userId!),
            success: updatedFactors.join("、")  // 用顿号分隔
          }),
        });

        if (response.ok) {
          toast({
            title: "保存成功",
            description: "成功归因已更新",
          });
          setNewSuccessFactor("");
          // 重新加载数据
          loadScripts();
        } else {
          throw new Error("保存失败");
        }
      } catch (error) {
        toast({
          title: "保存失败",
          description: "无法保存成功归因",
          variant: "destructive",
        });
      }
    }
  };

  // 处理删除脚本
  const handleDeleteScript = async () => {
    if (!scriptToDelete) return;

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast({
        title: "未登录",
        description: "请先登录",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.popularScriptDelete(parseInt(userId), scriptToDelete.post_id)), {
        method: "DELETE",
      });

      if (response.ok) {
        // 从列表中移除
        setScripts(prev => prev.filter(s => s.id !== scriptToDelete.id));
        
        // 如果当前打开的是被删除的脚本，关闭侧边栏
        if (selectedScript?.id === scriptToDelete.id) {
          setSelectedScript(null);
        }

        toast({
          title: "删除成功",
          description: "爆款脚本已删除",
        });
      } else {
        throw new Error("删除失败");
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "无法删除爆款脚本，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setScriptToDelete(null);
    }
  };

  const handleGenerateScript = async () => {
    if (!selectedScript) return;

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast({
        title: "未登录",
        description: "请先登录",
        variant: "destructive",
      });
      return;
    }

    try {
      let response;
      
      // 根据内容类型调用不同的接口
      if (selectedScript.contentType === "video") {
        // 视频类型：调用视频分析接口
        response = await fetch(getApiUrl(API_ENDPOINTS.videoAnalysisStart), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: parseInt(userId),
            post_id: selectedScript.post_id,
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // 视频类型：跳转到脚本生成页面，并传递 jianyi3 数据
          toast({
            title: "数据已准备",
            description: "正在跳转到脚本生成页面...",
          });
          
          navigate("/script-generation", {
            state: {
              jianyi3: selectedScript.jianyi3,
              post_id: selectedScript.post_id,
              isVideoAnalysis: true
            }
          });
        } else {
          throw new Error("启动视频分析失败");
        }
      } else {
        // 图文类型：调用图文分析接口
        response = await fetch(getApiUrl(API_ENDPOINTS.imageAnalysisStart), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: parseInt(userId),
            post_id: selectedScript.post_id,
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // 图文类型：跳转到图文分析页面
          toast({
            title: "数据已准备",
            description: "正在跳转到图文分析页面...",
          });
          
          navigate(`/image-analysis?post_id=${selectedScript.post_id}`);
        } else {
          throw new Error("启动图文分析失败");
        }
      }
    } catch (error) {
      toast({
        title: "启动失败",
        description: selectedScript.contentType === "video" 
          ? "无法启动视频分析" 
          : "无法启动图文分析",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">爆款脚本</h1>
        <p className="text-muted-foreground mt-1">查看和分析优质脚本，学习爆款创作技巧</p>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* 内容类型筛选 */}
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
                <Video className="mr-2 h-4 w-4" />
                视频
              </Button>
              <Button
                variant={contentType === "image" ? "default" : "outline"}
                size="sm"
                onClick={() => setContentType("image")}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                图文
              </Button>
            </div>

            {/* 时间排序 */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">最新优先</SelectItem>
                <SelectItem value="dateAsc">最早优先</SelectItem>
              </SelectContent>
            </Select>

            {/* 标签筛选 */}
            <Select value={selectedTag || "all"} onValueChange={(v) => setSelectedTag(v === "all" ? null : v)}>
              <SelectTrigger className="w-[150px]">
                <Tag className="mr-2 h-4 w-4" />
                <SelectValue placeholder="全部标签" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部标签</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 加载状态 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : scripts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">还没有分析过的脚本</p>
            <Button onClick={() => navigate("/trends")}>
              前往趋势洞察分析内容
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* 脚本列表 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScripts.map((script) => (
            <Card key={script.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="relative aspect-[9/16] overflow-hidden bg-muted">
                {script.thumbnail ? (
                  script.contentType === "video" && script.video_url_base64 ? (
                    <video
                      src={`data:video/mp4;base64,${script.video_url_base64}`}
                      className="w-full h-full object-cover"
                      poster={script.display_url_base64 ? `data:image/jpeg;base64,${script.display_url_base64}` : undefined}
                    />
                  ) : (
                    <img
                      src={script.thumbnail.startsWith('data:') ? script.thumbnail : `data:image/jpeg;base64,${script.thumbnail}`}
                      alt={script.title}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <Badge className="absolute top-2 right-2">
                  {script.contentType === "video" ? (
                    <>
                      <Video className="mr-1 h-3 w-3" />
                      视频
                    </>
                  ) : script.images_base64 && script.images_base64.length > 1 ? (
                    <>
                      <ImageIcon className="mr-1 h-3 w-3" />
                      多图
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-1 h-3 w-3" />
                      图文
                    </>
                  )}
                </Badge>
                {/* 删除按钮 */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 left-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setScriptToDelete(script);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold line-clamp-2">{script.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{script.description}</p>
                <div className="flex flex-wrap gap-2">
                  {script.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {script.successFactors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {script.successFactors.map((factor, idx) => (
                      <Badge key={idx} className="text-xs bg-success/10 text-success border-success/20">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                )}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setSelectedScript(script)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  查看分析
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    

      {/* 脚本详情侧边栏 */}
      <Sheet open={!!selectedScript} onOpenChange={() => {
        setSelectedScript(null);
        setCurrentImageIndex(0);
      }}>
        <SheetContent className="w-full sm:max-w-[50vw] overflow-y-auto">
          {selectedScript && (() => {
            const jianyi1Parts = parseJianyi1(selectedScript.jianyi1);  // 竞品策略分析（4个部分）
            const jianyi15Parts = parseJianyi15(selectedScript.jianyi1_5);  // 我方爆款脚本（策略适配洞察）
            const jianyi2Parts = parseJianyi2(selectedScript.jianyi2);  // 帖子文案 + 推荐标签
            const jianyi3Parts = parseJianyi3(selectedScript.jianyi3);  // Video 分析
            const isMultiImage = selectedScript.images_base64 && selectedScript.images_base64.length > 1;
            
            // 获取当前显示的提示词（优先使用 prompt/prompt_array）
            let currentPrompt: string | null = null;
            if (selectedScript.prompt_array && selectedScript.prompt_array.length > 0) {
              // Sidecar 类型：使用 prompt_array，根据当前图片索引显示
              currentPrompt = selectedScript.prompt_array[Math.min(currentImageIndex, selectedScript.prompt_array.length - 1)] || selectedScript.prompt_array[0];
            } else if (selectedScript.prompt) {
              // Image 类型：使用 prompt
              currentPrompt = selectedScript.prompt;
            }

            return (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedScript.title}</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  {/* 封面预览 - Sidecar类型使用轮播 */}
                  {isMultiImage ? (
                    <div className="max-w-[200px] mx-auto">
                      <Carousel className="w-full" setApi={setCarouselApi}>
                        <CarouselContent>
                          {selectedScript.images_base64!.map((img, index) => (
                            <CarouselItem key={index}>
                              <div className="aspect-[9/16] overflow-hidden rounded-lg bg-muted">
                                <img
                                  src={`data:image/jpeg;base64,${img}`}
                                  alt={`图片 ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious />
                        <CarouselNext />
                      </Carousel>
                      <p className="text-center text-sm text-muted-foreground mt-2">
                        {currentImageIndex + 1} / {selectedScript.images_base64!.length}
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-[200px] mx-auto aspect-[9/16] overflow-hidden rounded-lg bg-muted">
                      {selectedScript.thumbnail ? (
                        selectedScript.contentType === "video" && selectedScript.video_url_base64 ? (
                          <video
                            controls
                            src={`data:video/mp4;base64,${selectedScript.video_url_base64}`}
                            className="w-full h-full object-cover"
                            poster={selectedScript.display_url_base64 ? `data:image/jpeg;base64,${selectedScript.display_url_base64}` : undefined}
                          />
                        ) : (
                          <img
                            src={selectedScript.thumbnail.startsWith('data:') ? selectedScript.thumbnail : `data:image/jpeg;base64,${selectedScript.thumbnail}`}
                            alt={selectedScript.title}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 根据内容类型显示不同的分析内容 */}
                  {selectedScript.contentType === "video" ? (
                    /* Video 类型 - 显示 jianyi3 的三个部分 */
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">视频分析</h3>
                      
                      {/* 一、帖子文案分析 */}
                      {jianyi3Parts.captionAnalysis && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">【一】帖子文案分析</h4>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {cleanMarkdown(jianyi3Parts.captionAnalysis)}
                          </p>
                        </div>
                      )}

                      {/* 二、标签分析 */}
                      {jianyi3Parts.hashtagAnalysis && (
                        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">【二】标签分析</h4>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {cleanMarkdown(jianyi3Parts.hashtagAnalysis)}
                          </p>
                        </div>
                      )}

                      {/* 三、视频内容分析 */}
                      {jianyi3Parts.videoAnalysis && (
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">【三】视频内容分析</h4>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {cleanMarkdown(jianyi3Parts.videoAnalysis)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Image/Sidecar 类型 - 显示 jianyi1, jianyi1.5, jianyi2 */
                    <div className="space-y-4">
                      {/* 图片生成提示词 - 放在最上方 */}
                      {currentPrompt && (
                        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            图片生成提示词
                            {isMultiImage && selectedScript.prompt_array && selectedScript.prompt_array.length > 1 && (
                              <span className="text-sm text-muted-foreground">
                                (第 {currentImageIndex + 1} 张)
                              </span>
                            )}
                          </h4>
                          <p className="text-sm whitespace-pre-wrap">
                            {cleanMarkdown(currentPrompt)}
                          </p>
                          {isMultiImage && selectedScript.prompt_array && selectedScript.prompt_array.length > 1 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              💡 提示：轮播切换图片时，提示词会自动切换
                            </p>
                          )}
                        </div>
                      )}

                      <h3 className="font-semibold text-lg">竞品策略分析</h3>
                      
                      {/* jianyi1 的四个部分 - 竞品策略分析 */}
                      {jianyi1Parts.contentPosition && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">内容定位</h4>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {cleanMarkdown(jianyi1Parts.contentPosition)}
                          </p>
                        </div>
                      )}

                      {jianyi1Parts.visualStrategy && (
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">视觉策略</h4>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {cleanMarkdown(jianyi1Parts.visualStrategy)}
                          </p>
                        </div>
                      )}

                      {jianyi1Parts.copyStrategy && (
                        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">文案策略</h4>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {cleanMarkdown(jianyi1Parts.copyStrategy)}
                          </p>
                        </div>
                      )}

                      {jianyi1Parts.targetAudience && (
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">目标受众</h4>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {cleanMarkdown(jianyi1Parts.targetAudience)}
                          </p>
                        </div>
                      )}

                      <h3 className="font-semibold text-lg mt-6">我方爆款参照脚本</h3>
                      
                      {/* jianyi1.5 - 策略适配洞察 */}
                      {jianyi15Parts.strategyInsight && (
                        <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                          <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">策略适配洞察</h4>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {cleanMarkdown(jianyi15Parts.strategyInsight)}
                          </p>
                        </div>
                      )}

                      {/* jianyi2 - 帖子文案 */}
                      {jianyi2Parts.postCopy && (
                        <div className="bg-pink-50 dark:bg-pink-950/20 rounded-lg p-4 border border-pink-200 dark:border-pink-800">
                          <h4 className="font-semibold text-pink-900 dark:text-pink-100 mb-2">帖子文案</h4>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {cleanMarkdown(jianyi2Parts.postCopy)}
                          </p>
                        </div>
                      )}

                      {/* jianyi2 - 推荐标签 */}
                      {jianyi2Parts.hashtags && (
                        <div className="bg-cyan-50 dark:bg-cyan-950/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800">
                          <h4 className="font-semibold text-cyan-900 dark:text-cyan-100 mb-2">推荐标签</h4>
                          <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {cleanMarkdown(jianyi2Parts.hashtags)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 成功归因标签 */}
                  <div className="space-y-2 mt-6">
                    <h3 className="font-semibold">成功归因标签</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedScript.successFactors.map((factor, idx) => (
                        <Badge key={idx} className="bg-success/10 text-success border-success/20">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="添加成功归因..."
                        value={newSuccessFactor}
                        onChange={(e) => setNewSuccessFactor(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleAddSuccessFactor()}
                      />
                      <Button onClick={handleAddSuccessFactor}>添加</Button>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline" onClick={handleGenerateScript}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      生成爆款脚本
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon"
                      onClick={() => setScriptToDelete(selectedScript)}
                      title="删除脚本"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!scriptToDelete} onOpenChange={(open) => !open && setScriptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除爆款脚本 <span className="font-semibold">"{scriptToDelete?.title}"</span> 吗？
              <br />
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScript}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  确认删除
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PopularScripts;
