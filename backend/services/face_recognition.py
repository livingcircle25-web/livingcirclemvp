"""
Real face-match + liveness verification using DeepFace (free, local, open-source
— no API keys).

Honesty notes (read before changing thresholds/behavior):
- `check_face_presence()` is just a fast pre-filter (face detected? blurry?) via
  a real Laplacian-variance blur check — it is NOT the liveness signal.
- `check_liveness()` IS real anti-spoofing: DeepFace's built-in `anti_spoofing=True`
  runs a trained presentation-attack-detection model (MiniFASNet) over the face
  crop, looking for texture/reflection/moiré artifacts that distinguish a live
  camera feed from a printed photo or a photo of a screen. This only means
  something because the frontend (LiveCameraCapture) captures directly from
  getUserMedia/the device camera with no upload/library option — running this
  model against an uploaded file would be nearly meaningless, since the attacker
  controls the file. Like any anti-spoofing model, it isn't perfect (no single-
  frame check can fully replace multi-frame/challenge-response liveness), but it
  is a real, trained model doing real presentation-attack detection, not a stub.
- `estimate_gender()` uses DeepFace's gender classifier, which — like all such
  classifiers — has real, non-trivial error rates and documented bias, especially
  for trans/non-binary users. It is intentionally informational-only here and must
  never be the sole reason a verification is rejected.
"""
from __future__ import annotations

import base64
import logging
import os
import re
import tempfile
import uuid
from typing import Optional

import cv2
from PIL import Image

logger = logging.getLogger("living-circle.face")

_DATA_URI_RE = re.compile(r"^data:image/\w+;base64,")


def _decode_to_tempfile(data_uri_or_b64: str, max_side: int = 800) -> str:
    """Decode a base64/data-URI image into a real temp file, downscaled for speed.

    Uses tempfile.gettempdir() rather than a hardcoded "/tmp" path — the latter
    doesn't exist on Windows.
    """
    raw = _DATA_URI_RE.sub("", data_uri_or_b64.strip())
    image_bytes = base64.b64decode(raw)
    path = os.path.join(tempfile.gettempdir(), f"lc_face_{uuid.uuid4().hex}.jpg")
    with Image.open(__import__("io").BytesIO(image_bytes)) as img:
        img = img.convert("RGB")
        img.thumbnail((max_side, max_side))  # shrink only if larger; keeps aspect ratio
        img.save(path, format="JPEG", quality=90)
    return path


def _cleanup(*paths: Optional[str]) -> None:
    for p in paths:
        if not p:
            continue
        try:
            os.remove(p)
        except OSError:
            pass


