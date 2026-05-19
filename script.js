let first = null, second = null, lock = false;
let iq = 100, score = 0, moves = 0;
let timerInterval;
let totalTime = 0, remainingTime = 0;

let currRows, currCols, currTime, currMode;
let hintsLeft = 3;
let comboStreak = 0;

let confettiParticles = [];
let confettiAnimFrame;

// ── ICON THEMES ──
const themes = {
    animals: ["🐶", "🐱", "🐼", "🦁", "🐸", "🐵", "🐯", "🐰", "🦊", "🐻", "🐷", "🐔", "🐧", "🦄", "🐙", "🦋", "🐞", "🐢", "🐬", "🦓"],
    fruits: ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🍒", "🥝", "🍍", "🥭", "🍌", "🍉", "🫐", "🍈", "🥥", "🍐", "🍏", "🫒", "🍅", "🥑"],
    space: ["🚀", "🌙", "⭐", "🪐", "☄️", "🌌", "👽", "🛸", "🔭", "💫", "🌠", "🌟", "🪨", "🛰️", "🌍", "🌞", "🌛", "🌈", "⚡", "🔮"],
    sports: ["⚽", "🏀", "🎾", "🏈", "⚾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥊", "🏹", "🎯", "🛹", "🏄", "🎿", "🏋️", "🤺", "🚴", "🎳"]
};
let currentTheme = "animals";
let icons = [...themes[currentTheme]];

/* ══ THEME SELECTION ══ */
function selectTheme(theme) {
    currentTheme = theme;
    icons = [...themes[theme]];
    document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(`[data-theme="${theme}"]`).classList.add("active");
    spawnFloatingCards();
}

/* ══ FLOATING CARDS HOME BG ══ */
function spawnFloatingCards() {
    const container = document.getElementById("floatingCards");
    container.innerHTML = "";
    const allEmojis = [...icons, ...icons];

    for (let i = 0; i < 28; i++) {
        0
        const card = document.createElement("div");
        const isFaceDown = Math.random() < 0.4;
        card.className = "float-card" + (isFaceDown ? " face-down" : "");

        const size = 60 + Math.random() * 60;
        card.style.width = size + "px";
        card.style.height = size + "px";
        card.style.left = (Math.random() * 105 - 2) + "%";

        const rotStart = (Math.random() - 0.5) * 40;
        const rotEnd = rotStart + (Math.random() - 0.5) * 30;
        const duration = 8 + Math.random() * 14;
        const delay = -(Math.random() * duration);
        const opacity = 0.25 + Math.random() * 0.45;

        card.style.setProperty("--rot-start", rotStart + "deg");
        card.style.setProperty("--rot-end", rotEnd + "deg");
        card.style.setProperty("--op", opacity);
        card.style.animationDuration = duration + "s";
        card.style.animationDelay = delay + "s";

        if (!isFaceDown) {
            card.style.fontSize = (size * 0.45) + "px";
            card.textContent = allEmojis[Math.floor(Math.random() * allEmojis.length)];
        } else {
            card.style.fontSize = (size * 0.4) + "px";
        }

        container.appendChild(card);
    }
}

/* ══ LEADERBOARD ══ */
const JSONBIN_URL = "https://api.jsonbin.io/v3/b/6a0c08cbee5a733b12e21a93";
const JSONBIN_KEY = "$2a$10$oC5K/adQ2GY1mf0lUkYrUutwdzpKNAH1CRlQhIrAicTjjttuCzmcC";

let globalScoresCache = [];

