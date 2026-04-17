// this file is for the game logic and steps

let sessionId = null;
let playerName = "";
let timerInterval = null;
let lastWordStart = null;
let timeLeft = 120;
let returnToMenuAfterNameSave = false;
let currentMode = "classic";
let currentModeLabel = "Classic";
let gameEnded = false;
let overloadKeystrokes = 0;
const OVERLOAD_TARGET = 1000;
const PLAYER_NAME_STORAGE_KEY = "typefighters_player_name";

function resolveMode(rawMode) {
    const mode = (rawMode || "classic").toLowerCase();
    if (mode === "overload") return "overload";
    return "classic";
}

function modeLabel(mode) {
    if (mode === "overload") return "Overload";
    return "Classic";
}

function isOverloadMode() {
    return currentMode === "overload";
}

function getStoredPlayerName() {
    try {
        return (localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || "").trim();
    } catch (e) {
        return "";
    }
}

function saveStoredPlayerName(name) {
    try {
        localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
    } catch (e) {
        // if storage is blocked, gameplay still works for this session
    }
}

function fadeStepOut(currentStep, cb) {
    // this fades out the current step
    currentStep.style.transition = "opacity 0.4s cubic-bezier(0.4,0,0.2,1)";
    currentStep.style.opacity = 1;
    setTimeout(() => {
        currentStep.style.opacity = 0;
        setTimeout(() => {
            currentStep.style.display = "none";
            if (cb) cb();
        }, 400);
    }, 10);
}

function fadeStepIn(nextStep) {
    // this fades in the next step
    nextStep.style.display = "flex";
    nextStep.style.opacity = 0;
    nextStep.style.transition = "opacity 0.4s cubic-bezier(0.4,0,0.2,1)";
    setTimeout(() => {
        nextStep.style.opacity = 1;
    }, 10);
}

function showStep(step) {
    // this hides all steps and shows the one we want
    ["step-name", "step-start", "step-game", "step-over"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = "none";
            el.style.opacity = 1;
        }
    });
    const nextStep = document.getElementById('step-' + step);
    if (nextStep) {
        nextStep.style.display = "flex";
        nextStep.style.opacity = 1;
    }
}

function transitionStep(fromId, toId, afterInCallback) {
    // this does the transition between steps with fade and blank
    const fromStep = document.getElementById(fromId);
    const toStep = document.getElementById(toId);
    if (!fromStep || !toStep) return;
    fadeStepOut(fromStep, () => {
        window.showTransitionBlank(() => {
            setTimeout(() => {
                window.hideTransitionBlank(0);
                fadeStepIn(toStep);
                if (afterInCallback) setTimeout(afterInCallback, 400);
            }, 200);
        }, 400);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const searchParams = new URLSearchParams(window.location.search);
    currentMode = resolveMode(searchParams.get('mode'));
    currentModeLabel = modeLabel(currentMode);

    const modeLabelEl = document.getElementById('current-mode-label');
    if (modeLabelEl) modeLabelEl.textContent = currentModeLabel.toLowerCase();

    // this is for the name step
    document.getElementById('name-next-btn').onclick = function() {
        const name = document.getElementById('player-name-input').value.trim();
        if (name.length > 0) {
            playerName = name;
            saveStoredPlayerName(name);
            if (returnToMenuAfterNameSave) {
                if (typeof window.showTransitionBlank === 'function') {
                    window.showTransitionBlank(() => {
                        window.location.href = '/menu';
                    }, 300);
                } else {
                    window.location.href = '/menu';
                }
                return;
            }
            transitionStep('step-name', 'step-start', function() {
                document.getElementById('start-input').focus();
            });
        }
    };

    document.getElementById('player-name-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('name-next-btn').click();
    });

    document.getElementById('start-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && this.value.trim().toLowerCase() === 'start') {
            transitionStep('step-start', 'step-game', function() {
                startGame();
            });
        }
    });

    document.getElementById('word-input').addEventListener('keydown', function(e) {
        if (isOverloadMode()) {
            handleOverloadKeydown(e);
            return;
        }

        // classic mode: submit on enter
        if (e.key === 'Enter') {
            const input = this.value.trim();
            if (input && sessionId) {
                if (lastWordStart) {
                    const speed = Date.now() - lastWordStart;
                    document.getElementById('last-speed').textContent = speed;
                }
                submitWord(input);
            }
            this.value = '';
        }
    });

    // this stops people from copying the word
    document.getElementById('game-box').addEventListener('mousedown', function(e) {
        if (e.target.id === 'current-word') e.preventDefault();
    });
    document.getElementById('game-box').addEventListener('selectstart', function(e) {
        if (e.target.id === 'current-word') e.preventDefault();
    });

    const forceNameStep = searchParams.get('change_name') === '1';
    returnToMenuAfterNameSave = forceNameStep;

    // if we already know the player, skip asking for the name again unless user chose to change it
    const storedName = getStoredPlayerName();
    if (storedName && !forceNameStep) {
        playerName = storedName;
        showStep('start');
        document.getElementById('start-input').focus();
    } else {
        showStep('name');
        const nameInput = document.getElementById('player-name-input');
        if (storedName) {
            nameInput.value = storedName;
            nameInput.select();
        }
        nameInput.focus();
    }
});

