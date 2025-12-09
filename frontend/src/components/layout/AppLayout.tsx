import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  TrendingUp,
  Video,
  FileCheck,
  Settings,
  Search,
  Bell,
  HelpCircle,
  User,
  Key,
  LogOut,
  Menu,
  X,
  Sparkles,
  Image,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["脚本管理"]); // 默认展开脚本管理
  
  // 获取当前登录用户名
  const currentUsername = localStorage.getItem("username") || "用户";
  
  // 切换菜单展开状态
  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  const navigation = [
    { name: "仪表板", href: "/dashboard", icon: Home },
    { name: "趋势洞察", href: "/trends", icon: TrendingUp },
    { name: "我的项目", href: "/projects", icon: Video },
    {
      name: "脚本管理",
      icon: Sparkles,
      children: [
        { name: "爆款脚本", href: "/popular-scripts" },
        { name: "图文分析", href: "/image-analysis" },
        { name: "视频分析", href: "/script-generation" },
      ],
    },
    // { name: "图片生成", href: "/image-generation", icon: Image },  // 已隐藏
    // { name: "审核中心", href: "/review", icon: FileCheck, badge: 5 },  // 已隐藏
    { name: "系统管理", href: "/admin", icon: Settings },
  ];

  const notifications = [
    { id: 1, type: "review", message: "项目「教小朋友认识水果」等待您审核", time: "2小时前" },
    { id: 2, type: "complete", message: "AI脚本生成已完成", time: "4小时前" },
    { id: 3, type: "comment", message: "陈主管在项目中添加了评论", time: "1天前" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center gap-4 px-4">
          {/* Logo区域 */}
          <div className="flex items-center gap-2 mr-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X /> : <Menu />}
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:inline-block">社媒视频平台</span>
            </Link>
          </div>

          {/* 搜索框 */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索项目..."
                className="pl-8 w-full"
              />
            </div>
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2 ml-auto">
            {/* 帮助中心 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>使用指南</DropdownMenuItem>
                <DropdownMenuItem>视频教程</DropdownMenuItem>
                <DropdownMenuItem>常见问题</DropdownMenuItem>
                <DropdownMenuItem>联系支持</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 通知中心 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-error">
                    3
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>通知中心</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.map((notif) => (
                  <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3 cursor-pointer">
                    <p className="text-sm">{notif.message}</p>
                    <span className="text-xs text-muted-foreground mt-1">{notif.time}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center justify-center text-primary">
                  查看全部通知
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 用户菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  <span>{currentUsername}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>我的账号</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  <Settings className="mr-2 h-4 w-4" />
                  个人设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-error"
                  onClick={() => {
                    // 清除所有用户信息
                    localStorage.removeItem("userId");
                    localStorage.removeItem("username");
                    localStorage.removeItem("userRole");
                    localStorage.removeItem("userToken");
                    navigate("/login");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 左侧导航栏 */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-card transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:block pt-16 lg:pt-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <nav className="flex flex-col gap-1 p-4">
            {navigation.map((item) => {
              if ("children" in item && item.children) {
                const isExpanded = expandedMenus.includes(item.name);
                const isAnyChildActive = item.children.some(child => location.pathname === child.href);
                
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-lg w-full hover:bg-accent hover:text-accent-foreground",
                        isAnyChildActive && "text-primary"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1 text-left">{item.name}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                    <div className="ml-8 space-y-1">
                      {item.children.map((child) => {
                        const isChildActive = location.pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-sm transition-colors",
                              isChildActive
                                ? "bg-primary text-primary-foreground font-medium"
                                : "hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                    )}
                  </div>
                );
              }
              
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href!}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                  {item.badge && (
                    <Badge className="ml-auto bg-warning text-warning-foreground">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AppLayout;
