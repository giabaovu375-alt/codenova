// ai.ts — Ultimate Multi-AI Provider Hub (Clean & Fixed)
export type ProviderId =
  | "openai"
  | "deepseek"
  | "claude"
  | "gemini"
  | "groq"
  | "openrouter"
  | "huggingface"
  | "mistral"
  | "together"
  | "cerebras";

export type ProviderInfo = {
  id: ProviderId;
  name: string;
  description: string;
  signupUrl: string;
  models: string[];
  defaultModel: string;
  tier: "fast" | "smart" | "balanced";
  apiFormat: "openai" | "gemini" | "anthropic" | "huggingface";
  baseUrl?: string;
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI (GPT-4o, GPT-3.5)",
    description: "Model mạnh nhất, chất lượng cao, có phí.",
    signupUrl: "https://platform.openai.com/api-keys",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o-mini",
    tier: "smart",
    apiFormat: "openai",
  },
  {
    id: "deepseek",
    name: "DeepSeek (V3, R1)",
    description: "Giá rẻ, chất lượng tốt, có free tier.",
    signupUrl: "https://platform.deepseek.com/api_keys",
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
    tier: "smart",
    apiFormat: "openai",
    baseUrl: "https://api.deepseek.com/v1",
  },
  {
    id: "claude",
    name: "Anthropic Claude (Sonnet, Haiku)",
    description: "Chất lượng code cực tốt, có free tier giới hạn.",
    signupUrl: "https://console.anthropic.com/keys",
    models: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    defaultModel: "claude-3-haiku-20240307",
    tier: "smart",
    apiFormat: "anthropic",
  },
  {
    id: "gemini",
    name: "Google Gemini (2.0 Flash, 1.5 Pro)",
    description: "Free tier rộng rãi, cân bằng tốc độ và chất lượng.",
    signupUrl: "https://aistudio.google.com/apikey",
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"],
    defaultModel: "gemini-2.0-flash",
    tier: "balanced",
    apiFormat: "gemini",
  },
  {
    id: "groq",
    name: "Groq (Llama 3.3 70B, Mixtral)",
    description: "Cực nhanh, miễn phí. Tốt cho code cơ bản.",
    signupUrl: "https://console.groq.com/keys",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    defaultModel: "llama-3.3-70b-versatile",
    tier: "fast",
    apiFormat: "openai",
  },
  {
    id: "openrouter",
    name: "OpenRouter (Multi-model)",
    description: "Truy cập 200+ model, có free tier.",
    signupUrl: "https://openrouter.ai/keys",
    models: [
      "deepseek/deepseek-chat-v3.1:free",
      "deepseek/deepseek-r1:free",
      "qwen/qwen2.5:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ],
    defaultModel: "deepseek/deepseek-chat-v3.1:free",
    tier: "smart",
    apiFormat: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  {
    id: "huggingface",
    name: "Hugging Face (Miễn phí)",
    description: "Model miễn phí từ cộng đồng, phù hợp code cơ bản.",
    signupUrl: "https://huggingface.co/settings/tokens",
    models: ["microsoft/Phi-3-mini-4k-instruct", "mistralai/Mistral-7B-Instruct-v0.2"],
    defaultModel: "microsoft/Phi-3-mini-4k-instruct",
    tier: "fast",
    apiFormat: "huggingface",
  },
  {
    id: "mistral",
    name: "Mistral AI (Large, Small)",
    description: "Model châu Âu, chất lượng tốt, có free tier.",
    signupUrl: "https://console.mistral.ai/api-keys/",
    models: ["mistral-large-latest", "mistral-small-latest"],
    defaultModel: "mistral-small-latest",
    tier: "smart",
    apiFormat: "openai",
    baseUrl: "https://api.mistral.ai/v1",
  },
  {
    id: "together",
    name: "Together AI (Llama, Mistral)",
    description: "Hạ tầng nhanh, nhiều model mở, có free credit.",
    signupUrl: "https://api.together.xyz/",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1"],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    tier: "balanced",
    apiFormat: "openai",
    baseUrl: "https://api.together.xyz/v1",
  },
  {
    id: "cerebras",
    name: "Cerebras (Llama siêu nhanh)",
    description: "Tốc độ inference nhanh nhất, miễn phí hiện tại.",
    signupUrl: "https://cloud.cerebras.ai/",
    models: ["llama3.1-8b", "llama3.1-70b"],
    defaultModel: "llama3.1-8b",
    tier: "fast",
    apiFormat: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
  },
];

const KEY_PREFIX = "codenova:apikey:";
const MODEL_PREFIX = "codenova:model:";

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
  return PROVIDERS.some((p) => getApiKey(p.id));
}

