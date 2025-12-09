import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Image as ImageIcon, 
  Wand2, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Loader2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { getApiUrl, API_ENDPOINTS } from "@/config/api";

interface AnalysisData {
  id: number;
  user_id: number;
  post_id: string;
  display_url_base64: string | null;
  images_base64: string[] | null;
  jianyi2: string | null;
  post_type: string;
  prompt: string | null;
  prompt_array: string[] | null;
  new_display_url_base64: string | null;
  new_images_base64: string[] | null;
  created_at: string;
  updated_at: string;
}

const ImageAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [imageMode, setImageMode] = useState<"original" | "generated">("original");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const pendingScrollIndex = useRef<number | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  
  const userId = localStorage.getItem("userId");
  const searchParams = new URLSearchParams(location.search);
  const postId = searchParams.get("post_id");
  const mode = searchParams.get("mode"); // "create" 或 null
  const isCreateMode = mode === "create";

  useEffect(() => {
    if (!userId) {
      toast({
        title: "未登录",
        description: "请先登录",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!postId) {
      // 没有 post_id：禁止直接访问，跳转到我的项目
      toast({
        title: "无法直接访问",
        description: "请从「我的项目」新建图文项目或从「爆款脚本」进入",
        variant: "destructive",
      });
      navigate("/projects");
      return;
    }

    fetchAnalysisData();
    // 不再需要轮询，因为数据已经从 popular 表直接继承
  }, [postId, userId]);

  // 创建模式：默认显示生成区域
  useEffect(() => {
    if (isCreateMode && data) {
      setImageMode("generated");
    }
  }, [isCreateMode, data]);

  // Monitor carousel slide changes
  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const onSelect = () => {
      const index = carouselApi.selectedScrollSnap();
      setCurrentImageIndex(index);
    };

    carouselApi.on("select", onSelect);
    onSelect(); // Set initial index

    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  // Handle pending scroll after data load
  useEffect(() => {
    if (carouselApi && pendingScrollIndex.current !== null) {
      const targetIndex = pendingScrollIndex.current;
      console.log(`Executing pending scroll to index: ${targetIndex}`);
      
      // Wait for next tick to ensure DOM is updated
      setTimeout(() => {
        carouselApi.scrollTo(targetIndex);
        pendingScrollIndex.current = null;
      }, 200);
    }
  }, [data, carouselApi]);

  const fetchAnalysisData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await fetch(
        getApiUrl(API_ENDPOINTS.imageAnalysisData(parseInt(userId), postId))
      );

      if (response.ok) {
        const result = await response.json();
        setData(result);
        
        // 数据已经从 popular 表继承，包含 prompt 和 prompt_array
        // 无需等待生成或轮询
      } else {
        throw new Error("加载失败");
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: "无法加载分析数据",
        variant: "destructive",
      });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleUpdatePrompt = async (field: "prompt" | "jianyi2", value: string) => {
    if (!data) return;

    try {
      await fetch(getApiUrl(API_ENDPOINTS.imageAnalysisUpdatePrompt), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: parseInt(userId!),
          post_id: postId,
          [field]: value,
        }),
      });
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const handleUpdatePromptArray = async (index: number, value: string) => {
    if (!data || !data.prompt_array) return;

    const newArray = [...data.prompt_array];
    newArray[index] = value;

    try {
      await fetch(getApiUrl(API_ENDPOINTS.imageAnalysisUpdatePrompt), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: parseInt(userId!),
          post_id: postId,
          prompt_array: newArray,
        }),
      });
      
      setData({ ...data, prompt_array: newArray });
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const handleGenerateImage = async (imageIndex?: number) => {
    if (!data) return;

    try {
      setGenerating(true);
      const response = await fetch(getApiUrl(API_ENDPOINTS.imageAnalysisGenerateImages), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: parseInt(userId!),
          post_id: postId,
          image_index: imageIndex,
          aspect_ratio: aspectRatio,
        }),
      });

      if (response.ok) {
        toast({
          title: "生成成功",
          description: "图片已生成",
        });
        
        // Sidecar 类型：设置待跳转的索引
        if (imageIndex !== undefined && imageIndex !== null && data.post_type === "Sidecar") {
          pendingScrollIndex.current = imageIndex;
          console.log(`Setting pending scroll to index: ${imageIndex}`);
        }
        
        // 先切换到生成模式
        setImageMode("generated");
        
        // 静默刷新数据（不显示 loading，避免重新渲染）
        await fetchAnalysisData(true);
      } else {
        throw new Error("生成失败");
      }
    } catch (error) {
      toast({
        title: "生成失败",
        description: "图片生成出错，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadImage = (base64Data: string, filename: string) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64Data}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-96 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!postId || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            图文分析
          </h2>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">暂无数据，请从爆款脚本页面选择项目进入</p>
            <Button onClick={() => navigate("/popular-scripts")}>
              前往爆款脚本
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          {isCreateMode ? "创建图文" : "图文分析"}
        </h2>
        <Badge>{data.post_type === "Image" ? "图文" : "多图"}</Badge>
      </div>

      <Tabs defaultValue={data.post_type === "Image" ? "single" : "multi"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">图文</TabsTrigger>
          <TabsTrigger value="multi">多图</TabsTrigger>
        </TabsList>

        {/* 图文标签 */}
        <TabsContent value="single" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* 左侧：图片显示 */}
            <Card className="h-[70vh] flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-base font-medium">图片</span>
                  <div className="ml-auto flex items-center gap-2">
                    {!isCreateMode && (
                    <Button
                      size="sm"
                      variant={imageMode === "original" ? "default" : "outline"}
                      onClick={() => setImageMode("original")}
                    >
                      原图
                    </Button>
                    )}
                    <Button
                      size="sm"
                      variant={imageMode === "generated" ? "default" : "outline"}
                      onClick={() => setImageMode("generated")}
                      disabled={!data.new_display_url_base64}
                    >
                      {isCreateMode ? "生成图片" : "新图"}
                    </Button>
                    {/* 下载按钮 - 原图和新图都支持下载 */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (imageMode === "original" && data.display_url_base64) {
                          handleDownloadImage(data.display_url_base64, `original_${postId}.png`);
                        } else if (imageMode === "generated" && data.new_display_url_base64) {
                          handleDownloadImage(data.new_display_url_base64, `generated_${postId}.png`);
                        }
                      }}
                      disabled={
                        (imageMode === "original" && !data.display_url_base64) ||
                        (imageMode === "generated" && !data.new_display_url_base64)
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="w-full h-full">
                  {imageMode === "original" && data.display_url_base64 && !isCreateMode ? (
                    <img
                      src={`data:image/jpeg;base64,${data.display_url_base64}`}
                      alt="原图"
                      className="w-full h-full object-contain"
                    />
                  ) : imageMode === "generated" && data.new_display_url_base64 ? (
                    <img
                      src={`data:image/png;base64,${data.new_display_url_base64}`}
                      alt="生成图"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      {isCreateMode ? "填写提示词后点击生成图片" : "暂无图片"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 右侧：提示词与脚本 */}
            <Card className="h-[70vh] flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="text-base font-medium">提示词与推荐脚本</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-full flex flex-col">
                  <div className="px-4 pt-4 flex-1 flex flex-col gap-4 overflow-y-auto">
                    {/* 提示词 */}
                    <div className="flex-none flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">提示词</span>
                      </div>
                      <Textarea
                        value={data.prompt || ""}
                        onChange={(e) => {
                          setData({ ...data, prompt: e.target.value });
                          handleUpdatePrompt("prompt", e.target.value);
                        }}
                        placeholder={isCreateMode ? "请输入图片生成提示词..." : "提示词已从分析结果继承..."}
                        className="min-h-[120px] resize-none"
                      />
                    </div>

                    {/* 推荐脚本 */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">推荐脚本</span>
                      </div>
                      <Textarea
                        value={data.jianyi2 || ""}
                        onChange={(e) => {
                          setData({ ...data, jianyi2: e.target.value });
                          handleUpdatePrompt("jianyi2", e.target.value);
                        }}
                        placeholder="在此编辑推荐脚本..."
                        className="flex-1 min-h-0 resize-none"
                      />
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="px-4 pb-4 mt-auto space-y-2">
                    {/* 图片比例选择 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium whitespace-nowrap">图片比例:</span>
                      <Select value={aspectRatio} onValueChange={setAspectRatio}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1:1">1:1 (正方形)</SelectItem>
                          <SelectItem value="9:16">9:16 (竖屏)</SelectItem>
                          <SelectItem value="16:9">16:9 (横屏)</SelectItem>
                          <SelectItem value="3:4">3:4 (竖向)</SelectItem>
                          <SelectItem value="4:3">4:3 (横向)</SelectItem>
                          <SelectItem value="3:2">3:2 (横向)</SelectItem>
                          <SelectItem value="2:3">2:3 (竖向)</SelectItem>
                          <SelectItem value="5:4">5:4 (横向)</SelectItem>
                          <SelectItem value="4:5">4:5 (竖向)</SelectItem>
                          <SelectItem value="21:9">21:9 (超宽屏)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => handleGenerateImage()}
                      disabled={generating || !data.prompt}
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      按照提示词生成图片
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 多图标签 */}
        <TabsContent value="multi" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* 左侧：图片轮播 */}
            <Card className="h-[70vh] flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-base font-medium">
                    图片 {currentImageIndex + 1}/{data.images_base64?.length || 0}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {!isCreateMode && (
                    <Button
                      size="sm"
                      variant={imageMode === "original" ? "default" : "outline"}
                      onClick={() => setImageMode("original")}
                    >
                      原图
                    </Button>
                    )}
                    <Button
                      size="sm"
                      variant={imageMode === "generated" ? "default" : "outline"}
                      onClick={() => setImageMode("generated")}
                      disabled={!data.new_images_base64?.[currentImageIndex]}
                    >
                      {isCreateMode ? "生成图片" : "新图"}
                    </Button>
                    {/* 下载按钮 - 原图和新图都支持下载 */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (imageMode === "original") {
                          // 下载原图
                          const imageData = data.images_base64?.[currentImageIndex];
                          if (imageData) {
                            handleDownloadImage(imageData, `original_${postId}_${currentImageIndex}.png`);
                          }
                        } else if (imageMode === "generated") {
                          // 下载新图
                          const imageData = data.new_images_base64?.[currentImageIndex];
                          if (imageData) {
                            handleDownloadImage(imageData, `generated_${postId}_${currentImageIndex}.png`);
                          }
                        }
                      }}
                      disabled={
                        (imageMode === "original" && !data.images_base64?.[currentImageIndex]) ||
                        (imageMode === "generated" && !data.new_images_base64?.[currentImageIndex])
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-4">
                <Carousel className="w-full h-full" setApi={setCarouselApi}>
                  <CarouselContent>
                    {/* Images from images_base64 (Sidecar 类型直接从这里开始) */}
                    {isCreateMode && (!data.images_base64 || data.images_base64.length === 0) ? (
                      // 创建模式：显示 3 个占位符
                      [0, 1, 2].map((idx) => (
                        <CarouselItem key={idx}>
                          <div className="w-full h-[calc(70vh-120px)] flex items-center justify-center">
                            {data.new_images_base64?.[idx] ? (
                              <img
                                src={`data:image/png;base64,${data.new_images_base64[idx]}`}
                                alt={`生成图片 ${idx + 1}`}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <div className="text-muted-foreground">
                                填写提示词 {idx + 1} 后点击生成
                              </div>
                            )}
                          </div>
                        </CarouselItem>
                      ))
                    ) : (
                      data.images_base64?.map((img, idx) => (
                      <CarouselItem key={idx}>
                        <div className="w-full h-[calc(70vh-120px)] flex items-center justify-center">
                            {imageMode === "original" && !isCreateMode ? (
                            <img
                              src={`data:image/jpeg;base64,${img}`}
                              alt={`图片 ${idx + 1}`}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : imageMode === "generated" && data.new_images_base64?.[idx] ? (
                            <img
                              src={`data:image/png;base64,${data.new_images_base64[idx]}`}
                              alt={`生成图片 ${idx + 1}`}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                              <div className="text-muted-foreground">
                                {isCreateMode ? "填写提示词后点击生成" : "暂无新图"}
                              </div>
                          )}
                        </div>
                      </CarouselItem>
                      ))
                    )}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </CardContent>
            </Card>

            {/* 右侧：提示词与脚本 */}
            <Card className="h-[70vh] flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="text-base font-medium">提示词与推荐脚本</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-full flex flex-col">
                  <div className="px-4 pt-4 flex-1 flex flex-col gap-4 overflow-y-auto">
                    {/* 提示词 - 根据当前图片索引显示 (Sidecar 类型直接使用 prompt_array) */}
                    <div className="flex-none flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          提示词 ({currentImageIndex + 1})
                        </span>
                      </div>
                      <Textarea
                        value={data.prompt_array?.[currentImageIndex] || ""}
                        onChange={(e) => {
                          handleUpdatePromptArray(currentImageIndex, e.target.value);
                        }}
                        placeholder={isCreateMode ? "请输入图片生成提示词..." : "提示词已从分析结果继承..."}
                        className="min-h-[120px] resize-none"
                      />
                    </div>

                    {/* 推荐脚本 */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">推荐脚本</span>
                      </div>
                      <Textarea
                        value={data.jianyi2 || ""}
                        onChange={(e) => {
                          setData({ ...data, jianyi2: e.target.value });
                          handleUpdatePrompt("jianyi2", e.target.value);
                        }}
                        placeholder="在此编辑推荐脚本..."
                        className="flex-1 min-h-0 resize-none"
                      />
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="px-4 pb-4 mt-auto space-y-2">
                    {/* 图片比例选择 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium whitespace-nowrap">图片比例:</span>
                      <Select value={aspectRatio} onValueChange={setAspectRatio}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1:1">1:1 (正方形)</SelectItem>
                          <SelectItem value="9:16">9:16 (竖屏)</SelectItem>
                          <SelectItem value="16:9">16:9 (横屏)</SelectItem>
                          <SelectItem value="3:4">3:4 (竖向)</SelectItem>
                          <SelectItem value="4:3">4:3 (横向)</SelectItem>
                          <SelectItem value="3:2">3:2 (横向)</SelectItem>
                          <SelectItem value="2:3">2:3 (竖向)</SelectItem>
                          <SelectItem value="5:4">5:4 (横向)</SelectItem>
                          <SelectItem value="4:5">4:5 (竖向)</SelectItem>
                          <SelectItem value="21:9">21:9 (超宽屏)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => handleGenerateImage(currentImageIndex)}
                      disabled={
                        generating || !data.prompt_array?.[currentImageIndex]
                      }
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      按照提示词生成图片
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImageAnalysis;

