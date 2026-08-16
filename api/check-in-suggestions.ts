import { checkInSuggestions } from "../server/ai.js";

export default async function handler(req: any, res: any) {
  setJson(res);
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const result = await checkInSuggestions(parseBody(req));
    return res.status(result.status || 200).json(result.body);
  } catch {
    return res.status(200).json({
      success: true,
      data: { topics: [] },
      fallback: true,
      error: "AI 연결이 잠시 불안정해요. 저장된 기록으로 계속 사용할 수 있어요.",
      meta: { provider: "local", fallback: true, reason: "GEMINI_REQUEST_FAILED" }
    });
  }
}

function parseBody(req: any) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function setJson(res: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}
