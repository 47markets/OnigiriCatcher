// --- グローバル変数 ---
let gameState = "title";  // "title", "playing", "gameover"
let score = 0;
let highScore = 0;
let currentTeaSpeed = 2;  // 初期の🍵落下速度。おにぎりキャッチごとに+0.1
let teaThreshold = 5;     // 次に🍵追加するスコア閾値
let sakeThreshold = 10;   // 次に🍶追加するスコア閾値

let onigiriList = []; // 🍙 オブジェクトリスト
let teaList = [];     // 🍵 オブジェクトリスト
let sakeList = [];    // 🍶 オブジェクトリスト

let onigiriSpawnTimer = 0;
const onigiriSpawnInterval = 60; // フレーム毎（約1秒間隔）

// 各種定数
const canvasWidth = 400;
const canvasHeight = 600;
const truckWidth = 80;
const truckHeight = 40;
const itemSize = 32;    // アイテム（絵文字）描画サイズ
const onigiriSpeed = 3; // 🍙 の落下速度
const baseTeaSpeed = 2; // 🍵 の基本落下速度（以降 currentTeaSpeed により上昇）
const sakeSpeed = 3;    // 🍶 の基礎速度（角度で計算）

let truckX;  // トラックの x 座標
let bgm;     // BGM用オーディオエレメント

// --- p5.js setup ---
function setup() {
  // キャンバス作成（背景は透明に）
  const cnv = createCanvas(canvasWidth, canvasHeight);
  cnv.parent('game-container');
  clear();
  
  // 初期トラック位置
  truckX = canvasWidth / 2;
  
  // localStorage からハイスコア取得
  highScore = Number(localStorage.getItem("highScore")) || 0;
  
  // ページスクロール防止（スマホ対応）
  document.body.style.overflow = 'hidden';
  document.addEventListener('touchmove', function(e){ e.preventDefault(); }, {passive: false});
  
  textAlign(CENTER, CENTER);
  
  // BGM エレメント取得
  bgm = document.getElementById('bgm');
}

// --- p5.js draw ループ ---
function draw() {
  // キャンバスをクリア（背景は下層の CSS グラデーションが見えるように透明）
  clear();
  
  if (gameState === "playing") {
    // --- トラックの操作 ---
    if (touches.length > 0) {
      truckX = touches[0].x;
    } else {
      truckX = mouseX;
    }
    truckX = constrain(truckX, truckWidth / 2, canvasWidth - truckWidth / 2);
    
    // --- 🍙（おにぎり）のスポーン ---
    onigiriSpawnTimer++;
    if (onigiriSpawnTimer >= onigiriSpawnInterval) {
      spawnOnigiri();
      onigiriSpawnTimer = 0;
    }
    
    // --- 落下アイテムの更新・描画・衝突判定 ---
    // 🍙（おにぎり）: キャッチ時にスコア+1・🍵速度上昇・閾値到達で追加アイテム
    for (let i = onigiriList.length - 1; i >= 0; i--) {
      const item = onigiriList[i];
      item.update();
      item.draw();
      if (checkCollision(item, truckX, canvasHeight - truckHeight / 2)) {
        // キャッチ成功
        onigiriList.splice(i, 1);
        score++;
        currentTeaSpeed += 0.1;
        // スコアに応じて新たな🍵追加（5点ごと）
        if (score >= teaThreshold) {
          spawnTea();
          teaThreshold += 5;
        }
        // スコアに応じて新たな🍶追加（10点ごと）
        if (score >= sakeThreshold) {
          spawnSake();
          sakeThreshold += 10;
        }
      } else if (item.y - item.radius > canvasHeight) {
        // 画面外に出たら削除
        onigiriList.splice(i, 1);
      }
    }
    
    // 🍵（お茶）: 衝突で即ゲームオーバー
    for (let i = teaList.length - 1; i >= 0; i--) {
      const item = teaList[i];
      item.update();
      item.draw();
      if (checkCollision(item, truckX, canvasHeight - truckHeight / 2)) {
        triggerGameOver();
      } else if (item.y - item.radius > canvasHeight) {
        teaList.splice(i, 1);
      }
    }
    
    // 🍶（酒）: 衝突で即ゲームオーバー（左右バウンド付き）
    for (let i = sakeList.length - 1; i >= 0; i--) {
      const item = sakeList[i];
      item.update();
      item.draw();
      if (checkCollision(item, truckX, canvasHeight - truckHeight / 2)) {
        triggerGameOver();
      } else if (item.y - item.radius > canvasHeight) {
        sakeList.splice(i, 1);
      }
    }
    
    // --- トラックの描画 ---
    drawTruck();
    
    // --- スコア表示（右上） ---
    fill(255);
    textSize(24);
    text("Score: " + score, canvasWidth - 70, 30);
  }
}

