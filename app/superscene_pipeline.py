"""
SuperScene Pipeline — Long-form Video Production
Script → Scenes → Voiceover → Video → Assembly → Final Video

Uses Grok (grok_service) for script analysis, Edge TTS for voiceover,
EvoLink/FAL for video generation, FFmpeg for assembly.
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
    Break a script into scenes using Grok (grok_service.ai_text_generate),
    the production text AI for member features.
    Returns: {success, scenes: [{scene_number, narration_text, visual_prompt, estimated_duration, transition_type}]}
    """
    # Scene breakdown runs on Grok, NOT Anthropic. grok_service owns its own
    # key/availability and failures are caught below. Do not gate this on
    # ANTHROPIC_API_KEY — that key is engineering/watchdog only, and gating here
    # silently killed the whole explainer pipeline at stage 1 whenever it was
    # unset (fixed 29 May 2026).

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
        from .grok_service import ai_text_generate
        text_content = await ai_text_generate(
            prompt=user_prompt,
            system=system_prompt,
            max_tokens=4096,
            temperature=0.7,
        )

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

_BRAND_DIMS = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080)}
_BRAND_FONTS = {"Sora": "Sora-Bold.ttf", "DM Sans": "DMSans-Regular.ttf"}
_BRAND_FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")
_BRAND_INTRO_DUR = 2.5
_BRAND_OUTRO_DUR = 3.0


def _brand_font(name: str) -> str:
    p = os.path.join(_BRAND_FONT_DIR, _BRAND_FONTS.get(name, "Sora-Bold.ttf"))
    return p if os.path.exists(p) else os.path.join(_BRAND_FONT_DIR, "Sora-Bold.ttf")


def _brand_hex(c: str, default: str) -> str:
    import re as _re
    c = (c or "").strip().lstrip("#")
    return "0x" + c if _re.match(r"^[0-9a-fA-F]{6}$", c) else default


def _wrap_caption(text, width=42, max_lines=4):
    import textwrap
    lines = textwrap.wrap((text or "").strip(), width=width)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(".") + "\u2026"
    return "\n".join(lines)


