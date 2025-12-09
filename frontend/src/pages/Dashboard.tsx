import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Video, FileCheck, Sparkles, BarChart3, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  
  const stats = [
    { label: "进行中项目", value: "12", icon: Video, color: "text-primary" },
    { label: "待审核", value: "5", icon: FileCheck, color: "text-warning" },
    { label: "本月完成", value: "28", icon: TrendingUp, color: "text-success" },
    { label: "AI分析次数", value: "156", icon: Sparkles, color: "text-info" },
  ];

  const recentProjects = [
    { id: 1, name: "教小朋友认识水果", status: "脚本审核中", progress: 65, updatedAt: "2小时前" },
    { id: 2, name: "学习英语字母歌", status: "图片生成中", progress: 80, updatedAt: "4小时前" },
    { id: 3, name: "情绪管理小故事", status: "成品审核中", progress: 90, updatedAt: "1天前" },
  ];

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-2">欢迎回来，张三 👋</h1>
        <p className="text-primary-foreground/90">让我们继续创作优质的教育内容</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} bg-accent p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 主要功能区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快速操作 */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            快速开始
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              className="h-auto py-6 flex-col gap-2 bg-gradient-to-br from-primary to-primary-dark hover:opacity-90"
              onClick={() => navigate('/script-generation')}
            >
              <Sparkles className="w-6 h-6" />
              <div>
                <div className="font-semibold">AI脚本生成</div>
                <div className="text-xs opacity-90">智能创作视频脚本</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/trends')}
            >
              <TrendingUp className="w-6 h-6" />
              <div>
                <div className="font-semibold">趋势洞察</div>
                <div className="text-xs text-muted-foreground">发现热门内容</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/projects')}
            >
              <Video className="w-6 h-6" />
              <div>
                <div className="font-semibold">新建项目</div>
                <div className="text-xs text-muted-foreground">开始新的视频制作</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/review')}
            >
              <FileCheck className="w-6 h-6" />
              <div>
                <div className="font-semibold">审核中心</div>
                <div className="text-xs text-muted-foreground">处理待审核任务</div>
              </div>
            </Button>
          </div>
        </Card>

        {/* 数据概览 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            本周数据
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">项目完成率</span>
                <span className="font-semibold">78%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">审核通过率</span>
                <span className="font-semibold">92%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">平均生产周期</span>
                <span className="font-semibold text-success">-35%</span>
              </div>
              <p className="text-xs text-muted-foreground">较上月缩短</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 最近项目 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            最近项目
          </h2>
          <Button variant="ghost" size="sm">查看全部</Button>
        </div>
        <div className="space-y-4">
          {recentProjects.map((project) => (
            <div key={project.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center text-white font-bold">
                {project.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{project.name}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-muted-foreground">{project.status}</span>
                  <span className="text-xs text-muted-foreground">{project.updatedAt}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all" 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
              <Button variant="outline" size="sm">查看</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