// --- FallingItem クラス ---
// 落下アイテム（🍙、🍵、🍶）の基底クラス
class FallingItem {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;  // "onigiri", "tea", "sake"
    this.radius = itemSize / 2;
    if (this.type === "onigiri") {
      this.speedY = onigiriSpeed;
    } else if (this.type === "tea") {
      this.speedY = currentTeaSpeed;
    } else if (this.type === "sake") {
      // 30°～45°の角度をランダムに決定し、左右どちらかにバウンド
      const angleDeg = random(30, 45);
      const angle = radians(angleDeg);
      const baseSpeed = sakeSpeed;
      this.speedY = baseSpeed * cos(angle);
      this.speedX = baseSpeed * sin(angle) * (random() < 0.5 ? -1 : 1);
    }
  }
  
  update() {
    if (this.type === "tea") {
      // 最新の落下速度を反映
      this.speedY = currentTeaSpeed;
      this.y += this.speedY;
    } else if (this.type === "sake") {
      this.x += this.speedX;
      this.y += this.speedY;
      // 横端でバウンド
      if (this.x < this.radius || this.x > canvasWidth - this.radius) {
        this.speedX *= -1;
      }
    } else {  // onigiri
      this.y += this.speedY;
    }
  }
  
  draw() {
    textAlign(CENTER, CENTER);
    textSize(itemSize);
    if (this.type === "onigiri") {
      text("🍙", this.x, this.y);
    } else if (this.type === "tea") {
      text("🍵", this.x, this.y);
    } else if (this.type === "sake") {
      text("🍶", this.x, this.y);
    }
  }
}

// --- 衝突判定 ---
// トラック（🚛）は truckX, truckY を中心とする矩形（幅 truckWidth, 高さ truckHeight）
// 落下アイテムは円として判定
function checkCollision(item, truckX, truckY) {
  let dx = abs(item.x - truckX);
  let dy = abs(item.y - truckY);
  if (dx > (truckWidth / 2 + item.radius)) return false;
  if (dy > (truckHeight / 2 + item.radius)) return false;
  if (dx <= (truckWidth / 2)) return true;
  if (dy <= (truckHeight / 2)) return true;
  let cornerDistSq = (dx - truckWidth / 2) ** 2 + (dy - truckHeight / 2) ** 2;
  return (cornerDistSq <= (item.radius ** 2));
}

// --- トラック描画 ---
function drawTruck() {
  textAlign(CENTER, CENTER);
  textSize(itemSize);
  // トラックは画面下部中央に配置（truckWidth, truckHeight は当たり判定用）
  text("🚛", truckX, canvasHeight - truckHeight / 2);
}

// --- 各種スポーン関数 ---
function spawnOnigiri() {
  const x = random(itemSize, canvasWidth - itemSize);
  const y = -itemSize;
  onigiriList.push(new FallingItem(x, y, "onigiri"));
}

function spawnTea() {
  const x = random(itemSize, canvasWidth - itemSize);
  const y = -itemSize;
  teaList.push(new FallingItem(x, y, "tea"));
}

