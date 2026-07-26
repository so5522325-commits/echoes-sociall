// ================= AUTH LOGIC & SESSION MANAGEMENT =================
let currentAuthMode = 'login';

function switchAuthTab(mode) {
    currentAuthMode = mode;
    const loginBtn = document.getElementById('tab-login-btn');
    const signupBtn = document.getElementById('tab-signup-btn');
    const userGroup = document.getElementById('username-group');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (mode === 'login') {
        loginBtn.style.background = '#38bdf8';
        loginBtn.style.color = '#0f172a';
        signupBtn.style.background = '#334155';
        signupBtn.style.color = '#f8fafc';
        userGroup.style.display = 'none';
        submitBtn.innerText = 'LOGIN TO PLAY';
    } else {
        signupBtn.style.background = '#38bdf8';
        signupBtn.style.color = '#0f172a';
        loginBtn.style.background = '#334155';
        loginBtn.style.color = '#f8fafc';
        userGroup.style.display = 'block';
        submitBtn.innerText = 'CREATE ACCOUNT';
    }
}

async function handleAuthSubmit() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const username = document.getElementById('auth-username').value.trim();

    if (!email || !password) {
        alert("⚠️ Please enter Email and Password!");
        return;
    }

    try {
        let name = username || 'Player';
        if (typeof account !== 'undefined') {
            if (currentAuthMode === 'signup') {
                if (!username) { alert("⚠️ Please enter Username!"); return; }
                await account.create(Appwrite.ID.unique(), email, password, username);
                alert("🎉 Account Created Successfully!");
                await account.createEmailPasswordSession(email, password);
            } else {
                await account.createEmailPasswordSession(email, password);
            }
            let user = await account.get();
            name = user.name || username || 'Player';
        } else {
            name = username || email.split('@')[0] || 'Player';
        }
        
        currentProfileName = name;
        localStorage.setItem('echoes_is_logged_in', 'true');
        localStorage.setItem('echoes_username', name);
        
        updateUIValues();
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
    } catch (error) {
        console.error("Auth Error:", error);
        alert(`❌ Auth Failed: ${error.message}`);
    }
}

function playAsGuest() {
    currentProfileName = 'Guest Player';
    localStorage.setItem('echoes_is_logged_in', 'true');
    localStorage.setItem('echoes_username', 'Guest Player');
    updateUIValues();
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
}

async function handleLogout() {
    if (confirm("क्या आप सच में Logout करना चाहते हैं?")) {
        try {
            if (typeof account !== 'undefined') {
                await account.deleteSession('current');
            }
        } catch (e) {
            console.log("Session delete error:", e);
        }
        
        localStorage.removeItem('echoes_is_logged_in');
        localStorage.removeItem('echoes_username');
        
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
    }
}

// --- APPWRITE CONFIGURATION ---
const { Client, Databases, ID, Account } = Appwrite;

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1') 
    .setProject('6a413df70035d232adfb');         

const databases = new Databases(client);
const account = new Account(client);

const DATABASE_ID = '6a414c58001cef943254';
const COLLECTION_ID = 'nexus_os_';

let currentCoins = 1000;
let currentGameMode = 'pass_and_play';
let pendingGameMode = null;
let turnTimer = null;
let timeLeft = 15;
let currentProfileName = 'Player';
let currentAvatar = '👑';
let winsCount = 0;
let matchesCount = 0;
let currentDocumentId = null;

async function initUserData() {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID
        );
        
        if (response.documents.length > 0) {
            let userData = response.documents[0];
            currentDocumentId = userData.$id;
            currentCoins = userData.coins ?? 1000;
            winsCount = userData.wins ?? 0;
            matchesCount = userData.matches ?? 0;
            currentProfileName = localStorage.getItem('echoes_username') || userData.username || 'Player';
        } else {
            let newDoc = await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID,
                ID.unique(),
                {
                    username: currentProfileName,
                    coins: currentCoins,
                    wins: winsCount,
                    matches: matchesCount
                }
            );
            currentDocumentId = newDoc.$id;
        }
        updateUIValues();
    } catch (error) {
        console.error("Appwrite Init Error:", error);
    }
}

async function updateCloudData(dataToUpdate) {
    if (!currentDocumentId) return;
    try {
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            currentDocumentId,
            dataToUpdate
        );
    } catch (error) {
        console.error("Appwrite Update Error:", error);
    }
}

