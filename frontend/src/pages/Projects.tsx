import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Video, Plus, Search, Clock, CheckCircle, AlertCircle, FileText, Image as ImageIcon, Play, Calendar, User, MoreVertical, Edit, Trash2, Loader2, Download } from "lucide-react";
import { getApiUrl, API_ENDPOINTS } from "@/config/api";

interface Project {
  id: number;
  post_id: string;
  name: string;
  status: string;
  statusColor: string;
  progress: number;
  thumbnail: string | null;
  creator: string;
  createdAt: string;
  updatedAt: string;
  post_type: string;
  script?: string;
  images?: string[];
  videoUrl?: string | null;
  originalVideoUrl?: string | null;  // 原始视频URL
  tags?: string[];
  hasJianyi4?: boolean;  // 是否有分镜头脚本（用于视频项目判断跳转页面）
}

const Projects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  // 从后端加载项目数据
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem("userId") || "1";
        const response = await fetch(getApiUrl(API_ENDPOINTS.myProjects(parseInt(userId))));
        
        if (!response.ok) {
          throw new Error("获取项目列表失败");
        }

        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error("加载项目失败:", error);
        toast({
          title: "加载失败",
          description: "无法加载项目列表，请稍后重试",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "已完成":
        return <CheckCircle className="w-4 h-4" />;
      case "脚本审核中":
      case "成品审核中":
        return <Clock className="w-4 h-4 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusClass = (statusColor: string) => {
    const classes = {
      success: "bg-success-light text-success border-success/20",
      warning: "bg-warning-light text-warning border-warning/20",
      info: "bg-info-light text-info border-info/20",
      error: "bg-error-light text-error border-error/20",
    };
    return classes[statusColor as keyof typeof classes] || classes.info;
  };

  // 删除项目
  const handleDeleteProject = async (projectId: number) => {
    try {
      const userId = localStorage.getItem("userId") || "1";
      const response = await fetch(`${getApiUrl(API_ENDPOINTS.myProjectDelete(projectId))}?user_id=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除项目失败");
      }

      // 从列表中移除
      setProjects(projects.filter(p => p.id !== projectId));
      toast({
        title: "删除成功",
        description: "项目已删除",
      });
    } catch (error) {
      console.error("删除项目失败:", error);
      toast({
        title: "删除失败",
        description: "无法删除项目，请稍后重试",
        variant: "destructive",
      });
    }
  };

  // 新建项目 - 打开对话框
  const handleNewProject = () => {
    setShowNewProjectDialog(true);
  };

  // 创建空白项目
  const handleCreateBlankProject = async (postType: string) => {
    try {
      setCreatingProject(true);
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

      const response = await fetch(getApiUrl(API_ENDPOINTS.createBlankProject), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: parseInt(userId),
          post_type: postType,
        }),
      });

      if (!response.ok) {
        throw new Error("创建项目失败");
      }

      const result = await response.json();
      
      toast({
        title: "创建成功",
        description: "正在跳转到编辑页面...",
      });

      setShowNewProjectDialog(false);

      // 根据类型跳转到对应页面
      if (postType === "Image" || postType === "Sidecar") {
        navigate(`/image-analysis?post_id=${result.post_id}&mode=create`);
      } else if (postType === "Video") {
        navigate(`/script-generation?post_id=${result.post_id}&mode=create`);
      }
    } catch (error) {
      console.error("创建项目失败:", error);
      toast({
        title: "创建失败",
        description: "无法创建项目，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setCreatingProject(false);
    }
  };

  // 继续编辑项目
  const handleContinueEdit = (postId: string, postType?: string, hasJianyi4?: boolean) => {
    if (postType === "Video") {
      // 视频项目：根据是否有分镜头脚本决定跳转页面
      if (hasJianyi4) {
        // 已有分镜头脚本，跳转到分镜头脚本页面（第二阶段）
        navigate(`/shot-script?post_id=${postId}`);
      } else {
        // 没有分镜头脚本，跳转到内容脚本页面（第一阶段）
        navigate(`/script-generation?post_id=${postId}`);
      }
    } else {
      // Image 和 Sidecar 类型都跳转到图文分析
    navigate(`/image-analysis?post_id=${postId}`);
    }
  };

  // 下载项目
  const handleDownloadProject = async (project: Project) => {
    try {
      toast({
        title: "开始下载",
        description: "正在准备项目文件...",
      });

      // 使用 JSZip 创建 ZIP 文件
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // 1. 添加脚本文件
      if (project.script) {
        zip.file("脚本.txt", project.script);
      }

      // 2. 添加图片文件
      if (project.images && project.images.length > 0) {
        const imagesFolder = zip.folder("图片素材");
        if (imagesFolder) {
          project.images.forEach((base64Image, index) => {
            // 将 Base64 转换为 Blob
            const base64Data = base64Image.includes(',') 
              ? base64Image.split(',')[1] 
              : base64Image;
            
            imagesFolder.file(
              `素材_${index + 1}.png`,
              base64Data,
              { base64: true }
            );
          });
        }
      }

      // 3. 添加视频文件（如果是 Video 类型且有生成的视频）
      if (project.post_type === 'Video' && project.videoUrl) {
        const base64Data = project.videoUrl.includes(',') 
          ? project.videoUrl.split(',')[1] 
          : project.videoUrl;
        
        zip.file("生成视频.mp4", base64Data, { base64: true });
      }

      // 4. 生成 ZIP 文件并下载
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.name}_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "下载成功",
        description: "项目文件已下载到本地",
      });
    } catch (error) {
      console.error("下载项目失败:", error);
      toast({
        title: "下载失败",
        description: "无法下载项目文件，请稍后重试",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的项目</h1>
          <p className="text-muted-foreground mt-1">管理您的视频制作项目</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-primary-dark" onClick={handleNewProject}>
          <Plus className="w-4 h-4 mr-2" />
          新建项目
        </Button>
      </div>

      {/* 筛选栏 */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="script-review">脚本审核中</SelectItem>
              <SelectItem value="image-gen">图片生成中</SelectItem>
              <SelectItem value="product-review">成品审核中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="updated">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">最近更新</SelectItem>
              <SelectItem value="created">创建时间</SelectItem>
              <SelectItem value="name">项目名称</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索项目..." className="pl-9" />
          </div>
        </div>
      </Card>

      {/* 加载状态 */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">加载项目中...</span>
        </div>
      ) : projects.length === 0 ? (
        <Card className="py-12">
          <CardContent>
            <div className="text-center text-muted-foreground">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">还没有任何项目</p>
              <p className="text-sm mb-6">点击右上角"新建项目"开始创建您的第一个视频项目</p>
              <Button onClick={handleNewProject}>
                <Plus className="w-4 h-4 mr-2" />
                新建项目
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 项目卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
          <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* 项目封面 */}
            <div className="relative aspect-video bg-muted">
              {project.post_type === 'Video' && project.thumbnail ? (
                // Video类型：显示视频的第一帧作为封面
                <video
                  src={`data:video/mp4;base64,${project.thumbnail}`}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    // 加载视频后，定位到第一帧
                    e.currentTarget.currentTime = 0.1;
                  }}
                />
              ) : project.thumbnail ? (
                // Image/Sidecar类型：显示图片
                <img
                  src={`data:image/jpeg;base64,${project.thumbnail}`}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge className={getStatusClass(project.statusColor)}>
                  {getStatusIcon(project.status)}
                  <span className="ml-1">{project.status}</span>
                </Badge>
              </div>
            </div>

            {/* 项目信息 */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-lg line-clamp-1 flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  {project.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <User className="w-3 h-3" />
                  {project.creator}
                </p>
              </div>

              {/* 进度条 */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">完成进度</span>
                  <span className="font-semibold">{project.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-primary-dark h-2 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* 项目元信息 */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {project.createdAt}
                </span>
                <span>{project.updatedAt}</span>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleContinueEdit(project.post_id, project.post_type, project.hasJianyi4)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  继续编辑
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedProject(project)}
                >
                  查看详情
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除项目
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}

        {/* 新建项目卡片 */}
        <Card 
          className="overflow-hidden border-dashed border-2 hover:border-primary transition-colors cursor-pointer"
          onClick={handleNewProject}
        >
          <div className="aspect-video flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors p-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">创建新项目</h3>
            <p className="text-sm mt-2 text-center">
              开始新的视频制作流程
            </p>
          </div>
        </Card>
      </div>
        </>
      )}

      {/* 新建项目对话框 */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建项目</DialogTitle>
            <DialogDescription>
              选择您要创建的项目类型
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* 图文帖子 */}
            <Card 
              className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
              onClick={() => !creatingProject && handleCreateBlankProject("Image")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">图文帖子</h3>
                  <p className="text-sm text-muted-foreground">创建单张图片配文案的帖子</p>
                </div>
              </CardContent>
            </Card>

            {/* 多图帖子 */}
            <Card 
              className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
              onClick={() => !creatingProject && handleCreateBlankProject("Sidecar")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">多图帖子</h3>
                  <p className="text-sm text-muted-foreground">创建多张图片轮播的帖子</p>
                </div>
              </CardContent>
            </Card>

            {/* 视频帖子 */}
            <Card 
              className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
              onClick={() => !creatingProject && handleCreateBlankProject("Video")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Video className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">视频帖子</h3>
                  <p className="text-sm text-muted-foreground">创建视频内容的帖子</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {creatingProject && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在创建项目...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 项目详情侧边栏 */}
      <Sheet open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {selectedProject && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  {selectedProject.name}
                </SheetTitle>
              </SheetHeader>
              
              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">概览</TabsTrigger>
                  <TabsTrigger value="script">脚本</TabsTrigger>
                  <TabsTrigger value="images">图片素材</TabsTrigger>
                  <TabsTrigger value="video">视频预览</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* 项目封面/原始视频 */}
                  <div className="aspect-video overflow-hidden rounded-lg">
                    {selectedProject.originalVideoUrl ? (
                      <div className="w-full h-full bg-black">
                        <video
                          src={`data:video/mp4;base64,${selectedProject.originalVideoUrl}`}
                          controls
                          className="w-full h-full"
                        >
                          您的浏览器不支持视频播放
                        </video>
                      </div>
                    ) : selectedProject.thumbnail ? (
                      <img
                        src={`data:image/jpeg;base64,${selectedProject.thumbnail}`}
                        alt={selectedProject.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <ImageIcon className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* 项目状态 */}
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">项目状态</span>
                        <Badge className={getStatusClass(selectedProject.statusColor)}>
                          {getStatusIcon(selectedProject.status)}
                          <span className="ml-1">{selectedProject.status}</span>
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">完成进度</span>
                          <span className="font-semibold">{selectedProject.progress}%</span>
                        </div>
                        <Progress value={selectedProject.progress} />
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">创建者:</span>
                          <span className="font-medium">{selectedProject.creator}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">创建时间:</span>
                          <span className="font-medium">{selectedProject.createdAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">最后更新:</span>
                        <span className="font-medium">{selectedProject.updatedAt}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 标签 */}
                  {selectedProject.tags && selectedProject.tags.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">项目标签</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-4">
                    <Button 
                      className="flex-1"
                      onClick={() => handleContinueEdit(selectedProject.post_id, selectedProject.post_type, selectedProject.hasJianyi4)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      继续编辑
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDownloadProject(selectedProject)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      下载项目
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="script" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">脚本内容</h3>
                    </div>
                    {selectedProject.script ? (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {selectedProject.script}
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground text-center">无信息</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="images" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">生成的图片素材</h3>
                    </div>
                    {selectedProject.images && selectedProject.images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {selectedProject.images.map((image, idx) => (
                          <Card key={idx} className="overflow-hidden">
                            <div className="aspect-video">
                              <img
                                src={`data:image/jpeg;base64,${image}`}
                                alt={`素材 ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <CardContent className="p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                  素材 {idx + 1}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          无信息
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="video" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">视频预览</h3>
                    </div>
                    {selectedProject.videoUrl ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="aspect-video overflow-hidden rounded-lg bg-black">
                            <video
                              src={`data:video/mp4;base64,${selectedProject.videoUrl}`}
                              controls
                              className="w-full h-full"
                            >
                              您的浏览器不支持视频播放
                            </video>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">
                          无信息
                        </p>
                      </CardContent>
                    </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Projects;
