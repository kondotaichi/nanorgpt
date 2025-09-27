'use client'
import { auth, provider } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [user, setUser] = useState<User|null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      // 自動リダイレクトは削除 - ユーザーが明示的にログインした場合のみ遷移
    });
  }, []);

  const login = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, provider);
      // ログイン成功後、/map に遷移
      router.push("/map");
    } catch (error) {
      console.error("Login failed:", error);
      alert("ログインに失敗しました。もう一度お試しください。");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="flex items-center justify-center w-screen h-screen bg-gradient-to-br from-purple-800 to-black text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6">nanoGPT World</h1>
        <button
          onClick={login}
          disabled={isLoggingIn}
          className="px-6 py-3 bg-emerald-500 rounded-lg text-lg font-semibold hover:bg-emerald-600 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? "ログイン中..." : "Googleでログイン"}
        </button>
      </div>
    </main>
  );
}
