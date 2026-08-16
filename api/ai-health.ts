import { getAiHealthResult } from "../server/ai.js";

export default async function handler(req: any, res: any) {
  setJson(res);
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const result = await getAiHealthResult();
    return res.status(200).json(result);
  } catch {
    return res.status(200).json({
      success: true,
      configured: false,
      provider: "local-fallback",
      reason: "GEMINI_REQUEST_FAILED"
    });
  }
}

function setJson(res: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}
