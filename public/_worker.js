export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });

    // 1. جلب المشاريع
    if (url.pathname === "/api/projects" && request.method === "GET") {
      const id = url.searchParams.get("telegram_id") || "demo";
      const { results = [] } = await env.DB.prepare(
        "SELECT * FROM projects WHERE telegram_id=? ORDER BY updated_at DESC"
      ).bind(id).all();

      return json({ ok: true, projects: results });
    }

    // 2. إنشاء مشروع جديد عبر الذكاء الاصطناعي
    if (url.pathname === "/api/projects" && request.method === "POST") {
      const body = await request.json();
      const u = body.telegramUser || { id: "demo", first_name: "زائر", username: "demo" };
      const goal = String(body.goal || "").trim();

      if (!goal) {
        return json({ ok: false, error: "اكتب هدف المشروع" }, 400);
      }

      // حفظ المستخدم
      await env.DB.prepare(`
        INSERT INTO users(telegram_id,username,first_name) VALUES(?,?,?)
        ON CONFLICT(telegram_id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name, last_seen=CURRENT_TIMESTAMP
      `).bind(String(u.id), u.username || "", u.first_name || "").run();

      // حفظ المشروع مبدئياً
      const r = await env.DB.prepare(
        "INSERT INTO projects(telegram_id,title,goal,progress) VALUES(?,?,?,?)"
      ).bind(String(u.id), goal.slice(0, 55), goal, 5).run();

      const projectId = r.meta.last_row_id;

      // 3. طلب المهام من الذكاء الاصطناعي
      let tasks = [];
      try {
        const prompt = `أنت مدير مشاريع ذكي. المستخدم يريد تحقيق هذا الهدف: "${goal}".
أعطني قائمة من 5 مهام عملية وقصيرة جداً للبدء بتنفيذ الهدف.
الرد يجب أن يكون مصفوفة JSON فقط بدون أي نصوص أو شروحات إضافية.
مثال: ["المهمة الأولى", "المهمة الثانية", "المهمة الثالثة"]`;

        const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [{ role: 'user', content: prompt }]
        });

        // تنظيف الرد للتأكد أنه JSON صالح
        let aiText = aiResponse.response.trim();
        if (aiText.startsWith("```json")) aiText = aiText.replace("```json", "");
        if (aiText.startsWith("```")) aiText = aiText.replace("```", "");
        if (aiText.endsWith("```")) aiText = aiText.replace(/```$/, "");

        tasks = JSON.parse(aiText.trim());
        if (!Array.isArray(tasks)) throw new Error("الرد ليس مصفوفة");

      } catch (e) {
        console.error("AI Error:", e);
        // مهام احتياطية في حال فشل الذكاء الاصطناعي
        tasks = [
          "فهم المتطلبات وتحليل الهدف",
          "تجهيز الأدوات والموارد اللازمة",
          "تنفيذ الخطوة الأولى",
          "المراجعة والتعديل",
          "الإطلاق والمتابعة"
        ];
      }

      // 4. حفظ المهام في قاعدة البيانات
      for (const name of tasks) {
        await env.DB.prepare(
          "INSERT INTO tasks(project_id,title) VALUES(?,?)"
        ).bind(projectId, String(name).slice(0, 100)).run();
      }

      return json({ ok: true, id: projectId });
    }

    return env.ASSETS.fetch(request);
  }
};