export function getSelectedModel(p: ProviderId): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem(MODEL_PREFIX + p) ??
    PROVIDERS.find((x) => x.id === p)?.defaultModel ??
    ""
  );
}

export function setSelectedModel(p: ProviderId, model: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_PREFIX + p, model);
}

export function suggestModelForLanguage(provider: ProviderId, language: string): string {
  const info = PROVIDERS.find((p) => p.id === provider);
  if (!info) return "";

  const heavyLanguages = ["cpp", "java", "c"];
  if (heavyLanguages.includes(language.toLowerCase())) {
    const smartModels = info.models.filter(
      (m) => !m.includes("lite") && !m.includes("mini") && !m.includes("small") && !m.includes("8b")
    );
    return smartModels.length > 0 ? smartModels[0] : info.defaultModel;
  }

  return info.defaultModel;
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

// ============================================================
// Response cache: tránh gọi lại API cho cùng prompt
// (giảm chi phí, tăng tốc, tránh bị provider gắn cờ lạm dụng)
// ============================================================
const CACHE_PREFIX = "codenova:aicache:v1:";
const CACHE_INDEX_KEY = "codenova:aicache:v1:__index";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 ngày
const CACHE_MAX_ENTRIES = 200;
const memCache = new Map<string, { value: string; ts: number }>();

function hashKey(input: string): string {
  // FNV-1a 32-bit -> base36, đủ ngắn & ổn định cho cache key
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}

function makeCacheKey(provider: ProviderId, model: string, messages: Msg[]): string {
  const norm = messages.map((m) => `${m.role}:${m.content.trim()}`).join("\u0001");
  return `${provider}|${model}|${hashKey(norm)}`;
}

function readIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CACHE_INDEX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeIndex(keys: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(keys));
  } catch {}
}

function cacheGet(key: string): string | null {
  const mem = memCache.get(key);
  if (mem && Date.now() - mem.ts < CACHE_TTL_MS) return mem.value;
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const obj = JSON.parse(raw) as { value: string; ts: number };
    if (Date.now() - obj.ts >= CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    memCache.set(key, obj);
    return obj.value;
  } catch {
    return null;
  }
}

function cacheSet(key: string, value: string) {
  const entry = { value, ts: Date.now() };
  memCache.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    const idx = readIndex().filter((k) => k !== key);
    idx.push(key);
    while (idx.length > CACHE_MAX_ENTRIES) {
      const old = idx.shift();
      if (old) localStorage.removeItem(CACHE_PREFIX + old);
    }
    writeIndex(idx);
  } catch {
    // localStorage đầy: dọn bớt
    try {
      const idx = readIndex();
      for (let i = 0; i < 20 && idx.length > 0; i++) {
        const old = idx.shift();
        if (old) localStorage.removeItem(CACHE_PREFIX + old);
      }
      writeIndex(idx);
    } catch {}
  }
}

export function clearAiCache() {
  memCache.clear();
  if (typeof window === "undefined") return;
  for (const k of readIndex()) localStorage.removeItem(CACHE_PREFIX + k);
  localStorage.removeItem(CACHE_INDEX_KEY);
}

async function safeFetch(url: string, init: RequestInit, label: string, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(`${label}: Yêu cầu bị timeout sau ${timeoutMs / 1000}s.`);
    }
    throw new Error(
      `${label}: không kết nối được tới máy chủ (kiểm tra mạng/CORS/key). ` +
        (e instanceof Error ? e.message : String(e))
    );
  } finally {
    clearTimeout(timer);
  }
}

async function readError(res: Response, label: string): Promise<never> {
  let body = "";
  try {
    body = await res.text();
  } catch {}
  if (body.length > 400) body = body.slice(0, 400) + "…";
  throw new Error(`${label} ${res.status}: ${body || res.statusText}`);
}

// OpenAI-compatible API
async function callOpenAICompatible(
  key: string,
  model: string,
  messages: Msg[],
  baseUrl: string,
  label: string,
  extraHeaders?: Record<string, string>
): Promise<string> {
  const url = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    ...extraHeaders,
  };
  const res = await safeFetch(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, temperature: 0.3 }),
    },
    label
  );
  if (!res.ok) await readError(res, label);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Anthropic API
