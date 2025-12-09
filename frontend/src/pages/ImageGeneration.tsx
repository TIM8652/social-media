import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Image, Sparkles, Download, RefreshCw, Settings2, Check, X, Edit, MessageSquare, StopCircle } from "lucide-react";
import { toast } from "sonner";

type ShotScript = {
  shotNumber: string;
  sceneDescription: string;
  staticPrompt: string;
  dynamicPrompt: string;
};

type GeneratedImage = {
  shotNumber: string;
  imageUrl: string;
  prompt: string;
  reviewStatus?: "pending" | "passed" | "failed";
  reviewReason?: string;
};

const ImageGeneration = () => {
  const location = useLocation();
  const [currentPhase, setCurrentPhase] = useState<"character" | "batch" | "review" | "complete">("character");
  const [characterImage, setCharacterImage] = useState("");
  const [characterPrompt, setCharacterPrompt] = useState("A young woman in her 20s, professional appearance, warm smile, clear facial features");
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [shotScripts, setShotScripts] = useState<ShotScript[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
  const [editMessages, setEditMessages] = useState<Array<{ role: "user" | "assistant", content: string }>>([]);
  const [editInput, setEditInput] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [globalPrompt, setGlobalPrompt] = useState("");

  useEffect(() => {
    if (location.state?.shotScripts) {
      setShotScripts(location.state.shotScripts);
      // 构建全局提示词
      const prompt = location.state.shotScripts
        .map((s: ShotScript) => `镜头${s.shotNumber}: ${s.staticPrompt}`)
        .join("\n");
      setGlobalPrompt(prompt);
    }
    // 自动填充人物描述提示词
    if (location.state?.characterDescription) {
      setCharacterPrompt(location.state.characterDescription);
    }
  }, [location]);

  const handleGenerateCharacter = async () => {
    setIsGeneratingCharacter(true);
    // 模拟AI生成角色设定图
    setTimeout(() => {
      setCharacterImage("https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400");
      setIsGeneratingCharacter(false);
      toast.success("角色设定图生成成功");
    }, 2000);
  };

  const handleConfirmCharacter = () => {
    setCurrentPhase("batch");
    toast.success("已锁定角色，开始批量生成分镜头图片");
  };

  const handleBatchGenerate = async () => {
    setIsBatchGenerating(true);
    setBatchProgress(0);
    
    // 模拟批量生成
    for (let i = 0; i < shotScripts.length; i++) {
      // 检查是否被终止
      if (!isBatchGenerating) break;
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newImage: GeneratedImage = {
        shotNumber: shotScripts[i].shotNumber,
        imageUrl: `https://images.unsplash.com/photo-${1500000000000 + i}?w=400`,
        prompt: shotScripts[i].staticPrompt,
        reviewStatus: "pending"
      };
      
      setGeneratedImages(prev => [...prev, newImage]);
      setBatchProgress(((i + 1) / shotScripts.length) * 100);
      
      toast.success(`镜头 ${shotScripts[i].shotNumber} 生成完成`);
    }
    
    setIsBatchGenerating(false);
    // 生成完成后进入审核阶段
    setCurrentPhase("review");
    toast.success("所有图片生成完成，开始AI审核");
    // 自动开始审核
    setTimeout(() => handleStartReview(), 1000);
  };

  const handleStartReview = async () => {
    setIsReviewing(true);
    setReviewProgress(0);
    
    // 模拟AI审核过程
    for (let i = 0; i < generatedImages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 随机模拟审核结果，大部分通过，少数不通过
      const passed = Math.random() > 0.2;
      
      setGeneratedImages(prev => prev.map((img, idx) => 
        idx === i 
          ? { 
              ...img, 
              reviewStatus: passed ? "passed" : "failed",
              reviewReason: passed ? undefined : "图片构图不符合要求，需要重新调整"
            }
          : img
      ));
      
      setReviewProgress(((i + 1) / generatedImages.length) * 100);
    }
    
    setIsReviewing(false);
    const failedCount = generatedImages.filter(img => img.reviewStatus === "failed").length;
    
    if (failedCount > 0) {
      toast.warning(`审核完成，${failedCount} 张图片未通过审核`);
    } else {
      toast.success("所有图片已通过审核！");
      setCurrentPhase("complete");
    }
  };

  const handleRegenerateFailedImage = async (image: GeneratedImage) => {
    toast.info(`正在重新生成镜头 ${image.shotNumber}`);
    
    // 模拟重新生成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setGeneratedImages(prev => prev.map(img => 
      img.shotNumber === image.shotNumber
        ? { 
            ...img, 
            imageUrl: `https://images.unsplash.com/photo-${Date.now()}?w=400`,
            reviewStatus: "pending"
          }
        : img
    ));
    
    toast.success("重新生成完成，进行审核");
    
    // 重新审核这张图片
    await new Promise(resolve => setTimeout(resolve, 1500));
    const passed = Math.random() > 0.3;
    
    setGeneratedImages(prev => prev.map(img => 
      img.shotNumber === image.shotNumber
        ? { 
            ...img, 
            reviewStatus: passed ? "passed" : "failed",
            reviewReason: passed ? undefined : "图片仍需调整"
          }
        : img
    ));
    
    if (passed) {
      toast.success("审核通过！");
      // 检查是否所有图片都通过
      const allPassed = generatedImages.every(img => 
        img.shotNumber === image.shotNumber || img.reviewStatus === "passed"
      );
      if (allPassed) {
        setCurrentPhase("complete");
      }
    } else {
      toast.warning("审核仍未通过，请继续调整");
    }
  };

  const handleSaveProject = () => {
    toast.success("项目已保存并更新");
    // 这里应该调用API保存项目
  };

  const handleStopGeneration = () => {
    setIsBatchGenerating(false);
    toast.info("已停止生成，保留已生成的图片");
  };

  const handleEditImage = (image: GeneratedImage) => {
    setEditingImage(image);
    setEditMessages([]);
    setEditInput("");
  };

  const handleSendEditMessage = async () => {
    if (!editInput.trim()) return;
    
    const userMessage = { role: "user" as const, content: editInput };
    setEditMessages(prev => [...prev, userMessage]);
    setEditInput("");
    
    // 模拟AI回复和图片修改
    setTimeout(() => {
      const aiMessage = { 
        role: "assistant" as const, 
        content: "好的，我已经根据您的要求修改了图片。" 
      };
      setEditMessages(prev => [...prev, aiMessage]);
      toast.success("图片已更新");
    }, 1500);
  };

  const handleRegenerateAll = async () => {
    setGeneratedImages([]);
    setBatchProgress(0);
    setShowPromptEditor(false);
    toast.success("开始重新生成所有图片");
    handleBatchGenerate();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI图片生成</h1>
          <p className="text-muted-foreground mt-1">
            {currentPhase === "character" && "第一步：生成并确认角色设定图"}
            {currentPhase === "batch" && "第二步：批量生成分镜头图片"}
            {currentPhase === "review" && "第三步：AI审核图片质量"}
            {currentPhase === "complete" && "审核完成，您可以编辑或保存项目"}
          </p>
        </div>
        {currentPhase !== "character" && (
          <Button variant="outline" onClick={() => setShowPromptEditor(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            编辑全局提示词
          </Button>
        )}
      </div>

      {/* 角色设定图阶段 */}
      {currentPhase === "character" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                角色描述
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="characterPrompt">主角描述</Label>
                <Textarea
                  id="characterPrompt"
                  value={characterPrompt}
                  onChange={(e) => setCharacterPrompt(e.target.value)}
                  placeholder="详细描述主角的外貌特征、年龄、着装等..."
                  rows={6}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleGenerateCharacter}
                disabled={isGeneratingCharacter}
              >
                {isGeneratingCharacter ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成角色设定图
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                角色设定图预览
              </CardTitle>
            </CardHeader>
            <CardContent>
              {characterImage ? (
                <div className="space-y-4">
                  <div className="aspect-square rounded-lg overflow-hidden border">
                    <img 
                      src={characterImage} 
                      alt="Character" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleGenerateCharacter}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      重新生成
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleConfirmCharacter}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      确认使用
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center">
                  <div className="text-center">
                    <Image className="mx-auto h-16 w-16 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">
                      点击生成角色设定图
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 批量生成阶段 */}
      {currentPhase === "batch" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  批量生成进度
                </span>
                {isBatchGenerating && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleStopGeneration}
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    终止生成
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={batchProgress} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {generatedImages.length} / {shotScripts.length} 张图片已生成
                </span>
                <span className="text-muted-foreground">
                  {Math.round(batchProgress)}%
                </span>
              </div>
              {!isBatchGenerating && generatedImages.length === 0 && (
                <Button className="w-full" onClick={handleBatchGenerate}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  开始批量生成
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 已生成的图片展示 */}
          {generatedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>已生成的图片</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {generatedImages.map((img, index) => (
                    <div key={index} className="group relative aspect-square rounded-lg border overflow-hidden">
                      <img 
                        src={img.imageUrl} 
                        alt={`Shot ${img.shotNumber}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <span className="text-white text-sm font-medium">镜头 {img.shotNumber}</span>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleEditImage(img)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            编辑
                          </Button>
                          <Button size="sm" variant="secondary">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* AI审核阶段 */}
      {currentPhase === "review" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI审核进度
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={reviewProgress} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isReviewing ? "正在审核中..." : "审核完成"}
                </span>
                <span className="text-muted-foreground">
                  {Math.round(reviewProgress)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 审核结果展示 */}
          {!isReviewing && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>审核结果</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {generatedImages.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg border overflow-hidden">
                        <img 
                          src={img.imageUrl} 
                          alt={`Shot ${img.shotNumber}`}
                          className="w-full h-full object-cover"
                        />
                        {/* 审核状态标识 */}
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                          img.reviewStatus === "passed" 
                            ? "bg-success text-white" 
                            : "bg-destructive text-white"
                        }`}>
                          {img.reviewStatus === "passed" ? (
                            <>
                              <Check className="h-3 w-3 inline mr-1" />
                              通过
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 inline mr-1" />
                              未通过
                            </>
                          )}
                        </div>
                        
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                          <p className="text-xs font-medium">镜头 {img.shotNumber}</p>
                          {img.reviewStatus === "failed" && img.reviewReason && (
                            <p className="text-xs text-red-200 mt-1">{img.reviewReason}</p>
                          )}
                          {img.reviewStatus === "failed" && (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              className="w-full mt-2"
                              onClick={() => handleRegenerateFailedImage(img)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              重新生成
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 如果所有图片都通过，显示保存按钮 */}
              {generatedImages.every(img => img.reviewStatus === "passed") && (
                <Card className="bg-success/10 border-success">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-success">所有图片已通过审核！</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          您可以保存项目或继续编辑图片
                        </p>
                      </div>
                      <Button 
                        className="bg-success hover:bg-success/90"
                        onClick={handleSaveProject}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        保存并更新项目
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* 完成阶段 */}
      {currentPhase === "complete" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              所有图片
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generatedImages.map((img, index) => (
                <div key={index} className="group relative aspect-square rounded-lg border overflow-hidden">
                  <img 
                    src={img.imageUrl} 
                    alt={`Shot ${img.shotNumber}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <span className="text-white text-sm font-medium">镜头 {img.shotNumber}</span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleEditImage(img)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        编辑
                      </Button>
                      <Button size="sm" variant="secondary">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 对话式编辑对话框 */}
      <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>编辑图片 - 镜头 {editingImage?.shotNumber}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>当前图片</Label>
              <div className="aspect-square rounded-lg overflow-hidden border">
                <img 
                  src={editingImage?.imageUrl || ""} 
                  alt="Editing"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>编辑对话</Label>
              <div className="h-[400px] border rounded-lg flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {editMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      输入您想要的修改，例如：<br/>
                      "把裙子改成蓝色" 或 "让背景更明亮"
                    </div>
                  ) : (
                    editMessages.map((msg, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg ${
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground ml-8" 
                            : "bg-muted mr-8"
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t flex gap-2">
                  <Input
                    placeholder="输入修改指令..."
                    value={editInput}
                    onChange={(e) => setEditInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendEditMessage()}
                  />
                  <Button onClick={handleSendEditMessage}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 全局提示词编辑器 */}
      <Dialog open={showPromptEditor} onOpenChange={setShowPromptEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑全局提示词</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>全局提示词</Label>
              <Textarea
                value={globalPrompt}
                onChange={(e) => setGlobalPrompt(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromptEditor(false)}>
              取消
            </Button>
            <Button onClick={handleRegenerateAll}>
              <Sparkles className="mr-2 h-4 w-4" />
              重新生成全部图片
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageGeneration;