def _build_branded_mp4(work, segs, logo_path, brand, W, H, output_filename):
    """Synchronous FFmpeg builder: branded intro card + scene clips (with logo
    bug) + branded end card, with voiceover laid on a card-padded timeline.
    Returns the local output path. Pure FFmpeg so it can be tested offline."""
    head = _brand_font(brand.get("heading_font", "Sora"))
    body = _brand_font(brand.get("body_font", "DM Sans"))
    primary  = _brand_hex(brand.get("primary_color"), "0x0a1438")
    primary2 = "0x1e3a8a"
    accent   = _brand_hex(brand.get("accent_color"), "0x22d3ee")
    show_intro = bool(brand.get("show_intro", True))
    show_outro = bool(brand.get("show_outro", True))
    show_bug   = bool(brand.get("show_logo_bug", True))
    title    = (brand.get("title") or brand.get("business_name") or "").strip()
    cta_text = (brand.get("cta_text") or "").strip()
    cta_url  = (brand.get("cta_url") or "").strip()

    ts = max(30, int(H * 0.055)); cs = max(24, int(H * 0.045)); us = max(18, int(H * 0.03))
    bug_h = max(20, int(H * 0.07)); ilogo = max(48, int(H * 0.18))

    def run(cmd):
        subprocess.run(cmd, capture_output=True, check=True)
    def tf(name, txt):
        fp = os.path.join(work, name); open(fp, "w").write(txt); return fp

    segments = []  # (video_path, duration, vo_path|None)

    # ── Intro card ──
    if show_intro and (title or logo_path):
        out = os.path.join(work, "intro.mp4")
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
               "gradients=s=%dx%d:c0=%s:c1=%s:d=%s:r=30" % (W, H, primary, primary2, _BRAND_INTRO_DUR)]
        parts = []; last = "0:v"
        if logo_path:
            cmd += ["-i", logo_path]
            parts.append("[1]scale=-1:%d[lg]" % ilogo)
            parts.append("[%s][lg]overlay=(W-w)/2:(H-h)/2-%d[a]" % (last, int(H * 0.07))); last = "a"
        if title:
            parts.append("[%s]drawtext=fontfile=%s:textfile=%s:fontcolor=white:fontsize=%d:x=(w-text_w)/2:y=H/2+%d[v]"
                         % (last, head, tf("title.txt", title), ts, int(H * 0.08))); last = "v"
        cmd += ["-filter_complex", ";".join(parts), "-map", "[%s]" % last,
                "-t", str(_BRAND_INTRO_DUR), "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", out]
        run(cmd); segments.append((out, _BRAND_INTRO_DUR, None))

    # ── Scenes (normalise + logo bug + burned-in caption) ──
    show_caps = bool(brand.get("captions", True))
    for i, sc in enumerate(segs):
        out = os.path.join(work, "n%03d.mp4" % i)
        inputs = ["-i", sc["video"]]
        parts = ["[0:v]scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[s0]" % (W, H, W, H)]
        last = "s0"
        if logo_path and show_bug:
            inputs += ["-i", logo_path]
            parts.append("[1]scale=-1:%d[lg]" % bug_h)
            parts.append("[%s][lg]overlay=W-w-%d:%d[s1]" % (last, int(W * 0.02), int(H * 0.04)))
            last = "s1"
        narr = (sc.get("narration") or "").strip()
        if show_caps and narr:
            cf = tf("cap%03d.txt" % i, _wrap_caption(narr))
            cfs = max(16, int(H * 0.038))
            parts.append("[%s]drawtext=fontfile=%s:textfile=%s:fontcolor=white:fontsize=%d:line_spacing=6:"
                         "box=1:boxcolor=black@0.45:boxborderw=%d:x=(w-text_w)/2:y=h-text_h-%d[s2]"
                         % (last, body, cf, cfs, max(10, int(H * 0.018)), int(H * 0.06)))
            last = "s2"
        cmd = ["ffmpeg", "-y", "-loglevel", "error"] + inputs + [
            "-filter_complex", ";".join(parts), "-map", "[%s]" % last,
            "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", out]
        run(cmd); segments.append((out, sc.get("dur"), sc.get("vo")))

    # ── End card ──
    if show_outro and (cta_text or cta_url or logo_path):
        out = os.path.join(work, "outro.mp4")
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i",
               "gradients=s=%dx%d:c0=%s:c1=%s:d=%s:r=30" % (W, H, primary, primary2, _BRAND_OUTRO_DUR)]
        parts = []; last = "0:v"
        if logo_path:
            cmd += ["-i", logo_path]
            parts.append("[1]scale=-1:%d[lg]" % int(ilogo * 0.8))
            parts.append("[%s][lg]overlay=(W-w)/2:(H-h)/2-%d[a]" % (last, int(H * 0.10))); last = "a"
        if cta_text:
            parts.append("[%s]drawtext=fontfile=%s:textfile=%s:fontcolor=white:fontsize=%d:x=(w-text_w)/2:y=H/2+%d[b]"
                         % (last, head, tf("cta.txt", cta_text), cs, int(H * 0.04))); last = "b"
        if cta_url:
            parts.append("[%s]drawtext=fontfile=%s:textfile=%s:fontcolor=%s:fontsize=%d:x=(w-text_w)/2:y=H/2+%d[v]"
                         % (last, body, tf("url.txt", cta_url), accent, us, int(H * 0.12))); last = "v"
        if parts:
            cmd += ["-filter_complex", ";".join(parts), "-map", "[%s]" % last]
        else:
            cmd += ["-map", "0:v"]
        cmd += ["-t", str(_BRAND_OUTRO_DUR), "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", out]
        run(cmd); segments.append((out, _BRAND_OUTRO_DUR, None))

    # ── Concat video ──
    vl = os.path.join(work, "vlist.txt")
    open(vl, "w").write("".join("file '%s'\n" % seg[0] for seg in segments))
    body_v = os.path.join(work, "body.mp4")
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", vl, "-c", "copy", body_v])

    # ── Audio timeline (silence for cards, VO for scenes) ──
    aud = []
    for idx, (path, dur, vo) in enumerate(segments):
        seg = os.path.join(work, "a%03d.m4a" % idx)
        if vo:
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", vo, "-ar", "44100", "-ac", "2", "-c:a", "aac", seg])
        else:
            run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                 "-t", str(dur or 1), "-c:a", "aac", seg])
        aud.append(seg)
    al = os.path.join(work, "alist.txt")
    open(al, "w").write("".join("file '%s'\n" % a for a in aud))
    fullvo = os.path.join(work, "fullvo.m4a")
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", al, "-c", "copy", fullvo])

    # ── Mux (apad keeps audio covering the whole video; -shortest ends at video) ──
    out = os.path.join(work, output_filename)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", body_v, "-i", fullvo,
         "-filter_complex", "[1:a]apad[a]", "-map", "0:v", "-map", "[a]",
         "-c:v", "copy", "-c:a", "aac", "-shortest", out])
    return out


