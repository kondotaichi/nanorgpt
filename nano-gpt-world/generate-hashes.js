// ハッシュ生成スクリプト
// 使用方法: node generate-hashes.js

const crypto = require('crypto');

const answers = {
  "ch1": "intro",
  "ch2": "tokenization", 
  "ch3": "training",
  "ch4": "attention",
  "ch5": "transformer",
  "ch6": "positional",
  "ch7": "multihead",
  "ch8": "feedforward",
  "ch9": "normalization",
  "ch10": "residual",
  "ch11": "optimization",
  "ch12": "finetuning",
  "ch13": "advanced"
};

const salt = "nanoGPT2024";

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

console.log("=== ハッシュ生成結果 ===");
console.log("Salt:", salt);
console.log("");

Object.entries(answers).forEach(([chapterId, password]) => {
  const input = salt + password;
  const hash = sha256Hex(input);
  console.log(`${chapterId}: "${password}"`);
  console.log(`  Salt + Password: "${input}"`);
  console.log(`  Hash: ${hash}`);
  console.log("");
});

console.log("=== world1.json用の設定 ===");
Object.entries(answers).forEach(([chapterId, password]) => {
  const hash = sha256Hex(salt + password);
  console.log(`"${chapterId}": {`);
  console.log(`  "password": "${password}",`);
  console.log(`  "salt": "${salt}",`);
  console.log(`  "answerHash": "${hash}"`);
  console.log(`},`);
});
