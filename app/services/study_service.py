from openai import AsyncOpenAI
from app.core.config import settings
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.admin import AppConfig
import logging

logger = logging.getLogger(__name__)

class StudyService:
    def __init__(self):
        api_key = settings.OPENAI_API_KEY
        if api_key and api_key.startswith("ey"):
            logger.error("OPENAI_API_KEY appears to be a JWT token instead of a valid OpenAI API key.")
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=api_key) if api_key else None

    async def generate_content(
        self, 
        db: AsyncIOMotorDatabase, 
        topic: str, 
        duration_minutes: int, 
        prompt: str,
        exam_mode: bool = False,
        system_prompt_override: str = None
    ) -> tuple[str, int]:
        if not self.client:
            logger.warning("OpenAI client not initialized. Returning mock content.")
            return f"Mock study content for topic: {topic}. Duration: {duration_minutes} minutes. Exam Mode: {exam_mode}", 0

        # 1. Fetch config from DB (contains fixed topics and their prompt_templates)
        config = await db["config"].find_one({"_id": "app_config"})
        
        # 2. Base defaults from Schema
        default_config = AppConfig()
        char_limits = default_config.character_limits
        topics = default_config.topics
        
        if config:
            char_limits = config.get("character_limits", char_limits)
            # Merge prompts for fixed topics from DB if available
            db_topics = config.get("topics", [])
            if db_topics:
                db_prompts = {t.get("name"): t.get("prompt_template") for t in db_topics if isinstance(t, dict)}
                for t in topics:
                    if t.name in db_prompts and db_prompts[t.name]:
                        t.prompt_template = db_prompts[t.name]

        max_chars = char_limits.get(str(duration_minutes), 2500)
        
        # 3. Find topic template
        topic_template = "Generate a comprehensive study guide about {topic}."
        for t in topics:
            # Handle both object and dict styles
            t_name = t.name if hasattr(t, 'name') else t.get('name', '')
            t_prompt = t.prompt_template if hasattr(t, 'prompt_template') else t.get('prompt_template', '')
            
            if t_name.lower() == topic.lower():
                topic_template = t_prompt or topic_template
                break
        
        base_prompt = topic_template.format(topic=topic)
        
        # 4. Construct System Prompt
        system_prompt = system_prompt_override or (
            "You are an expert academic tutor. Your goal is to generate high-quality, "
            "engaging, and educational study content based on a specific topic and user requirements."
        )

        system_prompt += (
            f"\n\nTOPIC: {topic}\n"
            f"CONTENT TYPE: Study Guide for a {duration_minutes}-minute audio presentation.\n"
            f"STRICT LIMIT: Do not exceed {max_chars} characters.\n"
            "STRUCTURE: Use clear headings, logical flow, and engaging language suitable for listening."
        )

        if exam_mode:
            system_prompt = (
                "You are an expert exam creator. Generate a set of 5 high-quality Multiple Choice Questions (MCQs) "
                f"based on the topic '{topic}' and user requirements. "
                "Each question must have exactly 4 options (A, B, C, D) and one clear correct answer. "
                "Format your response as a valid JSON object with a key 'questions' containing an array of objects, "
                "where each object has: 'id' (string), 'question' (string), 'options' (array of 4 strings), and 'correct_answer' (string, matching one of the options). "
                "Do NOT include any markdown formatting, code blocks, or preamble. Just valid JSON."
            )
        else:
            system_prompt = system_prompt_override or (
                "You are an expert academic tutor. Your goal is to generate high-quality, "
                "engaging, and educational study content based on a specific topic and user requirements."
            )

            system_prompt += (
                f"\n\nTOPIC: {topic}\n"
                f"CONTENT TYPE: Study Guide for a {duration_minutes}-minute audio presentation.\n"
                f"STRICT LIMIT: Do not exceed {max_chars} characters.\n"
                "STRUCTURE: Use clear headings, logical flow, and engaging language suitable for listening."
            )
        
        user_prompt = f"Topic Template Context: {base_prompt}\n\nSpecific Study Requirements: {prompt}"
        if exam_mode:
            user_prompt = f"Generate 5 MCQs for: {topic}. User requirements: {prompt}"

        max_tokens = (max_chars // 4) + 500 
        
        try:
            # Use gpt-4-turbo-preview as it's guaranteed to support response_format="json_object"
            # Fallback to gpt-4 if needed, but remove response_format
            model_name = "gpt-4-turbo-preview" if exam_mode else "gpt-4"
            
            kwargs = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": max_tokens,
            }
            
            if exam_mode:
                kwargs["response_format"] = { "type": "json_object" }

            response = await self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            usage = response.usage.total_tokens
            
            if not exam_mode and len(content) > max_chars:
                content = content[:max_chars].rsplit('.', 1)[0] + '.'
                
            return content, usage
        except Exception as e:
            logger.error(f"Error generating content: {e}")
            raise e

study_service = StudyService()
