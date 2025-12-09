"""
Image Analysis Module
Handles image analysis, prompt generation, and image generation
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import json
import base64
import requests
import os
import re
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor
from database import get_db_connection

load_dotenv()

router = APIRouter(prefix="/api/image-analysis", tags=["image-analysis"])

# API Keys
from apiconfig import get_api_key

def get_aisonnet_key():
    return get_api_key("AISONNET_API_KEY") or os.getenv("AISONNET_API_KEY", "")

def get_deepseek_key():
    return get_api_key("DEEPSEEK_API_KEY") or os.getenv("DEEPSEEK_API_KEY", "")

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


# ============================================
# Request/Response Models
# ============================================

class StartAnalysisRequest(BaseModel):
    user_id: int
    post_id: str

class UpdatePromptRequest(BaseModel):
    user_id: int
    post_id: str
    prompt: Optional[str] = None
    prompt_array: Optional[List[str]] = None
    jianyi2: Optional[str] = None

class GenerateImageRequest(BaseModel):
    user_id: int
    post_id: str
    image_index: Optional[int] = None  # None for display_url, 0-N for images_base64
    aspect_ratio: Optional[str] = "1:1"  # Default aspect ratio


# ============================================
# Helper Functions
# ============================================



def translate_prompt_to_english(chinese_prompt: str) -> str:
    """
    Translate Chinese prompt to English using DeepSeek API
    
    Args:
        chinese_prompt: Prompt in Chinese
    
    Returns:
        str: Prompt in English
    """
    try:
        if not chinese_prompt or not chinese_prompt.strip():
            return ""
        
        headers = {
            "Authorization": f"Bearer {get_deepseek_key()}",
            "Content-Type": "application/json"
        }
        
        system_prompt = """你是一个专业的翻译助手，专门翻译 AI 绘画提示词。
