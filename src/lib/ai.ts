// Direct AI provider clients (no Lovable gateway). Keys live in localStorage.
export type ProviderId = "groq" | "gemini" | "openrouter";

export type ProviderInfo = {
  id: ProviderId;
  name: string;
  description: string;
  signupUrl: string;
  defaultModel: string;
  // Recommended tier: "fast" for basic, "smart" for advanced code
  tier: "fast" | "smart" | "balanced";
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "groq",
    name: "Groq (Llama 3.3 70B)",
    description: "Cực nhanh, miễn phí. Tốt cho code cơ bản.",
    signupUrl: "https://console.groq.com/keys",
    defaultModel: "llama-3.3-70b-versatile",
    tier: "fast",
  },
  {
    id: "gemini",
    name: "Google Gemini 2.0 Flash",
    description: "Free tier rộng rãi. Cân bằng tốc độ và chất lượng.",
    signupUrl: "https://aistudio.google.com/apikey",
    defaultModel: "gemini-2.0-flash",
    tier: "balanced",
  },
  {
    id: "openrouter",
    name: "OpenRouter (DeepSeek free)",
    description: "Truy cập model mạnh, có giới hạn. Dùng cho code nâng cao.",
    signupUrl: "https://openrouter.ai/keys",
    defaultModel: "deepseek/deepseek-chat-v3.1:free",
    tier: "smart",
  },
];

const KEY_PREFIX = "codenova:apikey:";

export function getApiKey(p: ProviderId): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_PREFIX + p) ?? "";
}

export function setApiKey(p: ProviderId, key: string) {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem(KEY_PREFIX + p, key);
  else localStorage.removeItem(KEY_PREFIX + p);
}

export function hasAnyKey() {
  return PROVIDERS.some(p => getApiKey(p.id));
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function safeFetch(url: string, init: RequestInit, label: string): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    throw new Error(
      `${label}: không kết nối được tới máy chủ (kiểm tra mạng/CORS/key). ` +
        (e instanceof Error ? e.message : String(e)),
    );
  }
}

async function readError(res: Response, label: string): Promise<never> {
  let body = "";
  try { body = await res.text(); } catch { /* ignore */ }
  // Trim huge HTML responses
  if (body.length > 400) body = body.slice(0, 400) + "…";
  throw new Error(`${label} ${res.status}: ${body || res.statusText}`);
}

async function callGroq(key: string, model: string, messages: Msg[]): Promise<string> {
  const res = await safeFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  }, "Groq");
  if (!res.ok) await readError(res, "Groq");
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOpenRouter(key: string, model: string, messages: Msg[]): Promise<string> {
  const res = await safeFetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      "X-Title": "Code Nova",
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  }, "OpenRouter");
  if (!res.ok) await readError(res, "OpenRouter");
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(key: string, model: string, messages: Msg[]): Promise<string> {
  const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
      contents,
      generationConfig: { temperature: 0.3 },
    }),
  }, "Gemini");
  if (!res.ok) await readError(res, "Gemini");
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") ?? "";
}

export async function chat(provider: ProviderId, messages: Msg[]): Promise<string> {
  const info = PROVIDERS.find(p => p.id === provider)!;
  const key = getApiKey(provider);
  if (!key) throw new Error(`Chưa có API key cho ${info.name}. Vào Cài đặt để thêm.`);
  if (provider === "groq") return callGroq(key, info.defaultModel, messages);
  if (provider === "openrouter") return callOpenRouter(key, info.defaultModel, messages);
  return callGemini(key, info.defaultModel, messages);
}

// Pick best available provider for a given task
export function pickProvider(prefer: "fast" | "smart"): ProviderId | null {
  const order: ProviderId[] =
    prefer === "smart"
      ? ["openrouter", "gemini", "groq"]
      : ["groq", "gemini", "openrouter"];
  for (const id of order) if (getApiKey(id)) return id;
  return null;
}

export async function explainCode(code: string, prefer: "fast" | "smart" = "fast", language = "python"): Promise<string> {
  const p = pickProvider(prefer);
  if (!p) throw new Error("Chưa có API key nào. Vào /settings để thêm.");
  return chat(p, [
    { role: "system", content: `Bạn là trợ giảng lập trình tên Code Nova. Giải thích ngắn gọn, dễ hiểu bằng tiếng Việt. Dùng markdown. Không dài dòng. Ngôn ngữ đang dạy: ${language}.` },
    { role: "user", content: `Giải thích đoạn code ${language} sau, chỉ ra các điểm quan trọng và cảnh báo lỗi nếu có:\n\n\`\`\`${language}\n${code}\n\`\`\`` },
  ]);
}

