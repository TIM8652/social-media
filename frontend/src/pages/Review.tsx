import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Clock, Search, Filter, Play } from "lucide-react";

const Review = () => {
  const [activeTab, setActiveTab] = useState("pending");

  const videos = [
    {
      id: 1,
      title: "职场沟通技巧分享",
      creator: "张三",
      platform: "抖音",
      status: "pending",
      submitTime: "2024-01-20 14:30",
      duration: "60秒",
      thumbnail: "/placeholder.svg",
    },
    {
      id: 2,
      title: "美食探店-网红餐厅",
      creator: "李四",
      platform: "小红书",
      status: "approved",
      submitTime: "2024-01-20 12:15",
      duration: "45秒",
      thumbnail: "/placeholder.svg",
    },
    {
      id: 3,
      title: "旅游攻略-三亚游玩",
      creator: "王五",
      platform: "视频号",
      status: "rejected",
      submitTime: "2024-01-20 10:00",
      duration: "90秒",
      thumbnail: "/placeholder.svg",
      rejectReason: "内容质量不符合标准",
    },
  ];

  const stats = [
    { label: "待审核", value: "12", color: "text-warning", icon: Clock },
    { label: "今日已审", value: "45", color: "text-success", icon: CheckCircle2 },
    { label: "今日拒绝", value: "3", color: "text-destructive", icon: XCircle },
    { label: "审核通过率", value: "93.8%", color: "text-primary", icon: CheckCircle2 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">待审核</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-success/10 text-success border-success">已通过</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">已拒绝</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">审核中心</h1>
          <p className="text-muted-foreground mt-1">视频内容审核管理</p>
        </div>
      </div>

      {/* 统计卡片 */}
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

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索视频标题、创作者..." className="pl-9" />
            </div>
            <Select>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="平台筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                <SelectItem value="ins">Ins</SelectItem>
                <SelectItem value="whatsapp">Whatsapp</SelectItem>
                <SelectItem value="wechat">公众号</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 审核列表 */}
      <Card>
        <CardHeader>
          <CardTitle>视频列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">待审核 (12)</TabsTrigger>
              <TabsTrigger value="approved">已通过</TabsTrigger>
              <TabsTrigger value="rejected">已拒绝</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-4">
                {videos
                  .filter((v) => activeTab === "all" || v.status === activeTab)
                  .map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="relative w-32 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <Play className="h-8 w-8 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{video.title}</h3>
                          {getStatusBadge(video.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          创作者: {video.creator} • 平台: {video.platform} • 时长: {video.duration}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          提交时间: {video.submitTime}
                        </p>
                        {video.rejectReason && (
                          <p className="text-sm text-destructive mt-1">
                            拒绝原因: {video.rejectReason}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {video.status === "pending" ? (
                          <>
                            <Button size="sm" variant="outline">
                              <Play className="mr-2 h-4 w-4" />
                              预览
                            </Button>
                            <Button size="sm" className="bg-success hover:bg-success/90">
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              通过
                            </Button>
                            <Button size="sm" variant="destructive">
                              <XCircle className="mr-2 h-4 w-4" />
                              拒绝
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline">
                            查看详情
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Review;
