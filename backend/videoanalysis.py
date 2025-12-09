"""
Video Analysis Module
Handles video analysis data inheritance from popular to mypostl
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import json
import os
from google import genai
from google.genai import types
import time
import requests
import base64
from database import get_db_connection

router = APIRouter(prefix="/api/video-analysis", tags=["video-analysis"])

# API Keys
from apiconfig import get_api_key

def get_google_key():
    return get_api_key("get_google_key()") or os.getenv("get_google_key()", "")

def get_sora2_key():
    return get_api_key("get_sora2_key()") or os.getenv("get_sora2_key()", "")

def get_deepseek_key():
    return get_api_key("get_deepseek_key()") or os.getenv("get_deepseek_key()", "")

def translate_to_english_with_deepseek(text: str) -> str:
    """
    使用 DeepSeek 将中文翻译成英文
    
    Args:
        text: 需要翻译的中文文本
    
    Returns:
        翻译后的英文文本
    """
    if not get_deepseek_key():
        print("⚠️  DeepSeek API Key 未配置，跳过翻译")
        return text
    
    try:
        print(f"\n📝 使用 DeepSeek 翻译文本...")
        print(f"原文长度: {len(text)} 字符")
        
        headers = {
            "Authorization": f"Bearer {get_deepseek_key()}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": "把这段提示词中的所有文本都翻译成英文，保留格式（一定要百分百保留格式）"
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            "temperature": 0.3
        }
        
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=60
        )
        
        response.raise_for_status()
        result = response.json()
        
        translated_text = result["choices"][0]["message"]["content"].strip()
        
        print(f"✅ 翻译完成，译文长度: {len(translated_text)} 字符")
        
        return translated_text
        
    except Exception as e:
        print(f"⚠️  翻译失败: {str(e)}")
        print(f"使用原文本继续...")
        return text

# get_db_connection 已从 database.py 导入，无需重复定义


def build_shot_script_prompt(jianyi1: str, jianyi3: str) -> str:
    """
    构建分镜头脚本生成提示词
    
    Args:
        jianyi1: 包含脚本主题、内容风格、关键词、特殊要求的字段
        jianyi3: 视频分析内容
    
    Returns:
        完整的提示词
    """
    # 解析 jianyi1 中的各个字段
    script_topic = ""
    content_style = ""
    keywords = ""
    special_requirements = ""
    
    if jianyi1:
        lines = jianyi1.split('\n')
        for line in lines:
            if line.startswith('脚本主题：'):
                script_topic = line.replace('脚本主题：', '').strip()
            elif line.startswith('内容风格：'):
                content_style = line.replace('内容风格：', '').strip()
            elif line.startswith('关键词：'):
                keywords = line.replace('关键词：', '').strip()
            elif line.startswith('特殊要求：'):
                special_requirements = line.replace('特殊要求：', '').strip()
    
    # 构建完整提示词
    prompt = f"""## (C) Capacity & Role (能力与角色)

你是一位顶级的病毒式内容策略师兼金牌编剧。你的核心专长是"爆款结构迁移"，即精准分析任何成功短视频（Reels/Shorts/TikTok）的叙事结构、钩子、节奏和转化策略，然后将这套"成功公式"无缝地应用到全新的主题和品牌上，创作出一个兼具病毒传播潜力和品牌价值的完整"内容包"（视频脚本 + 社媒文案）。你特别擅长通过多元化的视觉呈现来体现品牌的国际化特色。

## (I) Insight & Context (背景信息与洞察)

**1. 爆款参考脚本分析 (The Proven Formula):**

{jianyi3}

**2. 新内容创意简报 (The New Creative Brief):**

*   **[INPUT-2: 脚本主题]:** {script_topic}
*   **[INPUT-3: 内容风格]:** {content_style}
*   **[INPUT-4: 核心关键词]:** {keywords}
*   **[INPUT-5: 额外要求]:** {special_requirements}
*   **[INPUT-6: 品牌/公司信息]: 我们是一家全球知名在线英语教育品牌"51 Talk"，主要提供针对青少年（3-18岁）的一对一外教在线英语课程。**

