from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """
    Uniform error body: {"detail": "...", "code": "...", "fields": {...}}.
    Field errors keep their per-field messages so the frontend can show them inline (E3).
    """
    response = exception_handler(exc, context)
    if response is None:
        return None
    data = response.data
    body = {"code": getattr(exc, "default_code", "error")}
    if isinstance(data, dict):
        if "detail" in data:
            body["detail"] = str(data["detail"])
            body["code"] = str(getattr(data["detail"], "code", None) or body["code"])
            body.update(getattr(exc, "extra", {}))
        else:
            fields = {k: (v[0] if isinstance(v, list) and v else v) for k, v in data.items()}
            fields = {k: str(v) if not isinstance(v, dict) else v for k, v in fields.items()}
            body["fields"] = fields
            body["detail"] = next(iter(fields.values()), "ঘরগুলো ঠিক করুন") if len(fields) == 1 else f"{len(fields)}টি ঘর ঠিক করতে হবে"
            body["code"] = "invalid"
    elif isinstance(data, list):
        body["detail"] = str(data[0]) if data else "সমস্যা হয়েছে"
    response.data = body
    return response
