// --- ESTADO GLOBAL ---
let state = {
    screen: 'start', 
    board: Array(9).fill(null),
    turn: 'X',
    cursor: {r:1, c:1},
    menuIdx: 0,
    modalMode: null,
    qData: null,
    qIdx: 0,
    inputLock: false,
    lastBtnState: 0,
    lastMoveTime: 0,
    timerInterval: null,
    timeLeft: 10,
    isIaTurn: false
};

// --- AUDIO ---
const audio = {
    menu: document.getElementById('music-menu'),
    game: document.getElementById('music-game'),
    place: document.getElementById('sfx-place'),
    win: document.getElementById('sfx-win')
};

// Configuración de Audio
audio.menu.volume = 0.5;
audio.game.volume = 0.2;
audio.win.volume = 0.8;

// --- SONDEO DEL MANDO ---
setInterval(async () => {
    try {
        const res = await fetch('/get_input?t=' + Date.now());
        const data = await res.json();
        
        const dbg = document.getElementById('debug-status');
        if(dbg) {
            dbg.innerText = data.connected ? "✅ MANDO LISTO" : "🔍 BUSCANDO...";
            dbg.style.color = data.connected ? "#00E5FF" : "#FF0055";
        }

        if (!data.connected) return;
        handleInput(data);
    } catch (e) {}
}, 50); 

function handleInput(data) {
    const now = Date.now();
    const btnCurrent = (data.btn === 1 || data.sw === 1) ? 1 : 0;
    const btnClick = (btnCurrent === 1 && state.lastBtnState === 0);
    state.lastBtnState = btnCurrent;

    // --- PANTALLA DE INICIO (EL MOMENTO CRÍTICO) ---
    if (state.screen === 'start') {
        if (btnClick) {
            // 1. Desbloquear motor de audio del navegador
            audio.place.play().then(() => {
                audio.place.pause();
                audio.place.currentTime = 0;
                
                // 2. INICIAR MÚSICA DEL MENÚ AHORA MISMO
                audio.menu.currentTime = 0;
                let playPromise = audio.menu.play();
                if (playPromise !== undefined) {
                    playPromise.then(_ => {
                        // Audio iniciado correctamente
                    }).catch(error => {
                        console.log("Error al iniciar música:", error);
                    });
                }
                
                // 3. Ir al menú visualmente
                goMenu();
            }).catch(e => console.log("Navegador bloqueó audio:", e));
        }
        return;
    }

    if (state.inputLock) return;
    if (now - state.lastMoveTime < 150) return; 

    // Mapeo Joystick
    let dx = 0; 
    if (data.x < 1200) dx = -1; 
    if (data.x > 2800) dx = 1;  
    
    let dy = 0;
    if (data.y < 1200) dy = -1;
    if (data.y > 2800) dy = 1;

    if (dx !== 0 || dy !== 0 || btnClick) {
        if (state.modalMode === 'alert') { if(btnClick) closeModal(); } 
        else if (state.modalMode === 'question') {
            if (dy !== 0) moveQuestion(dy);
            if (btnClick) answerQuestion();
        }
        else if (state.screen === 'menu') {
            if (dy !== 0) moveMenu(dy);
            if (btnClick) selectMenu();
        }
        else if (state.screen === 'game') {
            if (dx !== 0 || dy !== 0) moveCursor(dx, dy);
            if (btnClick) tryMove();
        }
        if (dx !== 0 || dy !== 0) state.lastMoveTime = now;
    }
}

// --- NAVEGACIÓN ---
function goMenu() {
    state.screen = 'menu';
    
    // Ocultar/Mostrar pantallas
    document.getElementById('start-overlay').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    document.getElementById('modal').classList.add('hidden');
    
    stopExplosion();

    // Videos: Mostrar menú, ocultar juego
    const vidMenu = document.getElementById('vid-menu');
    const vidGame = document.getElementById('vid-game');
    vidMenu.classList.remove('hidden-video');
    vidGame.classList.add('hidden-video');
    
    // Asegurar que el video del menú se reproduzca
    vidMenu.play().catch(()=>{});
    vidGame.pause();

    // Audio: Detener juego, asegurar menú (si venimos del juego)
    audio.game.pause(); 
    audio.game.currentTime = 0;
    if (audio.menu.paused) audio.menu.play().catch(()=>{});

    state.inputLock = false; 
    state.menuIdx = 0; 
    updateMenuVisuals();
}