**3. 视觉多样性要求:**

*   **国际化面孔呈现:** 脚本中出现的主角（包括老师、学生、家长等角色）必须体现多元化特征，优先选择：**中东面孔、菲裔面孔、欧美面孔**等国际化外貌特征。这不仅体现品牌的全球化师资优势，更能增强内容的包容性和吸引力。
*   **角色分配策略:** 当脚本涉及"外教老师"角色时，优先使用欧美面孔或其他非亚裔面孔；当涉及"学生/家长"角色时，可灵活搭配不同面孔，展现用户群体的多样性。

## (R) Request & Task (请求与任务)

你的核心任务是，严格遵循 [INPUT-1] 中的**"爆款结构"**，并结合 [INPUT-2] 至 [INPUT-6] 的**"新创意简报"**以及**"视觉多样性要求"**，创作一个全新的、完整的**"病毒式视频内容包"**。

*   **结构映射要求:** 新脚本的"核心定位"、"叙事结构"、"钩子"和"转化策略"必须与 [INPUT-1] 的分析结果保持绝对一致。
*   **内容整合要求:** 新脚本和文案的具体内容必须围绕 [INPUT-2] 的主题，体现 [INPUT-3] 的风格，并自然地植入 [INPUT-4] 的关键词、[INPUT-5] 的额外要求以及 [INPUT-6] 的品牌信息。
*   **视觉呈现要求:** 脚本中的所有人物角色必须明确标注面孔特征（中东面孔/菲裔面孔/欧美面孔等），确保视觉呈现的国际化和多样性。

## (S) Statement & Output Format (指令与输出格式)

请严格按照以下 Markdown 格式输出，不要添加任何开场白或解释。每次只输出一个完整的内容包。

---

**【全新病毒式视频内容包】**

**1. 视频主题:**
*   [根据新创意简报提炼的、引人注目的视频标题]

**2. 内容梗概:**
*   [用一句话总结脚本核心亮点 ，确保能在15秒内传达完毕。必须在梗概中明确提及主要角色的面孔特征，如："通过一位中东面孔妈妈的发音困扰切入...展示欧美面孔外教的解决方案..."]

**3. 分镜头脚本 (Shot-by-Shot):**

*   **[场景 1 | 钩子 | 0-3秒]** (对应参考脚本的钩子类型)
    *   **视觉:** [详细描述画面内容，必须明确标注人物的面孔特征，如："一位焦虑的菲裔面孔妈妈，背景是孩子在艰难地读英语单词"]
    *   **台词/字幕:** [包含VO、人物对话或关键屏上文字]

*   **[场景 2 | 承接 | 4-7秒]** (对应参考脚本的叙事结构-承)
    *   **视觉:** [描述画面内容，继续标注人物面孔特征]
    *   **台词/字幕:** [描述内容]

*   **[场景 3 | 转折/解决 | 8-12秒]** (对应参考脚本的叙事结构-转)
    *   **视觉:** [描述画面内容，可在此处植入品牌元素，如："画面切换至欧美面孔外教在51Talk平台上与亚裔学生开心互动"]
    *   **台词/字幕:** [描述内容，可在此处提及品牌或服务]

*   **[场景 4 | 转化/CTA | 13-15秒]** (对应参考脚本的CTA类型)
    *   **视觉:** [描述引导用户行动的画面，如箭头指向评论区，可继续体现多元化面孔]
    *   **台词/字幕:** [清晰的行动号召指令]
    *(注: 根据参考脚本的复杂性，可增加或删减场景)*

**4. Instagram 帖子文案:**

*   **文案:**
    *   [此处生成一段符合Instagram平台风格的帖子正文。开头引人入胜，中间提供价值，结尾引导互动。可适当使用Emoji表情增强可读性。可在文案中巧妙体现"国际化师资"等品牌优势。]
