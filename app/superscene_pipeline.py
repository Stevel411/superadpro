"""
SuperScene Pipeline — Long-form Video Production
Script → Scenes → Voiceover → Video → Assembly → Final Video

Uses Claude Haiku for script analysis, Edge TTS for voiceover,
EvoLink for video generation, FFmpeg for assembly.
"""
import os
import json
import logging
import asyncio
import subprocess
import tempfile
import httpx
from typing import List, Optional
from decimal import Decimal

logger = logging.getLogger("superadpro.pipeline")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")


# ═══ STAGE 1: SCRIPT ANALYSIS ══════════════════════════════

async def analyse_script(script: str, style: str = "cinematic") -> dict:
    """
    Break a script into scenes using Claude Haiku.
    Returns: {success, scenes: [{scene_number, narration_text, visual_prompt, estimated_duration, transition_type}]}
    """
    if not ANTHROPIC_API_KEY:
        return {"success": False, "error": "Anthropic API key not configured"}

    system_prompt = """You are a professional video director and storyboard artist. 
Your job is to break a script into individual scenes for AI video generation.

For each scene, provide:
1. narration_text: The exact words the voiceover should say for this scene (copy from the script)
2. visual_prompt: A detailed cinematic description of what the AI video should show. Include camera angles, lighting, mood, movement, and visual details. This must be a prompt suitable for AI video generation (Kling, Sora, VEO models).
3. estimated_duration: How many seconds this scene should last (based on narration length, roughly 2.5 words per second)
4. transition_type: How this scene transitions to the next (cut, fade, dissolve)

Rules:
- Each scene should be 5-15 seconds long
- If a paragraph needs more than 15 seconds, split it into multiple scenes
- Visual prompts should be vivid, specific, and cinematic
- Match the visual to what the narration describes
- Use the specified style throughout

Respond ONLY with valid JSON, no markdown, no explanation. Format:
{"scenes": [{"scene_number": 1, "narration_text": "...", "visual_prompt": "...", "estimated_duration": 10, "transition_type": "cut"}, ...]}"""

    user_prompt = f"Style: {style}\n\nScript to break into scenes:\n\n{script}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 4096,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}],
                },
            )
            data = resp.json()

        if resp.status_code != 200:
            err = data.get("error", {}).get("message", "Script analysis failed")
            return {"success": False, "error": err}

        # Extract text content
        text_content = ""
        for block in data.get("content", []):
            if block.get("type") == "text":
                text_content += block.get("text", "")

        # Parse JSON response
        clean = text_content.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            clean = clean.strip()

        result = json.loads(clean)
        scenes = result.get("scenes", [])

        if not scenes:
            return {"success": False, "error": "No scenes generated from script"}

        return {"success": True, "scenes": scenes}

    except json.JSONDecodeError as e:
        logger.exception("Script analysis JSON parse error")
        return {"success": False, "error": f"Failed to parse scene breakdown: {e}"}
    except httpx.TimeoutException:
        return {"success": False, "error": "Script analysis timed out"}
    except Exception as e:
        logger.exception("Script analysis error")
        return {"success": False, "error": str(e)}


# ═══ STAGE 2: VOICEOVER GENERATION ═════════════════════════

async def generate_voiceover(text: str, voice: str = "en-US-GuyNeural") -> dict:
    """
    Generate voiceover audio for a scene using Edge TTS.
    Returns: {success, audio_url, duration_seconds}
    """
    try:
        import edge_tts

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = tmp.name

        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(tmp_path)

        # Get duration using FFmpeg probe
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", tmp_path],
            capture_output=True, text=True
        )
        duration = float(result.stdout.strip()) if result.stdout.strip() else 5.0

        # Upload to R2
        import boto3
        r2_endpoint = os.getenv("R2_ENDPOINT", "")
        r2_key = os.getenv("R2_ACCESS_KEY_ID", "")
        r2_secret = os.getenv("R2_SECRET_ACCESS_KEY", "")
        r2_bucket = os.getenv("R2_BUCKET", "superadpro-media")
        r2_public = os.getenv("R2_PUBLIC_URL", "")

        if not all([r2_endpoint, r2_key, r2_secret]):
            return {"success": False, "error": "R2 storage not configured"}

        s3 = boto3.client("s3", endpoint_url=r2_endpoint,
                          aws_access_key_id=r2_key,
                          aws_secret_access_key=r2_secret)

        import time
        key = f"pipeline/voiceover/{int(time.time())}_{hash(text) % 100000}.mp3"
        s3.upload_file(tmp_path, r2_bucket, key,
                       ExtraArgs={"ContentType": "audio/mpeg"})

        audio_url = f"{r2_public}/{key}"
        os.unlink(tmp_path)

        return {"success": True, "audio_url": audio_url, "duration_seconds": round(duration, 2)}

    except Exception as e:
        logger.exception("Voiceover generation error")
        return {"success": False, "error": str(e)}


