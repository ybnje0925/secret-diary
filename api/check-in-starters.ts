import { checkInStarters } from "../server/ai.js";

export default async function handler(req: any, res: any) {
  setJson(res);
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const result = await checkInStarters(parseBody(req));
    return res.status(result.status || 200).json(result.body);
  } catch {
    return res.status(200).json({
      success: true,
      data: {
        natural: "오랜만이야. 문득 생각나서 연락했어. 잘 지내?",
        friendly: "잘 지내? 생각나서 연락했어.",
        polite: "오랜만이에요. 잘 지내고 계신가요?"
      },
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
