// Auth & State Management
let isLoginMode = true;
let currentCoins = 1000;
let currentGameMode = 'pass_and_play';
let turnTimer = null;
let timeLeft = 15;

function playSound(type) {
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle && !soundToggle.checked) return;
    const audio = document.getElementById(`sound-${type}`);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => {});
    }
}

function toggleAuthMode(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;

    const subtitle = document.getElementById('auth-subtitle');
    const authBtn = document.getElementById('auth-btn');
    const toggleMsg = document.getElementById('toggle-msg');
    const toggleLink = document.getElementById('toggle-link');
    const errorMsg = document.getElementById('auth-error');

    errorMsg.innerText = '';

    if (isLoginMode) {
        subtitle.innerText = 'Login to your account';
        authBtn.innerText = 'LOGIN';
        toggleMsg.innerText = "Don't have an account?";
        toggleLink.innerText = 'Sign Up';
    } else {
        subtitle.innerText = 'Create a new account';
        authBtn.innerText = 'SIGN UP';
        toggleMsg.innerText = 'Already have an account?';
        toggleLink.innerText = 'Login';
    }
}

function handleAuth(e) {
    e.preventDefault();
    const userInp = document.getElementById('username').value.trim();
    const passInp = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('auth-error');

    if (!userInp || !passInp) {
        errorMsg.innerText = "Please fill in all fields!";
        return;
    }

    let users = JSON.parse(localStorage.getItem('ludo_users') || '{}');

    if (isLoginMode) {
        if (users[userInp] && users[userInp].pass === passInp) {
            localStorage.setItem('ludo_current_user', userInp);
            showHomeScreen(userInp);
        } else {
            errorMsg.innerText = "Invalid username or password!";
        }
    } else {
        if (users[userInp]) {
            errorMsg.innerText = "Username already exists!";
        } else {
            users[userInp] = { pass: passInp, wins: 0, matches: 0 };
            localStorage.setItem('ludo_users', JSON.stringify(users));
            localStorage.setItem('ludo_current_user', userInp);
            alert("Account created successfully!");
            showHomeScreen(userInp);
        }
    }
}

