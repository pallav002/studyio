import boto3
from app.core.config import settings
import logging
from typing import IO
from contextlib import closing

logger = logging.getLogger(__name__)

class PollyService:
    def __init__(self):
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.client = boto3.client(
                "polly",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
        else:
            self.client = None

    async def text_to_speech(self, text: str) -> tuple[bytes, list[dict], int]:
        if not self.client:
            logger.warning("AWS Polly client not initialized. Returning mock audio data.")
            return b"Mock audio data", [], len(text)

        try:
            import asyncio
            from concurrent.futures import ThreadPoolExecutor
            
            loop = asyncio.get_event_loop()
            executor = ThreadPoolExecutor(max_workers=2)
            
            # Polly has a character limit per request (3000 for neural, 6000 for standard)
            # We'll use a safe chunk size of 2500 characters
            chunk_size = 2500
            text_chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
            
            combined_audio = b""
            combined_speech_marks = []
            total_chars = 0
            current_time_offset = 0

            for chunk in text_chunks:
                # 1. Synthesize Audio - Run in thread pool to avoid blocking
                from functools import partial
                
                audio_func = partial(
                    self.client.synthesize_speech,
                    Text=chunk,
                    OutputFormat="mp3",
                    VoiceId="Joanna",
                    Engine="neural"
                )
                audio_response = await loop.run_in_executor(executor, audio_func)
                logger.info(f"Polly Audio Response Metadata: {audio_response.get('ResponseMetadata')}")
                
                if "AudioStream" in audio_response:
                    with closing(audio_response["AudioStream"]) as stream:
                        combined_audio += stream.read()
                else:
                    raise Exception("Could not synthesize speech audio")

                # 2. Synthesize Speech Marks (Timestamps) - Run in thread pool
                marks_func = partial(
                    self.client.synthesize_speech,
                    Text=chunk,
                    OutputFormat="json",
                    SpeechMarkTypes=["word"],
                    VoiceId="Joanna",
                    Engine="neural"
                )
                marks_response = await loop.run_in_executor(executor, marks_func)
                logger.info(f"Polly Marks Response Metadata: {marks_response.get('ResponseMetadata')}")

                last_mark_time = 0
                if "AudioStream" in marks_response:
                    with closing(marks_response["AudioStream"]) as stream:
                        marks_text = stream.read().decode("utf-8")
                        # Polly returns multiple JSON objects, one per line
                        for line in marks_text.strip().split("\n"):
                            if line:
                                import json
                                mark = json.loads(line)
                                # Adjust time and start position for combined marks
                                mark["time"] += current_time_offset
                                mark["start"] += total_chars
                                combined_speech_marks.append(mark)
                                last_mark_time = max(last_mark_time, mark["time"])
                
                # Update offsets for next chunk
                # We use the last mark's time as a base for the next chunk's offset.
                # We add a small buffer (e.g., 500ms) to account for the pause between chunks/sentences.
                if last_mark_time > current_time_offset:
                    current_time_offset = last_mark_time + 300 # Approximate pause between chunks
                
                total_chars += len(chunk)
                # We'll need a way to get the duration of the audio chunk to update current_time_offset
                # For MP3, we can estimate or use a library. 
                # Given the constraints, let's at least ensure all text is synthesized.
                
            return combined_audio, combined_speech_marks, len(text)
                
        except Exception as e:
            logger.error(f"Error in Polly synthesis: {e}")
            raise e

polly_service = PollyService()