function updateUIValues() {
    document.getElementById('user-coins').innerText = currentCoins.toLocaleString();
    document.getElementById('user-stats-text').innerText = `Wins: ${winsCount} | Matches: ${matchesCount}`;
    document.getElementById('user-display-name').innerText = currentProfileName;
}

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) {
        if (modalId === 'leaderboard-modal') updateLeaderboardData();
        if (modalId === 'profile-modal') loadDigitalProfileData();
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

// Digital Profile Data Loader & Saver
function loadDigitalProfileData() {
    document.getElementById('username-input').value = currentProfileName;
    document.getElementById('hud-coins').innerText = currentCoins.toLocaleString();
    document.getElementById('hud-wins').innerText = winsCount;
    document.getElementById('hud-matches').innerText = matchesCount;
    let winRate = matchesCount > 0 ? Math.round((winsCount / matchesCount) * 100) : 0;
    document.getElementById('hud-winrate').innerText = `${winRate}%`;
}

async function saveProfileChanges() {
    let newUsername = document.getElementById('username-input').value.trim();
    if (!newUsername) return;
    
    currentProfileName = newUsername;
    localStorage.setItem('echoes_username', newUsername);
    
    if (currentDocumentId) {
        try {
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID,
                currentDocumentId,
                { username: newUsername }
            );
        } catch (error) {
            console.error("Update Error:", error);
        }
    }
    
    updateUIValues();
    alert("💾 Operator Data Updated Successfully!");
    toggleModal('profile-modal', false);
}

function openProfileModal() {
    toggleModal('profile-modal', true);
}

function updateLeaderboardData() {
    let lbList = document.getElementById('leaderboard-list');
    lbList.innerHTML = '';
    let mockLeaders = [
        { name: currentProfileName, wins: winsCount },
        { name: 'CyberKing', wins: 15 },
        { name: 'LudoMaster', wins: 12 }
    ].sort((a, b) => b.wins - a.wins);
    mockLeaders.forEach((u, idx) => {
        let row = document.createElement('div');
        row.className = 'lb-row';
        row.innerHTML = `<span>#${idx+1} ${u.name}</span> <span>Wins: ${u.wins}</span>`;
        lbList.appendChild(row);
    });
}

function buyItem(itemName, cost, themeName) {
    if (currentCoins >= cost) {
        currentCoins -= cost;
        updateUIValues();
        updateCloudData({ coins: currentCoins });
        if (themeName === 'neon') document.body.className = 'neon-theme';
        else if (themeName === 'gold') document.body.className = 'gold-theme';
        alert(`🎉 Applied ${itemName}!`);
    } else {
        alert("❌ Not enough coins!");
    }
}

function claimStreakReward() { toggleModal('streak-modal', true); }
function claimRewardAction() {
    currentCoins += 100;
    updateUIValues();
    updateCloudData({ coins: currentCoins });
    alert("🎉 Streak Claimed! 🪙 100 Added.");
    toggleModal('streak-modal', false);
}

function claimSpin() { toggleModal('spin-modal', true); }
function startSpinAnimation() {
    const wheel = document.getElementById('wheel-board');
    const rewards = [100, 200, 300, 500];
    const randomIndex = Math.floor(Math.random() * rewards.length);
    wheel.style.transform = `rotate(${1800 + (randomIndex * 90) + 45}deg)`;
    setTimeout(() => {
        currentCoins += rewards[randomIndex];
        updateUIValues();
        updateCloudData({ coins: currentCoins });
        alert(`🎉 Won 🪙 ${rewards[randomIndex]} Coins!`);
    }, 4000);
}

function createCustomRoom() {
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('room-status-msg').innerText = `Room Code: ${randomCode}`;
}
function joinCustomRoom() {
    toggleModal('friends-modal', false);
    openBetModal('pass_and_play');
}

// Bet Amount Logic
function openBetModal(mode) {
    pendingGameMode = mode;
    document.getElementById('bet-amount-input').value = 50;
    toggleModal('bet-modal', true);
}

function confirmAndStartGame() {
    const amountInput = document.getElementById('bet-amount-input');
    let betAmount = parseInt(amountInput.value);

    if (isNaN(betAmount) || betAmount <= 0) {
        alert("⚠️ Kripya sahi entry amount dalein!");
        return;
    }

    if (currentCoins < betAmount) {
        alert("❌ Aapke paas itne coins nahi hain! Pehle coins earn karein.");
        return;
    }

    currentCoins -= betAmount;
    updateUIValues();
    updateCloudData({ coins: currentCoins });

    toggleModal('bet-modal', false);
    startGame(pendingGameMode);
}