function moveMenu(dy) {
    state.menuIdx += dy;
    if (state.menuIdx < 0) state.menuIdx = 1; 
    if (state.menuIdx > 1) state.menuIdx = 0;
    updateMenuVisuals();
}

function updateMenuVisuals() {
    const b1 = document.getElementById('btn-pvp');
    const b2 = document.getElementById('btn-ia');
    b1.className = 'menu-btn';
    b2.className = 'menu-btn';
    if (state.menuIdx === 0) b1.classList.add('selected');
    else b2.classList.add('selected');
}

function selectMenu() {
    state.mode = (state.menuIdx === 0) ? 'pvp' : 'ia';
    startGame();
}

// --- JUEGO ---
function startGame() {
    state.screen = 'game';
    state.board.fill(null); 
    state.turn = 'X'; 
    state.cursor = {r:1, c:1}; 
    state.isIaTurn = false;
    
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    // Videos: Ocultar menú, mostrar juego
    const vidMenu = document.getElementById('vid-menu');
    const vidGame = document.getElementById('vid-game');
    vidMenu.classList.add('hidden-video');
    vidGame.classList.remove('hidden-video');
    vidGame.play().catch(()=>{});

    // Audio: Stop menú, Play juego
    audio.menu.pause(); 
    audio.menu.currentTime = 0;
    audio.game.currentTime = 0; 
    audio.game.play().catch(()=>{});
    
    renderBoard(); 
    updateCursorPos();
}

// --- CONTROL TABLERO ---
function moveCursor(dx, dy) {
    state.cursor.c = Math.max(0, Math.min(2, state.cursor.c + dx));
    state.cursor.r = Math.max(0, Math.min(2, state.cursor.r + dy));
    updateCursorPos();
}

function updateCursorPos() {
    const cur = document.getElementById('cursor');
    const cellSize = 122; const offset = 18;
    cur.style.left = (state.cursor.c * cellSize + offset) + 'px';
    cur.style.top = (state.cursor.r * cellSize + offset) + 'px';
}

function tryMove() {
    const idx = state.cursor.r * 3 + state.cursor.c;
    if (state.board[idx] !== null) return;
    state.inputLock = true;
    fetch('/questions?limit=1')
        .then(r => r.json())
        .then(d => {
            if(d.items.length > 0) showQuestion(d.items[0]); 
            else placePiece();
        }).catch(() => placePiece());
}

// --- PREGUNTAS ---
function showQuestion(q) {
    state.modalMode = 'question'; state.qData = q; state.qIdx = 0; state.timeLeft = 10;
    document.getElementById('modal-title').innerText = "🧠 ¡Pregunta Veloz!";
    document.getElementById('modal-msg').innerText = q.q;
    const div = document.getElementById('modal-options'); div.innerHTML = '';
    q.opts.forEach((o,i) => {
        div.innerHTML += `<div class="opt-btn ${i===0?'selected':''}" id="opt-${i}">${o}</div>`;
    });
    document.getElementById('timer-container').classList.remove('hidden');
    document.getElementById('modal').classList.remove('hidden');
    state.inputLock = false;
    startTimer();
}

function startTimer() {
    const bar = document.getElementById('modal-timer-fill');
    bar.style.width = '100%';
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.timeLeft -= 0.1;
        const pct = (state.timeLeft / 10) * 100; 
        bar.style.width = pct + '%';
        if(state.timeLeft < 3) bar.style.background = '#E71D36';
        else bar.style.background = '#2EC4B6';
        if(state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            showAlert("⌛ ¡TIEMPO!", "¡Muy lento! Pierdes turno.", () => nextTurn());
        }
    }, 100);
}

function moveQuestion(dy) {
    document.getElementById(`opt-${state.qIdx}`).classList.remove('selected');
    state.qIdx += dy;
    const max = state.qData.opts.length;
    if(state.qIdx < 0) state.qIdx = max-1; if(state.qIdx >= max) state.qIdx = 0;
    document.getElementById(`opt-${state.qIdx}`).classList.add('selected');
}

function answerQuestion() {
    clearInterval(state.timerInterval);
    document.getElementById('modal').classList.add('hidden');
    const ok = (state.qIdx === state.qData.ans);
    if(ok) showAlert("🌟 ¡CORRECTO!", "¡Genio! Tu ficha entra.", () => placePiece());
    else showAlert("❌ ¡NOOO!", "Respuesta equivocada.", () => nextTurn());
}