async function fetchGlobalScores() {
    const lb = document.getElementById("leaderboard");
    if (!lb) return;
    
    lb.innerHTML = `<div class="lb-empty">Loading global scores...</div>`;
    
    try {
        const response = await fetch(JSONBIN_URL, {
            headers: {
                "X-Master-Key": JSONBIN_KEY
            }
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();
        let scores = data.record || [];
        if (!Array.isArray(scores)) scores = [];
        
        // Sort: highest IQ, then highest score, then lowest time (or moves)
        scores.sort((a, b) => {
            if (b.iq !== a.iq) return b.iq - a.iq;
            if (b.score !== a.score) return b.score - a.score;
            return a.moves - b.moves;
        });
        
        globalScoresCache = scores;
        renderLeaderboard(scores);
    } catch (error) {
        console.error("Failed to load global scores:", error);
        lb.innerHTML = `<div class="lb-empty">Failed to load global scores.</div>`;
        if (globalScoresCache.length > 0) {
            renderLeaderboard(globalScoresCache);
        }
    }
}

async function saveScore(mode, score, iq, moves) {
    // Local Best Score handling
    const currentBest = parseInt(localStorage.getItem('memoryBest_' + mode) || '0');
    if (score > currentBest) {
        localStorage.setItem('memoryBest_' + mode, score);
        if (mode === currMode) {
            document.getElementById("bestScore").textContent = score;
        }
    }

    if (mode === "Custom") return; // Exclude Custom from global

    const name = getPlayerName() || "Anonymous";
    const email = getPlayerEmail() || `guest@${localStorage.getItem('memoryUserNum') || '0'}`;
    const newEntry = { name, email, mode, score, iq, moves, date: new Date().toLocaleDateString() };
    
    try {
        const getRes = await fetch(JSONBIN_URL, {
            headers: { "X-Master-Key": JSONBIN_KEY }
        });
        
        let scores = [];
        if (getRes.ok) {
            const data = await getRes.json();
            scores = data.record || [];
            if (!Array.isArray(scores)) scores = [];
        }
        
        // Check if user already has a score in this mode
        const existingIdx = scores.findIndex(s => s.email === email && s.mode === mode);
        if (existingIdx !== -1) {
            const old = scores[existingIdx];
            // Compare score logic (higher IQ, higher score, lower moves)
            let isBetter = false;
            if (iq > old.iq) isBetter = true;
            else if (iq === old.iq && score > old.score) isBetter = true;
            else if (iq === old.iq && score === old.score && moves < old.moves) isBetter = true;
            
            if (isBetter) {
                scores[existingIdx] = newEntry; // Replace with better
            }
        } else {
            scores.push(newEntry);
        }
        
        // Group by mode
        const grouped = { "Easy": [], "Medium": [], "Hard": [] };
        scores.forEach(s => {
            if (grouped[s.mode]) grouped[s.mode].push(s);
        });

        const sortedAndCapped = [];
        for (const m in grouped) {
            grouped[m].sort((a, b) => {
                if (b.iq !== a.iq) return b.iq - a.iq;
                if (b.score !== a.score) return b.score - a.score;
                return a.moves - b.moves;
            });
            sortedAndCapped.push(...grouped[m].slice(0, 5));
        }
        
        await fetch(JSONBIN_URL, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": JSONBIN_KEY
            },
            body: JSON.stringify(sortedAndCapped)
        });
        
        await fetchGlobalScores();
    } catch (error) {
        console.error("Failed to save global score:", error);
    }
}

function isHighScore(newScore) {
    const scores = globalScoresCache;
    return scores.length < 10 || newScore > (scores[Math.min(scores.length - 1, 9)]?.score || 0);
}

function renderLeaderboard(scores = globalScoresCache) {
    const lb = document.getElementById("leaderboard");
    if (!scores || !scores.length) {
        lb.innerHTML = `<div class="lb-empty">No scores yet — play a game!</div>`;
        return;
    }

    const grouped = { "Hard": [], "Medium": [], "Easy": [] }; // Desired display order
    scores.forEach(s => {
        if (grouped[s.mode]) grouped[s.mode].push(s);
    });

    let html = "";
    for (const [m, modeScores] of Object.entries(grouped)) {
        html += `<div class="lb-mode-header" style="text-align:center; padding: 10px; color: var(--gold); font-family: 'Orbitron', sans-serif; letter-spacing: 2px;">--- ${m.toUpperCase()} ---</div>`;
        if (modeScores.length === 0) {
            html += `<div class="lb-empty" style="text-align:center; font-size:0.9rem; opacity:0.6; padding-bottom: 10px;">No scores yet</div>`;
        } else {
            html += modeScores.slice(0, 5).map((s, i) => `
                <div class="lb-row ${i === 0 ? 'lb-top' : ''}">
                    <span class="lb-rank">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                    <span class="lb-name">${s.name || 'Anonymous'}</span>
                    <span class="lb-mode">${s.mode}</span>
                    <span class="lb-score">${s.score} pts</span>
                    <span class="lb-iq">IQ ${s.iq}</span>
                    <span class="lb-moves">${s.moves} moves</span>
                    <span class="lb-date">${s.date}</span>
                </div>`).join("");
        }
    }
    lb.innerHTML = html;
}

