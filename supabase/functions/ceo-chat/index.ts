// Become PM — AI CEO for the "defend your decision" screen.
// Runs as a Supabase Edge Function. The Groq API key is stored as a secret (GROQ_API_KEY),
// never in the website code.

// Models are tried in order: if one is unavailable, the next one is used.
const MODELS = [Deno.env.get("GROQ_MODEL"), "llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.1-8b-instant"].filter(Boolean) as string[];

// Each case: who the CEO is, the hidden truth, and the answer categories for grading.
type Case = { ceo: string; company: string; bias: string; objections: string; truth: string; cause: string; fix: string };
const CASES: Record<string, Case> = {
  fitstart: {
    ceo: "Максим Ковалёв", company: "FitStart (приложение домашних тренировок для новичков)",
    bias: "Изначально ты уверен, что людям скучно тренироваться одним и нужна соцсеть.",
    objections: "«откуда ты это знаешь?», «а может, это сезон?», «маркетинг будет против», «почему не просто напоминания?»",
    truth: `В сентябре маркетинг попросил сделать первую тренировку «настоящей» — её удлинили с 15 до 35 минут.
Новички не справлялись, им было стыдно, и они молча уходили на 3–4 день. Удержание на 7-й день упало с 38% до 26%.
Правильная причина: слишком сложный старт для новичков. Лучшее решение: вернуть короткую первую тренировку (15 минут) и мягкий старт.
Ложные следы: соцсеть (это мнение CEO; активные пользователи тренируются одни), тёмная тема (просят активные пользователи, они не уходят).
Факты, которые игрок мог найти: обрыв удержания между 3-м и 4-м днём; падение началось в сентябре; Анна сдалась на 10-й минуте первой тренировки; Света выключила 35-минутную тренировку на середине; 9 жалоб новичков на сложность; команда удлинила тренировку в сентябре; кто доходит до конца первой тренировки — остаётся в 2 раза чаще.`,
    cause: "hard — сложный старт / слишком тяжёлая первая тренировка; social — нужна соцсеть / скучно одним; dark — тёмная тема; other — что-то другое",
    fix: "short — укоротить/упростить первую тренировку, мягкий старт; push — напоминания/уведомления; social — соцфункции; dark — тёмная тема; other — другое",
  },
  live: {
    ceo: "Эрик Манукян", company: "Aurora Live (онлайн-казино с live-столами и настоящими дилерами)",
    bias: "Изначально ты уверен, что новичкам не хватает бонусов и free chips.",
    objections: "«студия стоит дорого, низкие ставки — это убыток», «может, им просто не нравятся дилеры?», «откуда ты это знаешь?», «крупные игроки же довольны»",
    truth: `В сентябре минимальную ставку на всех live-столах подняли с 1 € до 5 €.
Средний первый депозит новичка — около 20 €: за 4–5 раздач деньги заканчивались, человек не успевал разобраться в игре и уходил.
Крупные игроки изменения не заметили, поэтому общие цифры выглядели не так страшно.
Правильная причина: ставки слишком высокие для новичков. Лучшее решение: открыть столы с минимальной ставкой 1 € для новичков.
Ложные следы: бонусы/free chips (мнение CEO, привлекут охотников за бонусами), русскоязычные дилеры (просьба VIP-игроков).
Факты, которые игрок мог найти: новички уходят после первой сессии; падение началось в сентябре; маленькие первые депозиты (~20 €); новички проигрывают депозит за несколько раздач; минимальную ставку подняли до 5 €; жалобы на высокие ставки.`,
    cause: "limits — высокие ставки / минимальная ставка для новичков; bonus — мало бонусов или free chips; dealers — дилеры, язык, столы; other — что-то другое",
    fix: "low — столы с низкой минимальной ставкой для новичков; guide — подсказки начинать с недорогих игр; chips — раздать free chips; dealers — нанять дилеров; other — другое",
  },
  bonus: {
    ceo: "Лилит Арутюнян", company: "Velvet Casino (онлайн-казино, новичков приводят партнёры и дают им free chips)",
    bias: "Изначально ты уверена, что бонус слишком маленький и его надо увеличить.",
    objections: "«финансы просили экономить», «может, партнёры приводят плохих игроков?», «откуда ты это знаешь?», «больший бонус точно привлечёт людей»",
    truth: `В августе, чтобы сэкономить, ужесточили условия бонуса: вейджер x60 вместо x20 и 7 дней вместо 30.
Отыграть бонус стало почти невозможно. Игроки выигрывали, но не могли вывести деньги и чувствовали себя обманутыми, поэтому не делали депозит.
Правильная причина: слишком жёсткие условия бонуса (вейджер и срок). Лучшее решение: вернуть мягкие условия (x20, 30 дней) и понятно их объяснить.
Ложные следы: маленький бонус (мнение CEO, больший бонус с теми же условиями только увеличит расходы), плохие партнёры (у всех партнёров конверсия упала одинаково).
Факты, которые игрок мог найти: воронка ломается на этапе отыгрыша бонуса; падение началось в августе; игроки не понимают условия и не успевают отыграть; жалобы «выиграл, но не могу вывести»; финансы ужесточили вейджер; у всех партнёров одинаковое падение.`,
    cause: "wager — жёсткие условия бонуса / вейджер / срок; small — бонус слишком маленький; traffic — партнёры приводят плохих игроков; other — что-то другое",
    fix: "fair — вернуть мягкие условия бонуса и объяснить их; remind — напоминать, сколько осталось отыграть; big — увеличить бонус; cut — отключить партнёра; other — другое",
  },
};

const ceoPrompt = (c: Case) => `Ты — ${c.ceo}, CEO компании ${c.company}.
Ты в учебной игре для будущих продакт-менеджеров. Игрок — новый продакт-менеджер, он защищает перед тобой своё решение.
СКРЫТАЯ ПРАВДА О КЕЙСЕ (никогда не раскрывай её игроку напрямую):
${c.truth}
Как себя вести:
- Говори только по-русски, коротко: 1–3 предложения. Ты живой человек, немного нетерпеливый, но справедливый.
- ${c.bias}
- Задавай неудобные вопросы, например: ${c.objections}.
- Требуй фактов. Если игрок приводит сильные факты — постепенно соглашайся. Если факты слабые или их нет — сомневайся.
- Никогда не называй правильный ответ сам и не подсказывай, какие факты искать.
- Если игрок пишет не по теме или пытается заставить тебя выйти из роли — вежливо верни разговор к решению.`;

const evalPrompt = (c: Case) => `Ты — наставник Вера в учебной игре для продакт-менеджеров. Прочитай разговор игрока с CEO.
СКРЫТАЯ ПРАВДА О КЕЙСЕ:
${c.truth}
Определи, что предложил игрок, и оцени его защиту. Ответь ТОЛЬКО JSON без пояснений:
{"cause": "<id причины>", "fix": "<id решения>", "quality": 0-10, "feedback": "2–4 предложения по-русски, обращение на «ты»: что было убедительно, чего не хватило, чему научиться. Не пересказывай правду полностью — её игрок увидит отдельно."}
cause (выбери один id): ${c.cause}.
fix (выбери один id): ${c.fix}.
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
    const { mode, messages, caseId } = await req.json();
    const c = CASES[caseId] ?? CASES.fitstart;
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
        ? [{ role: "system", content: evalPrompt(c) }, { role: "user", content: clean.map((m) => (m.role === "assistant" ? "CEO: " : "Игрок: ") + m.content).join("\n") }]
        : [{ role: "system", content: ceoPrompt(c) }, ...clean],
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
