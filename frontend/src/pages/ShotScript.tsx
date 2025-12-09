import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, Video, Play, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, API_ENDPOINTS } from "@/config/api";

const ShotScript = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [postId, setPostId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  
  // 检测创建模式
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get("mode");
  const isCreateMode = mode === "create";
  
  // 解析后的字段
  const [videoTitle, setVideoTitle] = useState("");
  const [contentSummary, setContentSummary] = useState("");
  const [shotScript, setShotScript] = useState("");
  const [instagramCaption, setInstagramCaption] = useState("");
  const [alternatives, setAlternatives] = useState("");
  
  // 视频生成相关
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoBase64, setVideoBase64] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [duration, setDuration] = useState<10 | 15>(15);
  
  // 视频懒加载状态
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // 防抖定时器
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 解析 jianyi4 内容
  const parseJianyi4 = (jianyi4: string) => {
    if (!jianyi4) {
      console.warn("⚠️ jianyi4 为空，无法解析");
      return;
    }

    console.log("📝 开始解析 jianyi4:", jianyi4.substring(0, 200) + "...");

    try {
      // 提取视频主题
      const titleMatch = jianyi4.match(/\*\*1\.\s*视频主题[:：]\*\*\s*\n+\*\s*(.*?)(?=\n+\*\*2\.|$)/s);
      if (titleMatch) {
        console.log("✅ 解析到视频主题:", titleMatch[1].trim());
        setVideoTitle(titleMatch[1].trim());
      } else {
        console.warn("⚠️ 未找到视频主题");
      }

      // 提取内容梗概
      const summaryMatch = jianyi4.match(/\*\*2\.\s*内容梗概[:：]\*\*\s*\n+\*\s*(.*?)(?=\n+\*\*3\.|$)/s);
      if (summaryMatch) {
        console.log("✅ 解析到内容梗概");
        setContentSummary(summaryMatch[1].trim());
      } else {
        console.warn("⚠️ 未找到内容梗概");
      }

      // 提取分镜头脚本 (包含所有场景内容)
      // 匹配从 **3. 分镜头脚本** 开始，到 **4.** 之前的所有内容
      const scriptMatch = jianyi4.match(/\*\*3\.\s*分镜头脚本[^*]*?\*\*\s*\n+(.*?)(?=\n+\*\*4\.)/s);
      if (scriptMatch) {
        console.log("✅ 解析到分镜头脚本 (方式1)");
        setShotScript(scriptMatch[1].trim());
      } else {
        // 尝试备用匹配方式
        const scriptMatch2 = jianyi4.match(/\*\*3\.\s*分镜头脚本.*?\*\*\s*\n+([\s\S]*?)(?=\*\*4\.)/);
        if (scriptMatch2) {
          console.log("✅ 解析到分镜头脚本 (方式2)");
          setShotScript(scriptMatch2[1].trim());
        } else {
          console.warn("⚠️ 未找到分镜头脚本");
        }
      }

      // 提取 Instagram 帖子文案 (包含文案和标签)
      const captionMatch = jianyi4.match(/\*\*4\.\s*Instagram\s*帖子文案[:：]\*\*\s*\n+(.*?)(?=\n+---\n+\*\*【备选方案】|$)/s);
      if (captionMatch) {
        console.log("✅ 解析到 Instagram 文案");
        setInstagramCaption(captionMatch[1].trim());
      } else {
        console.warn("⚠️ 未找到 Instagram 文案");
      }

      // 提取备选方案 (从 **【备选方案】** 开始到结尾)
      const alternativesMatch = jianyi4.match(/\*\*【备选方案】\*\*\s*\n+(.*?)$/s);
      if (alternativesMatch) {
        console.log("✅ 解析到备选方案");
        setAlternatives(alternativesMatch[1].trim());
      } else {
        console.warn("⚠️ 未找到备选方案");
      }
      
      console.log("✅ jianyi4 解析完成");
    } catch (error) {
      console.error("❌ 解析 jianyi4 失败:", error);
      toast({
        title: "解析失败",
        description: "无法解析分镜头脚本内容",
        variant: "destructive",
      });
    }
  };

  // 加载数据
  const loadData = async () => {
    try {
      const response = await fetch(
        getApiUrl(API_ENDPOINTS.videoAnalysisData(parseInt(userId), postId))
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.jianyi4) {
          parseJianyi4(data.jianyi4);
        }
        // 加载已生成的视频
        if (data.new_video_url_base64) {
          setVideoBase64(data.new_video_url_base64);
        }
      }
    } catch (error) {
      console.error("加载数据失败:", error);
      toast({
        title: "加载失败",
        description: "无法加载分镜头脚本数据",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 下载视频
  const handleDownloadVideo = () => {
    if (!videoBase64) return;

    try {
      // 创建 Blob
      const byteCharacters = atob(videoBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'video/mp4' });

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video_${postId}_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "下载成功",
        description: "视频已保存到本地",
      });
    } catch (error) {
      console.error("下载失败:", error);
      toast({
        title: "下载失败",
        description: "无法下载视频，请重试",
        variant: "destructive",
      });
    }
  };

  // 生成视频
  const handleGenerateVideo = async () => {
    if (!userId || !postId) {
      toast({
        title: "缺少参数",
        description: "用户ID或帖子ID缺失",
        variant: "destructive",
      });
      return;
    }

    setGeneratingVideo(true);
    
    toast({
      title: "开始生成视频",
      description: "使用Sora2生成视频，预计需要4-5分钟，请耐心等待...",
    });

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.videoAnalysisGenerateVideo), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: parseInt(userId),
          post_id: postId,
          aspect_ratio: aspectRatio,
          duration: duration,
          size: "large"
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // 更新视频
        setVideoBase64(result.video_base64);
        
        const minutes = Math.floor(result.elapsed_time / 60);
        const seconds = result.elapsed_time % 60;
        
        toast({
          title: "视频生成成功！",
          description: `耗时 ${minutes}分${seconds}秒，视频已保存并显示在下方`,
        });
        
        // 刷新数据以确保显示最新的视频
        await loadData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "生成失败");
      }
    } catch (error: any) {
      console.error("生成视频失败:", error);
      toast({
        title: "生成失败",
        description: error.message || "视频生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setGeneratingVideo(false);
    }
  };

  // 实时保存函数（防抖）
  const handleAutoSave = () => {
    if (!userId || !postId) return;
    
    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    // 设置新的定时器（1000ms 后保存）
    saveTimerRef.current = setTimeout(async () => {
      try {
        // 重新组装 jianyi4
        const newJianyi4 = assembleJianyi4();
        
        const response = await fetch(getApiUrl(API_ENDPOINTS.videoAnalysisUpdateJianyi4), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: parseInt(userId),
            post_id: postId,
            jianyi4: newJianyi4,
          }),
        });
        
        if (response.ok) {
          console.log("✅ Auto-saved jianyi4");
          toast({
            title: "已保存",
            description: "分镜头脚本已自动保存",
          });
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 1000);
  };

  // 组装 jianyi4
  const assembleJianyi4 = (): string => {
    let result = `---

**【全新病毒式视频内容包】**

**1. 视频主题:**

*   ${videoTitle}

**2. 内容梗概:**

*   ${contentSummary}

**3. 分镜头脚本 (Shot-by-Shot):**

${shotScript}

**4. Instagram 帖子文案:**

${instagramCaption}

---`;

    if (alternatives) {
      result += `

**【备选方案】**

${alternatives}`;
    }

    return result;
  };

  useEffect(() => {
    const userIdFromStorage = localStorage.getItem("userId");
    if (!userIdFromStorage) {
      toast({
        title: "未登录",
        description: "请先登录",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setUserId(userIdFromStorage);

    // 从导航状态或 URL 参数获取 post_id（优先 URL 参数，适配"继续编辑"场景）
    const searchParams = new URLSearchParams(location.search);
    const postIdFromQuery = searchParams.get("post_id");
    const postIdFromState = location.state?.post_id;
    
    const finalPostId = postIdFromQuery || postIdFromState;
    
    if (finalPostId) {
      setPostId(finalPostId);
      
      // 如果不是创建模式，直接加载数据（使用局部变量，不依赖状态）
      if (!isCreateMode) {
        const loadDataWithParams = async () => {
          try {
            const response = await fetch(
              getApiUrl(API_ENDPOINTS.videoAnalysisData(parseInt(userIdFromStorage), finalPostId))
            );
            
            if (response.ok) {
              const data = await response.json();
              console.log("✅ 加载到的数据:", data);
              
              if (data.jianyi4) {
                parseJianyi4(data.jianyi4);
              }
              // 加载已生成的视频
              if (data.new_video_url_base64) {
                setVideoBase64(data.new_video_url_base64);
              }
            } else {
              console.error("❌ API 返回错误:", response.status);
            }
          } catch (error) {
            console.error("❌ 加载数据失败:", error);
            toast({
              title: "加载失败",
              description: "无法加载分镜头脚本数据",
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        };
        
        loadDataWithParams();
      } else {
        // 创建模式：初始化空白数据
        setLoading(false);
      }
    } else {
      toast({
        title: "缺少参数",
        description: "未找到帖子ID",
        variant: "destructive",
      });
      navigate(-1);
    }
  }, [location, isCreateMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isCreateMode ? "创建分镜头脚本" : "分镜头脚本"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isCreateMode ? "填写脚本内容并生成视频" : "编辑和完善您的视频脚本"}
          </p>
        </div>
      </div>

      {/* 视频主题 */}
      <Card>
        <CardHeader>
          <CardTitle>1. 视频主题</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={videoTitle}
            onChange={(e) => {
              setVideoTitle(e.target.value);
              handleAutoSave();
            }}
            placeholder={isCreateMode ? "请输入视频主题..." : "输入视频主题..."}
            className="text-lg"
          />
        </CardContent>
      </Card>

      {/* 内容梗概 */}
      <Card>
        <CardHeader>
          <CardTitle>2. 内容梗概</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={contentSummary}
            onChange={(e) => {
              setContentSummary(e.target.value);
              handleAutoSave();
            }}
            placeholder={isCreateMode ? "请用一句话总结脚本核心亮点..." : "用一句话总结脚本核心亮点..."}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* 分镜头脚本 */}
      <Card>
        <CardHeader>
          <CardTitle>3. 分镜头脚本 (Shot-by-Shot)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={shotScript}
            onChange={(e) => {
              setShotScript(e.target.value);
              handleAutoSave();
            }}
            placeholder={isCreateMode ? "请输入详细的分镜头描述..." : "详细的分镜头描述..."}
            rows={20}
            className="font-mono"
          />
        </CardContent>
      </Card>

      {/* 备选方案 */}
      <Card>
        <CardHeader>
          <CardTitle>【备选方案】</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={alternatives}
            onChange={(e) => {
              setAlternatives(e.target.value);
              handleAutoSave();
            }}
            placeholder="备选方案和创意..."
            rows={8}
          />
        </CardContent>
      </Card>

      {/* 视频生成配置与按钮 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            生成视频
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 视频比例选择 */}
          <div className="space-y-2">
            <Label>视频比例</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={aspectRatio === "9:16" ? "default" : "outline"}
                onClick={() => setAspectRatio("9:16")}
                disabled={generatingVideo}
                className="flex-1"
              >
                9:16
              </Button>
              <Button
                type="button"
                variant={aspectRatio === "16:9" ? "default" : "outline"}
                onClick={() => setAspectRatio("16:9")}
                disabled={generatingVideo}
                className="flex-1"
              >
                16:9
              </Button>
            </div>
          </div>

          {/* 视频时长选择 */}
          <div className="space-y-2">
            <Label>视频时长</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={duration === 10 ? "default" : "outline"}
                onClick={() => setDuration(10)}
                disabled={generatingVideo}
                className="flex-1"
              >
                10s
              </Button>
              <Button
                type="button"
                variant={duration === 15 ? "default" : "outline"}
                onClick={() => setDuration(15)}
                disabled={generatingVideo}
                className="flex-1"
              >
                15s
              </Button>
            </div>
          </div>

          {/* 生成/重新生成按钮 */}
          <div className="flex gap-2">
            <Button
              size="lg"
              onClick={handleGenerateVideo}
              disabled={generatingVideo}
              className="flex-1"
            >
              {generatingVideo ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  生成中（4-5分钟）...
                </>
              ) : videoBase64 ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  重新生成视频
                </>
              ) : (
                <>
                  <Video className="mr-2 h-5 w-5" />
                  开始生成视频
                </>
              )}
            </Button>
            
            {videoBase64 && !generatingVideo && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleDownloadVideo}
              >
                <Download className="mr-2 h-5 w-5" />
                下载视频
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 视频和帖子文案 - 并列显示 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 视频播放器 */}
        {videoBase64 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                生成的视频
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                {isVideoPlaying ? (
                <video
                  controls
                    autoPlay
                  className="w-full rounded-lg shadow-lg"
                  style={{ aspectRatio: aspectRatio === "9:16" ? "9/16" : "16/9" }}
                >
                  <source
                    src={`data:video/mp4;base64,${videoBase64}`}
                    type="video/mp4"
                  />
                  您的浏览器不支持视频播放
                </video>
                ) : (
                  <div 
                    className="relative cursor-pointer group w-full"
                    onClick={() => setIsVideoPlaying(true)}
                    style={{ aspectRatio: aspectRatio === "9:16" ? "9/16" : "16/9" }}
                  >
                    <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                      <Video className="w-16 h-16 text-muted-foreground" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg group-hover:bg-black/40 transition-colors">
                      <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-primary border-b-[15px] border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instagram 帖子文案 */}
        <Card>
          <CardHeader>
            <CardTitle>4. Instagram 帖子文案</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={instagramCaption}
              onChange={(e) => {
                setInstagramCaption(e.target.value);
                handleAutoSave();
              }}
              placeholder="Instagram 帖子文案和标签..."
              rows={20}
              className="h-full"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShotScript;

