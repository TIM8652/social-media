import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, RefreshCw, Wand2, ArrowRight, Check } from "lucide-react";
import { getApiUrl, API_ENDPOINTS } from "@/config/api";
import { useToast } from "@/hooks/use-toast";

type ShotScript = {
  shotNumber: string;
  sceneDescription: string;
  staticPrompt: string;
  dynamicPrompt: string;
  characterDescription?: string;
};

const ScriptGeneration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<"content" | "shot">("content");
  const [loading, setLoading] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");
  const [shotScripts, setShotScripts] = useState<ShotScript[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [referenceScript, setReferenceScript] = useState("");
  const [characterDescription, setCharacterDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [isVideoAnalysis, setIsVideoAnalysis] = useState(false);
  const [postId, setPostId] = useState<string>("");
  
  // 检测创建模式
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get("mode");
  const isCreateMode = mode === "create";
  
  // 表单字段状态
  const [scriptTopic, setScriptTopic] = useState("");
  const [contentStyle, setContentStyle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  
  // 防抖定时器
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟项目列表数据
  const existingProjects = [
    { id: "1", name: "教小朋友认识水果" },
    { id: "2", name: "学习英语字母歌" },
    { id: "3", name: "情绪管理小故事" },
    { id: "4", name: "认识动物朋友们" },
  ];

  // 实时保存函数（防抖）
  const handleAutoSave = (field: string, value: string) => {
    // 创建模式或分析模式都需要保存
    if ((!isVideoAnalysis && !isCreateMode) || !postId) return;
    
    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    // 设置新的定时器（500ms 后保存）
    saveTimerRef.current = setTimeout(async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;
        
        const payload: any = {
          user_id: parseInt(userId),
          post_id: postId,
        };
        
        // 根据字段类型设置对应的值
        if (field === "script_topic") payload.script_topic = value;
        else if (field === "content_style") payload.content_style = value;
        else if (field === "keywords") payload.keywords = value;
        else if (field === "special_requirements") payload.special_requirements = value;
        else if (field === "jianyi3") payload.jianyi3 = value;
        
        const response = await fetch(getApiUrl(API_ENDPOINTS.videoAnalysisUpdatePrompt), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (response.ok) {
          console.log(`✅ Auto-saved ${field}`);
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 500);
  };

  // 加载数据
  const loadVideoAnalysisData = async (userId: string, postId: string) => {
    // 验证参数
    if (!userId || !postId) {
      console.error("❌ userId or postId is empty, skipping API call");
      return;
    }
    
    try {
      const response = await fetch(
        getApiUrl(API_ENDPOINTS.videoAnalysisData(parseInt(userId), postId))
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // 设置 jianyi3
        if (data.jianyi3) {
          setGeneratedScript(data.jianyi3);
        }
        
        // 解析 jianyi1，提取各个字段
        if (data.jianyi1) {
          const lines = data.jianyi1.split('\n');
          for (const line of lines) {
            if (line.startsWith('脚本主题：')) {
              setScriptTopic(line.replace('脚本主题：', '').trim());
            } else if (line.startsWith('内容风格：')) {
              setContentStyle(line.replace('内容风格：', '').trim());
            } else if (line.startsWith('关键词：')) {
              setKeywords(line.replace('关键词：', '').trim());
            } else if (line.startsWith('特殊要求：')) {
              setSpecialRequirements(line.replace('特殊要求：', '').trim());
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      const userId = localStorage.getItem("userId");
      
      if (!userId) {
        toast({
          title: "未登录",
          description: "请先登录",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      
    // 从导航状态中获取参考脚本和项目名称
    if (location.state?.referenceScript) {
      const script = location.state.referenceScript;
      setReferenceScript(`${script.title}\n\n${script.description}\n\n钩子分析：${script.hookAnalysis}\n\n结构分析：${script.structureAnalysis}\n\n视觉分析：${script.visualAnalysis}`);
    }
    if (location.state?.projectName) {
      setProjectName(location.state.projectName);
    }
      
      // 优先从 URL 参数获取 post_id（适用于所有情况：继续编辑、创建模式、视频分析）
      const urlPostId = searchParams.get("post_id");
      
      if (urlPostId) {
        setPostId(urlPostId);
        setIsVideoAnalysis(true); // 启用自动保存
        
        // 加载已有数据
        await loadVideoAnalysisData(userId, urlPostId);
        setInitializing(false);
      } 
      // 兼容旧的方式：从 location.state 获取（视频分析跳转）
      else if (location.state?.isVideoAnalysis && location.state?.post_id) {
      setIsVideoAnalysis(true);
      setPostId(location.state.post_id);
      
        await loadVideoAnalysisData(userId, location.state.post_id);
        setInitializing(false);
      }
      // 没有 post_id：禁止直接访问，跳转到我的项目
      else {
        toast({
          title: "无法直接访问",
          description: "请从「我的项目」新建视频项目或从「爆款脚本」进入",
          variant: "destructive",
        });
        navigate("/projects");
        return;
      }
    };
    
    initPage();
  }, []);

  const handleGenerateShotScript = () => {
    setCurrentStep("shot");
    setLoading(true);
    // 模拟AI生成分镜头脚本
    setTimeout(() => {
      setShotScripts([
        {
          shotNumber: "1",
          sceneDescription: "开场画面：主持人微笑面对镜头",
          staticPrompt: "professional presenter, warm smile, modern office background, soft lighting",
          dynamicPrompt: "camera slowly zooms in, presenter waves hello"
        },
        {
          shotNumber: "2",
          sceneDescription: "展示产品特写",
          staticPrompt: "product close-up, clean white background, professional studio lighting",
          dynamicPrompt: "product rotates 360 degrees, highlights key features"
        },
        {
          shotNumber: "3",
          sceneDescription: "使用场景演示",
          staticPrompt: "lifestyle setting, natural lighting, cozy atmosphere",
          dynamicPrompt: "smooth transition to usage scenario, user interaction"
        }
      ]);
      setLoading(false);
    }, 2000);
  };

  const handleUpdateShotScript = (index: number, field: keyof ShotScript, value: string) => {
    setShotScripts(prev => prev.map((script, i) => 
      i === index ? { ...script, [field]: value } : script
    ));
  };

  const handleSaveProject = () => {
    // 保存到项目列表，包括内容脚本和分镜头脚本
    console.log("保存项目:", projectName, { contentScript: generatedScript, shotScripts, characterDescription });
    setShowSaveDialog(false);
    setProjectName("");
    // 跳转到图片生成界面
    navigate("/image-generation", { 
      state: { 
        projectName,
        shotScripts,
        characterDescription
      } 
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">脚本生成</h1>
        <p className="text-muted-foreground mt-1">智能生成短视频脚本，提升创作效率</p>
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep === "content" ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"
          }`}>
            {currentStep === "shot" ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <span className={`font-medium ${currentStep === "content" ? "text-foreground" : "text-muted-foreground"}`}>
            内容脚本
          </span>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            currentStep === "shot" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            2
          </div>
          <span className={`font-medium ${currentStep === "shot" ? "text-foreground" : "text-muted-foreground"}`}>
            分镜头脚本
          </span>
        </div>
      </div>

      {currentStep === "content" ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 输入区域 */}
            <Card className="h-[calc(600px*1.5)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  输入参数
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 h-[calc(100%-5rem)] overflow-y-auto">
                {/* 关联项目 - 仅在非视频分析且非创建模式显示 */}
                {!isVideoAnalysis && !isCreateMode && (
                  <div className="space-y-2">
                    <Label htmlFor="project">关联项目</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger id="project">
                        <SelectValue placeholder="选择关联项目" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                 {/* 脚本主题 - 始终显示 */}
                 <div className="space-y-2">
                   <Label htmlFor="topic">脚本主题</Label>
                   <Input
                     id="topic"
                     placeholder={isCreateMode 
                       ? "请输入脚本主题，例如：教小朋友认识水果" 
                       : "例如：职场干货、美食教程、旅游攻略..."}
                     value={scriptTopic}
                     onChange={(e) => {
                       setScriptTopic(e.target.value);
                       handleAutoSave("script_topic", e.target.value);
                     }}
                   />
                 </div>

                 {/* 内容风格 - 始终显示 */}
                 <div className="space-y-2">
                   <Label htmlFor="style">内容风格</Label>
                   <Input
                     id="style"
                     placeholder={isCreateMode 
                       ? "请输入内容风格，例如：轻松活泼、寓教于乐" 
                       : "例如：专业严肃、幽默风趣、情感共鸣、知识科普..."}
                     value={contentStyle}
                     onChange={(e) => {
                       setContentStyle(e.target.value);
                       handleAutoSave("content_style", e.target.value);
                     }}
                   />
                 </div>

                 {/* 关键词 - 始终显示 */}
                 <div className="space-y-2">
                   <Label htmlFor="keywords">关键词</Label>
                   <Input
                     id="keywords"
                     placeholder="用逗号分隔多个关键词"
                     value={keywords}
                     onChange={(e) => {
                       setKeywords(e.target.value);
                       handleAutoSave("keywords", e.target.value);
                     }}
                   />
                 </div>

                 {/* 特殊要求 - 始终显示 */}
                 <div className="space-y-2">
                   <Label htmlFor="requirements">特殊要求</Label>
                   <Textarea
                     id="requirements"
                     placeholder="描述您的特殊需求，如目标受众、想要强调的点等..."
                     rows={4}
                     value={specialRequirements}
                     onChange={(e) => {
                       setSpecialRequirements(e.target.value);
                       handleAutoSave("special_requirements", e.target.value);
                     }}
                   />
                 </div>

                {/* 参考脚本 - 仅在非视频分析且非创建模式显示 */}
                {!isVideoAnalysis && !isCreateMode && (
                  <div className="space-y-2">
                    <Label htmlFor="reference">参考脚本（可选）</Label>
                    <Textarea
                      id="reference"
                      placeholder="粘贴或选择参考脚本..."
                      value={referenceScript}
                      onChange={(e) => setReferenceScript(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 输出区域 */}
            <Card className="h-[calc(600px*1.5)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {isCreateMode ? "生成的内容脚本" : isVideoAnalysis ? "视频分析脚本" : "内容脚本"}
                </CardTitle>
              </CardHeader>
               <CardContent className="h-[calc(100%-5rem)] flex flex-col">
                 <Textarea
                   placeholder={isCreateMode 
                     ? "填写左侧参数后点击生成脚本..." 
                     : "生成的脚本将显示在这里，您可以直接编辑修改..."}
                   value={generatedScript}
                   onChange={(e) => {
                     setGeneratedScript(e.target.value);
                     handleAutoSave("jianyi3", e.target.value);
                   }}
                   className="flex-1 font-mono resize-none"
                 />
               </CardContent>
            </Card>
          </div>
          
          {/* 生成脚本按钮 - 在两个卡片下方 */}
          <div className="flex justify-center mt-6">
            <Button 
              size="lg" 
              className="px-12"
              disabled={loading || ((isVideoAnalysis || isCreateMode) && !generatedScript)}
              onClick={async () => {
                if (isVideoAnalysis || isCreateMode) {
                  // 视频分析模式或创建模式：调用生成分镜头脚本接口
                  setLoading(true);
                  try {
                    const userId = localStorage.getItem("userId");
                    if (!userId || !postId) {
                      alert("缺少必要信息");
                      return;
                    }
                    
                    const response = await fetch(getApiUrl(API_ENDPOINTS.videoAnalysisGenerateShotScript), {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        user_id: parseInt(userId),
                        post_id: postId,
                      }),
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      
                      // 如果是跳过生成（已存在内容），显示提示
                      if (result.skipped) {
                        console.log("分镜头脚本已存在，直接跳转");
                      }
                      
                      // 跳转到分镜头脚本页面，携带 mode 参数
                      const targetUrl = isCreateMode 
                        ? `/shot-script?post_id=${postId}&mode=create`
                        : `/shot-script?post_id=${postId}`;
                      navigate(targetUrl);
                    } else {
                      throw new Error("生成失败");
                    }
                  } catch (error) {
                    alert("生成分镜头脚本失败");
                    console.error(error);
                  } finally {
                    setLoading(false);
                  }
                } else {
                  // 普通模式：原有的生成脚本逻辑
                  // TODO: 实现普通模式的生成逻辑
                }
              }}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  {isVideoAnalysis || isCreateMode ? "继续生成分镜头脚本" : "生成脚本"}
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              分镜头脚本
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 mb-4">
              <Label htmlFor="characterDescription">人物描述提示词</Label>
              <Textarea
                id="characterDescription"
                placeholder="描述主角的外貌特征、年龄、着装等，用于后续图片生成..."
                value={characterDescription}
                onChange={(e) => setCharacterDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">镜头号</TableHead>
                    <TableHead className="w-[200px]">画面描述</TableHead>
                    <TableHead>静态提示词</TableHead>
                    <TableHead>动态提示词</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shotScripts.map((script, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={script.shotNumber}
                          onChange={(e) => handleUpdateShotScript(index, "shotNumber", e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={script.sceneDescription}
                          onChange={(e) => handleUpdateShotScript(index, "sceneDescription", e.target.value)}
                          rows={3}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={script.staticPrompt}
                          onChange={(e) => handleUpdateShotScript(index, "staticPrompt", e.target.value)}
                          rows={3}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={script.dynamicPrompt}
                          onChange={(e) => handleUpdateShotScript(index, "dynamicPrompt", e.target.value)}
                          rows={3}
                          className="w-full"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("content")}
                className="flex-1"
              >
                返回上一步
              </Button>
              <Button
                className="flex-1"
                disabled={shotScripts.length === 0}
                onClick={() => setShowSaveDialog(true)}
              >
                确认并保存为项目
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 保存项目对话框 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存为项目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">项目名称</Label>
              <Input
                id="projectName"
                placeholder="输入项目名称..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveProject} disabled={!projectName}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScriptGeneration;