// --- COLOCAR FICHA ---
function placePiece() {
    const idx = state.cursor.r * 3 + state.cursor.c;
    state.board[idx] = state.turn;
    audio.place.currentTime = 0; audio.place.play();
    renderBoard();
    
    const cell = document.getElementById(`c${idx}`);
    cell.classList.remove('pop'); void cell.offsetWidth; cell.classList.add('pop');

    const win = checkWin();
    if(win) {
        audio.game.pause(); audio.win.currentTime = 0; audio.win.play();
        launchExplosion();
        showAlert("🏆 ¡VICTORIA!", `¡El jugador ${win} gana!`, goMenu);
        return;
    }
    if(!state.board.includes(null)) {
        showAlert("🤐 EMPATE", "¡Qué reñido estuvo!", goMenu);
        return;
    }
    nextTurn();
}

function nextTurn() {
    state.modalMode = null; document.getElementById('modal').classList.add('hidden');
    state.turn = (state.turn === 'X') ? 'O' : 'X';
    document.getElementById('turn-display').innerText = `Turno: ${state.turn}`;
    if(state.mode === 'ia' && state.turn === 'O') {
        state.inputLock = true; state.isIaTurn = true;
        setTimeout(iaPlay, 1000);
    } else {
        state.inputLock = false;
    }
}

function iaPlay() {
    const empty = state.board.map((v,i)=>v===null?i:null).filter(v=>v!==null);
    if(empty.length > 0) {
        const m = empty[Math.floor(Math.random()*empty.length)];
        state.board[m] = 'O';
        audio.place.currentTime = 0; audio.place.play();
        renderBoard();
        const win = checkWin();
        if(win) {
            state.inputLock = false;
            audio.game.pause(); audio.win.play();
            showAlert("🤖 ¡GANA LA IA!", "Intenta de nuevo.", goMenu);
            return;
        }
    }
    state.turn = 'X'; document.getElementById('turn-display').innerText = `Turno: X`;
    state.inputLock = false; state.isIaTurn = false;
}

function renderBoard() {
    state.board.forEach((v, i) => {
        const c = document.getElementById(`c${i}`);
        c.innerText = v || '';
        c.style.color = (v==='X') ? '#E71D36' : '#2EC4B6';
        c.style.textShadow = '2px 2px 0 #000';
    });
}

function checkWin() {
    const w = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(let p of w) {
        if(state.board[p[0]] && state.board[p[0]]===state.board[p[1]] && state.board[p[0]]===state.board[p[2]]) return state.board[p[0]];
    }
    return false;
}

function showAlert(t, m, cb) {
    state.modalMode = 'alert';
    document.getElementById('modal-title').innerText = t;
    document.getElementById('modal-msg').innerText = m;
    document.getElementById('timer-container').classList.add('hidden');
    document.getElementById('modal-options').innerHTML = '<div class="opt-btn selected" style="text-align:center">Aceptar (Botón)</div>';
    document.getElementById('modal').classList.remove('hidden');
    state.alertCallback = cb;
    state.inputLock = false;
}

function closeModal() {
    state.modalMode = null; document.getElementById('modal').classList.add('hidden');
    if(state.alertCallback) { const cb = state.alertCallback; state.alertCallback = null; cb(); }
}

// --- EXPLOSIÓN ---
let explosionInterval;
function launchExplosion() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const particles = []; const cx = canvas.width/2; const cy = canvas.height/2;
    for(let i=0; i<200; i++) {
        const a = Math.random()*Math.PI*2; const v = Math.random()*15+5;
        particles.push({
            x: cx, y: cy, vx: Math.cos(a)*v, vy: Math.sin(a)*v,
            color: `hsl(${Math.random()*360}, 100%, 50%)`,
            size: Math.random()*8+4, life: 1.0, decay: Math.random()*0.02+0.01
        });
    }
    if(explosionInterval) clearInterval(explosionInterval);
    explosionInterval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach((p) => {
            if(p.life > 0) {
                alive = true;
                p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= p.decay; p.size *= 0.95;
                ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        });
        if(!alive) stopExplosion();
    }, 16);
}

function stopExplosion() {
    clearInterval(explosionInterval);
    const c = document.getElementById('confetti-canvas');
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
}