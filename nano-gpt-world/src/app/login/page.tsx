'use client'
import { auth, provider } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [user, setUser] = useState<User|null>(null);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) router.push("/map"); // ログイン済なら /map へ
    });
  }, [router]);

  const login = async () => {
    await signInWithPopup(auth, provider);
    // 成功すれば onAuthStateChanged が発火して /map に遷移
  };

  return (
    <main className="flex items-center justify-center w-screen h-screen bg-gradient-to-br from-purple-800 to-black text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6">nanoGPT World</h1>
        <button
          onClick={login}
          className="px-6 py-3 bg-emerald-500 rounded-lg text-lg font-semibold hover:bg-emerald-600 transition"
        >
          Googleでログイン
        </button>
      </div>
    </main>
  );
}