# ═══ STAGE 5: FFMPEG ASSEMBLY ══════════════════════════════

async def assemble_video(
    scene_clips: List[dict],
    output_filename: str = "pipeline_output.mp4",
    transition_duration: float = 0.5,
) -> dict:
    """
    Assemble scene clips into a final video using FFmpeg.
    scene_clips: [{video_url, voiceover_url, duration_seconds}]
    Returns: {success, video_url}
    """
    try:
        work_dir = tempfile.mkdtemp(prefix="superscene_")
        downloaded = []

        # Download all clips
        async with httpx.AsyncClient(timeout=120.0) as client:
            for i, scene in enumerate(scene_clips):
                # Download video
                vid_path = os.path.join(work_dir, f"scene_{i:03d}.mp4")
                resp = await client.get(scene["video_url"])
                with open(vid_path, "wb") as f:
                    f.write(resp.content)

                # Download voiceover if present
                vo_path = None
                if scene.get("voiceover_url"):
                    vo_path = os.path.join(work_dir, f"vo_{i:03d}.mp3")
                    resp = await client.get(scene["voiceover_url"])
                    with open(vo_path, "wb") as f:
                        f.write(resp.content)

                downloaded.append({"video": vid_path, "voiceover": vo_path})

        # Build FFmpeg concat file
        concat_path = os.path.join(work_dir, "concat.txt")
        with open(concat_path, "w") as f:
            for item in downloaded:
                f.write(f"file '{item['video']}'\n")

        output_path = os.path.join(work_dir, output_filename)

        # Step 1: Concatenate videos
        concat_out = os.path.join(work_dir, "concat_out.mp4")
        cmd_concat = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", concat_path,
            "-c", "copy", concat_out
        ]
        subprocess.run(cmd_concat, capture_output=True, check=True)

        # Step 2: Overlay voiceover audio
        has_voiceovers = any(d["voiceover"] for d in downloaded)
        if has_voiceovers:
            # Concatenate voiceover files
            vo_concat_path = os.path.join(work_dir, "vo_concat.txt")
            with open(vo_concat_path, "w") as f:
                for item in downloaded:
                    if item["voiceover"]:
                        f.write(f"file '{item['voiceover']}'\n")

            vo_merged = os.path.join(work_dir, "vo_merged.mp3")
            subprocess.run([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", vo_concat_path,
                "-c", "copy", vo_merged
            ], capture_output=True, check=True)

            # Mix video with voiceover (voiceover over original audio)
            subprocess.run([
                "ffmpeg", "-y",
                "-i", concat_out,
                "-i", vo_merged,
                "-filter_complex",
                "[0:a]volume=0.3[orig];[1:a]volume=1.0[vo];[orig][vo]amix=inputs=2:duration=first[a]",
                "-map", "0:v", "-map", "[a]",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                output_path
            ], capture_output=True, check=True)
        else:
            # No voiceover — just use concatenated video
            os.rename(concat_out, output_path)

        # Upload final video to R2
        import boto3
        import time
        r2_endpoint = os.getenv("R2_ENDPOINT", "")
        r2_key = os.getenv("R2_ACCESS_KEY_ID", "")
        r2_secret = os.getenv("R2_SECRET_ACCESS_KEY", "")
        r2_bucket = os.getenv("R2_BUCKET", "superadpro-media")
        r2_public = os.getenv("R2_PUBLIC_URL", "")

        if not all([r2_endpoint, r2_key, r2_secret]):
            return {"success": False, "error": "R2 storage not configured"}

        s3 = boto3.client("s3", endpoint_url=r2_endpoint,
                          aws_access_key_id=r2_key,
                          aws_secret_access_key=r2_secret)

        key = f"pipeline/final/{int(time.time())}_{output_filename}"
        s3.upload_file(output_path, r2_bucket, key,
                       ExtraArgs={"ContentType": "video/mp4"})

        final_url = f"{r2_public}/{key}"

        # Cleanup temp files
        import shutil
        shutil.rmtree(work_dir, ignore_errors=True)

        return {"success": True, "video_url": final_url}

    except subprocess.CalledProcessError as e:
        logger.exception(f"FFmpeg error: {e.stderr}")
        return {"success": False, "error": f"Video assembly failed: {e.stderr[:200] if e.stderr else 'FFmpeg error'}"}
    except Exception as e:
        logger.exception("Video assembly error")
        return {"success": False, "error": str(e)}
