import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Video, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, API_ENDPOINTS } from "@/config/api";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.login), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "登录失败",
          description: data.detail || "用户名或密码错误",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "登录成功",
        description: `欢迎回来，${data.user.username}！`,
      });

      // 保存用户信息到 localStorage
      localStorage.setItem("userId", data.user.id.toString());
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("userRole", data.user.role);

      // 根据角色跳转
      if (data.user.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (error) {
      toast({
        title: "登录失败",
        description: "无法连接到服务器",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent to-muted p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* 左侧品牌区 */}
        <div className="text-center lg:text-left space-y-6 order-2 lg:order-1">
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              社媒视频生成平台
            </h1>
          </div>
          <p className="text-xl text-foreground/80">
            AI驱动的视频内容协作平台
          </p>
          <div className="space-y-4 text-muted-foreground">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>AI趋势洞察，精准把握热点</span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>智能脚本生成，提升创作效率</span>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>协同审核流程，确保内容质量</span>
            </div>
          </div>
        </div>

        {/* 右侧登录表单 */}
        <Card className="p-8 order-1 lg:order-2 shadow-2xl">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold">欢迎回来</h2>
              <p className="text-muted-foreground">登录您的账号开始工作</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 transition-opacity"
              >
                登录
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