/* ══ CUSTOM BOX ══ */
function showCustom() {
    const box = document.getElementById("customBox");
    box.style.display = box.style.display === "block" ? "none" : "block";
}

function startCustom() {
    let rows = parseInt(document.getElementById("customRows").value);
    let cols = parseInt(document.getElementById("customCols").value);
    let timeInput = document.getElementById("customTime").value;
    let time = timeInput === "" ? 120 : parseInt(timeInput);

    if (!rows || rows < 2 || !cols || cols < 2)
        return alert("Invalid size! Rows and Columns must be at least 2.");
    if (rows > 100 || cols > 100)
        return alert("Maximum grid size is 100×100!");

    let total = rows * cols;
    if (total % 2 !== 0) total--;

    startGame(rows, cols, time, "Custom");
}

/* ══ START GAME ══ */
function startGame(rows, cols, time, mode) {
    currRows = rows; currCols = cols; currTime = time; currMode = mode;

    document.getElementById("home").style.display = "none";
    document.getElementById("game").style.display = "block";
    document.getElementById("winScreen").style.display = "none";
    document.getElementById("modeText").innerText = mode.toUpperCase();

    // Show player name in HUD
    const pName = getPlayerName();
    const hudName = document.getElementById("hudName");
    if (pName) {
        document.getElementById("hudNameText").textContent = pName;
        hudName.style.display = "block";
    } else {
        hudName.style.display = "none";
    }

    // Show Best Score
    const bestScore = localStorage.getItem('memoryBest_' + mode) || 0;
    document.getElementById("bestScore").textContent = bestScore;

    iq = 100; score = 0; moves = 0; comboStreak = 0;
    hintsLeft = 3;
    document.getElementById("hintBtn").querySelector("#hintCount").innerText = "(3)";
    document.getElementById("comboBanner").style.display = "none";

    updateStats();
    createBoard(rows, cols);
    clearInterval(timerInterval);

    if (time > 0) {
        totalTime = time; remainingTime = time;
        startTimer();
    } else {
        document.getElementById("timeDisplay").innerText = "∞";
        document.getElementById("timerFill").style.width = "100%";
    }
}

