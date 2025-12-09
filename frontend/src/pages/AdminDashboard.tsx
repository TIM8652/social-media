import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Search, Key, CheckCircle, XCircle } from "lucide-react";
import { getApiUrl, API_ENDPOINTS } from "@/config/api";

const AdminDashboard = () => {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [postCount, setPostCount] = useState("");
  const [competitorScrapeType, setCompetitorScrapeType] = useState("posts");  // 竞品抓取类型
  const [isLoading, setIsLoading] = useState(false);
  
  // 搜索抓取相关状态
  const [keyword, setKeyword] = useState("");
  const [searchPostCount, setSearchPostCount] = useState("");
  const [scrapeType, setScrapeType] = useState("posts");
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // API Key 状态
  const [apiKeys, setApiKeys] = useState({
    apify: "",
    google: "",
    aisonnet: "",
    deepseek: "",
    sora2: "",
  });

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState<{
    key: string;
    name: string;
    description: string;
    link: string;
    required: boolean;
  } | null>(null);
  const [tempKeyValue, setTempKeyValue] = useState("");

  const handleScrape = async () => {
    if (!username || !postCount) {
      toast({
        title: "请填写完整信息",
        description: "用户名和帖子数量不能为空",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const typeText = competitorScrapeType === "posts" ? "图文帖子" : "视频帖子";
    
    toast({
      title: "开始抓取",
      description: `正在抓取用户 ${username} 的 ${postCount} 条${typeText}...`,
    });

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.competitorScrape), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          post_count: parseInt(postCount),
          scrape_type: competitorScrapeType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "抓取任务已启动",
          description: data.message,
        });
        setUsername("");
        setPostCount("");
      } else {
        toast({
          title: "抓取失败",
          description: data.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "请求失败",
        description: "无法连接到服务器，请检查后端是否运行",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchScrape = async () => {
    if (!keyword || !searchPostCount) {
      toast({
        title: "请填写完整信息",
        description: "搜索关键词和帖子数量不能为空",
        variant: "destructive",
      });
      return;
    }

    setIsSearchLoading(true);
    
    const typeText = scrapeType === "posts" ? "图文帖子" : "视频帖子";
    
    toast({
      title: "开始抓取",
      description: `正在抓取标签 #${keyword} 的 ${searchPostCount} 条${typeText}...`,
    });

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.searchScrape), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: keyword,
          post_count: parseInt(searchPostCount),
          scrape_type: scrapeType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "抓取任务已启动",
          description: data.message,
        });
        setKeyword("");
        setSearchPostCount("");
      } else {
        toast({
          title: "抓取失败",
          description: data.message || "未知错误",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "请求失败",
        description: "无法连接到服务器，请检查后端是否运行",
        variant: "destructive",
      });
    } finally {
      setIsSearchLoading(false);
    }
  };

  // API Key 配置
  const apiKeyConfig = [
    {
      key: "apify",
      name: "Apify",
      description: "Instagram 数据抓取",
      link: "https://apify.com/",
      required: true,
    },
    {
      key: "google",
      name: "Google AI",
      description: "视频分析、提示词生成",
      link: "https://ai.google.dev/",
      required: true,
    },
    {
      key: "aisonnet",
      name: "AIsonnet",
      description: "图片生成",
      link: "https://newapi.aisonnet.org/",
      required: true,
    },
    {
      key: "deepseek",
      name: "DeepSeek",
      description: "文案生成、翻译",
      link: "https://platform.deepseek.com/",
      required: true,
    },
    {
      key: "sora2",
      name: "Sora2",
      description: "视频生成（可选）",
      link: "",
      required: false,
    },
  ];

  const openApiKeyDialog = (config: typeof apiKeyConfig[0]) => {
    setCurrentApiKey(config);
    setTempKeyValue(apiKeys[config.key as keyof typeof apiKeys]);
    setDialogOpen(true);
  };

  const handleSaveApiKey = async () => {
    if (currentApiKey) {
      try {
        const payload: any = {};
        
        // 根据 key 名称构建请求体
        if (currentApiKey.key === "apify") payload.apify_token = tempKeyValue;
        if (currentApiKey.key === "google") payload.google_key = tempKeyValue;
        if (currentApiKey.key === "aisonnet") payload.aisonnet_key = tempKeyValue;
        if (currentApiKey.key === "deepseek") payload.deepseek_key = tempKeyValue;
        if (currentApiKey.key === "sora2") payload.sora2_key = tempKeyValue;
        
        const response = await fetch(getApiUrl(API_ENDPOINTS.updateApiKeys), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        const data = await response.json();
        
        if (data.success) {
          // 更新本地状态
          setApiKeys((prev) => ({
            ...prev,
            [currentApiKey.key]: tempKeyValue || "***CONFIGURED***",
          }));
          
          toast({
            title: "保存成功",
            description: `${currentApiKey.name} API Key 已保存并立即生效`,
          });
          
          setDialogOpen(false);
          setCurrentApiKey(null);
          setTempKeyValue("");
        } else {
          toast({
            title: "保存失败",
            description: data.message || "未知错误",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "保存失败",
          description: "无法连接到服务器",
          variant: "destructive",
        });
      }
    }
  };

  // 加载 API Keys 状态
  useEffect(() => {
    loadApiKeysStatus();
  }, []);

  const loadApiKeysStatus = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.getApiKeysStatus));
      const data = await response.json();
      
      // 更新按钮颜色状态（已配置显示特殊标记）
      setApiKeys({
        apify: data.apify_token_set ? "***CONFIGURED***" : "",
        google: data.google_key_set ? "***CONFIGURED***" : "",
        aisonnet: data.aisonnet_key_set ? "***CONFIGURED***" : "",
        deepseek: data.deepseek_key_set ? "***CONFIGURED***" : "",
        sora2: data.sora2_key_set ? "***CONFIGURED***" : "",
      });
    } catch (error) {
      console.error("Failed to load API keys status", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-2">管理员后台 👨‍💼</h1>
        <p className="text-primary-foreground/90">系统管理与数据抓取</p>
      </div>

      {/* API 密钥配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-yellow-500" />
            API 密钥配置
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            点击按钮配置 API 密钥，填写完成后下载 .env 文件到 backend 目录
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key 按钮组 */}
          <div className="flex flex-wrap gap-3">
            {apiKeyConfig.map((config) => {
              const isFilled = apiKeys[config.key as keyof typeof apiKeys].length > 0;
              return (
                <Button
                  key={config.key}
                  onClick={() => openApiKeyDialog(config)}
                  className={`flex-1 min-w-[180px] h-20 flex flex-col items-center justify-center gap-2 ${
                    isFilled
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {isFilled ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <XCircle className="h-6 w-6" />
                  )}
                  <div className="text-center">
                    <div className="font-semibold">{config.name}</div>
                    <div className="text-xs opacity-90">
                      {config.required ? "必需" : "可选"}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* 使用说明 */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              使用说明：
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>点击红色按钮填写对应的 API 密钥</li>
              <li>填写完成后点击"保存"，按钮立即变为绿色</li>
              <li>配置立即生效，无需重启后端服务</li>
              <li>刷新页面后，已配置的密钥仍然显示为绿色</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              💡 提示：密钥保存在后端运行时内存中，重启后端服务后会重新从 .env 文件加载
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Key 输入对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-yellow-500" />
              配置 {currentApiKey?.name} API Key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-input">API Key</Label>
              <Input
                id="api-key-input"
                type="password"
                placeholder={`请输入 ${currentApiKey?.name} API Key`}
                value={tempKeyValue}
                onChange={(e) => setTempKeyValue(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>用途：</strong>
                {currentApiKey?.description}
              </p>
              {currentApiKey?.link && (
                <p className="text-sm text-muted-foreground">
                  <strong>获取地址：</strong>
                  <a
                    href={currentApiKey.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    {currentApiKey.link}
                  </a>
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                <strong>状态：</strong>
                {currentApiKey?.required ? (
                  <span className="text-red-500 font-semibold">必需</span>
                ) : (
                  <span className="text-gray-500">可选</span>
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveApiKey}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 竞品数据抓取功能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            竞品数据抓取
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>说明：</strong>输入用户名，选择抓取类型和数量
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>示例：</strong>用户名 "camblyk"，选择"图文帖子"，数量10
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                placeholder="请输入要抓取的用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                输入 Instagram 用户名（例如：camblyk）
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="competitorScrapeType">抓取类型</Label>
                <Select
                  value={competitorScrapeType}
                  onValueChange={setCompetitorScrapeType}
                  disabled={isLoading}
                >
                  <SelectTrigger id="competitorScrapeType">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posts">图文帖子 (Posts)</SelectItem>
                    <SelectItem value="stories">视频帖子 (Stories)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  选择要抓取的内容类型
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postCount">帖子数量</Label>
              <Input
                id="postCount"
                type="number"
                placeholder="请输入抓取数量"
                value={postCount}
                onChange={(e) => setPostCount(e.target.value)}
                disabled={isLoading}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                  抓取的帖子数量
              </p>
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-primary to-primary-dark"
            onClick={handleScrape}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在抓取中...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                开始抓取
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 搜索标签抓取功能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-purple-500" />
            搜索标签抓取
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>说明：</strong>输入Instagram标签（不需要#），选择抓取类型和数量
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>示例：</strong>输入 "تعلم_الانجليزية"，选择"图文帖子"，数量10
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="keyword">搜索关键词/标签</Label>
              <Input
                id="keyword"
                placeholder="请输入标签（不需要#）"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={isSearchLoading}
              />
              <p className="text-xs text-muted-foreground">
                例如：تعلم_الانجليزية、webscraping、fitness
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scrapeType">抓取类型</Label>
                <Select
                  value={scrapeType}
                  onValueChange={setScrapeType}
                  disabled={isSearchLoading}
                >
                  <SelectTrigger id="scrapeType">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posts">图文帖子 (Posts)</SelectItem>
                    <SelectItem value="stories">视频帖子 (Stories)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  选择要抓取的内容类型
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchPostCount">帖子数量</Label>
                <Input
                  id="searchPostCount"
                  type="number"
                  placeholder="请输入抓取数量"
                  value={searchPostCount}
                  onChange={(e) => setSearchPostCount(e.target.value)}
                  disabled={isSearchLoading}
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  抓取的帖子数量
                </p>
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            onClick={handleSearchScrape}
            disabled={isSearchLoading}
          >
            {isSearchLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在抓取中...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                开始抓取
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 抓取历史记录 */}
      <Card>
        <CardHeader>
          <CardTitle>抓取历史</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            暂无抓取记录
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;

