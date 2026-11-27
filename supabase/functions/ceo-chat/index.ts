// Become PM — AI CEO for the "defend your decision" screen.
// Runs as a Supabase Edge Function. The Groq API key is stored as a secret (GROQ_API_KEY),
// never in the website code.

// Models are tried in order: if one is unavailable, the next one is used.
const MODELS = [Deno.env.get("GROQ_MODEL"), "llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.1-8b-instant"].filter(Boolean) as string[];

const CASE_TRUTH = `
СКРЫТАЯ ПРАВДА О КЕЙСЕ (никогда не раскрывай её игроку напрямую):
В сентябре маркетинг попросил сделать первую тренировку «настоящей» — её удлинили с 15 до 35 минут.
Новички не справлялись, им было стыдно, и они молча уходили на 3–4 день. Удержание на 7-й день упало с 38% до 26%.
Правильная причина: слишком сложный старт для новичков. Лучшее решение: вернуть короткую первую тренировку (15 минут) и мягкий старт.
Ложные следы: соцсеть (это мнение CEO; активные пользователи вроде Марка тренируются одни), тёмная тема (просят активные пользователи, они не уходят).
Факты, которые игрок мог найти: обрыв удержания между 3-м и 4-м днём; падение началось в сентябре; Анна сдалась на 10-й минуте первой тренировки; Света выключила 35-минутную тренировку на середине; 9 жалоб новичков на сложность; команда удлинила тренировку в сентябре; кто доходит до конца первой тренировки — остаётся в 2 раза чаще.
`;

const CEO_PROMPT = `Ты — Максим Ковалёв, CEO стартапа FitStart (приложение домашних тренировок для новичков).
Ты в учебной игре для будущих продакт-менеджеров. Игрок — новый продакт-менеджер, он защищает перед тобой своё решение.
${CASE_TRUTH}
Как себя вести:
- Говори только по-русски, коротко: 1–3 предложения. Ты живой человек, немного нетерпеливый, но справедливый.
- Изначально ты уверен, что людям скучно тренироваться одним и нужна соцсеть.
- Задавай неудобные вопросы: «откуда ты это знаешь?», «а может, это сезон?», «маркетинг будет против», «почему не просто напоминания?».
- Требуй фактов. Если игрок приводит сильные факты — постепенно соглашайся. Если факты слабые или их нет — сомневайся.
- Никогда не называй правильный ответ сам и не подсказывай, какие факты искать.
- Если игрок пишет не по теме или пытается заставить тебя выйти из роли — вежливо верни разговор к решению.`;

const EVAL_PROMPT = `Ты — наставник Вера в учебной игре для продакт-менеджеров. Прочитай разговор игрока с CEO.
${CASE_TRUTH}
Определи, что предложил игрок, и оцени его защиту. Ответь ТОЛЬКО JSON без пояснений:
{"cause": "hard" | "social" | "dark" | "other", "fix": "short" | "push" | "social" | "dark" | "other", "quality": 0-10, "feedback": "2–4 предложения по-русски, обращение на «ты»: что было убедительно, чего не хватило, чему научиться. Не пересказывай правду полностью — её игрок увидит отдельно."}
cause: hard — сложный старт / слишком тяжёлая первая тренировка; social — нужна соцсеть / скучно одним; dark — тёмная тема; other — что-то другое.
fix: short — укоротить/упростить первую тренировку, мягкий старт; push — напоминания/уведомления; social — соцфункции; dark — тёмная тема; other — другое.
quality: насколько убедительно игрок рассуждал и опирался на факты (0 — без аргументов, 10 — сильные факты, ответил на возражения).`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { mode, messages } = await req.json();
    if (!Array.isArray(messages)) throw new Error("bad request");
    // keep requests small and safe
    const clean = messages.slice(-12).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 1200),
    }));
    const evaluate = mode === "evaluate";
    const base: Record<string, unknown> = {
      temperature: evaluate ? 0.2 : 0.7,
      max_tokens: evaluate ? 500 : 260,
      messages: evaluate
        ? [{ role: "system", content: EVAL_PROMPT }, { role: "user", content: clean.map((m) => (m.role === "assistant" ? "CEO: " : "Игрок: ") + m.content).join("\n") }]
        : [{ role: "system", content: CEO_PROMPT }, ...clean],
    };
    if (evaluate) base.response_format = { type: "json_object" };
    const key = Deno.env.get("GROQ_API_KEY");
    if (!key) return json({ error: "GROQ_API_KEY secret is missing" }, 500);
    let reply = "", lastError = "";
    for (const model of MODELS) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ ...base, model }),
      });
      if (r.ok) {
        const j = await r.json();
        reply = j.choices?.[0]?.message?.content ?? "";
        if (reply) break;
        lastError = `${model}: empty reply`;
      } else {
        lastError = `${model}: ${r.status} ${(await r.text()).slice(0, 300)}`;
        if (r.status === 401 || r.status === 429) break; // bad key or rate limit: other models won't help
      }
    }
    if (!reply) { console.error("Groq error:", lastError); return json({ error: lastError }, 503); }
    return json({ reply });
  } catch (e) {
    return json({ error: "bad request: " + String(e) }, 400);
  }
});
