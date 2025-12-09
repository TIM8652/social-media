"""
Content Analysis Module
Analyzes posts and generates script suggestions using Google AI (Gemini 2.5 Pro)
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os
from google import genai
from google.genai import types
from typing import Optional
import base64
import re
import time
import json
from database import get_db_connection

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

# API Keys
from apiconfig import get_api_key

def get_google_key():
    return get_api_key("get_google_key()") or os.getenv("get_google_key()", "")

class AnalysisRequest(BaseModel):
    post_id: str
    user_id: int

class AnalysisResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

def get_prompt_template_image_sidecar(caption: str) -> str:
    """
    获取 Image/Sidecar 类型的提示词（内置）
    
    Args:
        caption: 竞品文案
    
    Returns:
        完整的提示词
    """
    return f"""## (C) Capacity & Role (角色与能力)
你是一名顶级的社交媒体内容策略师，同时也是专精于中东（MENA）市场的品牌文化专家。你擅长"逆向工程"解构竞品内容，并能将任何创意策略"安全地"本地化，使其100%符合我方的品牌视觉规范和中东的文化红线。

## (I) Insight & Context (洞察与上下文)

**1. 我方品牌信息 (Our Brand DNA):**
* **公司简介:** 我们是一家全球知名在线英语教育品牌"51 Talk"，主要提供针对青少年（3-18岁）的一对一外教在线英语课程。
* **品牌调性:** 专业、友好、有趣。
* **品牌视觉 (VI) 核心:**
    * **主色:** Baby Yellow (#FDE700) 和 Blue (#28B7FF)。
    * **辅助色:** 浅蓝色系 (#ACE5FF, #D09BFF) (用于渐变或卡片)。
    * **中性色:** 深灰色 (#57585A) (用于正文文本) 和 白色 (#FFFFFF) (用于留白和卡片)。

**2. 中东文化红线 (MENA Red Lines):**
* **绝对禁止 (宗教):** 任何非伊斯兰宗教元素（如十字架、教堂、圣诞树、圣诞老人）、哈拉姆内容（猪肉、酒精、赌博）、魔法、占卜、星座。
* **绝对禁止 (社会):** 色情、裸露、婚外恋爱（男女朋友、约会）、LGBTQ（彩虹旗）。
* **绝对禁止 (政治):** 以色列相关、恐怖组织。
* **绝对禁止 (节日):** 所有非伊斯兰节日（圣诞节、万圣节、情人节、生日庆祝）。
* **中等风险 (谨慎替换):**
    * **服装:** 避免紧身、短裤、吊带、纹身。插画人物必须着装保守（长袖、长裤）。
    * **互动:** 避免陌生男女拥抱、牵手。
    * **动物:** 用"猫"代替"狗"。
    * **活动:** 用"家庭聚会/听音乐"代替"派对/舞会/摇滚"。

**3. 竞品帖子 (Competitor Input):**
* **[INPUT] 竞品文案原文:**
```
{caption}
```
* **[INPUT] 竞品图片/视觉描述:**
```
[已通过图片上传]
```

## (R) Request & Task (请求与任务)
请严格遵守上述 (I) 中的所有规范，执行以下两项任务：
1. **分析竞品:** 解构用户在 (I) 中输入的竞品帖子的核心策略。
2. **生成脚本:** 基于竞品的核心策略，创作一个**全新的、符合文化红线**的爆款参照脚本。

## (S) Steps to Execute & Style (执行步骤与风格)
请按照以下结构清晰输出：（不要输出开场白，每次输出只允许按照以下格式输出）

**【一、 竞品帖子策略分析】**
1. **内容定位 (Content Pillar):** (这篇帖子的主要目的是什么？例如：产品促销、情感共鸣、教育价值、品牌建设...)
2. **视觉策略 (Visual Strategy):** (图片风格是什么？例如：真人实景、品牌IP卡通、梗图/截图、设计海报...)
3. **文案策略 (Copy Strategy):** (文案的语气、结构、行动号召(CTA)是什么？)
4. **目标受众 (Target Audience):** (这篇帖子主要在和谁对话？例如：家长、学生...)
5. **成功归因 (Success factors):** (总结这篇帖子成功的两个主要因素，成功因素最好是在4个字以内。例如：痛点明确、方案实用。)

**【二、 我方爆款参照脚本 (已适配)】**
1. **策略适配洞察:** (简要说明你是如何"模仿"竞品风格并"替换"核心内容的。)
2. **帖子文案 (Post Copy):**
   *(在此处生成用于发布的新文，只提供【中文】版本。)*
   *(推荐标签 (Hashtags)(#OurBrandName #EnglishForKids #MENAParents 只提供【中文】版本...)*
3. **图片生成提示词 (Image Prompts):** 
   *(如果是单张图片，只在这里生成该图片的提示词，必须使用以下格式：)*
   
   **图片提示词：**
   [主体描述+风格类词汇+色彩类词汇（根据品牌调性）+构图布局类词汇+可用于AI绘图的中文提示词]
   
   *(如果是多张图片（Sidecar类型），请为每张图片单独生成提示词，必须使用以下格式：)*
   
   **第一张图片提示词：**
   [主体描述+风格类词汇+色彩类词汇（根据品牌调性）+构图布局类词汇+可用于AI绘图的中文提示词]
   
   **第二张图片提示词：**
   [主体描述+风格类词汇+色彩类词汇（根据品牌调性）+构图布局类词汇+可用于AI绘图的中文提示词]
   
   **第三张图片提示词：**
   [主体描述+风格类词汇+色彩类词汇（根据品牌调性）+构图布局类词汇+可用于AI绘图的中文提示词]
   
   *(以此类推，有多少张图片就生成多少个提示词。如果需要在图片中加入文字，请使用准确的阿拉伯语文本。不要在提示词中指定图片比例。)*

## (P) Parameters & Constraints (参数与约束)
* **[最重要] 合规约束:** 脚本（文案和图片）必须100%规避 (I) 中提到的所有中东文化红线。
* **[重要] 品牌约束:** 视觉提示词应**优先模仿**【一、 竞品帖子策略分析】中的"视觉策略"、"色彩风格"和"构图布局"。在模仿的基础上，**尝试**将我方品牌色（如 Baby Yellow #FDE700 或 Blue #28B7FF）融入。
* **[重要] 策略约束:** 不要照搬竞品的内容，而是要**提取其成功的"结构"或"洞察"**，然后用我方品牌和安全的内容去填充它。将帖子的**核心内容**（如文案、具体的人物、产品信息）替换为我方品牌和安全的内容。目标是"看起来像，但说的是我方的事"。
* **[重要] 图片文字约束:** 如果你决定在图片中生成文字（例如，在模拟的推文截图中），你必须使用**准确、规范的阿拉伯语文本**，并在提示词中清晰地包含它。
* **[重要] 图片比例约束:** 输出的图片生成提示词中，**不要包含**任何图片比例参数（如 --ar 3:4）。
* **输出约束:** 你的分析和脚本内容请使用**中文**生成，**并严格按照中文的排版输出，中文必须向左对齐**（脚本中的"帖子文案"部分除外，该部分需提供中文和阿拉伯语）（不要输出开场白，每次输出只允许按照输出格式进行输出）。"""


def get_prompt_template_video(caption: str) -> str:
    """
    获取 Video 类型的提示词（内置）
    
    Args:
        caption: 竞品文案
    
    Returns:
        完整的提示词
    """
    return f"""## (C) Capacity & Role (角色与能力)
你是一名顶级的社交媒体分析师，专精于中东（MENA）市场的短视频（Reels）内容生态。你拥有敏锐的洞察力，能够"逆向工程"解构任何视频帖子的爆款逻辑，将其拆解为底层的策略元素。

## (I) Insight & Context (洞察与上下文)

**1. 分析框架:**
你将使用一个专业的5点视频分析框架来解构视频内容，该框架包括：
* **核心定位 (Content Pillar):** 视频的商业目的（如：故事营销、痛点问答、社群玩梗、干货教学）。
* **叙事结构 (Narrative Structure):** 信息的组织方式（如：PAS模型、Q&A、期望vs现实）。
* **黄金钩子 (The Hook):** 视频前3秒吸引用户注意力的技巧。
* **听觉策略 (Audio Strategy):** 音频（原创VO或趋势音乐）和字幕的角色。
* **转化策略 (Conversion Strategy / CTA):** 视频本身（尤其是结尾）引导转化的方式。

**2. 竞品帖子 (Competitor Input):**
* **[INPUT] 竞品文案原文:**
```
{caption}
```
* **[INPUT] 竞品视频内容描述:**
```
[已通过视频上传]
```

## (R) Request & Task (请求与任务)
请严格按照 (S) 中定义的结构，对 (I) 中输入的竞品帖子进行详细分析。

## (S) Steps to Execute & Style (执行步骤与风格)
请按照以下三个部分，清晰地输出你的分析报告：（不要输出开场白，每次输出只允许按照以下格式输出）

**【一、 帖子文案分析 (Caption Analysis)】**

* **文案角色:** (分析文案的主要作用：是作为视频内容的补充、对视频的总结、纯粹的CTA引导，还是提供了视频中未提及的额外信息？)
* **核心信息:** (文案传达的关键点是什么？)
* **文案CTA (行动号召):** (文案中的行动号召是什么？例如：引导用户评论、点击主页链接、分享给朋友等。)

**【二、 标签分析 (Hashtag Analysis)】**

* **标签构成:** (分析标签的类型组合：品牌词 [#BrandName]、行业大词 [#EnglishLearning]、社群词 [#MENAParents]、本地化词 [#Riyadh] 等。)
* **标签策略:** (分析这些标签的主要目的：是为了品牌曝光、吸引精准的目标受众，还是为了蹭热点？)
* **成功归因:** (总结这篇帖子成功的两个主要因素，成功因素最好是在4个字以内。例如：痛点明确、方案实用。)

**【三、 视频内容分析 (Video Content Analysis)】**

1. **核心定位 (Content Pillar):** (这个视频的目的是什么？例如：故事营销、痛点问答、社群玩梗、干货教学、用户证言...)
2. **叙事结构 (Narrative Structure):** (视频的"剧本"是什么？例如：使用了PAS模型、Q&A结构、期望vs现实、清单体、前后对比...)
3. **黄金3秒钩子 (The Hook):** (视频开头1-3秒是如何抓住用户注意力的？例如：提出了一个强烈的痛点、展示了一个令人好奇的画面、使用了身份共鸣...)
4. **听觉策略 (Audio Strategy):** (视频是如何使用声音的？例如：使用了原创画外音(VO)来建立专业性、使用了动态字幕来适配静音观看、还是使用了热门趋势音乐来增加趣味性？)
5. **视觉与转化 (Visuals & CTA):** (视频画面本身（尤其是屏上文字和结尾）是如何引导用户行动的？例如：结尾清晰展示了注册页面、用屏上文字引导评论、还是纯品牌形象展示？)

## (P) Parameters & Constraints (参数与约束)
* **专注分析:** 你的任务**仅限于分析**竞品帖子。
* **禁止创作:** **不要**生成任何参照脚本或为我方公司提出建议。
* **语言:** 你的所有分析报告必须使用**中文**撰写。
* **输出:** （不要输出开场白，每次输出只允许按照指定格式输出）"""

def parse_analysis_result_image_sidecar(response_text: str) -> dict:
    """
    解析 Image/Sidecar 类型的分析结果
    
    返回:
        {
            "jianyi1": "【一】中的：内容定位+视觉策略+文案策略+目标受众",
            "success": "成功归因",
            "jianyi1.5": "【二】中的策略适配洞察",
            "jianyi2": "【二】中的帖子文案+推荐标签",
            "prompt": "单图提示词（Image类型）",
            "prompt_array": ["多图提示词数组（Sidecar类型）"]
        }
    """
    result = {
        "jianyi1": "",
        "success": "",
        "jianyi1.5": "",
        "jianyi2": "",
        "prompt": None,
        "prompt_array": None
    }
    
    try:
        # 提取【一、 竞品帖子策略分析】
        section_one_match = re.search(
            r'【一、\s*竞品帖子策略分析】(.*?)(?=【二、|$)', 
            response_text, 
            re.DOTALL
        )
        
        if section_one_match:
            section_one = section_one_match.group(1).strip()
            
            # 提取内容定位
            content_pillar = re.search(r'(?:1\.|内容定位|Content Pillar)[:：\s]*(.*?)(?=\n\s*(?:2\.|视觉策略|Visual Strategy)|$)', section_one, re.DOTALL)
            # 提取视觉策略
            visual_strategy = re.search(r'(?:2\.|视觉策略|Visual Strategy)[:：\s]*(.*?)(?=\n\s*(?:3\.|文案策略|Copy Strategy)|$)', section_one, re.DOTALL)
            # 提取文案策略
            copy_strategy = re.search(r'(?:3\.|文案策略|Copy Strategy)[:：\s]*(.*?)(?=\n\s*(?:4\.|目标受众|Target Audience)|$)', section_one, re.DOTALL)
            # 提取目标受众
            target_audience = re.search(r'(?:4\.|目标受众|Target Audience)[:：\s]*(.*?)(?=\n\s*(?:5\.|成功归因|Success factors)|$)', section_one, re.DOTALL)
            # 提取成功归因
            success_factors = re.search(r'(?:5\.|成功归因|Success factors)[:：\s]*(.*?)$', section_one, re.DOTALL)
            
            # 组合 jianyi1
            jianyi1_parts = []
            if content_pillar:
                jianyi1_parts.append(f"内容定位: {content_pillar.group(1).strip()}")
            if visual_strategy:
                jianyi1_parts.append(f"视觉策略: {visual_strategy.group(1).strip()}")
            if copy_strategy:
                jianyi1_parts.append(f"文案策略: {copy_strategy.group(1).strip()}")
            if target_audience:
                jianyi1_parts.append(f"目标受众: {target_audience.group(1).strip()}")
            
            result["jianyi1"] = "\n\n".join(jianyi1_parts)
            
            # success 字段
            if success_factors:
                result["success"] = success_factors.group(1).strip()
        
        # 提取【二、 我方爆款参照脚本】
        section_two_match = re.search(
            r'【二、\s*我方爆款参照脚本[^】]*】(.*?)$', 
            response_text, 
            re.DOTALL
        )
        
        if section_two_match:
            section_two = section_two_match.group(1).strip()
            
            # 1. 提取"1. **策略适配洞察:**"部分 → 存到 jianyi1.5
            strategy_match = re.search(
                r'1\.\s*\*?\*?策略适配洞察.*?[:：]\*?\*?\s*(.*?)(?=\n\s*2\.\s*\*?\*?帖子文案|$)',
                section_two,
                re.DOTALL
            )
            if strategy_match:
                result["jianyi1.5"] = strategy_match.group(1).strip()
            
            # 2. 提取"2. **帖子文案 (Post Copy):**"部分 → 存到 jianyi2
            post_copy_match = re.search(
                r'2\.\s*\*?\*?帖子文案.*?[:：]\*?\*?\s*(.*?)(?=\n\s*3\.\s*\*?\*?图片生成提示词|$)',
                section_two,
                re.DOTALL
            )
            if post_copy_match:
                result["jianyi2"] = post_copy_match.group(1).strip()
            
            # 3. 提取"3. **图片生成提示词 (Image Prompts):**"部分 → 分析是单图还是多图
            image_prompts_match = re.search(
                r'3\.\s*\*?\*?图片生成提示词.*?[:：]\*?\*?\s*(.*?)$',
                section_two,
                re.DOTALL
            )
            
            if image_prompts_match:
                prompts_text = image_prompts_match.group(1).strip()
                
                # 检查是否是多图格式（包含"第X张图片提示词"）
                multi_image_pattern = r'\*?\*?第[一二三四五六七八九十\d]+张图片提示词[:：]\*?\*?\s*'
                
                if re.search(multi_image_pattern, prompts_text):
                    # Sidecar 类型：按"第X张"分割成数组
                    parts = re.split(multi_image_pattern, prompts_text)
                    prompt_array = []
                    for p in parts[1:]:  # 跳过第一个空元素
                        if p.strip():
                            # 清理每个提示词，去掉可能的标记
                            cleaned = p.strip()
                            # 去掉可能的"图片提示词："或"提示词："前缀
                            cleaned = re.sub(r'^[\*\s]*(?:图片)?提示词[:：]\s*', '', cleaned)
                            prompt_array.append(cleaned)
                    result["prompt_array"] = prompt_array if prompt_array else None
                    result["prompt"] = None
                else:
                    # Image 类型：整个作为单个提示词
                    # 去掉可能的"图片提示词："或"提示词："前缀
                    cleaned_prompt = re.sub(r'^[\*\s]*(?:图片)?提示词[:：]\s*', '', prompts_text)
                    result["prompt"] = cleaned_prompt.strip()
                    result["prompt_array"] = None
        
    except Exception as e:
        print(f"解析分析结果失败: {str(e)}")
        # 如果解析失败，返回原始文本
        result["jianyi1"] = response_text
    
    return result

def parse_analysis_result_video(response_text: str) -> dict:
    """
    解析 Video 类型的分析结果
    
    返回:
        {
            "jianyi3": "所有返回数据（不含成功归因）",
            "success": "【二、标签分析】中的成功归因"
        }
    """
    result = {
        "jianyi3": response_text,
        "success": ""
    }
    
    try:
        # 提取【二、 标签分析】中的成功归因
        section_two_match = re.search(
            r'【二、\s*标签分析[^】]*】(.*?)(?=【三、|$)', 
            response_text, 
            re.DOTALL
        )
        
        if section_two_match:
            section_two = section_two_match.group(1).strip()
            
            # 提取成功归因（与 Image/Sidecar 使用相同的正则表达式）
            success_match = re.search(
                r'(?:\*\s*\*\*|)\s*(?:成功归因|Success factors)\s*[:：]\s*(.*?)$',
                section_two, 
                re.DOTALL
            )
            
            if success_match:
                result["success"] = success_match.group(1).strip()
                print(f"✓ 提取成功归因: {result['success'][:50]}...")
                
                # 从 jianyi3 中移除成功归因部分
                success_full_pattern = re.compile(
                    r'\*\s*\*\*\s*(?:成功归因|Success factors)\s*[:：]\s*[^\n]*',
                    re.IGNORECASE
                )
                result["jianyi3"] = success_full_pattern.sub('', response_text).strip()
            else:
                print("⚠ 未找到成功归因")
        else:
            print("⚠ 未找到【二、标签分析】部分")
    
    except Exception as e:
        print(f"❌ 解析视频分析结果失败: {str(e)}")
        import traceback
        traceback.print_exc()
    
    return result

def analyze_with_google_ai_multimodal(prompt: str, media_parts: list) -> str:
    """
    使用 Google AI (Gemini 2.5 Pro) 分析多模态内容
    
    Args:
        prompt: 提示词文本
        media_parts: 媒体部分列表（图片或视频）
    
    Returns:
        分析结果文本
    """
    try:
        if not get_google_key():
            raise Exception("Google AI API密钥未配置")
        
        # 创建客户端
        client = genai.Client(api_key=get_google_key())
        
        # 准备内容：媒体在前，提示词在后
        contents = media_parts + [prompt]
        
        print(f"正在使用 Gemini 2.5 Pro 分析... (媒体数量: {len(media_parts)})")
        
        # 调用 API
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                print(f"尝试 {attempt + 1}/{max_retries}...")
                response = client.models.generate_content(
                    model='gemini-2.5-pro',
                    contents=contents,
                )
                
                print(f"✅ 分析完成: {len(response.text)} 字符")
                return response.text.strip()
                
            except Exception as retry_error:
                last_error = retry_error
                print(f"❌ 尝试 {attempt + 1} 失败: {str(retry_error)}")
                
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    print(f"⏳ 等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
        
        raise Exception(f"Google AI 分析失败（已重试 {max_retries} 次）: {str(last_error)}")
        
    except Exception as e:
        print(f"❌ Google AI 分析错误: {str(e)}")
        raise Exception(f"Google AI 分析失败: {str(e)}")

@router.post("/script", response_model=AnalysisResponse)
def analyze_script(request: AnalysisRequest):
    """
    分析脚本接口
    
    根据帖子类型使用不同的提示词和分析逻辑：
    - Image: tishici1.txt + caption + display_url_base64
    - Sidecar: tishici2.txt + caption + display_url_base64 + images_base64[]
    - Video: tishici3.txt + caption + video_url_base64
    - Sidecar_video: 暂不处理
    """
    try:
        print(f"\n{'='*60}")
        print(f"开始分析脚本")
        print(f"Post ID: {request.post_id}")
        print(f"User ID: {request.user_id}")
        print(f"{'='*60}\n")
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Step 1: 获取帖子数据
        print("Step 1: 从 post_data 表获取帖子数据...")
        cur.execute("""
            SELECT post_id, post_type, caption, 
                   display_url_base64, images_base64,
                   video_url_base64
            FROM post_data
            WHERE post_id = %s
        """, (request.post_id,))
        
        post = cur.fetchone()
        if not post:
            raise HTTPException(status_code=404, detail=f"帖子 {request.post_id} 不存在")
        
        post_type = post['post_type']
        caption = post['caption'] or ""
        
        print(f"✅ 帖子类型: {post_type}")
        print(f"✅ 文案长度: {len(caption)} 字符")
        
        # Step 2: 根据类型处理
        if post_type == "Sidecar_video":
            raise HTTPException(status_code=400, detail="Sidecar_video 类型暂不支持分析")
        
        if post_type not in ["Image", "Sidecar", "Video"]:
            raise HTTPException(status_code=400, detail=f"不支持的帖子类型: {post_type}")
        
        # Step 3: 生成提示词
        print(f"Step 2: 生成提示词...")
        if post_type in ["Image", "Sidecar"]:
            full_prompt = get_prompt_template_image_sidecar(caption)
        elif post_type == "Video":
            full_prompt = get_prompt_template_video(caption)
        
        print(f"✅ 提示词长度: {len(full_prompt)} 字符")
        
        # Step 4: 准备媒体数据
        print(f"Step 3: 准备媒体数据...")
        media_parts = []
        
        if post_type == "Image":
            # Image 类型: display_url_base64
            if not post['display_url_base64']:
                raise HTTPException(status_code=400, detail="Image 类型缺少 display_url_base64")
            
            image_bytes = base64.b64decode(post['display_url_base64'])
            media_parts.append(
                types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
            )
            print(f"✅ 添加封面图: {len(image_bytes)/1024/1024:.2f} MB")
        
        elif post_type == "Sidecar":
            # Sidecar 类型: display_url_base64 + images_base64[]
            # 顺序：先 display，再 images（按顺序）
            if not post['display_url_base64']:
                raise HTTPException(status_code=400, detail="Sidecar 类型缺少 display_url_base64")
            
            # 先添加封面图
            image_bytes = base64.b64decode(post['display_url_base64'])
            media_parts.append(
                types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
            )
            print(f"✅ 添加封面图: {len(image_bytes)/1024/1024:.2f} MB")
            
            # 再添加 images_base64（按顺序）
            if post['images_base64']:
                images_list = json.loads(post['images_base64']) if isinstance(post['images_base64'], str) else post['images_base64']
                for idx, img_base64 in enumerate(images_list):
                    if img_base64:  # 跳过 null
                        img_bytes = base64.b64decode(img_base64)
                        media_parts.append(
                            types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg')
                        )
                        print(f"✅ 添加图片 {idx + 1}: {len(img_bytes)/1024/1024:.2f} MB")
        
        elif post_type == "Video":
            # Video 类型: video_url_base64
            if not post['video_url_base64']:
                raise HTTPException(status_code=400, detail="Video 类型缺少 video_url_base64")
            
            video_bytes = base64.b64decode(post['video_url_base64'])
            media_parts.append(
                types.Part(
                    inline_data=types.Blob(data=video_bytes, mime_type='video/mp4')
                )
            )
            print(f"✅ 添加视频: {len(video_bytes)/1024/1024:.2f} MB")
        
        # Step 5: 调用 Google AI 分析
        print(f"Step 4: 调用 Google AI 分析...")
        analysis_result = analyze_with_google_ai_multimodal(full_prompt, media_parts)
        
        print(f"✅ 分析结果长度: {len(analysis_result)} 字符")
        
        # Step 6: 解析结果
        print(f"Step 5: 解析分析结果...")
        if post_type in ["Image", "Sidecar"]:
            parsed_result = parse_analysis_result_image_sidecar(analysis_result)
            print(f"✅ jianyi1: {len(parsed_result['jianyi1'])} 字符")
            print(f"✅ success: {len(parsed_result['success'])} 字符")
            print(f"✅ jianyi1.5: {len(parsed_result['jianyi1.5'])} 字符")
            print(f"✅ jianyi2: {len(parsed_result['jianyi2'])} 字符")
            print(f"✅ prompt: {len(parsed_result['prompt']) if parsed_result['prompt'] else 0} 字符")
            if parsed_result['prompt_array']:
                print(f"✅ prompt_array: {len(parsed_result['prompt_array'])} 个提示词")
                for i, p in enumerate(parsed_result['prompt_array'], 1):
                    print(f"   - 第{i}张: {len(p)} 字符")
        elif post_type == "Video":
            parsed_result = parse_analysis_result_video(analysis_result)
            print(f"✅ jianyi3: {len(parsed_result['jianyi3'])} 字符")
            print(f"✅ success: {len(parsed_result['success'])} 字符")
        
        # Step 7: 保存到 popular 表
        print(f"Step 6: 保存到 popular 表...")
        
        # 检查记录是否已存在
        cur.execute("""
            SELECT id FROM popular WHERE user_id = %s AND post_id = %s
        """, (request.user_id, request.post_id))
        
        existing = cur.fetchone()
        
        if existing:
            # 更新现有记录
            if post_type == "Image":
                cur.execute("""
                    UPDATE popular 
                    SET jianyi1 = %s,
                        success = %s,
                        "jianyi1.5" = %s,
                        jianyi2 = %s,
                        prompt = %s,
                        prompt_array = NULL,
                        display_url_base64 = %s::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s AND post_id = %s
                """, (
                    parsed_result['jianyi1'],
                    parsed_result['success'],
                    parsed_result['jianyi1.5'],
                    parsed_result['jianyi2'],
                    parsed_result['prompt'],
                    json.dumps(post['display_url_base64']) if post['display_url_base64'] else None,
                    request.user_id,
                    request.post_id
                ))
            elif post_type == "Sidecar":
                cur.execute("""
                    UPDATE popular 
                    SET jianyi1 = %s,
                        success = %s,
                        "jianyi1.5" = %s,
                        jianyi2 = %s,
                        prompt = NULL,
                        prompt_array = %s::jsonb,
                        display_url_base64 = %s::jsonb,
                        images_base64 = %s::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s AND post_id = %s
                """, (
                    parsed_result['jianyi1'],
                    parsed_result['success'],
                    parsed_result['jianyi1.5'],
                    parsed_result['jianyi2'],
                    json.dumps(parsed_result['prompt_array']) if parsed_result['prompt_array'] else None,
                    json.dumps(post['display_url_base64']) if post['display_url_base64'] else None,
                    json.dumps(post['images_base64']) if post['images_base64'] else None,
                    request.user_id,
                    request.post_id
                ))
            elif post_type == "Video":
                cur.execute("""
                    UPDATE popular 
                    SET jianyi3 = %s,
                        success = %s,
                        video_url_base64 = %s::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s AND post_id = %s
                """, (
                    parsed_result['jianyi3'],
                    parsed_result['success'],
                    json.dumps(post['video_url_base64']) if post['video_url_base64'] else None,
                    request.user_id,
                    request.post_id
                ))
            print("✅ 更新现有记录")
        else:
            # 插入新记录
            if post_type == "Image":
                cur.execute("""
                    INSERT INTO popular 
                    (user_id, post_id, post_type, jianyi1, success, "jianyi1.5", jianyi2, prompt, display_url_base64)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                """, (
                    request.user_id,
                    request.post_id,
                    post_type,
                    parsed_result['jianyi1'],
                    parsed_result['success'],
                    parsed_result['jianyi1.5'],
                    parsed_result['jianyi2'],
                    parsed_result['prompt'],
                    json.dumps(post['display_url_base64']) if post['display_url_base64'] else None
                ))
            elif post_type == "Sidecar":
                cur.execute("""
                    INSERT INTO popular 
                    (user_id, post_id, post_type, jianyi1, success, "jianyi1.5", jianyi2, prompt_array, display_url_base64, images_base64)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb)
                """, (
                    request.user_id,
                    request.post_id,
                    post_type,
                    parsed_result['jianyi1'],
                    parsed_result['success'],
                    parsed_result['jianyi1.5'],
                    parsed_result['jianyi2'],
                    json.dumps(parsed_result['prompt_array']) if parsed_result['prompt_array'] else None,
                    json.dumps(post['display_url_base64']) if post['display_url_base64'] else None,
                    json.dumps(post['images_base64']) if post['images_base64'] else None
                ))
            elif post_type == "Video":
                cur.execute("""
                    INSERT INTO popular 
                    (user_id, post_id, post_type, jianyi3, success, video_url_base64)
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                """, (
                    request.user_id,
                    request.post_id,
                    post_type,
                    parsed_result['jianyi3'],
                    parsed_result['success'],
                    json.dumps(post['video_url_base64']) if post['video_url_base64'] else None
                ))
            print("✅ 插入新记录")
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"\n{'='*60}")
        print(f"✅ 分析完成并保存成功!")
        print(f"{'='*60}\n")
        
        return AnalysisResponse(
            success=True,
            message="分析完成",
            data=parsed_result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"\n❌ 分析失败: {str(e)}\n")
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")