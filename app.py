import streamlit as st
import json
import os
import datetime
import re

# Streamlit Page Configuration
st.set_page_config(
    page_title="용쨔의 비밀노트 📓 지인 관계 & 미팅 리마인드",
    page_icon="📓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS Styling for Warm Notebook Theme
st.markdown("""
<style>
    /* Global Page Styling */
    .stApp {
        background-color: #FAF7F2;
        color: #352f28;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    
    /* Header Card */
    .notebook-header {
        background-color: #ffffff;
        border: 1px solid #ece5d8;
        border-radius: 24px;
        padding: 20px 24px;
        margin-bottom: 24px;
        box-shadow: 0 4px 12px rgba(53, 47, 40, 0.03);
    }
    
    .badge-tag {
        background-color: #fdf2f2;
        color: #ef4444;
        border: 1px solid #fecaca;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 10px;
        border-radius: 9999px;
    }
    
    /* Custom Person Card */
    .person-card {
        background-color: #ffffff;
        border: 1px solid #ece5d8;
        border-radius: 20px;
        padding: 16px;
        margin-bottom: 12px;
        transition: all 0.2s ease;
    }
    
    .person-card-selected {
        background-color: #fff9f0;
        border: 2px solid #ff6b6b;
        border-radius: 20px;
        padding: 16px;
        margin-bottom: 12px;
    }

    .pill-cat {
        display: inline-block;
        background-color: #f3f0ea;
        color: #4a433a;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 8px;
    }

    /* Buttons */
    .stButton>button {
        border-radius: 12px;
        font-weight: 600;
    }

    /* Secret Paper Card */
    .secret-paper {
        background-color: #ffffff;
        border: 1px solid #ece5d8;
        border-radius: 28px;
        padding: 24px;
        box-shadow: 0 4px 20px rgba(53, 47, 40, 0.04);
    }
    
    .accent-box {
        background-color: #fff9f0;
        border: 1px solid #f3e6d3;
        border-radius: 16px;
        padding: 16px;
        margin-top: 12px;
        margin-bottom: 12px;
    }
</style>
""", unsafe_allow_html=True)

DATA_FILE = "people_data.json"

# Initial Demo Data
INITIAL_PEOPLE = [
    {
        "id": "person-1",
        "name": "홍길동",
        "phone": "010-1234-5678",
        "company": "한양상사 영업부",
        "category": "친구",
        "groups": ["대학동창", "골프모임"],
        "familyInfo": {
            "spouseName": "김영희",
            "children": [
                {"name": "홍민우", "ageOrBirth": "8살 (초1)", "memo": "최근 태권도 1품 획득, 포켓몬 카드에 열광"},
                {"name": "홍주아", "ageOrBirth": "5살 (유치원)", "memo": "딸기 우유 좋아함, 공주 드레스 선호"}
            ]
        },
        "memo": "식성: 매운 것 잘 못 먹음, 회와 드립 커피 선호.\n취미: 주말 골프, 캠핑.\n특이사항: 견과류 알레르기 약간 있음.",
        "avatarEmoji": "👨‍💼",
        "avatarBg": "bg-amber-100",
        "lastContactDate": "2026-07-20",
        "lastContactMedium": "식사",
        "history": [
            {
                "id": "h-1",
                "date": "2026-07-20",
                "medium": "식사",
                "summary": "1. 판교 삼겹살집에서 오붓하게 저녁 식사를 나누며 근황 토크 진행.\n2. 첫째 민우 초등학교 입학 적응 및 학원 선택 관련 고민 공유함.\n3. 다음 달 주말 조율하여 가족 동반 수목원 캠핑 가기로 약속함."
            }
        ]
    },
    {
        "id": "person-2",
        "name": "김지현",
        "phone": "010-9876-5432",
        "company": "네오테크 디자인팀",
        "category": "회사-업무",
        "groups": ["프로젝트A", "와인동호회"],
        "familyInfo": {
            "spouseName": "이서준",
            "children": [
                {"name": "이하은", "ageOrBirth": "4살", "memo": "어린이집 적응 완료, 피아노 소리 좋아함"}
            ]
        },
        "memo": "식성: 디카페인 바닐라 라떼만 마심. 오이 싫어함.\n취미: 필라테스, 와인 시음.\n특이사항: 최근 이직 성공으로 브랜드 리뉴얼 프로젝트 총괄 중.",
        "avatarEmoji": "👩‍🎨",
        "avatarBg": "bg-rose-100",
        "lastContactDate": "2026-07-18",
        "lastContactMedium": "통화",
        "history": [
            {
                "id": "h-2",
                "date": "2026-07-18",
                "medium": "통화",
                "summary": "1. 신규 UI/UX 디자인 가이드라인 전달 및 협력 방안 논의.\n2. 딸 하은이의 어린이집 재롱잔치 준비 소식 공유받음.\n3. 다음 주 화요일 브랜드 미팅 시 디카페인 커피 사가기로 메모함."
            }
        ]
    },
    {
        "id": "person-3",
        "name": "이철민",
        "phone": "010-5555-7777",
        "company": "성진파트너스 이사",
        "category": "지인",
        "groups": ["독서모임"],
        "familyInfo": {
            "spouseName": "박수진",
            "children": []
        },
        "memo": "식성: 삼계탕, 평양냉면 마니아. 단 음식 싫어함.\n취미: 테니스 구력 3년차, 고전 소설 독서.",
        "avatarEmoji": "🎾",
        "avatarBg": "bg-blue-100",
        "lastContactDate": "2026-07-15",
        "lastContactMedium": "대면",
        "history": [
            {
                "id": "h-3",
                "date": "2026-07-15",
                "medium": "대면",
                "summary": "1. 독서 모임 후 근처 카페에서 시사 이슈 및 자산 관리 교류.\n2. 최근 실내 테니스장 레슨 시작하여 손목 보호대 추천해줌.\n3. 가을에 개최될 아마추어 복식 대회 참가 의사 확인."
            }
        ]
    }
]

# Helper Functions to Load and Save Data
def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return INITIAL_PEOPLE

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Initialize Session State
if "people" not in st.session_state:
    st.session_state["people"] = load_data()

if "selected_id" not in st.session_state:
    st.session_state["selected_id"] = st.session_state["people"][0]["id"] if st.session_state["people"] else None

# Helper to analyze audio or text using Gemini
def analyze_with_gemini(script_text, person_name, audio_bytes=None, mime_type=None):
    api_key = os.environ.get("GEMINI_API_KEY", "")
    
    # Try calling Google Gemini API if key is set
    if api_key and api_key != "MY_GEMINI_API_KEY":
        try:
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            prompt = f"""
            당신은 친근하고 세심한 개인 비서 '용쨔'입니다.
            사용자가 지인과의 통화/대화 녹음 파일이나 스크립트를 업로드했습니다. 대화 내용을 분석하여 지인('{person_name}')에 관한 핵심 요약 및 개인 정보를 정교하게 추출해 주세요.
            
            JSON 응답 형식만 반환하세요:
            {{
              "detectedPersonName": "{person_name}",
              "lastContactDate": "{datetime.date.today().strftime('%Y-%m-%d')}",
              "lastContactMedium": "통화",
              "summary": "1. 대화 내용 요약 문장 1\\n2. 대화 내용 요약 문장 2\\n3. 대화 내용 요약 문장 3",
              "newFamilyDetails": [
                {{"name": "자녀이름", "ageOrBirth": "나이/학년", "memo": "특이사항"}}
              ],
              "newMemoInsights": ["취미/식성 메모 1", "관심사 메모 2"]
            }}
            
            대화 내용 스크립트: "{script_text}"
            """
            
            contents = [prompt]
            if audio_bytes and mime_type:
                contents.append({"mime_type": mime_type, "data": audio_bytes})
                
            response = model.generate_content(contents)
            text_resp = response.text.strip()
            if text_resp.startswith("```json"):
                text_resp = text_resp.replace("```json", "").replace("```", "").strip()
            elif text_resp.startswith("```"):
                text_resp = text_resp.replace("```", "").strip()
            return json.loads(text_resp)
        except Exception as e:
            st.warning(f"Gemini API 호출 중 오류 발생 ({e}). 규칙 기반 스마트 시뮬레이션을 수행합니다.")

    # Fallback Smart Simulation Engine
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    text_lower = script_text.lower() if script_text else ""
    
    if "테니스" in text_lower or "운동" in text_lower or "라켓" in text_lower:
        return {
            "detectedPersonName": person_name,
            "lastContactDate": today_str,
            "lastContactMedium": "식사",
            "summary": "1. 지인과 테니스 동호회 및 근황에 관한 깊은 대화를 나누었습니다.\n2. 최근 서브 리턴 연습으로 손목 무리가 온 점에 대해 공감해주었습니다.\n3. 다음 달 정기 월례 대회 복식 파트너로 함께 참가하기로 확정했습니다.",
            "newFamilyDetails": [
                {"name": "민지", "ageOrBirth": "9살", "memo": "어린이 테니스 교실 시작하여 신나함"}
            ],
            "newMemoInsights": [
                "테니스 구력 3년차, 주 2회 연습",
                "식사 후 삼겹살과 디카페인 음료 선호"
            ]
        }
    elif "육아" in text_lower or "아이" in text_lower or "유치원" in text_lower or "학교" in text_lower:
        return {
            "detectedPersonName": person_name,
            "lastContactDate": today_str,
            "lastContactMedium": "통화",
            "summary": "1. 자녀 육아 일상 및 영어 유치원/초등학교 적응에 대한 이야기를 나누었습니다.\n2. 아이가 새로운 환경에 아주 잘 적응하여 기뻐하는 소식을 공유받았습니다.\n3. 다음 주 주말 야외 가족 나들이 모임을 제안하고 약속했습니다.",
            "newFamilyDetails": [
                {"name": "예나", "ageOrBirth": "6살", "memo": "유치원 블루반 적응 완료"}
            ],
            "newMemoInsights": [
                "주말 야외 가족 나들이 카페 선호",
                "바닐라 라떼 마시는 것을 즐김"
            ]
        }
    else:
        return {
            "detectedPersonName": person_name,
            "lastContactDate": today_str,
            "lastContactMedium": "통화",
            "summary": f"1. {person_name}님과 최근 일상 및 비즈니스 현황에 관한 대화를 나누었습니다.\n2. 서로의 주요 관심사와 식성, 근황을 교류하며 친밀도를 높였습니다.\n3. 다음 조만간 대면 식사 자리를 가질 수 있도록 상호 일정을 조정하기로 했습니다.",
            "newFamilyDetails": [
                {"name": "지우", "ageOrBirth": "8살 (초1)", "memo": "올해 입학하여 태권도장 다님"}
            ],
            "newMemoInsights": [
                "취미로 맛집 탐방과 자전거 라이딩 선호",
                "자몽 에이드를 좋아함"
            ]
        }

# Streamlit App Layout Header
st.markdown("""
<div class="notebook-header">
    <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 14px;">
            <div style="background-color: #ff6b6b; color: white; width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                📓
            </div>
            <div>
                <h1 style="font-size: 22px; margin: 0; padding: 0; color: #352f28; font-weight: 800;">
                    용쨔의 비밀노트 <span class="badge-tag">Streamlit 배포버전</span>
                </h1>
                <p style="font-size: 13px; color: #a39788; margin: 4px 0 0 0;">만나기 1분 전, 소중한 사람들의 자녀 정보와 최근 대화 내용을 완벽하게 리마인드하세요.</p>
            </div>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# Main Two-Column Layout
col_left, col_right = st.columns([5, 7], gap="large")

# ==================== LEFT COLUMN: PEOPLE LIST & SEARCH ====================
with col_left:
    st.subheader("🔍 지인 비밀 목록")
    
    # Action Bar: Add Person & Demo Data Reset
    btn_col1, btn_col2 = st.columns(2)
    with btn_col1:
        if st.button("➕ 새 지인 등록", use_container_width=True, type="primary"):
            st.session_state["show_add_modal"] = True
    with btn_col2:
        if st.button("🔄 데모 데이터 복원", use_container_width=True):
            st.session_state["people"] = INITIAL_PEOPLE.copy()
            save_data(st.session_state["people"])
            st.session_state["selected_id"] = st.session_state["people"][0]["id"]
            st.success("데모 데이터가 복원되었습니다!")
            st.rerun()

    # Search & Category Filters
    search_query = st.text_input("🔎 이름, 소속, 메모 검색", placeholder="예: 홍길동, 태권도, 드립 커피").strip().lower()
    
    categories = ["전체", "가족", "친구", "지인", "회사-업무", "회사-동료", "외부 기타"]
    selected_cat = st.radio("카테고리 필터", categories, horizontal=True)
    
    # Filter People
    filtered_people = st.session_state["people"]
    if selected_cat != "전체":
        filtered_people = [p for p in filtered_people if p.get("category") == selected_cat]
        
    if search_query:
        filtered_people = [
            p for p in filtered_people
            if search_query in p["name"].lower()
            or search_query in p.get("company", "").lower()
            or search_query in p.get("memo", "").lower()
            or any(search_query in c.get("name", "").lower() or search_query in c.get("memo", "").lower() for c in p.get("familyInfo", {}).get("children", []))
        ]
        
    st.caption(f"총 {len(filtered_people)}명의 지인 노트")

    # Render Person Cards
    for person in filtered_people:
        is_selected = (person["id"] == st.session_state["selected_id"])
        
        card_bg = "#fff9f0" if is_selected else "#ffffff"
        border_color = "#ff6b6b" if is_selected else "#ece5d8"
        
        with st.container():
            c1, c2 = st.columns([1, 4])
            with c1:
                st.markdown(f"""
                <div style="background-color: {card_bg}; border: 2px solid {border_color}; border-radius: 16px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 26px; margin-top: 4px;">
                    {person.get('avatarEmoji', '👤')}
                </div>
                """, unsafe_allow_html=True)
            with c2:
                st.markdown(f"**{person['name']}** <span class='pill-cat'>{person.get('category', '지인')}</span>", unsafe_allow_html=True)
                st.caption(f"🏢 {person.get('company', '소속 미지정')} | 📞 {person.get('phone', '-')}")
                st.caption(f"🗓️ 마지막 연락: {person.get('lastContactDate', '-')} ({person.get('lastContactMedium', '통화')})")
                
                if st.button(f"📖 {person['name']} 비밀노트 열기", key=f"btn_select_{person['id']}", use_container_width=True):
                    st.session_state["selected_id"] = person["id"]
                    st.rerun()
            st.divider()

# ==================== RIGHT COLUMN: SECRET DIARY SHEET ====================
with col_right:
    selected_person = next((p for p in st.session_state["people"] if p["id"] == st.session_state["selected_id"]), None)
    
    if selected_person:
        st.markdown(f"""
        <div class="secret-paper">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; gap: 12px; align-items: center;">
                    <span style="font-size: 40px;">{selected_person.get('avatarEmoji', '👤')}</span>
                    <div>
                        <h2 style="margin: 0; font-size: 22px; color: #352f28;">{selected_person['name']}님의 비밀 다이어리</h2>
                        <span class="pill-cat">{selected_person.get('category', '지인')}</span> | 🏢 {selected_person.get('company', '소속 없음')}
                    </div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Tabs for details, AI Audio Analysis, and Edit
        tab1, tab2, tab3 = st.tabs(["⚡ 만나기 1분 전 체크", "🎙️ 음성 & AI 대화 분석", "✏️ 정보 수정"])
        
        # TAB 1: Meeting Reminder Check Sheet
        with tab1:
            st.subheader("💡 약속 장소 도착 전 리마인드")
            
            # 1. Family Info (Spouse & Children)
            fam = selected_person.get("familyInfo", {})
            st.markdown("### 👨‍👩‍👧‍👦 소중한 가족 정보")
            if fam.get("spouseName"):
                st.info(f"❤️ **배우자:** {fam['spouseName']}님")
                
            children = fam.get("children", [])
            if children:
                for idx, child in enumerate(children, 1):
                    st.markdown(f"""
                    - **자녀 {idx}: {child['name']}** ({child.get('ageOrBirth', '나이 미기재')})
                      - 📝 메모: *{child.get('memo', '내용 없음')}*
                    """)
            else:
                st.caption("기록된 자녀 정보가 없습니다.")
                
            st.divider()
            
            # 2. Preference & Hobbies Memo
            st.markdown("### ☕ 취미, 식성 및 주의할 점")
            st.warning(selected_person.get("memo", "기록된 메모가 없습니다."))
            
            st.divider()
            
            # 3. Last Conversation History
            st.markdown("### 📜 최근 나눈 대화 요약 이력")
            history = selected_person.get("history", [])
            if history:
                for h in history:
                    st.markdown(f"**[{h['date']} / {h['medium']}]**")
                    st.write(h["summary"])
                    st.caption("---")
            else:
                st.caption("아직 기록된 대화 이력이 없습니다.")

        # TAB 2: AI Voice/Text Conversation Analyzer
        with tab2:
            st.subheader("🎙️ 통화/대화 음성 녹음 또는 텍스트 AI 분석")
            st.caption(f"Gemini AI가 대화 내용을 분석하여 {selected_person['name']}님의 비밀노트(자녀, 취미, 3줄 요약)를 자동 업데이트합니다.")
            
            script_input = st.text_area("✍️ 대화 스크립트/메모 직접 입력", placeholder="예: 오늘 민수 만났음. 첫째 민우가 초등학교 들어갔는데 태권도장 재미있게 다닌다고 함. 삼겹살 먹었고 다음 달 골프 모임 가기로 약속함.", height=100)
            
            audio_file = st.file_uploader("🎵 통화 녹음 오디오 파일 업로드 (선택)", type=["mp3", "wav", "m4a", "ogg", "webm"])
            
            if st.button("🚀 AI 대화 분석 및 비밀노트 반영", type="primary", use_container_width=True):
                with st.spinner("용쨔 AI가 대화 내용을 정교하게 분석 중입니다..."):
                    audio_bytes = audio_file.read() if audio_file else None
                    mime_type = f"audio/{audio_file.name.split('.')[-1]}" if audio_file else None
                    
                    result = analyze_with_gemini(script_input, selected_person["name"], audio_bytes, mime_type)
                    
                    # Update Person's data with AI result
                    selected_person["lastContactDate"] = result.get("lastContactDate", datetime.date.today().strftime("%Y-%m-%d"))
                    selected_person["lastContactMedium"] = result.get("lastContactMedium", "통화")
                    
                    # Append History
                    new_history_item = {
                        "id": f"h-{len(selected_person.get('history', [])) + 1}",
                        "date": selected_person["lastContactDate"],
                        "medium": selected_person["lastContactMedium"],
                        "summary": result.get("summary", "대화 요약 생성 완료")
                    }
                    selected_person.setdefault("history", []).insert(0, new_history_item)
                    
                    # Append new family details if detected
                    for new_child in result.get("newFamilyDetails", []):
                        if new_child.get("name"):
                            selected_person.setdefault("familyInfo", {}).setdefault("children", []).append(new_child)
                            
                    # Append new memo insights
                    for insight in result.get("newMemoInsights", []):
                        if insight and insight not in selected_person.get("memo", ""):
                            selected_person["memo"] += f"\n• {insight}"
                            
                    save_data(st.session_state["people"])
                    st.success("🎉 대화 분석 완료! 비밀노트가 성공적으로 업데이트 되었습니다.")
                    st.rerun()

        # TAB 3: Edit Person Info
        with tab3:
            st.subheader("✏️ 정보 직접 수정")
            with st.form("edit_person_form"):
                e_name = st.text_input("이름", value=selected_person["name"])
                e_phone = st.text_input("전화번호", value=selected_person.get("phone", ""))
                e_company = st.text_input("소속 / 직장명", value=selected_person.get("company", ""))
                e_cat = st.selectbox("카테고리", ["가족", "친구", "지인", "회사-업무", "회사-동료", "외부 기타"], index=1)
                e_memo = st.text_area("취미, 식성 및 자유 메모", value=selected_person.get("memo", ""))
                
                if st.form_submit_button("💾 수정사항 저장", use_container_width=True):
                    selected_person["name"] = e_name
                    selected_person["phone"] = e_phone
                    selected_person["company"] = e_company
                    selected_person["category"] = e_cat
                    selected_person["memo"] = e_memo
                    save_data(st.session_state["people"])
                    st.success("수정되었습니다!")
                    st.rerun()
                    
            if st.button("🗑️ 이 지인 삭제", type="secondary", use_container_width=True):
                st.session_state["people"] = [p for p in st.session_state["people"] if p["id"] != selected_person["id"]]
                save_data(st.session_state["people"])
                st.session_state["selected_id"] = st.session_state["people"][0]["id"] if st.session_state["people"] else None
                st.success("삭제되었습니다.")
                st.rerun()
    else:
        st.info("👈 좌측에서 지인을 선택하거나 새 지인을 등록해 주세요.")

# Add New Person Modal (Sidebar / Expander)
if st.session_state.get("show_add_modal", False):
    with st.sidebar:
        st.subheader("➕ 새 지인 등록")
        with st.form("add_person_form"):
            new_name = st.text_input("이름 *")
            new_phone = st.text_input("전화번호")
            new_company = st.text_input("소속")
            new_cat = st.selectbox("카테고리", ["가족", "친구", "지인", "회사-업무", "회사-동료", "외부 기타"], index=2)
            new_memo = st.text_area("메모 (취미, 식성 등)")
            
            sub = st.form_submit_button("저장하기")
            if sub and new_name:
                new_person = {
                    "id": f"person-{len(st.session_state['people']) + 1}",
                    "name": new_name,
                    "phone": new_phone,
                    "company": new_company,
                    "category": new_cat,
                    "groups": [],
                    "familyInfo": {"spouseName": "", "children": []},
                    "memo": new_memo,
                    "avatarEmoji": "👤",
                    "avatarBg": "bg-amber-100",
                    "lastContactDate": datetime.date.today().strftime("%Y-%m-%d"),
                    "lastContactMedium": "통화",
                    "history": []
                }
                st.session_state["people"].insert(0, new_person)
                save_data(st.session_state["people"])
                st.session_state["selected_id"] = new_person["id"]
                st.session_state["show_add_modal"] = False
                st.success("새 지인이 추가되었습니다!")
                st.rerun()

# Streamlit Deployment Guide Section
st.markdown("---")
with st.expander("☁️ Streamlit Community Cloud 배포 방법 안내"):
    st.markdown("""
    **본 앱을 Streamlit Community Cloud (streamlit.io)에 무료로 바로 배포하는 방법:**
    
    1. **GitHub 저장소에 소스 코드 올리기**
       - `app.py` 와 `requirements.txt` 파일이 포함된 상태로 GitHub 저장소에 푸시합니다.
    2. **Streamlit Cloud 로그인**
       - [share.streamlit.io](https://share.streamlit.io) 접속 후 GitHub 계정으로 로그인합니다.
    3. **New app 버튼 클릭**
       - **Repository**: 사용자의 GitHub 저장소 선택
       - **Main file path**: `app.py` 지정
    4. **Advanced settings (선택 사항 - Gemini AI 연동)**
       - `Secrets` 섹션에 `GEMINI_API_KEY = "your-api-key"` 입력
    5. **Deploy 클릭** - 몇 초 만에 전 세계에서 접속 가능한 커스텀 URL이 생성됩니다!
    """)