async function callAnthropic(key: string, model: string, messages: Msg[]): Promise<string> {
  const sys = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const userMsgs = messages.filter((m) => m.role !== "system");
  const res = await safeFetch(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        system: sys || undefined,
        messages: userMsgs.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        max_tokens: 4096,
        temperature: 0.3,
      }),
    },
    "Claude"
  );
  if (!res.ok) await readError(res, "Claude");
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

// Google Gemini API
async function callGeminiAPI(key: string, model: string, messages: Msg[]): Promise<string> {
  const sys = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await safeFetch(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
        contents,
        generationConfig: { temperature: 0.3 },
      }),
    },
    "Gemini"
  );
  if (!res.ok) await readError(res, "Gemini");
  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((p: { text: string }) => p.text)
      .join("") ?? ""
  );
}

// Hugging Face API
async function callHuggingFaceAPI(key: string, model: string, messages: Msg[]): Promise<string> {
  const userMsgs = messages.filter((m) => m.role === "user");
  const prompt = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : "";
  const res = await safeFetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.3,
          return_full_text: false,
        },
      }),
    },
    "Hugging Face"
  );
  
  if (!res.ok) {
    // Kiểm tra lỗi model loading
    const errorData = await res.json().catch(() => ({}));
    if (errorData.error) {
      throw new Error(`Hugging Face: ${errorData.error}`);
    }
    await readError(res, "Hugging Face");
  }
  
  const data = await res.json();
  if (data.error) {
    throw new Error(`Hugging Face: ${data.error}`);
  }
  if (Array.isArray(data) && data.length > 0) {
    return data[0].generated_text ?? "";
  }
  return "";
}

export async function chat(
  provider: ProviderId,
  messages: Msg[],
  modelOverride?: string,
  options?: { noCache?: boolean }
): Promise<string> {
  const info = PROVIDERS.find((p) => p.id === provider);
  if (!info) throw new Error(`Provider ${provider} không tồn tại.`);
  const key = getApiKey(provider);
  if (!key) throw new Error(`Chưa có API key cho ${info.name}. Vào Cài đặt để thêm.`);
  const model = modelOverride || getSelectedModel(provider) || info.defaultModel;

  const cacheKey = makeCacheKey(provider, model, messages);
  if (!options?.noCache) {
    const cached = cacheGet(cacheKey);
    if (cached !== null) return cached;
  }

  let result: string;
  switch (info.apiFormat) {
    case "openai":
      result = await callOpenAICompatible(
        key,
        model,
        messages,
        info.baseUrl || "https://api.openai.com/v1",
        info.name,
        provider === "openrouter" ? {
          "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
          "X-Title": "Code Nova",
        } : undefined
      );
      break;
    case "anthropic":
      result = await callAnthropic(key, model, messages);
      break;
    case "gemini":
      result = await callGeminiAPI(key, model, messages);
      break;
    case "huggingface":
      result = await callHuggingFaceAPI(key, model, messages);
      break;
    default:
      throw new Error(`API format ${info.apiFormat} chưa được hỗ trợ.`);
  }

  if (!options?.noCache && result) cacheSet(cacheKey, result);
  return result;
}

export function pickProvider(prefer: "fast" | "smart"): ProviderId | null {
  const smartOrder: ProviderId[] = [
    "openai",
    "claude",
    "deepseek",
    "openrouter",
    "mistral",
    "gemini",
    "together",
    "groq",
    "cerebras",
    "huggingface",
  ];
  const fastOrder: ProviderId[] = [
    "groq",
    "cerebras",
    "gemini",
    "deepseek",
    "together",
    "mistral",
    "openrouter",
    "openai",
    "claude",
    "huggingface",
  ];
  const order = prefer === "smart" ? smartOrder : fastOrder;
  for (const id of order) if (getApiKey(id)) return id;
  return null;
}

// Hàm parse JSON an toàn từ AI response
function safeJsonParse(text: string): any {
  // Tìm JSON object/array đầu tiên hợp lệ
  const jsonMatch = text.match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/);
  if (!jsonMatch) return null;
  
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

