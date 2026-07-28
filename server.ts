import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Pasted chat text only now (no more audio uploads), so a small limit is plenty.
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Initialize Gemini client lazily to avoid crashing if API key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("Warning: GEMINI_API_KEY environment variable is not set correctly.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// REST API for quick-capture text analysis (STT one-liner memo or pasted
// KakaoTalk/conversation text) using Gemini.
app.post("/api/summarize-text", async (req, res) => {
  try {
    const { scriptText, selectedPersonName } = req.body;
    const todayStr = new Date().toISOString().split("T")[0];

    if (!scriptText || !String(scriptText).trim()) {
      return res.status(400).json({ success: false, error: "분석할 텍스트가 필요합니다." });
    }

    const ai = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      // Return a simulated mock intelligence if API key is missing or is placeholder,
      // so the app remains perfectly functional in local dev previews!
      console.log("Using simulated analysis because GEMINI_API_KEY is not configured.");

      const simulatedResponse = simulateAnalysis(scriptText, selectedPersonName, todayStr);
      return res.json({
        success: true,
        data: simulatedResponse,
        simulated: true
      });
    }

    const prompt = `
      당신은 친근하고 세심한 개인 비서 '용쨔'입니다.
      사용자가 지인과 나눈 대화(카톡 대화, 통화 후 한 줄 메모 등)의 텍스트를 입력했습니다. 이 텍스트를 분석하여 지인에 관한 핵심 요약 및 개인 정보를 정교하게 추출해 주세요.

      다음 세부 지침을 따라 분석해 주세요:
      1. 대화 속 상대방이 누구인지 분석합니다. (만약 선택된 인물명 '${selectedPersonName || ""}'이 제공되었다면 해당 인물 정보를 기준으로 분석하고, 그렇지 않다면 대화 내용에서 파악합니다.)
      2. 대화 내용의 핵심 줄거리 및 약속, 나눈 이야기 등을 3줄의 간결한 한글 요약으로 만들어 주세요. 각 요약은 독립된 3줄 문장 형태여야 합니다.
      3. 대화 일자는 대화에서 특별히 언급되지 않는 한 오늘 날짜인 '${todayStr}'로 기록하며, 연락 수단(통화, 카톡, 식사, 대면, 기타)을 문맥에서 파악해 지정해 주세요.
      4. 대화 중 새롭게 언급된 자녀나 배우자 정보가 있다면 추출해 주세요. (예: '첫째 아들 민우가 초등학교 들어갔어', '우리 딸 주아가 벌써 5살이야' -> name: '민우', ageOrBirth: '초등학교 입학', memo: '새 학교 적응 중' 등)
      5. 대화 중 파악한 상대방의 취미, 좋아하는 식성, 좋아하는 것, 건강 상태, 회사 업무 상태, 약속 메모 등이 있다면 'newMemoInsights' 리스트에 짤막한 요약 메모로 추가해 주세요. (예: '요즘 필라테스 시작했음', '아보카도 샐러드 좋아함', '가을에 제주도 여행 계획 중')

      분석할 대화 텍스트: "${scriptText}"
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        detectedPersonName: {
          type: Type.STRING,
          description: "대화 속에서 정보를 업데이트할 지인의 이름 (예: '김지현', '박민지' 등)"
        },
        lastContactDate: {
          type: Type.STRING,
          description: "최근 만남/통화 날짜 (형식: YYYY-MM-DD)"
        },
        lastContactMedium: {
          type: Type.STRING,
          description: "연락 수단. 다음 중 정확히 하나의 문자열이어야 함: '통화', '카톡', '식사', '대면', '기타'"
        },
        summary: {
          type: Type.STRING,
          description: "대화의 핵심 요약 3줄 (줄바꿈 문자 \\n로 연결된 3줄 문자열 또는 마크다운 줄바꿈이 들어간 3개 문장)"
        },
        newFamilyDetails: {
          type: Type.ARRAY,
          description: "새롭게 인지한 자녀 등 가족의 정보 리스트",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "자녀나 가족 구성원의 이름" },
              ageOrBirth: { type: Type.STRING, description: "나이, 생년월일 혹은 학년 (예: '7살', '초등 2학년')" },
              memo: { type: Type.STRING, description: "특이사항/학습/좋아하는 것 메모" }
            },
            required: ["name"]
          }
        },
        newMemoInsights: {
          type: Type.ARRAY,
          description: "취미, 관심사, 식성 등 새로 수집한 지인의 특징 키워드/메모 리스트",
          items: {
            type: Type.STRING
          }
        }
      },
      required: ["detectedPersonName", "lastContactDate", "lastContactMedium", "summary"]
    };

    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2
      }
    });

    const resultText = aiResponse.text;
    if (!resultText) {
      throw new Error("Gemini API가 빈 응답을 반환했습니다.");
    }

    const parsedData = JSON.parse(resultText);
    res.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error("AI Analysis failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "대화 내용 분석 도중 오류가 발생했습니다."
    });
  }
});

// Any unmatched /api/* request must fail as JSON, never fall through to the
// SPA's HTML catch-all — that HTML response is what breaks the frontend's
// response.json() call with "Unexpected token '<'" style parse errors.
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: "요청하신 API 엔드포인트를 찾을 수 없습니다." });
});

// Helper function to simulate analysis when GEMINI_API_KEY is not configured
function simulateAnalysis(scriptText: string, selectedName: string | undefined, todayStr: string) {
  const name = selectedName || "김민수";
  const textLower = scriptText.toLowerCase();

  if (textLower.includes("테니스") || textLower.includes("라켓") || textLower.includes("레슨")) {
    return {
      detectedPersonName: name,
      lastContactDate: todayStr,
      lastContactMedium: "식사",
      summary: "오늘 만남에서 테니스 동호회 이야기를 주로 나누었습니다.\n최근 서브 리턴 연습을 시작하여 손목에 약간 무리가 왔다고 합니다.\n다음 달 동호회 정기 월례 대회에 함께 복식 파트너로 참가하기로 조율했습니다.",
      newFamilyDetails: [
        { name: "민지", ageOrBirth: "9살", memo: "최근 어린이 테니스 교실을 시작해서 아주 신나함" }
      ],
      newMemoInsights: [
        "테니스 구력 3년차, 주 2회 실내 연습장 다님",
        "라켓은 요넥스 제품 사용 중",
        "모임 후 삼겹살에 사이다 먹는 것을 최고로 좋아함"
      ]
    };
  } else if (textLower.includes("육아") || textLower.includes("어린이집") || textLower.includes("유치원") || textLower.includes("아들") || textLower.includes("딸")) {
    return {
      detectedPersonName: name,
      lastContactDate: todayStr,
      lastContactMedium: "통화",
      summary: "자녀 육아 스트레스 및 유치원 추첨 관련 고민을 나누었습니다.\n첫째가 최근 영어 유치원에 완벽하게 적응하여 영어를 자주 쓴다고 합니다.\n다음 주 주말에 가족 동반으로 수목원에 나들이 가기로 제안했습니다.",
      newFamilyDetails: [
        { name: "예나", ageOrBirth: "6살", memo: "영어 유치원 블루반 입학하여 신나게 적응 중" },
        { name: "도윤", ageOrBirth: "3살", memo: "순하고 혼자서 블록 쌓기를 아주 잘함" }
      ],
      newMemoInsights: [
        "주말에는 주로 근외 카페나 수목원 등 야외 가족 나들이 선호",
        "커피는 디카페인 바닐라 라떼만 마심"
      ]
    };
  } else if (textLower.includes("회사") || textLower.includes("부장") || textLower.includes("업무") || textLower.includes("이직") || textLower.includes("프로젝트")) {
    return {
      detectedPersonName: name,
      lastContactDate: todayStr,
      lastContactMedium: "대면",
      summary: "회사 프로젝트 마감 및 최근 조직 개편에 대해 이야기했습니다.\n새로 부임한 부서장과의 조율에 에너지를 많이 쓰고 있다고 털어놓았습니다.\n스트레스 해소를 위해 향후 주말 낚시 캠핑을 계획하고 있습니다.",
      newFamilyDetails: [],
      newMemoInsights: [
        "최근 잦은 야근으로 피로도가 매우 높음, 비타민에 관심 많음",
        "음식은 매콤한 아구찜이나 해물탕 선호"
      ]
    };
  } else {
    return {
      detectedPersonName: name,
      lastContactDate: todayStr,
      lastContactMedium: "통화",
      summary: `지인과 나눈 대화 속에서 주요 비즈니스 및 일상 근황을 나누었습니다.\n최근 근황과 취미에 집중된 대화였습니다.\n다음 만남 일정을 상호 긍정적으로 기약했습니다.`,
      newFamilyDetails: [
        { name: "지우", ageOrBirth: "8살", memo: "올해 초등학교 입학해서 태권도장 다님" }
      ],
      newMemoInsights: [
        "취미로 맛집 탐방과 골프 연습을 병행하고 있음",
        "자몽 에이드를 매우 좋아함"
      ]
    };
  }
}

// Serve Vite dev server or static distribution files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in development mode.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static distribution files in production mode.");
  }

  // Final safety net: guarantee every error response is JSON (never Express's
  // default HTML error page), e.g. body-parser's "entity too large" error.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    const message =
      err.type === "entity.too.large"
        ? "입력한 텍스트가 너무 깁니다. 조금 줄여서 다시 시도해 주세요."
        : err.message || "서버 오류가 발생했습니다.";
    res.status(status).json({ success: false, error: message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[용쨔의 비밀노트] Server running on http://localhost:${PORT}`);
  });
}

startServer();
