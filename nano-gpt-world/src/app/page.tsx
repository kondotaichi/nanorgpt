'use client';
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { auth, provider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import cn from "classnames";

// ---- 型 ----
type Chapter = {
  id: string;
  title: string;
  colabUrl: string;
  markerXY: { x: number; y: number };
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
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [selected, setSelected] = useState<Chapter | null>(null);
  const [answer, setAnswer] = useState("");
  const [cleared, setCleared] = useState<Set<string>>(new Set());

  // auth state
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // world fetch
  useEffect(() => {
    (async () => {
      const res = await fetch("/data/world1.json");
      const w: World = await res.json();
      setWorld(w);
    })();
  }, []);

  // load progress
  useEffect(() => {
    (async () => {
      if (!user || !world) return;
      const pid = `${user.uid}_${world.id}`;
      const snap = await getDoc(doc(db, "progress", pid));
      const arr: string[] = snap.exists() ? (snap.data().clearedChapterIds || []) : [];
      setCleared(new Set(arr));
    })();
  }, [user, world]);

  const onLogin = () => signInWithPopup(auth, provider);
  const onLogout = () => signOut(auth);

  const allCleared = useMemo(() => world && cleared.size === world.chapters.length, [world, cleared]);

  // done: check answer -> save progress
  const onSubmitAnswer = async () => {
    if (!user || !world || !selected) return;
    const hash = await sha256Hex(selected.salt + answer.trim());
    if (hash !== selected.answerHash) {
      alert("パスワードが違います");
      return;
    }
    const pid = `${user.uid}_${world.id}`;
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
    const next = new Set(cleared); next.add(selected.id);
    setCleared(next);
    setAnswer("");
    setSelected(null);
    if (next.size === world.chapters.length) alert("GOAL！全クリアです🎉");
  };

  if (!world) return <div className="p-8">Loading...</div>;

  return (
    <main className="w-screen h-screen bg-black text-white">
      <header className="absolute z-20 left-4 top-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{world.title}</h1>
        <div className="ml-4">
          {user ? (
            <button className="px-3 py-1 bg-white/10 rounded" onClick={onLogout}>
              Sign out ({user.displayName || user.email})
            </button>
          ) : (
            <button className="px-3 py-1 bg-white/10 rounded" onClick={onLogin}>
              Continue with Google
            </button>
          )}
        </div>
      </header>

      {/* マップ（等比で全面） */}
      <div className="relative w-full h-full">
        {/* 背景 */}
        <Image
          src={world.mapImageUrl}
          alt="map"
          fill
          className="object-contain select-none pointer-events-none"
          priority
        />
        {/* マーカー */}
        {world.chapters.map((c) => {
          const isCleared = cleared.has(c.id);
          const isSel = selected?.id === c.id;
          return (
            <button
              key={c.id}
              aria-label={c.title}
              onClick={() => user && setSelected(c)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                "w-6 h-6 ring-4 transition",
                isCleared ? "bg-blue-500 ring-blue-300" : "bg-red-500 ring-red-300",
                isSel && "outline outline-4 outline-purple-400"
              )}
              style={{ left: `${c.markerXY.x * 100}%`, top: `${c.markerXY.y * 100}%` }}
              disabled={!user}
              title={c.title}
            />
          );
        })}
      </div>

      {/* モーダル（超簡易） */}
      {selected && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
          <div className="bg-white text-black rounded-xl p-4 w-[340px] shadow-xl">
            <div className="text-lg font-bold mb-2">{selected.title}</div>
            <div className="flex gap-2 mb-3">
              <button
                className="flex-1 px-3 py-2 bg-amber-500 text-white rounded"
                onClick={() => window.open(selected.colabUrl, "_blank")}
              >
                notebook
              </button>
              <button
                className="flex-1 px-3 py-2 bg-gray-200 rounded"
                onClick={() => {}}
              >
                done
              </button>
            </div>
            <input
              type="password"
              placeholder="ノートの合言葉"
              className="w-full border rounded px-3 py-2 mb-3"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded" onClick={() => setSelected(null)}>閉じる</button>
              <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={onSubmitAnswer}>送信</button>
            </div>
          </div>
        </div>
      )}

      {/* GOAL 表示（任意） */}
      {allCleared && (
        <div className="absolute right-4 bottom-4 bg-green-600 text-white px-4 py-2 rounded-lg z-20">
          GOAL解放🎉
        </div>
      )}
    </main>
  );
}