export async function explainCode(
  code: string,
  prefer: "fast" | "smart" = "fast",
  language = "python"
): Promise<string> {
  const p = pickProvider(prefer);
  if (!p) throw new Error("Chưa có API key nào. Vào /settings để thêm.");
  const model = suggestModelForLanguage(p, language);
  return chat(
    p,
    [
      {
        role: "system",
        content: `Bạn là trợ giảng lập trình tên Code Nova. Giải thích ngắn gọn, dễ hiểu bằng tiếng Việt. Dùng markdown. Không dài dòng. Ngôn ngữ đang dạy: ${language}.`,
      },
      {
        role: "user",
        content: `Giải thích đoạn code ${language} sau, chỉ ra các điểm quan trọng và cảnh báo lỗi nếu có:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      },
    ],
    model
  );
}

export async function fixCode(
  code: string,
  problem: string,
  language = "python"
): Promise<string> {
  const p = pickProvider("smart");
  if (!p) throw new Error("Chưa có API key nào. Vào /settings để thêm.");
  const model = suggestModelForLanguage(p, language);
  return chat(
    p,
    [
      {
        role: "system",
        content: `Bạn là chuyên gia debug ${language}. Trả về code đã sửa trong khối \`\`\`${language} kèm giải thích ngắn bằng tiếng Việt.`,
      },
      {
        role: "user",
        content: `Đoạn code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nVấn đề: ${problem || "Tìm và sửa lỗi giúp tôi."}`,
      },
    ],
    model
  );
}

export async function quickExplain(code: string, language = "python"): Promise<string> {
  const p = pickProvider("fast");
  if (!p) throw new Error("Chưa có API key.");
  return chat(p, [
    {
      role: "system",
      content: `Bạn giải thích code ${language} CỰC ngắn gọn (1-3 dòng tiếng Việt). Không dùng markdown, không tiêu đề.`,
    },
    {
      role: "user",
      content: `Giải thích đoạn code này thật ngắn (1-3 dòng):\n\n\`\`\`${language}\n${code}\n\`\`\``,
    },
  ]);
}

export async function gradeSubmission(
  prompt: string,
  code: string,
  language = "python"
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
  
  const obj = safeJsonParse(text);
  if (!obj || typeof obj.score !== "number") {
    return { score: 0, feedback: text || "Không phân tích được phản hồi AI.", optimized: code };
  }
  
  try {
    const score = Math.max(0, Math.min(10, Math.round(Number(obj.score) || 0)));
    return {
      score,
      feedback: String(obj.feedback ?? "").trim(),
      optimized: String(obj.optimized ?? "")
        .replace(new RegExp("^```" + language + "\\n?|```$", "g"), "")
        .trim(),
    };
  } catch {
    return { score: 0, feedback: text, optimized: code };
  }
}

export async function generateExercises(
  topic: string,
  count = 3,
  language = "python"
): Promise<string[]> {
  const p = pickProvider("fast");
  if (!p) throw new Error("Chưa có API key nào.");
  const text = await chat(p, [
    {
      role: "system",
      content: `Bạn ra bài tập ${language} ngắn gọn, đúng cấp độ, bằng tiếng Việt. Trả về JSON mảng chuỗi.`,
    },
    {
      role: "user",
      content: `Sinh ${count} bài tập ${language} liên quan đến chủ đề/đoạn code:\n${topic}\n\nChỉ trả về JSON ví dụ: ["Bài 1...", "Bài 2..."]`,
    },
  ]);
  
  const arr = safeJsonParse(text);
  if (Array.isArray(arr)) {
    return arr.map(String);
  }
  return [text];
}

export async function generateLessonContent(
  topic: string,
  language = "python"
): Promise<{
  title: string;
  description: string;
  blocks: { code: string; explanation: string }[];
  exercises: { prompt: string }[];
}> {
  const p = pickProvider("smart");
  if (!p) throw new Error("Chưa có API key nào.");
  const text = await chat(p, [
    {
      role: "system",
      content: `Bạn là giảng viên lập trình. Tạo bài học ${language} ngắn gọn bằng tiếng Việt. 
Trả về JSON hợp lệ theo format:
{
  "title": "Tiêu đề bài học",
  "description": "Mô tả ngắn 1-2 câu",
  "blocks": [
    { "code": "code ví dụ", "explanation": "giải thích 1-2 câu" }
  ],
  "exercises": [
    { "prompt": "Đề bài tập" }
  ]
}
Sinh 5-8 blocks code và 3 bài tập. Chỉ trả về JSON, không có text khác.`,
    },
    {
      role: "user",
      content: `Tạo bài học ${language} về chủ đề: ${topic}`,
    },
  ]);
  
  const obj = safeJsonParse(text);
  if (!obj || !obj.title) {
    throw new Error("AI không trả về JSON hợp lệ.");
  }
  return obj as any;
  }
