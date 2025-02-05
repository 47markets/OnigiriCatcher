// --- グローバル変数 ---
let gameState = "title";  // "title", "playing", "gameover"
let score = 0;
let highScore = 0;
let currentTeaSpeed = 2;   // 初期のお茶の落下速度
let teaThreshold = 5;      // 次にお茶を追加するスコア閾値
let sakeThreshold = 10;    // 次に酒を追加するスコア閾値

let onigiriList = [];  // 🍙 のオブジェクトリスト
let teaList = [];      // 🍵 のオブジェクトリスト
let sakeList = [];     // 🍶 のオブジェクトリスト

let onigiriSpawnTimer = 0;
const onigiriSpawnInterval = 90;  // spawn間隔を延長して🍙の量を減少
const maxOnigiriCount = 3;         // 画面上の🍙の最大数

// 各種定数
const canvasWidth = 400;
const canvasHeight = 600;
const truckWidth = 80;
const truckHeight = 40;
const itemSize = 32;     // アイテム（絵文字）のサイズ
const onigiriSpeed = 3;  // 🍙 の落下速度
const baseTeaSpeed = 2;  // 🍵 の基礎落下速度（currentTeaSpeedで加速）
const sakeSpeed = 3;     // 🍶 の基礎速度

let truckX;  // トラックの x 座標
let bgm;     // BGM用オーディオエレメント

// --- p5.js setup ---
function setup() {
  // キャンバス作成（背景は透明）
  const cnv = createCanvas(canvasWidth, canvasHeight);
  cnv.parent('game-container');
  clear();
  
  truckX = canvasWidth / 2;
  
  // localStorage からハイスコア取得
  highScore = Number(localStorage.getItem("highScore")) || 0;
  
  // ページスクロール防止（スマホ対応）
  document.body.style.overflow = 'hidden';
  document.addEventListener('touchmove', function(e){ e.preventDefault(); }, {passive: false});
  
  textAlign(CENTER, CENTER);
  
  // BGMエレメント取得
  bgm = document.getElementById('bgm');
}

// --- p5.js draw ループ ---
function draw() {
  clear();
  
  if (gameState === "playing") {
    // --- トラック操作（PC: mouseX, スマホ: touches[0].x） ---
    if (touches.length > 0) {
      truckX = touches[0].x;
    } else {
      truckX = mouseX;
    }
    truckX = constrain(truckX, truckWidth / 2, canvasWidth - truckWidth / 2);
    
    // --- 🍙 のスポーン（上限チェック付き） ---
    onigiriSpawnTimer++;
    if (onigiriSpawnTimer >= onigiriSpawnInterval) {
      if (onigiriList.length < maxOnigiriCount) {
        spawnOnigiri();
      }
      onigiriSpawnTimer = 0;
    }
    
    // --- 落下アイテムの更新・描画・衝突判定 ---
    // 🍙（おにぎり）：キャッチ時にスコア＋、お茶の速度加速、一定スコアで追加アイテム
    for (let i = onigiriList.length - 1; i >= 0; i--) {
      const item = onigiriList[i];
      item.update();
      item.draw();
      if (checkCollision(item, truckX, canvasHeight - truckHeight / 2)) {
        onigiriList.splice(i, 1);
        score++;
        currentTeaSpeed += 0.1;
        // スコアが閾値に達したときのみ新たなお茶・酒を追加（＝1個ずつ）
        if (score === teaThreshold) {
          spawnTea();
          teaThreshold += 5;
        }
        if (score === sakeThreshold) {
          spawnSake();
          sakeThreshold += 10;
        }
      } else if (item.y - item.radius > canvasHeight) {
        onigiriList.splice(i, 1);
      }
    }
    
    // 🍵（お茶）：衝突で即ゲームオーバー
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
    
    // 🍶（酒）：左右バウンド付きで落下、衝突で即ゲームオーバー
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
    
    // --- トラック描画 ---
    drawTruck();
    
    // --- スコア表示（右上） ---
    fill(255);
    textSize(24);
    text("Score: " + score, canvasWidth - 70, 30);
  }
}

// --- FallingItem クラス ---
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
// トラックは truckX, truckY を中心とする矩形（幅 truckWidth, 高さ truckHeight）
// 落下アイテムは円形として判定
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
  
  // 50%の確率でプロモーション画像を表示（読み込み完了後に表示）
  const promoDiv = document.getElementById("game-over-image");
  const promoImg = document.getElementById("promo-image");
  const showPromo = random() < 0.5;
  if (showPromo) {
    promoImg.style.visibility = "hidden";
    promoDiv.style.display = "block";
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
    promoImg.onload = function() {
      promoImg.style.visibility = "visible";
    };
  } else {
    promoDiv.style.display = "none";
  }
  
  // --- カウントダウンの表示とアニメーション ---
  const countdownDiv = document.getElementById("countdown");
  countdownDiv.style.display = "block";
  let countdown = 4;
  countdownDiv.textContent = countdown;
  // アニメーションを付与
  countdownDiv.classList.remove("countdown-animation");
  void countdownDiv.offsetWidth;  // reflowでアニメーション再起動
  countdownDiv.classList.add("countdown-animation");
  
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      countdownDiv.style.display = "none";
      promoDiv.style.display = "none";
      document.getElementById("restart-buttons").style.display = "block";
    } else {
      countdownDiv.textContent = countdown;
      countdownDiv.classList.remove("countdown-animation");
      void countdownDiv.offsetWidth;
      countdownDiv.classList.add("countdown-animation");
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
  
  // ゲーム開始時に必ず初期の🍵をスポーン
  spawnTea();
  
  // BGM再生（ユーザー操作後の自動再生制限対応）
  if (bgm) {
    bgm.play().catch(err => {
      console.log("BGM再生エラー:", err);
    });
  }
}

function restartGame() {
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

// --- イベントリスナー ---
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
