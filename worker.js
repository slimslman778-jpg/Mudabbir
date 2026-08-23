
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

    // التعديل هنا: أضفنا فحص لحالة التوكن
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        name: "Mudabbir",
        version: "2-cloudflare",
        token_ready: !!env.TELEGRAM_BOT_TOKEN
      });
    }

    if (url.pathname === "/api/projects" && request.method === "GET") {
      const id = url.searchParams.get("telegram_id") || "demo";

      const { results = [] } = await env.DB.prepare(
        "SELECT * FROM projects WHERE telegram_id=? ORDER BY updated_at DESC"
      ).bind(id).all();

      return json({
        ok: true,
        projects: results
      });
    }

    if (url.pathname === "/api/projects" && request.method === "POST") {
      const body = await request.json();

      const u = body.telegramUser || {
        id: "demo",
        first_name: "زائر",
        username: "demo"
      };

      const goal = String(body.goal || "").trim();

      if (!goal) {
        return json({
          ok: false,
          error: "اكتب هدف المشروع"
        }, 400);
      }

      await env.DB.prepare(`
        INSERT INTO users(telegram_id,username,first_name)
        VALUES(?,?,?)
        ON CONFLICT(telegram_id) DO UPDATE SET
        username=excluded.username,
        first_name=excluded.first_name,
        last_seen=CURRENT_TIMESTAMP
      `).bind(
        String(u.id),
        u.username || "",
        u.first_name || ""
      ).run();

      const r = await env.DB.prepare(
        "INSERT INTO projects(telegram_id,title,goal,progress) VALUES(?,?,?,?)"
      ).bind(
        String(u.id),
        goal.slice(0, 55),
        goal,
        5
      ).run();

      const projectId = r.meta.last_row_id;

      const names = [
        "فهم الهدف",
        "بناء خطة التنفيذ",
        "البحث والتحليل",
        "إنتاج النتيجة",
        "المراجعة والتسليم"
      ];

      for (const name of names) {
        await env.DB.prepare(
          "INSERT INTO tasks(project_id,title) VALUES(?,?)"
        ).bind(projectId, name).run();
      }

      return json({
        ok: true,
        id: projectId
      });
    }

    return env.ASSETS.fetch(request);
  }
};