function adjustWordFontSize(word) {
    const wordDisplay = document.getElementById('current-word');
    if (!wordDisplay) return;

    let fontSize;
    if (window.innerWidth <= 600) {
        // for mobile: shrink more aggressively for long words
        if (word.length <= 12) fontSize = 22;
        else if (word.length <= 18) fontSize = 18;
        else if (word.length <= 28) fontSize = 14;
        else if (word.length <= 40) fontSize = 11;
        else fontSize = 9;
    } else {
        // for desktop: allow larger font sizes for longer words
        if (word.length <= 12) fontSize = 36;
        else if (word.length <= 18) fontSize = 30;
        else if (word.length <= 28) fontSize = 24;
        else if (word.length <= 40) fontSize = 18;
        else fontSize = 14;
    }
    wordDisplay.style.fontSize = fontSize + 'px';
}

function typeText(element, text, speed = 40, cb) {
    element.classList.add('typing-animate');
    element.textContent = '';
    let i = 0;
    function typeChar() {
        if (i < text.length) {
            element.textContent = text.slice(0, i + 1);
            i++;
            setTimeout(typeChar, speed);
        } else {
            element.classList.remove('typing-animate');
            element.textContent = text;
            if (cb) cb();
        }
    }
    typeChar();
}

function setOverloadProgress() {
    const scoreElement = document.getElementById('score');
    const wordDisplay = document.getElementById('current-word');
    const speedElement = document.getElementById('last-speed');

    if (!scoreElement || !wordDisplay || !speedElement) return;

    const pct = Math.min(100, Math.floor((overloadKeystrokes / OVERLOAD_TARGET) * 100));
    const bonusReady = overloadKeystrokes >= OVERLOAD_TARGET;

    scoreElement.textContent = overloadKeystrokes;
    speedElement.textContent = overloadKeystrokes;

    const blocks = 20;
    const filled = Math.min(blocks, Math.floor((pct / 100) * blocks));
    const bar = "#".repeat(filled) + "-".repeat(blocks - filled);

    wordDisplay.textContent = bonusReady
        ? `overload complete [${bar}] ${pct}%`
        : `mash keys [${bar}] ${pct}%`;
    wordDisplay.style.fontSize = window.innerWidth <= 600 ? '18px' : '24px';
}

function handleOverloadKeydown(e) {
    if (gameEnded) return;
    if (!timerInterval) return;
    if (e.repeat) return;

    // Overload counts key hits only; typed content is intentionally ignored.
    e.preventDefault();
    if (e.target && typeof e.target.value === 'string') {
        e.target.value = '';
    }

    overloadKeystrokes += 1;
    setOverloadProgress();
}

function renderFinalStats(result) {
    const stat1Label = document.getElementById('final-stat-1-label');
    const stat1Value = document.getElementById('final-stat-1-value');
    const stat2Label = document.getElementById('final-stat-2-label');
    const stat2Value = document.getElementById('final-stat-2-value');
    const stat3Label = document.getElementById('final-stat-3-label');
    const stat3Value = document.getElementById('final-stat-3-value');

    if (!stat1Label || !stat1Value || !stat2Label || !stat2Value || !stat3Label || !stat3Value) {
        return;
    }

    if (isOverloadMode()) {
        const keystrokes = Number(result.keystrokes || result.total_attempts || 0);
        const bonusMultiplier = Number(result.bonus_multiplier || (keystrokes >= OVERLOAD_TARGET ? 2 : 1));
        const keysPerSecond = Number(result.keys_per_second || 0).toFixed(2);

        stat1Label.textContent = 'keystrokes';
        stat1Value.textContent = String(keystrokes);

        stat2Label.textContent = 'keys per second';
        stat2Value.textContent = String(keysPerSecond);

        stat3Label.textContent = 'overcharge bonus';
        stat3Value.textContent = bonusMultiplier > 1 ? `x${bonusMultiplier} active` : 'none';
        return;
    }

    stat1Label.textContent = 'words typed';
    stat1Value.textContent = String(result.total_attempts || 0);

    stat2Label.textContent = 'average speed';
    stat2Value.textContent = `${Number(result.avg_speed || 0).toFixed(2)} ms`;

    stat3Label.textContent = 'mistake policy';
    stat3Value.textContent = 'single typo ends run';
}