export async function fixCode(code: string, problem: string, language = "python"): Promise<string> {
  const p = pickProvider("smart");
  if (!p) throw new Error("Chưa có API key nào. Vào /settings để thêm.");
  return chat(p, [
    { role: "system", content: `Bạn là chuyên gia debug ${language}. Trả về code đã sửa trong khối \`\`\`${language} kèm giải thích ngắn bằng tiếng Việt.` },
    { role: "user", content: `Đoạn code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nVấn đề: ${problem || "Tìm và sửa lỗi giúp tôi."}` },
  ]);
}

// Quick 1-3 line explanation, used live in admin editor as user types.
export async function quickExplain(code: string, language = "python"): Promise<string> {
  const p = pickProvider("fast");
  if (!p) throw new Error("Chưa có API key.");
  return chat(p, [
    { role: "system", content: `Bạn giải thích code ${language} CỰC ngắn gọn (1-3 dòng tiếng Việt). Không dùng markdown, không tiêu đề.` },
    { role: "user", content: `Giải thích đoạn code này thật ngắn (1-3 dòng):\n\n\`\`\`${language}\n${code}\n\`\`\`` },
  ]);
}

// Grade a user's submission against an exercise prompt. Returns score 0-10, feedback, optimized code.
export async function gradeSubmission(
  prompt: string,
  code: string,
  language = "python",
): Promise<{ score: number; feedback: string; optimized: string }> {
  const p = pickProvider("smart");
  if (!p) throw new Error("Chưa có API key.");
  const text = await chat(p, [
    {
      role: "system",
      content:
        `Bạn là giám khảo ${language}. Chấm bài 0-10 dựa trên: đúng yêu cầu (5đ), chạy được không lỗi cú pháp (2đ), tối ưu/đẹp/đặt tên rõ (2đ), có comment hoặc cấu trúc tốt (1đ). ` +
        `Chấm chặt: code rỗng/sai hoàn toàn = 0, code chạy nhưng thiếu yêu cầu = 3-5, code đúng cơ bản = 6-7, đúng và gọn = 8-9, xuất sắc = 10. ` +
        `Trả về JSON THUẦN duy nhất với khoá: score (số 0-10), feedback (tiếng Việt, ngắn gọn, gạch đầu dòng các điểm tốt và cần sửa), optimized (code ${language} đã tối ưu, chỉ code, không kèm \`\`\`). Không thêm chữ nào ngoài JSON.`,
    },
    {
      role: "user",
      content: `Yêu cầu bài tập:\n${prompt}\n\nCode người học nộp:\n\`\`\`${language}\n${code}\n\`\`\``,
    },
  ]);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { score: 0, feedback: text || "Không phân tích được phản hồi AI.", optimized: code };
  try {
    const obj = JSON.parse(match[0]);
    const score = Math.max(0, Math.min(10, Math.round(Number(obj.score) || 0)));
    return {
      score,
      feedback: String(obj.feedback ?? "").trim(),
      optimized: String(obj.optimized ?? "").replace(new RegExp("^```" + language + "\\n?|```$", "g"), "").trim(),
    };
  } catch {
    return { score: 0, feedback: text, optimized: code };
  }
}

export async function generateExercises(topic: string, count = 3, language = "python"): Promise<string[]> {
  const p = pickProvider("fast");
  if (!p) throw new Error("Chưa có API key nào.");
  const text = await chat(p, [
    { role: "system", content: `Bạn ra bài tập ${language} ngắn gọn, đúng cấp độ, bằng tiếng Việt. Trả về JSON mảng chuỗi.` },
    { role: "user", content: `Sinh ${count} bài tập ${language} liên quan đến chủ đề/đoạn code:\n${topic}\n\nChỉ trả về JSON ví dụ: ["Bài 1...", "Bài 2..."]` },
  ]);
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [text];
  try {
    const arr = JSON.parse(match[0]);
    return Array.isArray(arr) ? arr.map(String) : [text];
  } catch {
    return [text];
  }
}