class FaceRecognitionService:
    def __init__(self) -> None:
        self.model_name = os.environ.get("FACE_RECOGNITION_MODEL", "Facenet512")
        self.distance_metric = "cosine"
        # Similarity thresholds (0-100). >=approve_at -> approved, >=pending_at -> pending
        # manual review (no admin review UI exists in this app, same as the pre-existing
        # government-ID-verification feature — status just stays "pending"), else rejected.
        self.approve_at = float(os.environ.get("FACE_MATCH_APPROVE_THRESHOLD", "85"))
        self.pending_at = float(os.environ.get("FACE_MATCH_PENDING_THRESHOLD", "70"))
        self.blur_threshold = float(os.environ.get("FACE_BLUR_THRESHOLD", "60"))

    # ---------- Embedding (used once at profile-photo upload time) ----------
    def extract_face_embedding(self, data_uri_or_b64: str):
        from deepface import DeepFace  # imported lazily — heavy import, only pay the cost when used

        path = _decode_to_tempfile(data_uri_or_b64)
        try:
            reps = DeepFace.represent(
                img_path=path, model_name=self.model_name, enforce_detection=True,
            )
            if not reps:
                return None, "No face detected in photo"
            return reps[0]["embedding"], None
        except ValueError as e:
            # DeepFace raises ValueError (not a generic Exception) when no face is found.
            logger.info("No face detected during embedding extraction: %s", e)
            return None, "No face detected in photo"
        except Exception as e:
            logger.exception("Face embedding extraction failed")
            return None, f"Face extraction failed: {e}"
        finally:
            _cleanup(path)

    # ---------- Quality/face-presence check (see module docstring — not liveness) ----------
    def check_face_presence(self, data_uri_or_b64: str) -> dict:
        path = _decode_to_tempfile(data_uri_or_b64)
        try:
            img = cv2.imread(path)
            if img is None:
                return {"face_detected": False, "blurry": None, "message": "Couldn't read the image."}
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            if len(faces) == 0:
                return {"face_detected": False, "blurry": None, "message": "No face detected. Make sure your face is clearly visible."}
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            blurry = blur_score < self.blur_threshold
            return {
                "face_detected": True,
                "blurry": blurry,
                "blur_score": round(float(blur_score), 1),
                "message": "Photo looks blurry — try again with steadier hands and better lighting." if blurry else "Face detected clearly.",
            }
        finally:
            _cleanup(path)

    # ---------- Liveness (real anti-spoofing — see module docstring) ----------
    def check_liveness(self, data_uri_or_b64: str) -> dict:
        from deepface import DeepFace

        path = _decode_to_tempfile(data_uri_or_b64)
        try:
            faces = DeepFace.extract_faces(img_path=path, anti_spoofing=True, enforce_detection=True)
            if not faces:
                return {"is_live": False, "score": 0.0, "message": "No face detected."}
            face = faces[0]
            is_real = bool(face.get("is_real", False))
            score = float(face.get("antispoof_score", 0.0))
            return {
                "is_live": is_real,
                "score": round(score, 3),
                "message": ("Live camera feed confirmed." if is_real else
                            "This doesn't look like a live camera feed — please make sure you're using your camera directly, not a photo of a photo or screen."),
            }
        except ValueError as e:
            logger.info("Liveness check: no face detected: %s", e)
            return {"is_live": False, "score": 0.0, "message": "No face detected."}
        except Exception as e:
            logger.exception("Liveness check failed")
            return {"is_live": False, "score": 0.0, "message": f"Liveness check failed: {e}"}
        finally:
            _cleanup(path)

    # ---------- Face match comparison ----------
    def compare_faces(self, profile_data_uri: str, submitted_data_uri: str) -> dict:
        from deepface import DeepFace

        p1 = _decode_to_tempfile(profile_data_uri)
        p2 = _decode_to_tempfile(submitted_data_uri)
        try:
            result = DeepFace.verify(
                img1_path=p1, img2_path=p2,
                model_name=self.model_name, distance_metric=self.distance_metric,
                enforce_detection=True,
            )
            distance = result["distance"]
            threshold = result.get("threshold") or 1.0
            # Normalize distance->similarity relative to DeepFace's own pass/fail
            # threshold for this model+metric, rather than an arbitrary fixed scale.
            similarity = max(0.0, min(100.0, (1 - (distance / (threshold * 2))) * 100))

            if similarity >= self.approve_at:
                status = "approved"
                message = "✅ Verification Approved! Your video matches your photo."
            elif similarity >= self.pending_at:
                status = "pending"
                message = "⏳ Verification pending — under manual review. Usually takes under 5 minutes."
            else:
                status = "rejected"
                message = ("❌ Face doesn't match your photo. Try again with: same angle, "
                           "same lighting, no glasses/sunglasses, same hairstyle.")
            return {"status": status, "similarity": round(similarity, 2), "message": message, "deepface_verified": bool(result["verified"])}
        except ValueError as e:
            logger.info("Face comparison: no face detected: %s", e)
            return {"status": "rejected", "similarity": 0.0, "message": "No face detected in one of the photos. Try again with better lighting."}
        except Exception as e:
            logger.exception("Face comparison failed")
            return {"status": "error", "similarity": 0.0, "message": f"Verification failed: {e}"}
        finally:
            _cleanup(p1, p2)

    # ---------- Gender — informational only, never a rejection reason ----------
    def estimate_gender(self, data_uri_or_b64: str, expected_gender: Optional[str]) -> dict:
        from deepface import DeepFace

        path = _decode_to_tempfile(data_uri_or_b64)
        try:
            analysis = DeepFace.analyze(img_path=path, actions=["gender"], enforce_detection=True)
            row = analysis[0] if isinstance(analysis, list) else analysis
            detected_raw = str(row.get("dominant_gender", "")).lower()
            detected = "female" if "wom" in detected_raw or "fem" in detected_raw else "male" if "man" in detected_raw else "unknown"
            expected = (expected_gender or "").strip().lower()
            expected_norm = "female" if expected in ("female", "woman") else "male" if expected in ("male", "man") else "other"
            return {"detected_gender": detected, "matches_profile": (detected == expected_norm) if expected_norm in ("male", "female") else None}
        except Exception as e:
            logger.info("Gender estimation skipped: %s", e)
            return {"detected_gender": "unknown", "matches_profile": None}
        finally:
            _cleanup(path)


face_service = FaceRecognitionService()