请将用户提供的中文提示词翻译成英文，保持关键词格式。
只返回翻译结果，不要添加任何解释、引号或额外内容。
保持逗号分隔的格式。"""
        
        data = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": chinese_prompt
                }
            ],
            "temperature": 0.3
        }
        
        print(f"Translating prompt to English...")
        print(f"Chinese prompt: {chinese_prompt[:100]}...")
        
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        
        if 'choices' in result and len(result['choices']) > 0:
            english_prompt = result['choices'][0]['message']['content'].strip()
            # Remove quotes if present
            english_prompt = english_prompt.strip('"\'')
            print(f"English prompt: {english_prompt[:100]}...")
            return english_prompt
        
        print("Translation failed: no valid response")
        return chinese_prompt  # Fallback to original
        
    except Exception as e:
        print(f"Translation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return chinese_prompt  # Fallback to original


def generate_image_from_prompt(prompt: str, aspect_ratio: str = "1:1") -> Optional[str]:
    """
    Generate image using AIsonnet Gemini 2.5 Flash Image API
    Automatically translates Chinese prompt to English before API call
    
    Args:
        prompt: Text prompt for image generation (can be Chinese or English)
        aspect_ratio: Aspect ratio for the generated image (e.g., "1:1", "16:9")
    
    Returns:
        Optional[str]: Base64 encoded image or None if failed
    """
    try:
        # Translate Chinese prompt to English
        english_prompt = translate_prompt_to_english(prompt)
        
        if not english_prompt:
            print("Prompt translation failed, using original prompt")
            english_prompt = prompt
        
        # AIsonnet API configuration
        api_url = "https://newapi.aisonnet.org/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {get_aisonnet_key()}",
            "Content-Type": "application/json"
        }
        
        # Prepare request data with aspect ratio
        data = {
            "model": "gemini-2.5-flash-image",
            "extra_body": {
                "imageConfig": {
                    "aspectRatio": aspect_ratio
                }
            },
            "messages": [
                {
                    "role": "system",
                    "content": json.dumps({"imageConfig": {"aspectRatio": aspect_ratio}})
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": english_prompt
                        }
                    ]
                }
            ],
            "max_tokens": 150,
            "temperature": 0.7
        }
        
        print(f"Generating image with AIsonnet API...")
        print(f"Original prompt: {prompt[:100]}...")
        print(f"English prompt: {english_prompt[:100]}...")
        print(f"Aspect ratio: {aspect_ratio}")
        
        # Call the API
        response = requests.post(api_url, headers=headers, json=data, timeout=90)
        response.raise_for_status()
        
        result = response.json()
        
        # Extract content from response
        if 'choices' in result and len(result['choices']) > 0:
            content = result['choices'][0]['message']['content']
            print(f"API response content: {content[:200]}...")
            
            # Extract URL from markdown format: ![image](url)
            url_match = re.search(r'!\[.*?\]\((https?://[^\)]+)\)', content)
            
            if url_match:
                image_url = url_match.group(1)
                print(f"Extracted image URL: {image_url}")
                
                # Download image and convert to base64
                img_response = requests.get(image_url, timeout=30)
                img_response.raise_for_status()
                image_base64 = base64.b64encode(img_response.content).decode('utf-8')
                print(f"Image downloaded and converted to base64 (length: {len(image_base64)})")
                return image_base64
            
            # If content is a direct URL
            elif content.startswith('http://') or content.startswith('https://'):
                print(f"Direct image URL: {content}")
                img_response = requests.get(content, timeout=30)
                img_response.raise_for_status()
                image_base64 = base64.b64encode(img_response.content).decode('utf-8')
                print(f"Image downloaded and converted to base64 (length: {len(image_base64)})")
                return image_base64
            
            # If content is already base64 data URL
            elif content.startswith('data:image'):
                print("Content is already base64 data URL")
                # Extract base64 part
                base64_data = content.split(',')[1] if ',' in content else content
                return base64_data
            
            else:
                print(f"Unexpected content format: {content[:100]}...")
                return None
        
        print("No valid response from API")
        return None
        
    except Exception as e:
        print(f"Image generation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


# ============================================
# API Endpoints
# ============================================

@router.post("/start")
async def start_analysis(request: StartAnalysisRequest, background_tasks: BackgroundTasks):
    """
    Start image analysis for a post
    直接从 popular 表继承数据到 mypostl 表，不再重新分析
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Step 1: Check if already exists in mypostl
            cur.execute("""
                SELECT id, prompt, prompt_array FROM mypostl 
                WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            existing = cur.fetchone()
            
            # If exists and has prompts, skip
            if existing and existing.get('prompt'):
                print(f"Post {request.post_id} already exists in mypostl with prompts, skipping")
                return {
                    "success": True,
                    "message": "Analysis already exists",
                    "skip_generation": True
                }
            
            # Step 2: Get data from popular table (包含所有字段)
            cur.execute("""
                SELECT 
                    post_id, post_type, 
                    display_url_base64, video_url_base64, images_base64,
                    jianyi1, "jianyi1.5", jianyi2, jianyi3, success,
                    prompt, prompt_array
                FROM popular 
                WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            popular_data = cur.fetchone()
            
            if not popular_data:
                raise HTTPException(status_code=404, detail="Post not found in popular table")
            
            post_type = popular_data['post_type']
            
            # Only process Image or Sidecar
            if post_type not in ['Image', 'Sidecar']:
                raise HTTPException(status_code=400, detail="Only Image and Sidecar posts are supported")
            
            # Step 3: Insert or Update mypostl with data from popular
            # Sidecar 类型不需要 display_url_base64 和 prompt
            if post_type == "Sidecar":
                if existing:
                    # Update existing record (Sidecar)
                    cur.execute("""
                        UPDATE mypostl
                        SET video_url_base64 = %s,
                            images_base64 = %s,
                            jianyi1 = %s,
                            jianyi2 = %s,
                            jianyi3 = %s,
                            post_type = %s,
                            prompt_array = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = %s AND post_id = %s
                    """, (
                        popular_data['video_url_base64'],
                        json.dumps(popular_data['images_base64']) if popular_data['images_base64'] else None,
                        popular_data['jianyi1'],
                        popular_data['jianyi2'],
                        popular_data['jianyi3'],
                        post_type,
                        json.dumps(popular_data['prompt_array']) if popular_data['prompt_array'] else None,
                        request.user_id,
                        request.post_id
                    ))
                    print(f"✅ Updated existing Sidecar record in mypostl for post {request.post_id}")
                else:
                    # Insert new record (Sidecar)
                    cur.execute("""
                        INSERT INTO mypostl 
                        (user_id, post_id, video_url_base64, images_base64, 
                         jianyi1, jianyi2, jianyi3, post_type, prompt_array)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        request.user_id,
                        request.post_id,
                        popular_data['video_url_base64'],
                        json.dumps(popular_data['images_base64']) if popular_data['images_base64'] else None,
                        popular_data['jianyi1'],
                        popular_data['jianyi2'],
                        popular_data['jianyi3'],
                        post_type,
                        json.dumps(popular_data['prompt_array']) if popular_data['prompt_array'] else None
                    ))
                    print(f"✅ Inserted new Sidecar record into mypostl for post {request.post_id}")
            else:
                # Image 类型正常继承所有字段
                if existing:
                    # Update existing record (Image)
                    cur.execute("""
                        UPDATE mypostl
                        SET display_url_base64 = %s,
                            video_url_base64 = %s,
                            images_base64 = %s,
                            jianyi1 = %s,
                            jianyi2 = %s,
                            jianyi3 = %s,
                            post_type = %s,
                            prompt = %s,
                            prompt_array = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = %s AND post_id = %s
                    """, (
                        popular_data['display_url_base64'],
                        popular_data['video_url_base64'],
                        json.dumps(popular_data['images_base64']) if popular_data['images_base64'] else None,
                        popular_data['jianyi1'],
                        popular_data['jianyi2'],
                        popular_data['jianyi3'],
                        post_type,
                        popular_data['prompt'],
                        json.dumps(popular_data['prompt_array']) if popular_data['prompt_array'] else None,
                        request.user_id,
                        request.post_id
                    ))
                    print(f"✅ Updated existing Image record in mypostl for post {request.post_id}")
                else:
                    # Insert new record (Image)
                    cur.execute("""
                        INSERT INTO mypostl 
                        (user_id, post_id, display_url_base64, video_url_base64, images_base64, 
                         jianyi1, jianyi2, jianyi3, post_type, prompt, prompt_array)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        request.user_id,
                        request.post_id,
                        popular_data['display_url_base64'],
                        popular_data['video_url_base64'],
                        json.dumps(popular_data['images_base64']) if popular_data['images_base64'] else None,
                        popular_data['jianyi1'],
                        popular_data['jianyi2'],
                        popular_data['jianyi3'],
                        post_type,
                        popular_data['prompt'],
                        json.dumps(popular_data['prompt_array']) if popular_data['prompt_array'] else None
                    ))
                    print(f"✅ Inserted new Image record into mypostl for post {request.post_id}")
            
            conn.commit()
            
            return {
                "success": True,
                "message": "Data inherited from popular table successfully",
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
        raise HTTPException(status_code=500, detail=f"Failed to start analysis: {str(e)}")
    finally:
        conn.close()



@router.get("/data")
async def get_analysis_data(user_id: int, post_id: str):
    """
    Get analysis data from mypostl table
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, user_id, post_id, display_url_base64, video_url_base64, 
                       images_base64, jianyi1, jianyi2, jianyi3, post_type, 
                       prompt, prompt_array, new_display_url_base64, new_images_base64,
                       created_at, updated_at
                FROM mypostl
                WHERE user_id = %s AND post_id = %s
            """, (user_id, post_id))
            
            result = cur.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Data not found")
            
            result_dict = dict(result)
            result_dict['created_at'] = result_dict['created_at'].isoformat()
            result_dict['updated_at'] = result_dict['updated_at'].isoformat()
            
            # 如果是空白项目（创建模式），初始化默认值
            if not result_dict.get('display_url_base64') and not result_dict.get('images_base64'):
                # 这是一个空白项目
                if not result_dict.get('prompt'):
                    result_dict['prompt'] = ""
                if not result_dict.get('jianyi2'):
                    result_dict['jianyi2'] = ""
                if result_dict.get('post_type') == 'Sidecar' and not result_dict.get('prompt_array'):
                    result_dict['prompt_array'] = ["", "", "", "", "", "", "", "", "", ""]  # 默认 10 张图片
            
            return result_dict
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
    finally:
        conn.close()


