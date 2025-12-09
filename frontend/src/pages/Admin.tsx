import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Settings,
  Key,
  Database,
  Shield,
  Bell,
  Trash2,
  Edit,
  Plus,
  FileText,
  User,
} from "lucide-react";

const Admin = () => {
  // 模拟当前用户角色 - 实际应从认证系统获取
  const currentUserRole = "管理员";
  const isAdmin = currentUserRole === "管理员";

  const users = [
    {
      id: 1,
      name: "张三",
      email: "zhangsan@example.com",
      role: "管理员",
      status: "active",
      lastLogin: "2024-01-20 14:30",
    },
    {
      id: 2,
      name: "李四",
      email: "lisi@example.com",
      role: "运营老师",
      status: "active",
      lastLogin: "2024-01-20 12:15",
    },
    {
      id: 3,
      name: "王五",
      email: "wangwu@example.com",
      role: "学科老师",
      status: "inactive",
      lastLogin: "2024-01-18 09:00",
    },
    {
      id: 4,
      name: "赵六",
      email: "zhaoliu@example.com",
      role: "市场老师",
      status: "active",
      lastLogin: "2024-01-19 16:45",
    },
    {
      id: 5,
      name: "孙七",
      email: "sunqi@example.com",
      role: "主管",
      status: "active",
      lastLogin: "2024-01-20 10:30",
    },
  ];

  const availableRoles = ["管理员", "运营老师", "学科老师", "市场老师", "主管"];

  const stats = [
    { label: "总用户数", value: "156", icon: Users, color: "text-primary" },
    { label: "活跃用户", value: "98", icon: Users, color: "text-success" },
    { label: "总项目数", value: "234", icon: Database, color: "text-info" },
    { label: "待审核", value: "12", icon: Shield, color: "text-warning" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">系统管理</h1>
          <p className="text-muted-foreground mt-1">系统配置与用户管理</p>
        </div>
      </div>

      {/* 统计卡片 - 仅管理员可见 */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 管理面板 */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue={isAdmin ? "users" : "profile"}>
            <TabsList>
              {isAdmin && (
                <TabsTrigger value="users">
                  <Users className="mr-2 h-4 w-4" />
                  用户管理
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="settings">
                  <Settings className="mr-2 h-4 w-4" />
                  系统设置
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="api">
                  <Key className="mr-2 h-4 w-4" />
                  API配置
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="prompts">
                  <FileText className="mr-2 h-4 w-4" />
                  提示词设置
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  通知设置
                </TabsTrigger>
              )}
              <TabsTrigger value="profile">
                <User className="mr-2 h-4 w-4" />
                个人设置
              </TabsTrigger>
            </TabsList>

            {/* 用户管理 - 仅管理员可见 */}
            {isAdmin && (
              <TabsContent value="users" className="mt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Input placeholder="搜索用户..." className="max-w-sm" />
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    添加用户
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">用户</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">角色</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">最后登录</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{user.role}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              {user.status === "active" ? (
                                <Badge className="bg-success/10 text-success border-success">
                                  活跃
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-muted">
                                  未激活
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {user.lastLogin}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabsContent>
            )}

            {/* 系统设置 - 仅管理员可见 */}
            {isAdmin && (
              <TabsContent value="settings" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">基础设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>自动审核</Label>
                        <p className="text-sm text-muted-foreground">
                          启用AI自动审核功能
                        </p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>邮件通知</Label>
                        <p className="text-sm text-muted-foreground">
                          发送系统通知邮件
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>数据备份</Label>
                        <p className="text-sm text-muted-foreground">
                          每日自动备份数据
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">安全设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>密码过期时间（天）</Label>
                      <Input type="number" defaultValue="90" />
                    </div>
                    <div className="space-y-2">
                      <Label>登录失败次数限制</Label>
                      <Input type="number" defaultValue="5" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            )}

            {/* API配置 - 仅管理员可见 */}
            {isAdmin && (
              <TabsContent value="api" className="mt-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">API密钥管理</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      配置项目所需的 API 密钥，修改后需要重启后端服务生效
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Apify API Token</Label>
                      <Input 
                        type="password" 
                        placeholder="输入 Apify API Token" 
                        id="apify-token"
                      />
                      <p className="text-xs text-muted-foreground">
                        用于 Instagram 数据抓取 | 获取地址: <a href="https://apify.com/" target="_blank" className="text-primary hover:underline">apify.com</a>
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Google AI API Key</Label>
                      <Input 
                        type="password" 
                        placeholder="输入 Google AI API Key" 
                        id="google-key"
                      />
                      <p className="text-xs text-muted-foreground">
                        用于视频分析、提示词生成 | 获取地址: <a href="https://ai.google.dev/" target="_blank" className="text-primary hover:underline">ai.google.dev</a>
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>AIsonnet API Key</Label>
                      <Input 
                        type="password" 
                        placeholder="输入 AIsonnet API Key" 
                        id="aisonnet-key"
                      />
                      <p className="text-xs text-muted-foreground">
                        用于图片生成（Gemini 2.5 Flash） | 获取地址: <a href="https://newapi.aisonnet.org/" target="_blank" className="text-primary hover:underline">aisonnet.org</a>
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>DeepSeek API Key</Label>
                      <Input 
                        type="password" 
                        placeholder="输入 DeepSeek API Key" 
                        id="deepseek-key"
                      />
                      <p className="text-xs text-muted-foreground">
                        用于文案生成、翻译 | 获取地址: <a href="https://platform.deepseek.com/" target="_blank" className="text-primary hover:underline">platform.deepseek.com</a>
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Sora2 API Key（可选）</Label>
                      <Input 
                        type="password" 
                        placeholder="输入 Sora2 API Key" 
                        id="sora2-key"
                      />
                      <p className="text-xs text-muted-foreground">
                        用于视频生成（可选功能）
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                    <Button>保存配置</Button>
                      <Button variant="outline">下载 .env 文件</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            )}

            {/* 提示词设置 - 仅管理员可见 */}
            {isAdmin && (
              <TabsContent value="prompts" className="mt-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI分析脚本提示词</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>提示词内容</Label>
                      <Textarea 
                        placeholder="输入AI分析脚本时使用的提示词，用于趋势洞察界面的AI分析功能..."
                        className="min-h-[120px]"
                      />
                      <p className="text-sm text-muted-foreground">
                        此提示词将在趋势洞察界面点击"AI分析"时使用
                      </p>
                    </div>
                    <Button>保存提示词</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI生成脚本提示词</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>内容脚本生成提示词</Label>
                      <Textarea 
                        placeholder="输入生成内容脚本时使用的提示词..."
                        className="min-h-[120px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>分镜头脚本生成提示词</Label>
                      <Textarea 
                        placeholder="输入生成分镜头脚本时使用的提示词..."
                        className="min-h-[120px]"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      这些提示词将在脚本生成界面使用
                    </p>
                    <Button>保存提示词</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI审核提示词</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>提示词内容</Label>
                      <Textarea 
                        placeholder="输入图片生成后AI审核时使用的提示词..."
                        className="min-h-[120px]"
                      />
                      <p className="text-sm text-muted-foreground">
                        此提示词将在图片生成后进行AI审核时使用
                      </p>
                    </div>
                    <Button>保存提示词</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            )}

            {/* 通知设置 - 仅管理员可见 */}
            {isAdmin && (
              <TabsContent value="notifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">通知偏好设置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>新项目创建通知</Label>
                      <p className="text-sm text-muted-foreground">
                        有新项目创建时通知管理员
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>审核完成通知</Label>
                      <p className="text-sm text-muted-foreground">
                        视频审核完成后通知创作者
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>系统维护通知</Label>
                      <p className="text-sm text-muted-foreground">
                        系统维护时通知所有用户
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            )}

            {/* 个人设置 - 所有用户可见 */}
            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">个人信息设置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>用户名称</Label>
                    <Input placeholder="请输入用户名称" defaultValue="张三" />
                  </div>
                  <div className="space-y-2">
                    <Label>电子邮箱</Label>
                    <Input type="email" placeholder="请输入电子邮箱" defaultValue="zhangsan@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>修改密码</Label>
                    <Input type="password" placeholder="请输入新密码" />
                  </div>
                  <div className="space-y-2">
                    <Label>确认密码</Label>
                    <Input type="password" placeholder="请再次输入新密码" />
                  </div>
                  <Button>保存设置</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