async def _assemble_branded_video(scene_clips, output_filename, brand, aspect="16:9"):
    """Download clips/voiceovers/logo, build the branded video, upload to R2."""
    import time, shutil
    W, H = _BRAND_DIMS.get(aspect, (1920, 1080))
    try:
        work = tempfile.mkdtemp(prefix="explainer_brand_")
        logo_path = None
        segs = []
        async with httpx.AsyncClient(timeout=120.0) as client:
            lu = brand.get("logo_url")
            if lu:
                try:
                    r = await client.get(lu)
                    if r.status_code == 200:
                        logo_path = os.path.join(work, "logo.png")
                        open(logo_path, "wb").write(r.content)
                except Exception:
                    logo_path = None
            for i, sc in enumerate(scene_clips):
                vp = os.path.join(work, "src%03d.mp4" % i)
                r = await client.get(sc["video_url"]); open(vp, "wb").write(r.content)
                vo = None
                if sc.get("voiceover_url"):
                    vo = os.path.join(work, "vo%03d.mp3" % i)
                    r = await client.get(sc["voiceover_url"]); open(vo, "wb").write(r.content)
                segs.append({"video": vp, "vo": vo, "dur": float(sc.get("duration_seconds") or 5), "narration": sc.get("narration_text")})

        output_path = _build_branded_mp4(work, segs, logo_path, brand, W, H, output_filename)

        import boto3
        r2_endpoint = os.getenv("R2_ENDPOINT", ""); r2_key = os.getenv("R2_ACCESS_KEY_ID", "")
        r2_secret = os.getenv("R2_SECRET_ACCESS_KEY", ""); r2_bucket = os.getenv("R2_BUCKET", "superadpro-media")
        r2_public = os.getenv("R2_PUBLIC_URL", "")
        if not all([r2_endpoint, r2_key, r2_secret]):
            return {"success": False, "error": "R2 storage not configured"}
        s3 = boto3.client("s3", endpoint_url=r2_endpoint, aws_access_key_id=r2_key, aws_secret_access_key=r2_secret)
        key = "pipeline/final/%d_%s" % (int(time.time()), output_filename)
        s3.upload_file(output_path, r2_bucket, key, ExtraArgs={"ContentType": "video/mp4"})
        shutil.rmtree(work, ignore_errors=True)
        return {"success": True, "video_url": "%s/%s" % (r2_public, key)}
    except subprocess.CalledProcessError as e:
        logger.exception("Branded FFmpeg error")
        return {"success": False, "error": "Branded assembly failed: %s" % (e.stderr[:200] if e.stderr else "FFmpeg error")}
    except Exception as e:
        logger.exception("Branded assembly error")
        return {"success": False, "error": str(e)}


async def assemble_video(
    scene_clips: List[dict],
    output_filename: str = "pipeline_output.mp4",
    transition_duration: float = 0.5,
    brand: dict = None,
    aspect: str = "16:9",
) -> dict:
    """
    Assemble scene clips into a final video using FFmpeg.
    scene_clips: [{video_url, voiceover_url, duration_seconds}]
    Returns: {success, video_url}
    """
    if brand:
        return await _assemble_branded_video(scene_clips, output_filename, brand, aspect)
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