*   **标签 (Hashtags):**
    *   [ #关键词标签 #行业标签 #痛点标签 #品牌标签 #国际化教育标签 #多元文化标签 #热门趋势标签 ]

---

## (P) Persona & Style (个性与风格)

你的沟通风格应该是 **专业、高效、且富有创意** 的。在交付成果时，请展现出顶级策略师的自信和清晰思路。同时，你对多元化和包容性有着敏锐的洞察，能够自然地将国际化元素融入创作中。

## (E) Experimentation & Exploration (探索与实验)

1.  **主动澄清:** 如果 [INPUT] 中的信息存在模糊或矛盾之处，请主动提出不超过2个关键问题来进行澄清，以便更好地完成任务。
2.  **提供备选方案:** 在完成核心任务后，请在输出的末尾以 `【备选方案】` 的形式，额外提供1-2个不同的"钩子(Hook)"或"行动号召(CTA)"的创意，供用户参考和选择。"""

    return prompt


def generate_with_google_ai(prompt: str) -> str:
    """
    使用 Google AI (Gemini 2.5 Pro) 生成分镜头脚本
    
    Args:
        prompt: 提示词
    
    Returns:
        生成的脚本内容
    """
    try:
        if not get_google_key():
            raise Exception("Google AI API密钥未配置")
        
        # 创建客户端
        client = genai.Client(api_key=get_google_key())
        
        print(f"正在使用 Gemini 2.5 Pro 生成分镜头脚本...")
        print(f"提示词长度: {len(prompt)} 字符")
        
        # 调用 API
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                print(f"尝试 {attempt + 1}/{max_retries}...")
                response = client.models.generate_content(
                    model='gemini-2.5-pro',
                    contents=prompt,
                )
                
                print(f"✅ 生成完成: {len(response.text)} 字符")
                return response.text.strip()
                
            except Exception as retry_error:
                last_error = retry_error
                print(f"❌ 尝试 {attempt + 1} 失败: {str(retry_error)}")
                
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    print(f"⏳ 等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
        
        raise Exception(f"Google AI 生成失败（已重试 {max_retries} 次）: {str(last_error)}")
        
    except Exception as e:
        print(f"❌ Google AI 生成错误: {str(e)}")
        raise Exception(f"Google AI 生成失败: {str(e)}")


# ============================================
# Request/Response Models
# ============================================

class StartVideoAnalysisRequest(BaseModel):
    user_id: int
    post_id: str

class UpdateScriptRequest(BaseModel):
    user_id: int
    post_id: str
    script_topic: Optional[str] = None
    content_style: Optional[str] = None
    keywords: Optional[str] = None
    special_requirements: Optional[str] = None
    jianyi3: Optional[str] = None

class GenerateShotScriptRequest(BaseModel):
    user_id: int
    post_id: str

class UpdateJianyi4Request(BaseModel):
    user_id: int
    post_id: str
    jianyi4: str


# ============================================
# API Endpoints
# ============================================

@router.post("/start")
async def start_video_analysis(request: StartVideoAnalysisRequest, background_tasks: BackgroundTasks):
    """
    Start video analysis for a post
    直接从 popular 表继承数据到 mypostl 表，不再重新分析
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Step 1: Check if already exists in mypostl
            cur.execute("""
                SELECT id, jianyi3 FROM mypostl 
                WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            existing = cur.fetchone()
            
            # If exists and has jianyi3, skip
            if existing and existing.get('jianyi3'):
                print(f"Post {request.post_id} already exists in mypostl with video analysis, skipping")
                return {
                    "success": True,
                    "message": "Video analysis already exists",
                    "skip_generation": True
                }
            
            # Step 2: Get data from popular table
            cur.execute("""
                SELECT 
                    post_id, post_type, 
                    display_url_base64, video_url_base64,
                    jianyi3, success
                FROM popular 
                WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            popular_data = cur.fetchone()
            
            if not popular_data:
                raise HTTPException(status_code=404, detail="Post not found in popular table")
            
            post_type = popular_data['post_type']
            
            # Only process Video type
            if post_type != 'Video':
                raise HTTPException(status_code=400, detail="Only Video posts are supported")
            
            # Step 3: 构建 jianyi1 内容（包含输入字段的模板）
            jianyi1_template = """脚本主题：

内容风格：

关键词：

特殊要求："""
            
            # Step 4: Insert or Update mypostl with Video data from popular
            if existing:
                # Update existing record
                cur.execute("""
                    UPDATE mypostl
                    SET display_url_base64 = %s,
                        video_url_base64 = %s,
                        jianyi1 = %s,
                        jianyi3 = %s,
                        post_type = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s AND post_id = %s
                """, (
                    popular_data['display_url_base64'],
                    popular_data['video_url_base64'],
                    jianyi1_template,
                    popular_data['jianyi3'],
                    post_type,
                    request.user_id,
                    request.post_id
                ))
                print(f"✅ Updated existing Video record in mypostl for post {request.post_id}")
            else:
                # Insert new record
                cur.execute("""
                    INSERT INTO mypostl 
                    (user_id, post_id, display_url_base64, video_url_base64, 
                     jianyi1, jianyi3, post_type)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    request.user_id,
                    request.post_id,
                    popular_data['display_url_base64'],
                    popular_data['video_url_base64'],
                    jianyi1_template,
                    popular_data['jianyi3'],
                    post_type
                ))
                print(f"✅ Inserted new Video record into mypostl for post {request.post_id}")
            
            conn.commit()
            
            return {
                "success": True,
                "message": "Video data inherited from popular table successfully",
                "post_type": post_type,
                "skip_generation": False
            }
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to start video analysis: {str(e)}")
    finally:
        conn.close()


@router.get("/data")
async def get_video_analysis_data(user_id: int, post_id: str):
    """
    Get video analysis data from mypostl table
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, user_id, post_id, display_url_base64, video_url_base64, 
                       jianyi1, jianyi3, jianyi4, post_type, new_video_url_base64,
                       created_at, updated_at
                FROM mypostl
                WHERE user_id = %s AND post_id = %s
            """, (user_id, post_id))
            
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Video data not found")
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            # 如果是空白项目（创建模式），初始化默认值
            if not result_dict.get('video_url_base64'):
                # 这是一个空白项目
                if not result_dict.get('jianyi1'):
                    result_dict['jianyi1'] = ""
                if not result_dict.get('jianyi3'):
                    result_dict['jianyi3'] = ""
                if not result_dict.get('jianyi4'):
                    result_dict['jianyi4'] = ""
            
            return result_dict
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()


@router.post("/update-script")
async def update_script(request: UpdateScriptRequest):
    """
    实时更新脚本数据（jianyi1 和 jianyi3）
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 检查记录是否存在
            cur.execute("""
                SELECT id, jianyi1 FROM mypostl 
                WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            existing = cur.fetchone()
            
            if not existing:
                raise HTTPException(status_code=404, detail="Record not found")
            
            # 如果有输入字段的更新，更新 jianyi1
            if any([request.script_topic is not None, request.content_style is not None, 
                    request.keywords is not None, request.special_requirements is not None]):
                
                # 获取当前的 jianyi1 内容
                current_jianyi1 = existing['jianyi1'] or """脚本主题：

内容风格：

关键词：

特殊要求："""
                
                # 解析当前 jianyi1 的各个字段
                import re
                lines = current_jianyi1.split('\n')
                updated_lines = []
                
                for line in lines:
                    if line.startswith('脚本主题：'):
                        if request.script_topic is not None:
                            updated_lines.append(f"脚本主题：{request.script_topic}")
                        else:
                            updated_lines.append(line)
                    elif line.startswith('内容风格：'):
                        if request.content_style is not None:
                            updated_lines.append(f"内容风格：{request.content_style}")
                        else:
                            updated_lines.append(line)
                    elif line.startswith('关键词：'):
                        if request.keywords is not None:
                            updated_lines.append(f"关键词：{request.keywords}")
                        else:
                            updated_lines.append(line)
                    elif line.startswith('特殊要求：'):
                        if request.special_requirements is not None:
                            updated_lines.append(f"特殊要求：{request.special_requirements}")
                        else:
                            updated_lines.append(line)
                    else:
                        updated_lines.append(line)
                
                new_jianyi1 = '\n'.join(updated_lines)
                
                # 更新 jianyi1
                cur.execute("""
                    UPDATE mypostl
                    SET jianyi1 = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s AND post_id = %s
                """, (new_jianyi1, request.user_id, request.post_id))
                
                print(f"✅ Updated jianyi1 for post {request.post_id}")
            
            # 如果有 jianyi3 的更新
            if request.jianyi3 is not None:
                cur.execute("""
                    UPDATE mypostl
                    SET jianyi3 = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s AND post_id = %s
                """, (request.jianyi3, request.user_id, request.post_id))
                
                print(f"✅ Updated jianyi3 for post {request.post_id}")
            
            conn.commit()
            
            # 返回更新后的 jianyi1
            cur.execute("""
                SELECT jianyi1, jianyi3 FROM mypostl 
                WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            result = cur.fetchone()
            
            return {
                "success": True,
                "message": "Updated successfully",
                "jianyi1": result['jianyi1'],
                "jianyi3": result['jianyi3']
            }
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error in update_script: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
    finally:
        conn.close()


@router.post("/generate-shot-script")
async def generate_shot_script(request: GenerateShotScriptRequest):
    """
    生成分镜头脚本
    """
    conn = get_db_connection()
    
    try:
        print(f"\n{'='*60}")
        print(f"开始生成分镜头脚本")
        print(f"Post ID: {request.post_id}")
        print(f"User ID: {request.user_id}")
        print(f"{'='*60}\n")
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Step 1: 从 mypostl 获取 jianyi1, jianyi3 和 jianyi4
            cur.execute("""
                SELECT jianyi1, jianyi3, jianyi4
                FROM mypostl 
                WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            data = cur.fetchone()
            
            if not data:
                raise HTTPException(status_code=404, detail="Data not found")
            
            jianyi1 = data['jianyi1']
            jianyi3 = data['jianyi3']
            jianyi4 = data['jianyi4']
            
            if not jianyi3:
                raise HTTPException(status_code=400, detail="jianyi3 is empty, cannot generate shot script")
            
            # 检查 jianyi4 是否已经存在内容
            if jianyi4 and jianyi4.strip():
                print(f"⚠️  jianyi4 已经存在内容，跳过生成，直接返回")
                print(f"✅ jianyi4 长度: {len(jianyi4)} 字符")
                return {
                    "success": True,
                    "message": "Shot script already exists",
                    "jianyi4": jianyi4,
                    "skipped": True
                }
            
            print(f"✅ 获取到 jianyi1 长度: {len(jianyi1) if jianyi1 else 0} 字符")
            print(f"✅ 获取到 jianyi3 长度: {len(jianyi3)} 字符")
            
            # Step 2: 构建提示词
            print(f"\nStep 1: 构建提示词...")
            prompt = build_shot_script_prompt(jianyi1, jianyi3)
            print(f"✅ 提示词构建完成，长度: {len(prompt)} 字符")
            
            # Step 3: 调用 Google AI 生成
            print(f"\nStep 2: 调用 Google AI 生成...")
            jianyi4_content = generate_with_google_ai(prompt)
            print(f"✅ 生成完成，长度: {len(jianyi4_content)} 字符")
            
            # Step 4: 保存到 mypostl 的 jianyi4 字段
            print(f"\nStep 3: 保存到数据库...")
            cur.execute("""
                UPDATE mypostl
                SET jianyi4 = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND post_id = %s
            """, (jianyi4_content, request.user_id, request.post_id))
            
            conn.commit()
            print(f"✅ 保存成功")
            
            print(f"\n{'='*60}")
            print(f"✅ 分镜头脚本生成完成！")
            print(f"{'='*60}\n")
            
            return {
                "success": True,
                "message": "Shot script generated successfully",
                "jianyi4": jianyi4_content
            }
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 生成失败: {str(e)}\n")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
    finally:
        conn.close()


@router.post("/update-jianyi4")
async def update_jianyi4(request: UpdateJianyi4Request):
    """
    更新 jianyi4 字段
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # 检查记录是否存在
            cur.execute("""
                SELECT id FROM mypostl 
                WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Record not found")
            
            # 更新 jianyi4
            cur.execute("""
                UPDATE mypostl
                SET jianyi4 = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s AND post_id = %s
            """, (request.jianyi4, request.user_id, request.post_id))
            
            conn.commit()
            
            return {
                "success": True,
                "message": "jianyi4 updated successfully"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error in update_jianyi4: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
    finally:
        conn.close()


# ============================================================
# Sora2 视频生成功能
# ============================================================

class Sora2API:
    """Sora2 API 客户端"""
    
    def __init__(self, api_key):
        self.api_key = api_key
        self.submit_url = "https://api.wuyinkeji.com/api/sora2/submit"
        self.detail_url = "https://api.wuyinkeji.com/api/sora2/detail"
    
    def submit_video(self, prompt, url=None, aspect_ratio="9:16", duration=10, size="small"):
        """提交视频生成请求"""
        headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }
        
        data = {
            "prompt": prompt,
            "aspectRatio": aspect_ratio,
            "duration": duration,
            "size": size
        }
        
        if url:
            data["url"] = url
        
        print(f"\n{'='*60}")
        print(f"📤 提交Sora2视频生成请求")
        print(f"提示词长度: {len(prompt)} 字符")
        print(f"视频配置: {aspect_ratio}, {duration}秒, {size}")
        print(f"{'='*60}\n")
        
        response = requests.post(self.submit_url, headers=headers, data=data, timeout=30)
        result = response.json()
        
        if result.get("code") in [0, 200] and "data" in result and "id" in result["data"]:
            task_id = result["data"]["id"]
            print(f"✅ 任务提交成功，任务ID: {task_id}")
            return task_id
        else:
            raise Exception(f"Submit failed: {result.get('msg', 'Unknown error')}")
    
    def get_video_status(self, task_id):
        """查询视频生成状态"""
        headers = {"Authorization": self.api_key}
        params = {"id": task_id}
        
        response = requests.get(self.detail_url, headers=headers, params=params, timeout=30)
        result = response.json()
        
        if result.get("code") in [0, 200] and "data" in result:
            return result["data"]
        else:
            raise Exception(f"Query failed: {result.get('msg', 'Unknown error')}")


def translate_to_english_deepseek(text: str) -> str:
    """
    使用 DeepSeek API 将文本翻译成英文
    
    Args:
        text: 要翻译的中文文本
    
    Returns:
        翻译后的英文文本
    """
    if not get_deepseek_key():
        print("⚠️  get_deepseek_key() not configured, skipping translation")
        return text
    
    print(f"\n🌐 开始使用 DeepSeek 翻译文本...")
    print(f"原文长度: {len(text)} 字符")
    
    try:
        url = "https://api.deepseek.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {get_deepseek_key()}"
        }
        
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a professional translator. Translate the following Chinese text to English. Keep the format and structure intact. Only return the translated text, no explanations."
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            "temperature": 0.3
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        translated_text = result['choices'][0]['message']['content'].strip()
        
        print(f"✅ 翻译成功，译文长度: {len(translated_text)} 字符\n")
        
        return translated_text
    except Exception as e:
        print(f"⚠️  翻译失败: {str(e)}, 使用原文")
        return text


def download_video_to_base64(video_url: str) -> str:
    """
    下载视频并转换为 Base64
    
    Args:
        video_url: 视频URL
    
    Returns:
        Base64 编码的视频字符串
    """
    print(f"\n📥 开始下载视频: {video_url}")
    
    try:
        response = requests.get(video_url, timeout=60)
        response.raise_for_status()
        
        video_data = response.content
        video_base64 = base64.b64encode(video_data).decode('utf-8')
        
        print(f"✅ 视频下载成功，大小: {len(video_data)} 字节")
        print(f"✅ Base64 编码完成，长度: {len(video_base64)} 字符\n")
        
        return video_base64
    except Exception as e:
        print(f"❌ 视频下载失败: {str(e)}")
        raise


class GenerateVideoRequest(BaseModel):
    user_id: int
    post_id: str
    aspect_ratio: Optional[str] = "9:16"
    duration: Optional[int] = 15
    size: Optional[str] = "large"


@router.post("/generate-video")
async def generate_video(request: GenerateVideoRequest):
    """
    生成视频并保存到数据库
    使用分镜头脚本(jianyi4)作为提示词
    """
    if not get_sora2_key():
        raise HTTPException(status_code=500, detail="get_sora2_key() not configured")
    
    conn = get_db_connection()
    
    try:
        print(f"\n{'='*60}")
        print(f"🎬 开始生成视频")
        print(f"Post ID: {request.post_id}")
        print(f"User ID: {request.user_id}")
        print(f"{'='*60}\n")
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. 获取 jianyi4 作为提示词
            cur.execute("""
                SELECT jianyi4, new_video_url_base64
                FROM mypostl 
                WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            data = cur.fetchone()
            
            if not data:
                raise HTTPException(status_code=404, detail="Post not found")
            
            jianyi4 = data.get('jianyi4')
            
            if not jianyi4:
                raise HTTPException(status_code=400, detail="jianyi4 is empty, cannot generate video")
            
            print(f"✅ 获取到 jianyi4，长度: {len(jianyi4)} 字符")
            
            # 2. 提取分镜头脚本部分
            import re
            shot_script_match = re.search(
                r'\*\*3\.\s*分镜头脚本.*?\*\*\s*\n(.*?)(?=\n\*\*4\.|$)',
                jianyi4,
                re.DOTALL
            )
            
            if not shot_script_match:
                print("⚠️  未找到分镜头脚本部分，使用完整 jianyi4")
                shot_script = jianyi4
            else:
                shot_script = shot_script_match.group(0).strip()
                print(f"✅ 提取到分镜头脚本部分，长度: {len(shot_script)} 字符")
            
            # 3. 使用 DeepSeek 翻译分镜头脚本成英文
            shot_script_english = translate_to_english_with_deepseek(shot_script)
            
            # 4. 创建 Sora2 API 客户端
            api = Sora2API(get_sora2_key())
            
            # 5. 提交视频生成任务（使用英文分镜头脚本）
            task_id = api.submit_video(
                prompt=shot_script_english,
                aspect_ratio=request.aspect_ratio,
                duration=request.duration,
                size=request.size
            )
            
            # 6. 轮询查询状态（最多等待10分钟）
            print(f"\n⏳ 开始轮询查询视频生成状态...")
            start_time = time.time()
            max_wait_time = 600  # 10分钟
            check_interval = 30  # 30秒
            check_count = 0
            
            while time.time() - start_time < max_wait_time:
                check_count += 1
                elapsed = int(time.time() - start_time)
                
                try:
                    status_data = api.get_video_status(task_id)
                    status = status_data.get("status")
                    
                    status_map = {0: "排队中", 1: "成功", 2: "失败", 3: "生成中"}
                    status_text = status_map.get(status, f"未知({status})")
                    
                    print(f"[第{check_count}次查询 | 已耗时{elapsed}秒] 状态: {status_text}")
                    
                    if status == 1:  # 成功
                        video_url = status_data.get("remote_url", "")
                        print(f"\n✅ 视频生成成功！URL: {video_url}")
                        
                        # 5. 下载视频并转换为 Base64
                        video_base64 = download_video_to_base64(video_url)
                        
                        # 6. 保存到数据库
                        cur.execute("""
                            UPDATE mypostl
                            SET new_video_url_base64 = %s,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = %s AND post_id = %s
                        """, (video_base64, request.user_id, request.post_id))
                        
                        conn.commit()
                        
                        print(f"✅ 视频已保存到数据库")
                        print(f"{'='*60}\n")
                        
                        return {
                            "success": True,
                            "message": "Video generated and saved successfully",
                            "video_base64": video_base64,
                            "task_id": task_id,
                            "elapsed_time": elapsed
                        }
                    
                    elif status == 2:  # 失败
                        raise Exception("视频生成失败")
                    
                    # 排队中或生成中，继续等待
                    time.sleep(check_interval)
                    
                except Exception as e:
                    print(f"⚠️  查询状态出错: {str(e)}")
                    time.sleep(check_interval)
            
            # 超时
            raise Exception(f"视频生成超时（超过 {max_wait_time} 秒）")
    
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"❌ Error in generate_video: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")
    finally:
        conn.close()