function spawnSake() {
  const x = random(itemSize, canvasWidth - itemSize);
  const y = -itemSize;
  sakeList.push(new FallingItem(x, y, "sake"));
}

// --- ゲームオーバー処理 ---
function triggerGameOver() {
  if (gameState !== "playing") return; // 重複防止
  gameState = "gameover";
  
  // ハイスコア更新
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
  
  showGameOverScreen();
}

function showGameOverScreen() {
  const gameOverScreen = document.getElementById("game-over-screen");
  if (gameOverScreen) {
    gameOverScreen.style.display = "flex";
  }
  
  // スコア・ハイスコア更新
  const scoreSpan = document.getElementById("score");
  const highScoreSpan = document.getElementById("high-score");
  if (scoreSpan) scoreSpan.textContent = "Score: " + score;
  if (highScoreSpan) highScoreSpan.textContent = "High Score: " + highScore;
  
  // 50%の確率でゲームオーバー画像を表示
  const promoDiv = document.getElementById("game-over-image");
  const promoImg = document.getElementById("promo-image");
  const showPromo = random() < 0.5;
  if (showPromo) {
    promoDiv.style.display = "block";
    // 画像1 と 画像2 を50%ずつ選択
    if (random() < 0.5) {
      promoImg.src = "pr_image1.png";
      promoImg.onclick = function() {
        window.open("https://shop.47markets.org/", "_blank");
      };
    } else {
      promoImg.src = "pr_image2.png";
      promoImg.onclick = function() {
        window.open("https://www.instagram.com/47markets/", "_blank");
      };
    }
  } else {
    promoDiv.style.display = "none";
  }
  
  // 4秒間のカウントダウン表示
  const countdownDiv = document.getElementById("countdown");
  countdownDiv.style.display = "block";
  let countdown = 4;
  countdownDiv.textContent = countdown;
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      countdownDiv.style.display = "none";
      promoDiv.style.display = "none";
      // カウントダウン終了後、再スタート用ボタン群を表示
      document.getElementById("restart-buttons").style.display = "block";
    } else {
      countdownDiv.textContent = countdown;
    }
  }, 1000);
}

// --- ゲーム開始・再スタート ---
function startGame() {
  // タイトル画面非表示
  const titleScreen = document.getElementById("title-screen");
  if (titleScreen) {
    titleScreen.style.display = "none";
  }
  // ゲームオーバー画面非表示
  const gameOverScreen = document.getElementById("game-over-screen");
  if (gameOverScreen) {
    gameOverScreen.style.display = "none";
  }
  
  // 変数リセット
  score = 0;
  currentTeaSpeed = baseTeaSpeed;
  teaThreshold = 5;
  sakeThreshold = 10;
  onigiriList = [];
  teaList = [];
  sakeList = [];
  onigiriSpawnTimer = 0;
  gameState = "playing";
  
  // BGM再生（ユーザー操作後なら自動再生制限回避）
  if (bgm) {
    bgm.play().catch(err => {
      console.log("BGM再生エラー:", err);
    });
  }
}

function restartGame() {
  // 再スタート用ボタン群非表示
  const restartButtons = document.getElementById("restart-buttons");
  if (restartButtons) {
    restartButtons.style.display = "none";
  }
  const gameOverScreen = document.getElementById("game-over-screen");
  if (gameOverScreen) {
    gameOverScreen.style.display = "none";
  }
  startGame();
}

// --- イベントリスナー設定 ---
document.getElementById("start-button").addEventListener("click", function(){
  startGame();
});

document.getElementById("play-again-button").addEventListener("click", function(){
  restartGame();
});

document.getElementById("instagram-button").addEventListener("click", function(){
  window.open("https://www.instagram.com/47markets/", "_blank");
});

document.getElementById("shop-button").addEventListener("click", function(){
  window.open("https://shop.47markets.org/", "_blank");
});
