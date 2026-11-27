"""SMS sending. 'console' logs messages (dev); 'bulksmsbd' calls the BulkSMSBD HTTP API."""

import json
import logging
import urllib.parse
import urllib.request

from django.conf import settings

log = logging.getLogger("sajs")


def send_sms(phone: str, message: str) -> bool:
    backend = settings.SMS_BACKEND
    if backend == "console":
        log.info("SMS → %s: %s", phone, message)
        return True
    if backend == "bulksmsbd":
        params = urllib.parse.urlencode(
            {"api_key": settings.SMS_API_KEY, "senderid": settings.SMS_SENDER_ID, "number": "88" + phone, "message": message}
        )
        try:
            with urllib.request.urlopen(f"https://bulksmsbd.net/api/smsapi?{params}", timeout=10) as r:
                ok = json.loads(r.read().decode() or "{}").get("response_code") == 202
                if not ok:
                    log.warning("SMS failed for %s", phone)
                return ok
        except Exception:  # network errors must never break the request flow
            log.exception("SMS error for %s", phone)
            return False
    raise RuntimeError(f"Unknown SMS_BACKEND {backend!r}")


def send_bulk(phones, message: str) -> int:
    return sum(1 for p in phones if p and send_sms(p, message))