function startGame(mode) {
    currentGameMode = mode;
    matchesCount++;
    updateCloudData({ matches: matchesCount });
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    resetGameStates();
}

function goHome() {
    stopTurnTimer();
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('home-screen').classList.remove('hidden');
}

window.onload = function() {
    renderBoardCells();
    initUserData(); 

    const isLoggedIn = localStorage.getItem('echoes_is_logged_in');
    const savedName = localStorage.getItem('echoes_username');

    if (isLoggedIn === 'true') {
        if (savedName) currentProfileName = savedName;
        updateUIValues();
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('home-screen').classList.remove('hidden');
    } else {
        document.getElementById('home-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
    }
};

// LUDO GAMEPLAY CORE
const players = ['red', 'green', 'yellow', 'blue'];
let turnIndex = 0, currentRoll = 0, canRoll = true, extraTurn = false;
const pawnPositions = { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] };
const trackCoordinates = [[7,2], [7,3], [7,4], [7,5], [7,6], [6,7], [5,7], [4,7], [3,7], [2,7], [1,7], [1,8], [1,9], [2,9], [3,9], [4,9], [5,9], [6,9], [7,10], [7,11], [7,12], [7,13], [7,14], [7,15], [8,15], [9,15], [9,14], [9,13], [9,12], [9,11], [9,10], [10,9], [11,9], [12,9], [13,9], [14,9], [15,9], [15,8], [15,7], [14,7], [13,7], [12,7], [11,7], [10,7], [9,6], [9,5], [9,4], [9,3], [9,2], [9,1], [8,1], [7,1]];
const homePaths = { red: [[8,2],[8,3],[8,4],[8,5],[8,6],[8,7]], green: [[2,8],[3,8],[4,8],[5,8],[6,8],[7,8]], yellow: [[8,14],[8,13],[8,12],[8,11],[8,10],[8,9]], blue: [[14,8],[13,8],[12,8],[11,8],[10,8],[9,8]] };
const startOffsets = { red: 0, green: 13, yellow: 26, blue: 39 };
const safeZones = [0, 8, 13, 21, 26, 34, 39, 47];

function resetGameStates() {
    turnIndex = 0; currentRoll = 0; canRoll = true; extraTurn = false;
    for (let col in pawnPositions) pawnPositions[col] = [-1, -1, -1, -1];
    document.querySelectorAll('.pawn').forEach(p => { p.classList.remove('on-board'); p.style.gridRowStart = 'auto'; p.style.gridColumnStart = 'auto'; });
    startTurnTimer();
}

function renderBoardCells() {
    const board = document.getElementById('board');
    if (!board || board.children.length > 4) return;
    trackCoordinates.forEach((coords, idx) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.gridRowStart = coords[0]; cell.style.gridColumnStart = coords[1];
        if (safeZones.includes(idx)) cell.classList.add('safe-star');
        board.appendChild(cell);
    });
    Object.keys(homePaths).forEach(color => {
        homePaths[color].forEach(coords => {
            const cell = document.createElement('div');
            cell.className = `cell ${color}-path`;
            cell.style.gridRowStart = coords[0]; cell.style.gridColumnStart = coords[1];
            board.appendChild(cell);
        });
    });
}

function startTurnTimer() {
    stopTurnTimer();
    timeLeft = 15;
    const fill = document.getElementById('turn-timer-fill');
    if (fill) fill.style.width = '100%';
    turnTimer = setInterval(() => {
        timeLeft--;
        if (fill) fill.style.width = `${(timeLeft / 15) * 100}%`;
        if (timeLeft <= 0) { stopTurnTimer(); setTimeout(nextTurn, 1000); }
    }, 1000);
}

function stopTurnTimer() { if (turnTimer) clearInterval(turnTimer); }

function nextTurn() {
    stopTurnTimer();
    if (extraTurn) extraTurn = false; else turnIndex = (turnIndex + 1) % players.length;
    currentRoll = 0; canRoll = true;
    players.forEach(p => {
        const box = document.getElementById(`${p}-dice-box`);
        if (box) { if (p === players[turnIndex]) box.classList.add('active-turn'); else box.classList.remove('active-turn'); }
    });
    document.getElementById('status').innerText = `${players[turnIndex].toUpperCase()}'s Turn`;
    startTurnTimer();
    if (currentGameMode === 'vs_computer' && players[turnIndex] !== 'red') setTimeout(() => rollDice(players[turnIndex]), 1000);
}