@router.post("/update-prompt")
async def update_prompt(request: UpdatePromptRequest):
    """
    Update prompt, prompt_array, or jianyi2 in mypostl
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cur:
            # Check if record exists
            cur.execute("""
                SELECT id FROM mypostl WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Data not found")
            
            # Build update statement
            update_fields = []
            update_values = []
            
            if request.prompt is not None:
                update_fields.append("prompt = %s")
                update_values.append(request.prompt)
            
            if request.prompt_array is not None:
                update_fields.append("prompt_array = %s::jsonb")
                update_values.append(json.dumps(request.prompt_array))
            
            if request.jianyi2 is not None:
                update_fields.append("jianyi2 = %s")
                update_values.append(request.jianyi2)
            
            if not update_fields:
                raise HTTPException(status_code=400, detail="No data to update")
            
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            update_values.extend([request.user_id, request.post_id])
            
            cur.execute(f"""
                UPDATE mypostl
                SET {', '.join(update_fields)}
                WHERE user_id = %s AND post_id = %s
            """, update_values)
            
            conn.commit()
            
            return {"success": True, "message": "Updated successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
    finally:
        conn.close()


@router.post("/generate-image")
async def generate_image(request: GenerateImageRequest):
    """
    Generate image based on prompt
    支持对应生成：即使先生成第三张再生成第二张，也能正确保存到对应位置
    """
    conn = get_db_connection()
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get current data
            cur.execute("""
                SELECT prompt, prompt_array, new_images_base64, post_type
                FROM mypostl
                WHERE user_id = %s AND post_id = %s
            """, (request.user_id, request.post_id))
            
            data = cur.fetchone()
            
            if not data:
                raise HTTPException(status_code=404, detail="Data not found")
            
            # Determine which prompt to use
            if request.image_index is None:
                # Generate for display_url (封面图) - 仅适用于 Image 类型
                # Sidecar 类型不应该使用这个分支
                if data['post_type'] == 'Sidecar':
                    raise HTTPException(status_code=400, detail="Sidecar type should not generate display_url")
                
                prompt = data['prompt']
                if not prompt:
                    raise HTTPException(status_code=400, detail="Prompt is empty")
                
                print(f"Generating image for display_url with prompt: {prompt[:100]}...")
                
                # Generate image with aspect ratio
                generated_image_base64 = generate_image_from_prompt(prompt, request.aspect_ratio)
                
                if not generated_image_base64:
                    raise HTTPException(status_code=500, detail="Image generation failed")
                
                # Save to new_display_url_base64
                cur.execute("""
                    UPDATE mypostl
                    SET new_display_url_base64 = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s AND post_id = %s
                """, (generated_image_base64, request.user_id, request.post_id))
                
                print(f"Image saved to new_display_url_base64")
                
            else:
                # Generate for images_base64[index] (多图中的某一张)
                # 适用于 Image 和 Sidecar 类型
                prompt_array = data['prompt_array']
                if not prompt_array or request.image_index >= len(prompt_array):
                    raise HTTPException(status_code=400, detail="Invalid image index or prompt not found")
                
                prompt = prompt_array[request.image_index]
                if not prompt:
                    raise HTTPException(status_code=400, detail="Prompt is empty")
                
                print(f"Generating image for images_base64[{request.image_index}] with prompt: {prompt[:100]}...")
                
                # Generate image with aspect ratio
                generated_image_base64 = generate_image_from_prompt(prompt, request.aspect_ratio)
                
                if not generated_image_base64:
                    raise HTTPException(status_code=500, detail="Image generation failed")
                
                # Update new_images_base64 array - 关键：确保数组足够大以容纳任意索引
                new_images = data['new_images_base64'] if data['new_images_base64'] else []
                
                # 确保数组长度足够（填充 None）
                while len(new_images) <= request.image_index:
                    new_images.append(None)
                
                # 在对应位置保存生成的图片
                new_images[request.image_index] = generated_image_base64
                
                print(f"Updating new_images_base64 array at index {request.image_index}")
                print(f"Array length: {len(new_images)}")
                
                cur.execute("""
                    UPDATE mypostl
                    SET new_images_base64 = %s::jsonb,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s AND post_id = %s
                """, (json.dumps(new_images), request.user_id, request.post_id))
                
                print(f"Image saved to new_images_base64[{request.image_index}]")
            
            conn.commit()
            
            return {
                "success": True,
                "message": "Image generated successfully",
                "image_base64": generated_image_base64
            }
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error in generate_image: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
    finally:
        conn.close()