function showHomeScreen(username) {
    document.getElementById('user-display-name').innerText = username;
    document.getElementById('user-coins').innerText = currentCoins.toLocaleString();
    
    let users = JSON.parse(localStorage.getItem('ludo_users') || '{}');
    let uData = users[username] || { wins: 0, matches: 0 };
    document.getElementById('user-stats-text').innerText = `Wins: ${uData.wins} | Matches: ${uData.matches}`;

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
    updateLeaderboardData();
}

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (show) {
        if (modalId === 'leaderboard-modal') updateLeaderboardData();
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function openProfileModal() {
    const currentUser = localStorage.getItem('ludo_current_user');
    if (!currentUser) return;

    let users = JSON.parse(localStorage.getItem('ludo_users') || '{}');
    let uData = users[currentUser] || { wins: 0, matches: 0 };

    let wins = uData.wins || 0;
    let matches = uData.matches || 0;
    let winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

    document.getElementById('prof-username').innerText = currentUser;
    document.getElementById('prof-matches').innerText = matches;
    document.getElementById('prof-wins').innerText = wins;
    document.getElementById('prof-winrate').innerText = winRate + '%';
    document.getElementById('prof-coins').innerText = currentCoins.toLocaleString();

    toggleModal('profile-modal', true);
}

function updateLeaderboardData() {
    let users = JSON.parse(localStorage.getItem('ludo_users') || '{}');
    let lbList = document.getElementById('leaderboard-list');
    lbList.innerHTML = '';

    let sortedUsers = Object.keys(users).map(name => ({
        name, wins: users[name].wins || 0, matches: users[name].matches || 0
    })).sort((a, b) => b.wins - a.wins);

    if (sortedUsers.length === 0) {
        lbList.innerHTML = '<p style="font-size:12px; color:#aaa;">No data available yet!</p>';
        return;
    }

    sortedUsers.forEach((u, idx) => {
        let row = document.createElement('div');
        row.className = 'lb-row';
        row.innerHTML = `<span>#${idx+1} ${u.name}</span> <span>Wins: ${u.wins}</span>`;
        lbList.appendChild(row);
    });
}

function buyItem(itemName, cost, themeName) {
    if (currentCoins >= cost) {
        currentCoins -= cost;
        document.getElementById('user-coins').innerText = currentCoins.toLocaleString();
        
        if (themeName === 'neon') {
            document.body.className = 'neon-theme';
        } else if (themeName === 'gold') {
            document.body.className = 'gold-theme';
        }
        alert(`🎉 Successfully purchased and applied ${itemName}!`);
    } else {
        alert("❌ Not enough coins! Play matches or spin the wheel.");
    }
}

// Daily Spin Logic
let isSpinning = false;

function claimSpin() {
    toggleModal('spin-modal', true);
    checkSpinCooldown();
}

function checkSpinCooldown() {
    const lastSpin = localStorage.getItem('ludo_last_spin');
    const spinBtn = document.getElementById('spin-trigger-btn');
    const timerMsg = document.getElementById('spin-timer-msg');

    if (lastSpin) {
        const timePassed = Date.now() - parseInt(lastSpin);
        const hoursLeft = 24 - (timePassed / (1000 * 60 * 60));

        if (hoursLeft > 0) {
            spinBtn.disabled = true;
            spinBtn.style.opacity = "0.5";
            spinBtn.innerText = "LOCKED";
            timerMsg.innerText = `⏳ Next Spin in: ${Math.ceil(hoursLeft)} Hours`;
            return false;
        }
    }

    spinBtn.disabled = false;
    spinBtn.style.opacity = "1";
    spinBtn.innerText = "SPIN NOW!";
    timerMsg.innerText = "";
    return true;
}

function startSpinAnimation() {
    if (isSpinning) return;
    if (!checkSpinCooldown()) return;

    isSpinning = true;
    const wheel = document.getElementById('wheel-board');
    const rewards = [100, 200, 300, 500];
    const randomIndex = Math.floor(Math.random() * rewards.length);
    const winAmount = rewards[randomIndex];

    const targetDegree = 1800 + (randomIndex * 90) + 45;
    wheel.style.transform = `rotate(${targetDegree}deg)`;

    setTimeout(() => {
        currentCoins += winAmount;
        document.getElementById('user-coins').innerText = currentCoins.toLocaleString();
        localStorage.setItem('ludo_last_spin', Date.now().toString());

        alert(`🎉 CONGRATULATIONS! You won 🪙 ${winAmount} Coins!`);
        isSpinning = false;
        checkSpinCooldown();
    }, 4000);
}

function startGame(mode) {
    currentGameMode = mode;
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    resetGameStates();
}

function goHome() {
    stopTurnTimer();
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
}

function logout() {
    stopTurnTimer();
    localStorage.removeItem('ludo_current_user');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('auth-error').innerText = '';
    
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
}

window.onload = function() {
    const loggedUser = localStorage.getItem('ludo_current_user');
    if (loggedUser) {
        showHomeScreen(loggedUser);
    }
};

// Game Logic & AI
const players = ['red', 'green', 'yellow', 'blue'];
let turnIndex = 0;
let currentRoll = 0;
let canRoll = true;
let extraTurn = false;

const pawnPositions = {
    red: [-1, -1, -1, -1],
    green: [-1, -1, -1, -1],
    yellow: [-1, -1, -1, -1],
    blue: [-1, -1, -1, -1]
};

const trackCoordinates = [
    [7,2], [7,3], [7,4], [7,5], [7,6],
    [6,7], [5,7], [4,7], [3,7], [2,7], [1,7],
    [1,8], [1,9], [2,9], [3,9], [4,9], [5,9], [6,9],
    [7,10], [7,11], [7,12], [7,13], [7,14], [7,15],
    [8,15], [9,15], [9,14], [9,13], [9,12], [9,11], [9,10],
    [10,9], [11,9], [12,9], [13,9], [14,9], [15,9],
    [15,8], [15,7], [14,7], [13,7], [12,7], [11,7], [10,7],
    [9,6], [9,5], [9,4], [9,3], [9,2], [9,1], [8,1], [7,1]
];

const homePaths = {
    red: [[8,2], [8,3], [8,4], [8,5], [8,6], [8,7]],
    green: [[2,8], [3,8], [4,8], [5,8], [6,8], [7,8]],
    yellow: [[8,14], [8,13], [8,12], [8,11], [8,10], [8,9]],
    blue: [[14,8], [13,8], [12,8], [11,8], [10,8], [9,8]]
};

const startOffsets = { red: 0, green: 13, yellow: 26, blue: 39 };
const safeZones = [0, 8, 13, 21, 26, 34, 39, 47];

function resetGameStates() {
    turnIndex = 0;
    currentRoll = 0;
    canRoll = true;
    extraTurn = false;
    for (let col in pawnPositions) {
        pawnPositions[col] = [-1, -1, -1, -1];
    }
    document.querySelectorAll('.pawn').forEach(p => {
        p.classList.remove('on-board');
        p.style.gridRowStart = 'auto';
        p.style.gridColumnStart = 'auto';
    });
    startTurnTimer();
}

function renderBoardCells() {
    const board = document.getElementById('board');
    trackCoordinates.forEach((coords, idx) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.gridRowStart = coords[0];
        cell.style.gridColumnStart = coords[1];
        if (safeZones.includes(idx)) cell.classList.add('safe-star');
        board.appendChild(cell);
    });

    Object.keys(homePaths).forEach(color => {
        homePaths[color].forEach(coords => {
            const cell = document.createElement('div');
            cell.className = `cell ${color}-path`;
            cell.style.gridRowStart = coords[0];
            cell.style.gridColumnStart = coords[1];
            board.appendChild(cell);
        });
    });
}