/* ══ BOARD ══ */
function createBoard(rows, cols) {
    const board = document.getElementById("board");
    board.innerHTML = "";

    // Responsive card sizing
    const screenW = window.innerWidth;
    const maxCardW = Math.floor((Math.min(screenW, 800) - 48) / cols) - 8;
    const cardSize = Math.max(48, Math.min(80, maxCardW));
    board.style.maxWidth = `${cols * (cardSize + 8)}px`;

    let total = rows * cols;
    if (total % 2 !== 0) total--;

    let needed = total / 2;
    let selected = [];
    for (let i = 0; i < needed; i++) selected.push(icons[i % icons.length]);

    let cards = [...selected, ...selected];
    cards.sort(() => Math.random() - 0.5);

    const fontSize = Math.max(18, Math.floor(cardSize * 0.44));

    cards.forEach((icon, idx) => {
        let card = document.createElement("div");
        card.className = "card";
        card.style.width = cardSize + "px";
        card.style.height = cardSize + "px";
        card.style.setProperty("--card-delay", (idx * 0.03) + "s");
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front"></div>
                <div class="card-back" style="font-size:${fontSize}px">${icon}</div>
            </div>`;
        card.onclick = () => flip(card, icon);
        board.appendChild(card);
    });
}

/* ══ FLIP ══ */
function flip(card, icon) {
    if (lock || card.classList.contains("flipped")) return;
    card.classList.add("flipped");
    moves++;
    updateStats();

    if (!first) {
        first = { card, icon };
    } else {
        second = { card, icon };
        lock = true;

        if (first.icon === second.icon) {
            comboStreak++;
            const bonus = comboStreak > 1 ? (comboStreak - 1) * 5 : 0;
            score += 10 + bonus;
            iq = Math.min(200, iq + 5);

            first.card.classList.add("solved");
            second.card.classList.add("solved");

            if (comboStreak >= 2) showCombo(comboStreak, bonus);

            reset(); updateStats(true); checkWin();
        } else {
            comboStreak = 0;
            iq = Math.max(0, iq - 3);
            updateStats(false);
            setTimeout(() => {
                first.card.classList.remove("flipped");
                second.card.classList.remove("flipped");
                reset();
            }, 800);
        }
    }
}

function reset() { first = null; second = null; lock = false; }

/* ══ COMBO BANNER ══ */
function showCombo(streak, bonus) {
    const banner = document.getElementById("comboBanner");
    const labels = ["", "", "COMBO!", "SUPER COMBO!", "MEGA COMBO!!", "ULTRA!!", "GODLIKE!"];
    const label = labels[Math.min(streak, labels.length - 1)];
    banner.innerHTML = `<span class="combo-streak">${label}</span><span class="combo-bonus">+${bonus} bonus</span>`;
    banner.style.display = "flex";
    banner.classList.remove("combo-pop");
    void banner.offsetWidth;
    banner.classList.add("combo-pop");
    clearTimeout(banner._hideTimer);
    banner._hideTimer = setTimeout(() => { banner.style.display = "none"; }, 1800);
}

/* ══ CHECK WIN ══ */
function checkWin() {
    if (document.querySelectorAll(".card:not(.solved)").length === 0) {
        clearInterval(timerInterval);
        setTimeout(showWinScreen, 1200);
    }
}

/* ══ STATS ══ */
function updateStats(matched) {
    const iqEl = document.getElementById("iq");
    const scoreEl = document.getElementById("score");
    const movesEl = document.getElementById("moves");

    iqEl.innerText = iq;
    scoreEl.innerText = score;
    movesEl.innerText = moves;

    if (matched) {
        [iqEl, scoreEl].forEach(el => {
            el.classList.remove("pop");
            void el.offsetWidth;
            el.classList.add("pop");
        });
    }
}

/* ══ HURRY-UP MESSAGES ══ */
const HURRY_MSGS = {
    15: { tier: 'yellow', msgs: ['⚡ Speed up!', '⏳ Tick tock!', '🚀 Move faster!', '💨 Don\'t dawdle!'] },
    10: { tier: 'orange', msgs: ['🔥 Hurry up!', '😰 Running low!', '⚠️ Nearly out!', '💥 Go go go!'] },
     5: { tier: 'red',    msgs: ['🚨 LAST 5 SECS!', '😱 ALMOST OVER!', '❗ NOW OR NEVER!', '💀 TIME DYING!'] },
};

function showHurryMessage(seconds) {
    const data = HURRY_MSGS[seconds];
    if (!data) return;
    const msg = data.msgs[Math.floor(Math.random() * data.msgs.length)];

    clearTimeout(window._hurryHideTimer);

    ['hurryLeft', 'hurryRight'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg;
        const side = id === 'hurryLeft' ? 'hurry-left' : 'hurry-right';
        el.className = `hurry-side ${side} hurry-${data.tier}`;
        el.style.display = 'flex';
        // Force reflow so animation restarts cleanly
        void el.offsetWidth;
        el.classList.add('hurry-zoom');
    });

    // Non-red tiers auto-hide when zoom-out finishes (matches CSS 2.5s)
    if (data.tier !== 'red') {
        window._hurryHideTimer = setTimeout(hideHurryBanner, 2500);
    }
}

function hideHurryBanner() {
    clearTimeout(window._hurryHideTimer);
    ['hurryLeft', 'hurryRight'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

/* ══ TIMER ══ */
function startTimer() {
    const timeEl = document.getElementById("timeDisplay");
    timeEl.innerText = remainingTime + "s";
    timeEl.classList.remove("countdown-urgent");
    document.getElementById("timerFill").style.width = "100%";
    hideHurryBanner();

    timerInterval = setInterval(() => {
        remainingTime--;
        const timeEl = document.getElementById("timeDisplay");
        timeEl.innerText = remainingTime + "s";
        document.getElementById("timerFill").style.width = ((remainingTime / totalTime) * 100) + "%";

        // Zoom in/out animation on countdown when last 10 seconds
        if (remainingTime <= 10 && remainingTime > 0) {
            timeEl.classList.add("countdown-urgent");
        } else {
            timeEl.classList.remove("countdown-urgent");
        }

        const fill = document.getElementById("timerFill");
        const ratio = remainingTime / totalTime;
        if (ratio < 0.2) {
            fill.style.background = "linear-gradient(90deg, #ff4455, #ff8800)";
            fill.style.animation = "timerShimmer 0.6s linear infinite, urgentPulse 0.5s ease infinite alternate";
        } else {
            fill.style.background = "";
            fill.style.animation = "";
        }

        // Hurry-up messages at key thresholds
        if (remainingTime === 15 || remainingTime === 10 || remainingTime === 5) {
            showHurryMessage(remainingTime);
        }

        if (remainingTime <= 0) {
            timeEl.classList.remove("countdown-urgent");
            clearInterval(timerInterval);
            hideHurryBanner();
            document.getElementById("goScore").innerText = score;
            document.getElementById("goIQ").innerText = iq;
            document.getElementById("goMoves").innerText = moves;
            document.getElementById("gameOverModal").style.display = "flex";
            // Save score on game over too
            saveScore(currMode, score, iq, moves);
            renderLeaderboard();
        }
    }, 1000);
}

function hint() {
    if (hintsLeft <= 0 || lock) return;

    hintsLeft--;
    document.getElementById("hintBtn").querySelector("#hintCount").innerText = `(${hintsLeft})`;
    if (first) first.card.classList.remove("flipped");
    if (second) second.card.classList.remove("flipped");
    reset();

    lock = true;

    const cards = document.querySelectorAll(".card:not(.solved)");
    cards.forEach(c => c.classList.add("flipped"));

    setTimeout(() => {
        cards.forEach(c => {
            if (!c.classList.contains("solved"))
                c.classList.remove("flipped");
        });
        reset();
    }, 1500);
}
/* ══ WIN SCREEN ══ */
function showWinScreen() {
    document.getElementById("winScore").innerText = score;
    document.getElementById("winIQ").innerText = iq;
    document.getElementById("winTime").innerText = totalTime > 0 ? remainingTime + "s" : "∞";
    document.getElementById("winMoves").innerText = moves;

    const ratingEl = document.getElementById("winRating");
    if (iq >= 150) { ratingEl.innerText = "🌟 Genius! Perfect memory!"; ratingEl.style.color = "#ffd700"; }
    else if (iq >= 120) { ratingEl.innerText = "✨ Excellent work!"; ratingEl.style.color = "#00f5ff"; }
    else if (iq >= 100) { ratingEl.innerText = "👍 Good job!"; ratingEl.style.color = "#00ff88"; }
    else { ratingEl.innerText = "💪 Keep practising!"; ratingEl.style.color = "#ff9900"; }

    // High score check
    const highScoreBadge = document.getElementById("newHighScore");
    if (isHighScore(score)) {
        highScoreBadge.style.display = "block";
        highScoreBadge.classList.remove("hs-pop");
        void highScoreBadge.offsetWidth;
        highScoreBadge.classList.add("hs-pop");
    } else {
        highScoreBadge.style.display = "none";
    }

    saveScore(currMode, score, iq, moves);
    renderLeaderboard();

    const ws = document.getElementById("winScreen");
    ws.style.display = "flex";
    ws.classList.remove("win-animate-in");
    void ws.offsetWidth;
    ws.classList.add("win-animate-in");

    startConfetti();
}

/* ══ CONFETTI ══ */
function startConfetti() {
    const canvas = document.getElementById("confettiCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    confettiParticles = [];
    const colors = ["#00f5ff", "#ff00aa", "#ffd700", "#00ff88", "#ff6600", "#ffffff", "#ff4488"];

    for (let i = 0; i < 180; i++) {
        confettiParticles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 12 + 4,
            h: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 3 + 1.5,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.15,
            drift: (Math.random() - 0.5) * 1.5,
            opacity: Math.random() * 0.6 + 0.4
        });
    }

    cancelAnimationFrame(confettiAnimFrame);
    animateConfetti(ctx, canvas);
}

function animateConfetti(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles.forEach(p => {
        p.y += p.speed; p.x += p.drift; p.angle += p.spin;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
    });
    confettiAnimFrame = requestAnimationFrame(() => animateConfetti(ctx, canvas));
}

function stopConfetti() {
    cancelAnimationFrame(confettiAnimFrame);
    const canvas = document.getElementById("confettiCanvas");
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

/* ══ PAUSE ══ */
function pauseGame() {
    clearInterval(timerInterval);
    document.getElementById("pauseMenu").style.display = "flex";
}

function resumeGame() {
    document.getElementById("pauseMenu").style.display = "none";
    if (totalTime > 0) startTimer();
}

function resetGame() {
    stopConfetti();
    clearInterval(timerInterval);
    document.getElementById("pauseMenu").style.display = "none";
    document.getElementById("winScreen").style.display = "none";
    document.getElementById("gameOverModal").style.display = "none";
    startGame(currRows, currCols, currTime, currMode);
}

function goHome() {
    stopConfetti();
    clearInterval(timerInterval);
    document.getElementById("game").style.display = "none";
    document.getElementById("winScreen").style.display = "none";
    document.getElementById("gameOverModal").style.display = "none";
    document.getElementById("pauseMenu").style.display = "none";
    document.getElementById("home").style.display = "flex";
    fetchGlobalScores();
    spawnFloatingCards();
}

/* ══ LOGOUT ══ */
function logout() {
    if (!confirm('Log out? Your name and tutorial progress will be cleared.')) return;
    stopConfetti();
    clearInterval(timerInterval);
    localStorage.removeItem('memoryPlayerName');
    localStorage.removeItem('memoryPlayerEmail');
    localStorage.removeItem('memoryTutDone');
    localStorage.removeItem('memoryUserNum');
    location.reload();
}

/* ══ THEME TOGGLE ══ */
function toggleThemeMode() {
    const isLight = document.body.classList.toggle('light-mode');
    const btn = document.getElementById('themeToggleBtn');
    if (isLight) {
        if (btn) btn.textContent = '🌙 DARK';
        localStorage.setItem('memoryTheme', 'light');
    } else {
        if (btn) btn.textContent = '☀️ LIGHT';
        localStorage.setItem('memoryTheme', 'dark');
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('memoryTheme');
    const btn = document.getElementById('themeToggleBtn');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (btn) btn.textContent = '🌙 DARK';
    } else {
        document.body.classList.remove('light-mode');
        if (btn) btn.textContent = '☀️ LIGHT';
    }
}

/* ══ INIT ══ */
window.addEventListener("DOMContentLoaded", () => {
    initTheme();
    spawnFloatingCards();
    fetchGlobalScores();
    initTutorial();
});

/* ══ USER COUNTER ══ */
async function getOrAssignUserNumber() {
    try {
        const response = await fetch('https://api.counterapi.dev/v1/tushar2007_memorymatch/logins/up');
        const data = await response.json();
        return data.count;
    } catch (error) {
        console.error('Error fetching global count:', error);
        let myNum = parseInt(localStorage.getItem('memoryUserNum') || '0');
        if (!myNum) {
            let global = parseInt(localStorage.getItem('memoryGlobalUserCount') || '0');
            global++;
            myNum = global;
            localStorage.setItem('memoryGlobalUserCount', global);
            localStorage.setItem('memoryUserNum', myNum);
        }
        return myNum;
    }
}

function ordinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getPlayerName() {
    return localStorage.getItem('memoryPlayerName') || '';
}

function savePlayerName(name) {
    localStorage.setItem('memoryPlayerName', name.trim());
}

function onNameInput() {
    const val = document.getElementById('tutNameInput').value.trim();
    const check = document.getElementById('tutNameCheck');
    const hint = document.getElementById('tutNameHint');
    if (val.length > 0) {
        check.textContent = '✓';
        check.style.color = 'var(--green)';
        hint.textContent = 'Hi, ' + val + '! Press Next or Enter to continue.';
        hint.style.color = 'rgba(0,255,136,0.7)';
    } else {
        check.textContent = '';
        hint.textContent = 'You can also skip — a name is optional.';
        hint.style.color = 'rgba(255,255,255,0.3)';
    }
}

function getPlayerEmail() {
    return localStorage.getItem('memoryPlayerEmail') || '';
}

function savePlayerEmail(email) {
    localStorage.setItem('memoryPlayerEmail', email.trim());
}

function onEmailInput() {
    const val = document.getElementById('tutEmailInput').value.trim();
    const check = document.getElementById('tutEmailCheck');
    const hint = document.getElementById('tutEmailHint');
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    
    if (val.length === 0) {
        check.textContent = '';
        hint.textContent = 'Optional. Leave empty for guest access.';
        hint.style.color = 'rgba(255,255,255,0.3)';
    } else if (isValid) {
        check.textContent = '✓';
        check.style.color = 'var(--green)';
        hint.textContent = 'Valid email.';
        hint.style.color = 'rgba(0,255,136,0.7)';
    } else {
        check.textContent = '✗';
        check.style.color = 'var(--red)';
        hint.textContent = 'Please enter a valid email format.';
        hint.style.color = 'var(--red)';
    }
}

/* ══ TUTORIAL ══ */
let tutStep = 0;
const TUT_TOTAL = 6;

async function initTutorial() {
    const isNew = !localStorage.getItem('memoryTutDone');
    if (isNew) {
        const userNum = await getOrAssignUserNumber();

        document.getElementById('tutPlayerNum').textContent = '#' + userNum;
        document.getElementById('tutUserNumber').textContent = '#' + userNum;

        const sub = document.getElementById('tutPlayerSub');
        if (userNum === 1) {
            sub.textContent = 'The very first player ever! 🎉';
        } else {
            sub.textContent = ordinalSuffix(userNum) + ' person to play Memory Match!';
        }

        // Pre-fill name if previously saved (rare but possible)
        const saved = getPlayerName();
        if (saved) document.getElementById('tutNameInput').value = saved;

        const savedEmail = getPlayerEmail();
        if (savedEmail && !savedEmail.startsWith('guest@')) {
            document.getElementById('tutEmailInput').value = savedEmail;
            onEmailInput();
        }

        tutStep = 0;
        renderTutStep();
        document.getElementById('tutorialOverlay').classList.add('tut-visible');
    }
}

function renderTutStep() {
    document.querySelectorAll('.tut-step').forEach((el, i) => {
        el.classList.toggle('active', i === tutStep);
    });
    document.querySelectorAll('.tut-dot').forEach((el, i) => {
        el.classList.toggle('active', i === tutStep);
    });

    // Start / stop video animation
    if (tutStep === 1) {
        startVideoAnimation();
    } else {
        stopVideoAnimation();
    }

    // Auto-focus name field on step 0
    if (tutStep === 0) {
        setTimeout(() => document.getElementById('tutNameInput').focus(), 300);
    }

    // Personalise last step if we have a name
    if (tutStep === TUT_TOTAL - 1) {
        const name = document.getElementById('tutNameInput').value.trim();
        const title = document.getElementById('tutReadyTitle');
        const desc = document.getElementById('tutReadyDesc');
        if (name) {
            title.textContent = 'Good luck, ' + name + '!';
            desc.innerHTML = 'Choose a <span class="tut-hl">difficulty</span>, pick your theme, and show everyone what you\'ve got!';
        } else {
            title.textContent = 'Ready to Play!';
            desc.innerHTML = 'Choose a <span class="tut-hl">difficulty</span>, pick your favourite icon theme, and start matching!';
        }
    }

    const btn = document.getElementById('tutNextBtn');
    const isLast = tutStep === TUT_TOTAL - 1;
    btn.textContent = isLast ? '🎮 Let\'s Play!' : 'Next →';
    btn.classList.toggle('tut-finish', isLast);
}

function tutNext() {
    // Save name and check email when leaving step 0
    if (tutStep === 0) {
        const name = document.getElementById('tutNameInput').value.trim();
        if (name) savePlayerName(name);
        
        const emailEl = document.getElementById('tutEmailInput');
        const emailVal = emailEl.value.trim();
        if (emailVal.length > 0) {
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
            if (!isValid) {
                emailEl.style.border = '2px solid var(--red)';
                setTimeout(() => emailEl.style.border = '', 800);
                return;
            }
            savePlayerEmail(emailVal);
        } else {
            const userNum = localStorage.getItem('memoryUserNum') || '0';
            savePlayerEmail(`guest@${userNum}`);
        }
    }

    if (tutStep < TUT_TOTAL - 1) {
        tutStep++;
        renderTutStep();
    } else {
        closeTutorial();
    }
}

/* ── Video step animation ── */
let _vidTimer = null;
const VID_CAPTIONS = [
    'Flip a card…',
    'Find its pair…',
    'Match! ✅',
    'Clear the board!'
];
const VID_STEP_IDS = ['vs1', 'vs2', 'vs3', 'vs4'];

function startVideoAnimation() {
    stopVideoAnimation();
    let idx = 0;
    function tick() {
        const caption = document.getElementById('tutVidCaption');
        if (caption) caption.textContent = VID_CAPTIONS[idx % VID_CAPTIONS.length];
        VID_STEP_IDS.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('vid-active', i === idx % VID_STEP_IDS.length);
        });
        idx++;
        _vidTimer = setTimeout(tick, 1400);
    }
    tick();
}

function stopVideoAnimation() {
    if (_vidTimer) { clearTimeout(_vidTimer); _vidTimer = null; }
    VID_STEP_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('vid-active');
    });
}

function closeTutorial() {
    // Validate email if closed from step 0
    if (tutStep === 0) {
        const emailEl = document.getElementById('tutEmailInput');
        const emailVal = emailEl.value.trim();
        if (emailVal.length > 0) {
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
            if (!isValid) {
                emailEl.style.border = '2px solid var(--red)';
                setTimeout(() => emailEl.style.border = '', 800);
                return;
            }
            savePlayerEmail(emailVal);
        } else {
            const userNum = localStorage.getItem('memoryUserNum') || '0';
            savePlayerEmail(`guest@${userNum}`);
        }
    }

    stopVideoAnimation();
    // Save name even on skip
    const nameEl = document.getElementById('tutNameInput');
    if (nameEl) {
        const name = nameEl.value.trim();
        if (name) savePlayerName(name);
    }
    localStorage.setItem('memoryTutDone', '1');
    const overlay = document.getElementById('tutorialOverlay');
    overlay.style.animation = 'overlayOut 0.35s ease both';
    setTimeout(() => {
        overlay.classList.remove('tut-visible');
        overlay.style.animation = '';
    }, 340);
}

// Dot click navigation
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tut-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            tutStep = parseInt(dot.dataset.step);
            renderTutStep();
        });
    });
});