async function finalizeGame(result) {
    if (gameEnded) return;
    gameEnded = true;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const wordInput = document.getElementById('word-input');
    if (wordInput) wordInput.disabled = true;

    try {
        if (typeof window.sendTelemetry === 'function') {
            await window.sendTelemetry(playerName, currentModeLabel, result.score);
        }
    } catch (err) {
        console.error('Telemetry send failed:', err);
    }

    transitionStep('step-game', 'step-over', function() {
        document.getElementById('game-over-reason').textContent = result.reason;
        document.getElementById('final-score').textContent = result.score;
        renderFinalStats(result);

        const finalModeEl = document.getElementById('final-mode');
        if (finalModeEl) {
            finalModeEl.textContent = currentModeLabel.toLowerCase();
        }
    });
}

function startGame() {
    gameEnded = false;
    overloadKeystrokes = 0;

    if (typeof window.TelemetryEngine?.resetTelemetry === 'function') {
        window.TelemetryEngine.resetTelemetry();
    }

    const wordInput = document.getElementById('word-input');
    wordInput.disabled = false;
    wordInput.value = '';
    wordInput.focus();
    document.getElementById('last-speed').textContent = '-';

    if (timerInterval) clearInterval(timerInterval);

    if (isOverloadMode()) {
        sessionId = null;
        timeLeft = 10;
        document.getElementById('score').textContent = '0';
        document.getElementById('time-left').textContent = '10';
        wordInput.placeholder = 'mash any keys as fast as possible';
        setOverloadProgress();
        timerInterval = setInterval(updateTimer, 1000);
        return;
    }

    // classic mode
    wordInput.placeholder = 'type the word here';
    fetch('/api/start_game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, game_mode: currentModeLabel })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.session_id) return;

        sessionId = data.session_id;
        document.getElementById('score').textContent = data.score;
        document.getElementById('time-left').textContent = Math.floor(data.time_left);
        document.getElementById('current-word').textContent = data.word;
        typeText(document.getElementById('current-word'), data.word, 40, () => {
            adjustWordFontSize(data.word);
        });
        wordInput.value = '';
        wordInput.focus();
        lastWordStart = Date.now();
        timeLeft = 120;
        document.getElementById('last-speed').textContent = '-';
        timerInterval = setInterval(updateTimer, 1000);
    });
}

function submitWord(input) {
    if (isOverloadMode()) return;

    fetch('/api/submit_word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, input: input })
    })
    .then(res => res.json())
    .then(data => {
        if (data.action === 'new_word') {
            typeText(document.getElementById('current-word'), data.word, 40, () => {
                adjustWordFontSize(data.word);
            });
            document.getElementById('score').textContent = data.score;
            document.getElementById('time-left').textContent = Math.floor(data.time_left);
            document.getElementById('word-input').value = '';
            document.getElementById('word-input').focus();
            lastWordStart = Date.now();
            timeLeft = data.time_left;
        } else if (data.action === 'game_over') {
            finalizeGame({
                reason: data.reason === 'time_up' ? 'Time is up!' : 'You misspelled the word!',
                score: data.score,
                total_attempts: data.total_attempts,
                avg_speed: data.avg_speed
            });
        }
    });
}

function updateTimer() {
    const timeElement = document.getElementById('time-left');
    let t = parseInt(timeElement.textContent);
    if (t > 0) {
        t -= 1;
        timeElement.textContent = t;
        timeLeft = t;
    }
    if (t <= 0 && timerInterval) {
        clearInterval(timerInterval);

        if (isOverloadMode()) {
            const bonusMultiplier = overloadKeystrokes >= OVERLOAD_TARGET ? 2 : 1;
            const finalScore = overloadKeystrokes >= OVERLOAD_TARGET
                ? overloadKeystrokes * 2
                : overloadKeystrokes;
            finalizeGame({
                reason: overloadKeystrokes >= OVERLOAD_TARGET
                    ? 'Overcharge complete! score doubled.'
                    : 'Overload sequence complete.',
                score: finalScore,
                total_attempts: overloadKeystrokes,
                avg_speed: 0,
                keystrokes: overloadKeystrokes,
                bonus_multiplier: bonusMultiplier,
                keys_per_second: overloadKeystrokes / 10
            });
            return;
        }

        if (sessionId) {
            fetch('/api/submit_word', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, input: '' })
            })
            .then(res => res.json())
            .then(data => {
                if (data.action === 'game_over') {
                    finalizeGame({
                        reason: data.reason === 'time_up' ? 'Time is up!' : 'You misspelled the word!',
                        score: data.score,
                        total_attempts: data.total_attempts,
                        avg_speed: data.avg_speed
                    });
                }
            });
        }
    }
}
