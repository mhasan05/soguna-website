import io
import logging
import re
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.forms.models import model_to_dict
from rest_framework.exceptions import ValidationError

log = logging.getLogger("sajs")

BN_DIGITS = "০১২৩৪৫৬৭৮৯"


def ascii_digits(value: str) -> str:
    return "".join(str(BN_DIGITS.index(c)) if c in BN_DIGITS else c for c in str(value))


def normalise_phone(raw: str | None) -> str | None:
    """Accepts +880 / 880 / 0 prefixes and Bangla digits → 01XXXXXXXXX, or None if invalid."""
    if not raw:
        return None
    d = re.sub(r"\D", "", ascii_digits(raw))
    if d.startswith("88"):
        d = d[2:]
    return d if re.fullmatch(r"01[3-9]\d{8}", d) else None


def require_phone(raw: str | None, field: str = "phone") -> str:
    p = normalise_phone(raw)
    if not p:
        raise ValidationError({field: "১১ সংখ্যার নম্বর দিন, যেমন ০১৭১২৩৪৫৬৭৮"})
    return p


def media_url(field_file, fallback_url: str = "") -> str:
    """Absolute URL for an uploaded file, or the external placeholder URL."""
    if field_file:
        url = field_file.url
        return url if url.startswith("http") else settings.PUBLIC_API_ORIGIN.rstrip("/") + url
    return fallback_url or ""


def check_upload(f, allowed=("image/",), field="file"):
    if f.size > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise ValidationError({field: f"ফাইল অনেক বড় ({f.size // (1024 * 1024)} MB) — সর্বোচ্চ {settings.MAX_UPLOAD_MB} MB"})
    ctype = getattr(f, "content_type", "") or ""
    if not any(ctype.startswith(a) for a in allowed):
        raise ValidationError({field: "এই ধরনের ফাইল নেওয়া যায় না"})


def to_webp(upload, max_px: int = 1600, quality: int = 80, lossless: bool = False) -> ContentFile:
    """Resize and convert an uploaded image to WebP (PRD: images stored as WebP)."""
    from PIL import Image, ImageOps

    img = Image.open(upload)
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    img.thumbnail((max_px, max_px))
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=100 if lossless else quality, lossless=lossless, method=4)
    name = Path(getattr(upload, "name", "image")).stem[:60] + ".webp"
    return ContentFile(buf.getvalue(), name=name)


def snapshot(instance) -> dict:
    """JSON-safe dict of a model instance for the audit log."""
    data = model_to_dict(instance)
    out = {}
    for k, v in data.items():
        if hasattr(v, "name"):  # files
            v = v.name or ""
        elif hasattr(v, "isoformat"):
            v = v.isoformat()
        elif isinstance(v, (list, tuple)):
            v = [getattr(x, "pk", x) for x in v]
        out[k] = v if isinstance(v, (str, int, float, bool, type(None), list)) else str(v)
    return out


def audit(user, action: str, instance=None, *, before=None, after=None, summary: str = "", model: str = "", object_id=""):
    from .models import AuditLog

    AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        model=model or (instance._meta.label if instance is not None else ""),
        object_id=str(object_id or getattr(instance, "pk", "") or ""),
        summary=summary[:240],
        before=before,
        after=after if after is not None else (snapshot(instance) if instance is not None and action != "delete" else None),
    )