function finishMove() { 
    let color = players[turnIndex];
    if (pawnPositions[color].every(pos => pos === 56)) {
        winsCount++;
        updateCloudData({ wins: winsCount });
        updateUIValues();
        alert(`🏆 ${color.toUpperCase()} Player Wins the Game!`);
        goHome();
        return;
    }
    setTimeout(nextTurn, 500); 
}

function sendEmoji(emoji) {
    const box = document.getElementById('floating-emoji');
    if (!box) return;
    box.innerText = emoji; box.style.opacity = '1'; box.style.transform = 'translate(0px, -20px)';
    setTimeout(() => { box.style.opacity = '0'; box.style.transform = 'translate(0px, 0px)'; }, 1200);
}

function rollDice(playerColor) {
    if (!canRoll || players[turnIndex] !== playerColor) return;
    stopTurnTimer();
    canRoll = false;
    let count = 0;
    const interval = setInterval(() => {
        document.getElementById(`dice-${playerColor}`).innerText = Math.floor(Math.random() * 6) + 1;
        count++;
        if (count > 8) {
            clearInterval(interval);
            currentRoll = Math.floor(Math.random() * 6) + 1;
            document.getElementById(`dice-${playerColor}`).innerText = currentRoll;
            document.getElementById('status').innerText = `${playerColor.toUpperCase()} rolled ${currentRoll}!`;
            if (!hasValidMoves(playerColor, currentRoll)) {
                setTimeout(nextTurn, 1000);
            } else if (currentGameMode === 'vs_computer' && playerColor !== 'red') {
                setTimeout(() => makeAIMove(playerColor, currentRoll), 800);
            } else {
                canRoll = true;
            }
        }
    }, 60);
}

function hasValidMoves(color, roll) {
    return pawnPositions[color].some(pos => (pos === -1 && roll === 6) || (pos !== -1 && pos + roll <= 56));
}

function makeAIMove(color, roll) {
    let validIndices = [];
    pawnPositions[color].forEach((pos, idx) => {
        if ((pos === -1 && roll === 6) || (pos !== -1 && pos + roll <= 56)) validIndices.push(idx);
    });
    if (validIndices.length > 0) {
        movePawn(color, validIndices[0]);
    } else {
        setTimeout(nextTurn, 1000);
    }
}

function updatePawnUI(color, pawnIndex, pos) {
    const pawnEl = document.getElementById(`${color}-${pawnIndex}`);
    if (!pawnEl) return;
    if (pos === -1) {
        pawnEl.classList.remove('on-board');
        pawnEl.style.gridRowStart = 'auto';
        pawnEl.style.gridColumnStart = 'auto';
    } else {
        pawnEl.classList.add('on-board');
        let coords = pos === 56 ? [8, 8] : (pos > 50 ? homePaths[color][pos - 51] : trackCoordinates[(startOffsets[color] + pos) % 52]);
        pawnEl.style.gridRowStart = coords[0]; 
        pawnEl.style.gridColumnStart = coords[1];
    }
}

function movePawn(color, pawnIndex) {
    if (players[turnIndex] !== color || currentRoll === 0) return;
    let currentPos = pawnPositions[color][pawnIndex];
    if (currentPos === -1 && currentRoll === 6) {
        pawnPositions[color][pawnIndex] = 0;
        updatePawnUI(color, pawnIndex, 0);
        extraTurn = true; 
        currentRoll = 0;
        finishMove();
    } else if (currentPos !== -1) {
        let newPos = currentPos + currentRoll;
        if (newPos <= 56) {
            pawnPositions[color][pawnIndex] = newPos;
            updatePawnUI(color, pawnIndex, newPos);
            if (newPos === 56 || currentRoll === 6) extraTurn = true;
            currentRoll = 0;
            finishMove();
        } else { canRoll = true; }
    } else { canRoll = true; }
}

function toggleQuickSound() {
    alert("🔊 Sound toggled!");
}

function toggleBGM(state) {
    const bgMusic = document.getElementById('bg-music');
    if (state) bgMusic.play();
    else bgMusic.pause();
}
    