// Turn Timer Logic
function startTurnTimer() {
    stopTurnTimer();
    timeLeft = 15;
    const fill = document.getElementById('turn-timer-fill');
    if (fill) fill.style.width = '100%';

    turnTimer = setInterval(() => {
        timeLeft--;
        if (fill) fill.style.width = `${(timeLeft / 15) * 100}%`;
        if (timeLeft <= 0) {
            stopTurnTimer();
            document.getElementById('status').innerText = "Time out! Turn skipped.";
            setTimeout(nextTurn, 1000);
        }
    }, 1000);
}

function stopTurnTimer() {
    if (turnTimer) clearInterval(turnTimer);
}

// Quick Emojis
function sendEmoji(emoji) {
    const box = document.getElementById('floating-emoji');
    box.innerText = emoji;
    box.style.opacity = '1';
    box.style.transform = 'translate(0px, -50px)';
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transform = 'translate(0px, 0px)';
    }, 1200);
}

function rollDice(playerColor) {
    if (!canRoll || players[turnIndex] !== playerColor) return;

    stopTurnTimer();
    const diceEl = document.getElementById(`dice-${playerColor}`);
    const statusEl = document.getElementById('status');
    const isVibrate = document.getElementById('vibrate-toggle').checked;

    canRoll = false;
    playSound('dice');
    if (isVibrate && 'vibrate' in navigator) navigator.vibrate(40);

    let count = 0;
    const interval = setInterval(() => {
        diceEl.innerText = Math.floor(Math.random() * 6) + 1;
        count++;

        if (count > 8) {
            clearInterval(interval);
            currentRoll = Math.floor(Math.random() * 6) + 1;
            diceEl.innerText = currentRoll;

            statusEl.innerText = `${playerColor.toUpperCase()} rolled ${currentRoll}!`;

            if (!hasValidMoves(playerColor, currentRoll)) {
                setTimeout(() => {
                    statusEl.innerText = "No valid move available!";
                    setTimeout(nextTurn, 1000);
                }, 500);
            } else {
                if (currentGameMode === 'vs_computer' && playerColor !== 'red') {
                    setTimeout(() => makeAIMove(playerColor, currentRoll), 800);
                }
            }
        }
    }, 60);
}

function hasValidMoves(color, roll) {
    return pawnPositions[color].some(pos => {
        if (pos === -1) return roll === 6;
        if (pos + roll <= 56) return true;
        return false;
    });
}

function makeAIMove(color, roll) {
    let validIndices = [];
    pawnPositions[color].forEach((pos, idx) => {
        if (pos === -1 && roll === 6) validIndices.push(idx);
        else if (pos !== -1 && pos + roll <= 56) validIndices.push(idx);
    });

    if (validIndices.length > 0) {
        let chosenIdx = validIndices[0];
        validIndices.forEach(idx => {
            if (pawnPositions[color][idx] === -1 && roll === 6) chosenIdx = idx;
        });
        movePawn(color, chosenIdx);
    }
}

