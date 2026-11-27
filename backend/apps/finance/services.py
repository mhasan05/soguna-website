"""Finance calculations — the single place where totals are derived (no stored balance)."""

from collections import defaultdict
from datetime import date

from django.db.models import Sum
from django.db.models.functions import TruncMonth

from .models import Donation, DuesPayment, Expense, Income, VerifyStatus

V = VerifyStatus.VERIFIED


def _sum(qs) -> int:
    return qs.aggregate(s=Sum("amount"))["s"] or 0


def totals(start: date | None = None, end: date | None = None) -> dict:
    def rng(qs, field):
        if start:
            qs = qs.filter(**{f"{field}__gte": start})
        if end:
            qs = qs.filter(**{f"{field}__lte": end})
        return qs

    dues = _sum(rng(DuesPayment.objects.filter(status=V), "created_at__date"))
    donations = _sum(rng(Donation.objects.filter(status=V), "created_at__date"))
    income = _sum(rng(Income.objects.filter(is_void=False), "date"))
    expense = _sum(rng(Expense.objects.filter(is_void=False), "date"))
    total_income = dues + donations + income
    return {"income": total_income, "expense": expense, "balance": total_income - expense, "dues": dues, "donations": donations, "other_income": income}


def monthly(last_n: int = 6, today: date | None = None) -> list[dict]:
    today = today or date.today()
    months = []
    y, m = today.year, today.month
    for _ in range(last_n):
        months.append((y, m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    months.reverse()
    start = date(*months[0], 1)
    inc = defaultdict(int)
    exp = defaultdict(int)
    for qs, field, bucket in (
        (DuesPayment.objects.filter(status=V), "created_at", inc),
        (Donation.objects.filter(status=V), "created_at", inc),
        (Income.objects.filter(is_void=False), "date", inc),
        (Expense.objects.filter(is_void=False), "date", exp),
    ):
        rows = qs.filter(**{f"{field}__gte": start}).annotate(mo=TruncMonth(field)).values("mo").annotate(s=Sum("amount"))
        for r in rows:
            mo = r["mo"]
            bucket[(mo.year, mo.month)] += r["s"] or 0
    return [{"year": y, "month": m, "income": inc[(y, m)], "expense": exp[(y, m)]} for y, m in months]


def expense_by_category() -> list[dict]:
    rows = Expense.objects.filter(is_void=False).values("category__name").annotate(s=Sum("amount")).order_by("-s")
    return [{"name": r["category__name"] or "অন্যান্য", "amount": r["s"] or 0} for r in rows]


def recent_transactions(limit: int = 12) -> list[dict]:
    items = []
    for d in Donation.objects.filter(status=V).select_related("event", "aid_request").order_by("-created_at")[:limit]:
        target = d.event.title if d.event else (d.aid_request.public_title or "সাহায্যের আবেদন") if d.aid_request else "সাধারণ তহবিল"
        items.append({"id": f"d{d.id}", "kind": "income", "title": d.public_name, "meta": target, "date": d.created_at.date(), "amount": d.amount, "voucher": None})
    for i in Income.objects.filter(is_void=False).select_related("category").order_by("-date")[:limit]:
        items.append({"id": f"i{i.id}", "kind": "income", "title": i.description or (i.category.name if i.category else "আয়"), "meta": i.category.name if i.category else "", "date": i.date, "amount": i.amount, "voucher": None})
    for e in Expense.objects.filter(is_void=False).select_related("category").order_by("-date")[:limit]:
        from apps.core.utils import media_url

        items.append({"id": f"e{e.id}", "kind": "expense", "title": e.description or (e.category.name if e.category else "খরচ"), "meta": e.category.name if e.category else "", "date": e.date, "amount": e.amount, "voucher": media_url(e.voucher_image) or None})
    # Monthly dues as one line per month
    dues = DuesPayment.objects.filter(status=V).annotate(mo=TruncMonth("created_at")).values("mo").annotate(s=Sum("amount")).order_by("-mo")[:3]
    for r in dues:
        n = DuesPayment.objects.filter(status=V, created_at__year=r["mo"].year, created_at__month=r["mo"].month).values("member").distinct().count()
        items.append({"id": f"m{r['mo']:%Y%m}", "kind": "income", "title": f"মাসিক চাঁদা — {n} জন সদস্য", "meta": "bKash/Nagad/নগদ", "date": r["mo"].date(), "amount": r["s"], "voucher": None})
    items.sort(key=lambda x: x["date"], reverse=True)
    return items[:limit]
