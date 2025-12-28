const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let currentTool = 'arrow';
let currentColor = 'black';
let isDrawing = false;
let startX, startY;
let arrows = [];
let players = [];
let pucks = [];
let pencilPaths = [];
let rinkImage = new Image();
rinkImage.src = 'img/tabule.png';
let dragging = false;
let draggedType = '';
let draggedIndex = -1;
let history = [];
let currentIndex = -1;
let isDark = true;

// Funkce pro toggle theme
function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('light-mode', !isDark);
    document.getElementById('themeToggle').textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
}

// Funkce pro undo/redo
function pushState() {
    history = history.slice(0, currentIndex + 1);
    history.push({
        arrows: arrows.map(a => ({...a})),
        players: players.map(p => ({...p})),
        pucks: pucks.map(p => ({...p})),
        pencilPaths: pencilPaths.map(p => ({...p, points: p.points.slice()}))
    });
    currentIndex = history.length - 1;
}

function loadState() {
    if (currentIndex >= 0 && currentIndex < history.length) {
        const state = history[currentIndex];
        arrows = state.arrows.map(a => ({...a}));
        players = state.players.map(p => ({...p}));
        pucks = state.pucks.map(p => ({...p}));
        pencilPaths = state.pencilPaths.map(p => ({...p, points: p.points.slice()}));
        drawRink();
    }
}

function undo() {
    if (currentIndex > 0) {
        currentIndex--;
        loadState();
    }
}

function redo() {
    if (currentIndex < history.length - 1) {
        currentIndex++;
        loadState();
    }
}

// Event listener pro klávesy
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
    }
});

// Nastavení hřiště
function drawRink() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(rinkImage, 0, 0, canvas.width, canvas.height);
    redrawObjects();
}

function getClickedObject(x, y) {
    // Kontrola puků
    for (let i = pucks.length - 1; i >= 0; i--) {
        const puck = pucks[i];
        const dist = Math.sqrt((x - puck.x) ** 2 + (y - puck.y) ** 2);
        if (dist < 10) {
            return { type: 'puck', index: i };
        }
    }
    // Kontrola hráčů
    for (let i = players.length - 1; i >= 0; i--) {
        const player = players[i];
        const dist = Math.sqrt((x - player.x) ** 2 + (y - player.y) ** 2);
        if (dist < 15) {
            return { type: 'player', index: i };
        }
    }
    return null;
}

function redrawObjects() {
    // Šipky
    arrows.forEach(arrow => drawArrow(arrow.x1, arrow.y1, arrow.x2, arrow.y2, arrow.color));
    // Hráči
    players.forEach(player => drawPlayer(player.x, player.y, player.color, player.number));
    // Puky
    pucks.forEach(puck => drawPuck(puck.x, puck.y, puck.color));
    // Tužka
    pencilPaths.forEach(path => drawPencilPath(path));
}

// Nástroje
document.getElementById('arrowTool').addEventListener('click', () => currentTool = 'arrow');
document.getElementById('playerTool').addEventListener('click', () => currentTool = 'player');
document.getElementById('puckTool').addEventListener('click', () => currentTool = 'puck');
document.getElementById('pencilTool').addEventListener('click', () => currentTool = 'pencil');
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.querySelectorAll('.color').forEach(btn => {
    btn.addEventListener('click', () => currentColor = btn.dataset.color);
});
document.getElementById('clear').addEventListener('click', () => {
    arrows = [];
    players = [];
    pucks = [];
    pencilPaths = [];
    pushState();
    drawRink();
});

// Validace čísla hráče
document.getElementById('playerNumber').addEventListener('input', function() {
    let value = parseInt(this.value);
    if (isNaN(value) || value < 1) {
        this.value = '';
    } else if (value > 99) {
        this.value = 99;
    }
});

// Kreslení
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    startX = (e.clientX - rect.left) * scaleX;
    startY = (e.clientY - rect.top) * scaleY;

    const clicked = getClickedObject(startX, startY);
    if (clicked) {
        dragging = true;
        draggedType = clicked.type;
        draggedIndex = clicked.index;
        return;
    }

    if (currentTool === 'arrow') {
        isDrawing = true;
    } else if (currentTool === 'pencil') {
        isDrawing = true;
        pencilPaths.push({ points: [{ x: startX, y: startY }], color: currentColor });
    } else {
        drawObject(startX, startY);
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const endX = (e.clientX - rect.left) * scaleX;
    const endY = (e.clientY - rect.top) * scaleY;

    if (dragging) {
        if (draggedType === 'player') {
            players[draggedIndex].x = endX;
            players[draggedIndex].y = endY;
        } else if (draggedType === 'puck') {
            pucks[draggedIndex].x = endX;
            pucks[draggedIndex].y = endY;
        }
        drawRink();
        return;
    }

    if (currentTool === 'arrow') {
        if (!isDrawing) return;
        drawRink();
        drawArrow(startX, startY, endX, endY, currentColor);
    } else if (currentTool === 'pencil') {
        if (!isDrawing) return;
        const currentPath = pencilPaths[pencilPaths.length - 1];
        currentPath.points.push({ x: endX, y: endY });
        drawRink();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (dragging) {
        dragging = false;
        draggedType = '';
        draggedIndex = -1;
        pushState();
        return;
    }

    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const endX = (e.clientX - rect.left) * scaleX;
    const endY = (e.clientY - rect.top) * scaleY;
    if (currentTool === 'arrow') {
        arrows.push({ x1: startX, y1: startY, x2: endX, y2: endY, color: currentColor });
        pushState();
        drawRink();
    } else if (currentTool === 'pencil') {
        pushState();
    }
    isDrawing = false;
});

function drawArrow(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Šipka
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(angle - Math.PI / 6), y2 - 10 * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(angle + Math.PI / 6), y2 - 10 * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

function drawPlayer(x, y, color, number) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fill();
    if (number) {
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(number, x, y + 4);
    }
}

function drawPuck(x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawPencilPath(path) {
    if (path.points.length < 2) return;
    ctx.strokeStyle = path.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
}

function drawObject(x, y) {
    if (currentTool === 'player') {
        const number = document.getElementById('playerNumber').value || '';
        players.push({ x, y, color: currentColor, number });
        document.getElementById('playerNumber').value = '';
        pushState();
        drawRink();
    } else if (currentTool === 'puck') {
        pucks = [];
        pucks.push({ x, y, color: currentColor });
        pushState();
        drawRink();
    }
}

// Inicializace
rinkImage.onload = () => {
    drawRink();
    pushState();
};