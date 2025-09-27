'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // ルートページにアクセスされたら /login にリダイレクト
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-black text-white">
      <div>Redirecting to login...</div>
    </div>
  );
}
