import { FormEvent, useState } from "react";
import { BrandTitle } from "./LockScreen";
import { supabase } from "../lib/supabase";

export default function AuthView() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setMessage(mode === "signup" && !result.data.session ? "가입 확인 메일을 확인해주세요." : "로그인되었습니다.");
    } catch (error: any) {
      setMessage(error?.message || "인증 처리 중 문제가 생겼어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#fff8ef] px-4 py-6 text-[#2f1b12]">
      <section className="w-full max-w-md rounded-[24px] border border-[#ead8c9] bg-[#fffaf3] p-6 shadow-[0_12px_32px_rgba(91,62,43,0.12)]">
        <div className="text-center">
          <BrandTitle size="lg" />
          <h2 className="mt-4 text-[21px] font-semibold leading-[1.35]">{mode === "signin" ? "계정으로 이어서 사용하기" : "사람談 계정 만들기"}</h2>
          <p className="mt-2 text-sm leading-[1.6] text-[#7c6252]">여러 기기에서 같은 사람 기록을 안전하게 불러옵니다.</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="이메일" className="saram-input" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={6} placeholder="비밀번호" className="saram-input" />
          {message && <p className="rounded-2xl bg-[#fff1e8] p-3 text-sm font-medium text-[#8d5b45]">{message}</p>}
          <button disabled={loading} className="w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white disabled:opacity-45">
            {loading ? "처리 중..." : mode === "signin" ? "로그인" : "회원가입"}
          </button>
        </form>
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full rounded-full border border-[#ead8c9] bg-white py-3 text-sm font-medium text-[#5a392a]">
          {mode === "signin" ? "새 계정 만들기" : "이미 계정이 있어요"}
        </button>
      </section>
    </main>
  );
}