function movePawn(color, pawnIndex) {
    if (players[turnIndex] !== color || currentRoll === 0) return;

    let currentPos = pawnPositions[color][pawnIndex];

    if (currentPos === -1) {
        if (currentRoll === 6) {
            pawnPositions[color][pawnIndex] = 0;
            updatePawnUI(color, pawnIndex, 0);
            playSound('move');
            extraTurn = true;
            finishMove();
        } else {
            if (color === 'red') alert("Inside base! Need 6 to open.");
        }
    } else {
        let newPos = currentPos + currentRoll;
        if (newPos <= 56) {
            pawnPositions[color][pawnIndex] = newPos;
            updatePawnUI(color, pawnIndex, newPos);
            playSound('move');
            
            if (newPos === 56) {
                extraTurn = true;
                checkWin(color);
            } else if (newPos < 51) {
                checkKill(color, newPos);
            }

            if (currentRoll === 6) extraTurn = true;
            finishMove();
        } else {
            if (color === 'red') alert("Invalid Move! Need exact roll to enter home.");
        }
    }
}

function checkKill(currentColor, currentPos) {
    const globalPos = (startOffsets[currentColor] + currentPos) % 52;
    if (safeZones.includes(globalPos)) return;

    players.forEach(p => {
        if (p !== currentColor) {
            pawnPositions[p].forEach((pos, idx) => {
                if (pos !== -1 && pos < 51) {
                    const otherGlobalPos = (startOffsets[p] + pos) % 52;
                    if (globalPos === otherGlobalPos) {
                        pawnPositions[p][idx] = -1;
                        const enemyPawn = document.getElementById(`${p}-${idx}`);
                        enemyPawn.classList.remove('on-board');
                        enemyPawn.style.gridRowStart = 'auto';
                        enemyPawn.style.gridColumnStart = 'auto';
                        
                        playSound('kill');
                        extraTurn = true;
                        if (currentColor === 'red') alert(`${currentColor.toUpperCase()} killed ${p.toUpperCase()}'s pawn!`);
                    }
                }
            });
        }
    });
}

function checkWin(color) {
    const allFinished = pawnPositions[color].every(pos => pos === 56);
    if (allFinished) {
        playSound('win');
        stopTurnTimer();
        
        let currentUser = localStorage.getItem('ludo_current_user');
        if (currentUser && color === 'red') {
            let users = JSON.parse(localStorage.getItem('ludo_users') || '{}');
            if (users[currentUser]) {
                users[currentUser].wins = (users[currentUser].wins || 0) + 1;
                users[currentUser].matches = (users[currentUser].matches || 0) + 1;
                localStorage.setItem('ludo_users', JSON.stringify(users));
            }
        }

        alert(`🎉 CONGRATULATIONS! ${color.toUpperCase()} PLAYER WON THE GAME! 🎉`);
        goHome();
    }
}

function finishMove() {
    const statusEl = document.getElementById('status');

    if (extraTurn) {
        statusEl.innerText = `${players[turnIndex].toUpperCase()} gets an extra turn!`;
        canRoll = true;
        currentRoll = 0;
        extraTurn = false;
        startTurnTimer();
    } else {
        nextTurn();
    }
}

function nextTurn() {
    stopTurnTimer();
    document.getElementById(`${players[turnIndex]}-dice-box`).classList.remove('active-turn');

    turnIndex = (turnIndex + 1) % players.length;
    currentRoll = 0;
    canRoll = true;
    extraTurn = false;

    const activeColor = players[turnIndex];
    document.getElementById(`${activeColor}-dice-box`).classList.add('active-turn');
    document.getElementById('status').innerText = `${activeColor.toUpperCase()} Player's Turn`;
    startTurnTimer();

    if (currentGameMode === 'vs_computer' && activeColor !== 'red') {
        setTimeout(() => rollDice(activeColor), 1000);
    }
}

function updatePawnUI(color, pawnIndex, step) {
    const pawn = document.getElementById(`${color}-${pawnIndex}`);
    const board = document.getElementById('board');
    let coords;

    if (step < 51) {
        const globalIndex = (startOffsets[color] + step) % 52;
        coords = trackCoordinates[globalIndex];
    } else {
        const homeStep = step - 51;
        coords = homePaths[color][homeStep];
    }

    board.appendChild(pawn);
    pawn.classList.add('on-board');
    pawn.style.gridRowStart = coords[0];
    pawn.style.gridColumnStart = coords[1];
}

renderBoardCells();
