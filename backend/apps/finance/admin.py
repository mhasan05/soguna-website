from django.contrib import admin

from .models import Donation, DuesPayment, DuesSetting, Expense, Income

admin.site.register([DuesSetting, DuesPayment, Donation, Income, Expense])
