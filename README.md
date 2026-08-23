# مُدبّر v2 — Cloudflare Free Base

هذه النسخة مهيأة للنشر على Cloudflare Workers + D1 بدل SQLite المحلي.

## لماذا؟
الملفات المحلية في بيئات Serverless المجانية ليست مكانًا مناسبًا لذاكرة المشاريع الدائمة. Cloudflare Workers Free يوفر 100,000 طلب يوميًا، وD1 متاح على الخطة المجانية، وSQLite-backed Durable Objects متاحة أيضًا على Free. راجع حدود الخطة قبل الإطلاق التجاري.

## ما الذي يحتاجه المستخدم؟
- حساب Cloudflare مجاني.
- إنشاء D1 database باسم `mudabbir-db`.
- وضع `database_id` في `wrangler.toml`.
- تنفيذ schema.sql.
- نشر Worker.

## مهم
هذه النسخة لا تحتوي Bot Token ولا API Keys. لا تضع الأسرار داخل الملفات.
