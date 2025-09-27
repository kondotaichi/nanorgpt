'use client'
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import cn from "classnames";

// ---- 型 ----
type Chapter = {
  id: string;
  title: string;
  colabUrl: string;
  markerXY: { x: number; y: number };
  password: string;
  salt: string;
  answerHash: string;
};
type World = {
  id: string;
  title: string;
  mapImageUrl: string;
  chapters: Chapter[];
};

// ---- util: SHA-256(hex) ----
async function sha256Hex(s: string) {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function MapPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const [world, setWorld] = useState<World | null>(null);
  const [selected, setSelected] = useState<Chapter | null>(null);
  const [answer, setAnswer] = useState("");
  const [cleared, setCleared] = useState<Set<string>>(new Set());

  // 認証状態チェック
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
      setUser(u);
    });
  }, [router]);

  // world.json 読み込み
  useEffect(() => {
    (async () => {
      const res = await fetch("/data/world1.json");
      const w: World = await res.json();
      console.log("読み込まれたworld data:", w);
      console.log("最初のチャプター:", w.chapters[0]);
      setWorld(w);
    })();
  }, []);

  // progress 読み込み
  useEffect(() => {
    (async () => {
      if (!user || !world) {
        console.log("Progress load skipped - user:", !!user, "world:", !!world);
        return;
      }
      
      try {
        const pid = `${user.uid}_${world.id}`;
        console.log("Loading progress for:", pid);
        
        const snap = await getDoc(doc(db, "progress", pid));
        console.log("Firestore response:", snap.exists(), snap.data());
        
        const arr: string[] = snap.exists()
          ? (snap.data()?.clearedChapterIds || [])
          : [];
        
        console.log("Cleared chapters:", arr);
        setCleared(new Set(arr));
      } catch (error) {
        console.error("Error loading progress:", error);
        if (error instanceof Error && 'code' in error && error.code === 'permission-denied') {
          console.error("権限エラー: Firebaseのセキュリティルールを確認してください");
        }
      }
    })();
  }, [user, world]);

  const allCleared = useMemo(
    () => world && cleared.size === world.chapters.length,
    [world, cleared]
  );

  // done: 答えを検証して progress 更新
  const onSubmitAnswer = async () => {
    if (!user || !world || !selected) return;
    
    try {
      const hash = await sha256Hex(selected.salt + answer.trim());
      console.log("=== デバッグ情報 ===");
      console.log("入力されたパスワード:", `"${answer.trim()}"`);
      console.log("Salt:", `"${selected.salt}"`);
      console.log("Salt + Password:", `"${selected.salt + answer.trim()}"`);
      console.log("生成されたハッシュ:", hash);
      console.log("期待されるハッシュ:", selected.answerHash);
      console.log("比較結果:", hash === selected.answerHash);
      console.log("==================");
      
      if (hash !== selected.answerHash) {
        alert("パスワードが違います");
        return;
      }
      
      const pid = `${user.uid}_${world.id}`;
      console.log("Saving progress for:", pid);
      
      await setDoc(
        doc(db, "progress", pid),
        {
          uid: user.uid,
          worldId: world.id,
          clearedChapterIds: arrayUnion(selected.id),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      
      console.log("Progress saved successfully");
      
      const next = new Set(cleared);
      next.add(selected.id);
      setCleared(next);
      setAnswer("");
      setSelected(null);
      
      if (next.size === world.chapters.length) alert("GOAL！全クリアです🎉");
    } catch (error) {
      console.error("Error saving progress:", error);
      if (error instanceof Error && 'code' in error && error.code === 'permission-denied') {
        alert("権限エラー: Firebaseのセキュリティルールを確認してください");
      } else {
        alert("進捗の保存に失敗しました: " + (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  if (!user) return <div className="p-8">Checking auth...</div>;
  if (!world) return <div className="p-8">Loading map…</div>;

  return (
    <main className="w-screen h-screen bg-black text-white">
      <header className="absolute z-20 left-4 top-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{world.title}</h1>
        <button
          className="px-3 py-1 bg-white/10 rounded"
          onClick={() => signOut(auth)}
        >
          Sign out
        </button>
      </header>

      {/* マップ */}
      <div className="relative w-full h-full">
        <Image
          src={world.mapImageUrl}
          alt="map"
          fill
          className="object-contain select-none pointer-events-none"
          priority
        />
        
        {/* チャプター */}
        {world.chapters.map((c) => {
          const isCleared = cleared.has(c.id);
          const isSel = selected?.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                "w-6 h-6 ring-4 transition-all duration-200 hover:scale-110",
                isCleared ? "bg-green-500 ring-green-300 shadow-lg" : "bg-red-500 ring-red-300",
                isSel && "outline outline-4 outline-purple-400 scale-125"
              )}
              style={{
                left: `${c.markerXY.x * 100}%`,
                top: `${c.markerXY.y * 100}%`,
              }}
              title={`${c.title} ${isCleared ? '(完了済み)' : '(未完了)'}`}
            >
              {/* 完了済みの場合はチェックマークを表示 */}
              {isCleared && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* モーダル - 新しいUI */}
      {selected && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
          <div className="bg-white text-black rounded-xl p-4 w-[340px] shadow-xl">
            {/* タイトルとdoneステータス */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold">{selected.title}</div>
              <div className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                cleared.has(selected.id) 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {cleared.has(selected.id) ? '✓ Done' : '○ Pending'}
              </div>
            </div>
            
            {/* notebookボタンのみ */}
            <div className="mb-3">
              <button
                className="w-full px-3 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                onClick={() => window.open(selected.colabUrl, "_blank")}
              >
                📓 Open Notebook
              </button>
            </div>
            
            {/* パスワード入力 */}
            <form onSubmit={(e) => { e.preventDefault(); onSubmitAnswer(); }}>
              <input
                type="password"
                placeholder="ノートの合言葉"
                className="w-full border rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={cleared.has(selected.id)}
              />
            </form>
            
            {/* actionボタン */}
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-2 rounded border hover:bg-gray-50 transition-colors"
                onClick={() => setSelected(null)}
              >
                閉じる
              </button>
              {!cleared.has(selected.id) && (
                <button
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  onClick={onSubmitAnswer}
                >
                  送信
                </button>
              )}
            </div>
            
            {/* 完了済みの場合のメッセージ */}
            {cleared.has(selected.id) && (
              <div className="mt-3 p-2 bg-green-50 text-green-700 rounded text-sm text-center">
                🎉 このチャプターは完了済みです！
              </div>
            )}
          </div>
        </div>
      )}

      {allCleared && (
        <div className="absolute right-4 bottom-4 bg-green-600 text-white px-4 py-2 rounded-lg z-20">
          GOAL解放🎉
        </div>
      )}
    </main>
  );
}
