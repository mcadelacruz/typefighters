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
let meltdownLives = 5;
let meltdownScore = 0;
let meltdownWordsCleared = 0;
let meltdownRoundDeadline = 0;
let meltdownRoundInterval = null;
let meltdownPenaltyLock = false;
let meltdownSurvivalBonus = 0;
let meltdownCurrentWord = "";
let flowTargetWpm = 40;
let flowCurrentWpm = 0;
let flowScore = 0;
let flowKeyTimestamps = [];
let flowOutOfBandStreak = 0;
let flowSweetStreak = 0;
let flowSweetTotalSeconds = 0;
let flowElapsedSeconds = 0;
let flowLastMultiplier = 1;
let flowBestMultiplier = 1;
let interferenceParagraphText = "";
let interferenceModalOpen = false;
let interferenceModalShownAt = 0;
let interferenceDistractionTimeout = null;
let interferenceReactionBonus = 0;
let interferenceReactionCount = 0;
let interferenceReactionTimes = [];
let interferenceStartedAt = 0;
let interferenceCurrentWpm = 0;
let interferenceBaseScore = 0;
let interferenceTypedLength = 0;
const OVERLOAD_TARGET = 1000;
const PLAYER_NAME_STORAGE_KEY = "typefighters_player_name";
const MELTDOWN_ROUND_MS = 3000;
const MELTDOWN_GLOBAL_SECONDS = 120;
const MELTDOWN_STARTING_LIVES = 5;
const MELTDOWN_SURVIVAL_BONUS = 5000;
const FLOW_GLOBAL_SECONDS = 120;
const FLOW_TARGET_START = 40;
const FLOW_TARGET_SHIFT_SECONDS = 20;
const FLOW_ALLOWED_BAND = 10;
const FLOW_SWEET_BAND = 5;
const INTERFERENCE_GLOBAL_SECONDS = 120;
const INTERFERENCE_MIN_DELAY = 5000;
const INTERFERENCE_MAX_DELAY = 10000;
const INTERFERENCE_PARAGRAPH = "In the glass hallway, the monitors kept scrolling soft reminders about deadlines, but the room itself felt strangely calm. A notebook lay open beside a mug, a pencil, and a stack of typed pages that had been corrected twice already. The exercise was simple enough in theory: keep your hands moving, trust the rhythm, and let the words arrive without fighting them. Outside, footsteps passed, the air conditioner hummed, and a bright red cursor blinked like a metronome.";
const MELTDOWN_WORDS = [
    "counterintelligence",
    "neurotransmitter",
    "inconsequentialities",
    "microcirculation",
    "immunohistochemistry",
    "counterproliferation",
    "interconnectedness",
    "electroencephalography",
    "photosynthetically",
    "deindustrialization",
    "mischaracterization",
    "thermoluminescent",
    "interconvertibility",
    "microphotometrically",
    "neuropharmacology",
    "counterdeployment",
    "superparamagnetic",
    "ultracentrifugation",
    "spectrophotometer",
    "anticonstitutional"
];

function resolveMode(rawMode) {
    const mode = (rawMode || "classic").toLowerCase();
    if (mode === "meltdown") return "meltdown";
    if (mode === "flow-state" || mode === "flow_state") return "flow_state";
    if (mode === "overload") return "overload";
    return "classic";
}

function modeLabel(mode) {
    if (mode === "meltdown") return "Meltdown";
    if (mode === "flow_state") return "Flow State";
    if (mode === "interference") return "Interference";
    if (mode === "overload") return "Overload";
    return "Classic";
}

function isMeltdownMode() {
    return currentMode === "meltdown";
}

function isFlowMode() {
    return currentMode === "flow_state";
}

function isInterferenceMode() {
    return currentMode === "interference";
}

function isOverloadMode() {
    return currentMode === "overload";
}

function pickMeltdownWord() {
    const idx = Math.floor(Math.random() * MELTDOWN_WORDS.length);
    return MELTDOWN_WORDS[idx];
}

function clearMeltdownRoundTimer() {
    if (meltdownRoundInterval) {
        clearInterval(meltdownRoundInterval);
        meltdownRoundInterval = null;
    }
}

function formatMeltdownSeconds(ms) {
    return Math.max(0, ms / 1000).toFixed(2);
}

function updateMeltdownRoundUI(remainingMs) {
    const timerEl = document.getElementById('meltdown-round-timer-value');
    if (!timerEl) return;
    timerEl.textContent = formatMeltdownSeconds(remainingMs);
}

function triggerMeltdownFlash() {
    const gameBox = document.getElementById('game-box');
    if (!gameBox) return;
    gameBox.classList.remove('meltdown-flash');
    void gameBox.offsetWidth;
    gameBox.classList.add('meltdown-flash');
    setTimeout(() => {
        gameBox.classList.remove('meltdown-flash');
    }, 220);
}

function playMeltdownBuzz() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.13);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.24, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);

        setTimeout(() => {
            ctx.close().catch(() => {});
        }, 220);
    } catch (e) {
        // Audio may fail due to browser policies; visual flash still signals penalty.
    }
}

function setMeltdownWord(nextWord) {
    meltdownCurrentWord = nextWord;
    const wordDisplay = document.getElementById('current-word');
    if (wordDisplay) {
        wordDisplay.textContent = meltdownCurrentWord;
        adjustWordFontSize(meltdownCurrentWord);
    }
}

function startMeltdownRound() {
    meltdownPenaltyLock = false;
    setMeltdownWord(pickMeltdownWord());
    meltdownRoundDeadline = performance.now() + MELTDOWN_ROUND_MS;
    updateMeltdownRoundUI(MELTDOWN_ROUND_MS);

    clearMeltdownRoundTimer();
    meltdownRoundInterval = setInterval(() => {
        const remaining = meltdownRoundDeadline - performance.now();
        if (remaining <= 0) {
            updateMeltdownRoundUI(0);
            handleMeltdownPenalty('timeout');
            return;
        }
        updateMeltdownRoundUI(remaining);
    }, 10);
}

function updateMeltdownHud() {
    const livesEl = document.getElementById('meltdown-lives-value');
    if (livesEl) livesEl.textContent = String(meltdownLives);
    document.getElementById('score').textContent = String(meltdownScore);
}

function handleMeltdownSuccess() {
    if (gameEnded) return;
    const remaining = Math.max(0, meltdownRoundDeadline - performance.now());
    const bonus = Math.floor(remaining);
    meltdownScore += 100 + bonus;
    meltdownWordsCleared += 1;
    document.getElementById('last-speed').textContent = String(bonus);
    updateMeltdownHud();
    startMeltdownRound();
}

function handleMeltdownPenalty(type) {
    if (gameEnded || meltdownPenaltyLock) return;
    meltdownPenaltyLock = true;

    triggerMeltdownFlash();
    playMeltdownBuzz();

    meltdownLives -= 1;
    updateMeltdownHud();

    if (meltdownLives <= 0) {
        clearMeltdownRoundTimer();
        finalizeGame({
            reason: type === 'timeout' ? 'Meltdown timer expired too many times.' : 'You burned all lives under pressure.',
            score: meltdownScore,
            total_attempts: meltdownWordsCleared,
            avg_speed: 0,
            lives_left: 0,
            survival_bonus: 0
        });
        return;
    }

    setTimeout(() => {
        if (!gameEnded) {
            startMeltdownRound();
        }
    }, 70);
}

function setupModeHud() {
    const gameBox = document.getElementById('game-box');
    const meltdownHud = document.getElementById('meltdown-hud');
    const flowPanel = document.getElementById('flow-panel');
    const interferencePanel = document.getElementById('interference-panel');
    const metricLabel = document.getElementById('live-metric-label');
    const metricUnit = document.getElementById('live-metric-unit');

    if (!gameBox || !meltdownHud || !flowPanel || !interferencePanel || !metricLabel || !metricUnit) return;

    if (isMeltdownMode()) {
        meltdownHud.removeAttribute('hidden');
        flowPanel.setAttribute('hidden', 'hidden');
        interferencePanel.setAttribute('hidden', 'hidden');
        gameBox.classList.add('meltdown-active');
        metricLabel.textContent = 'bonus from remaining ms';
        metricUnit.textContent = 'pts';
        return;
    }

    meltdownHud.setAttribute('hidden', 'hidden');
    gameBox.classList.remove('meltdown-active');

    if (isFlowMode()) {
        flowPanel.removeAttribute('hidden');
        interferencePanel.setAttribute('hidden', 'hidden');
        metricLabel.textContent = 'sweet spot combo';
        metricUnit.textContent = 'x';
        return;
    }

    flowPanel.setAttribute('hidden', 'hidden');

    if (isInterferenceMode()) {
        interferencePanel.removeAttribute('hidden');
        metricLabel.textContent = 'reaction bonus';
        metricUnit.textContent = 'pts';
        return;
    }

    interferencePanel.setAttribute('hidden', 'hidden');

    if (isOverloadMode()) {
        metricLabel.textContent = 'keystrokes';
        metricUnit.textContent = '';
        return;
    }

    metricLabel.textContent = 'last word speed';
    metricUnit.textContent = 'ms';
}

function initFlowMarquee() {
    const track = document.getElementById('flow-marquee-track');
    if (!track) return;

    const source = [
        'steady', 'rhythm', 'tempo', 'baseline', 'typing', 'motion',
        'cadence', 'signal', 'pattern', 'focus', 'breath', 'flow'
    ];

    const words = [];
    for (let i = 0; i < 42; i += 1) {
        words.push(source[Math.floor(Math.random() * source.length)]);
    }
    track.textContent = words.join('   ');
}

function clampFlowTarget(value) {
    return Math.min(110, Math.max(20, value));
}

function shiftFlowTarget() {
    const magnitude = 5 + Math.floor(Math.random() * 6);
    const direction = Math.random() < 0.5 ? -1 : 1;
    flowTargetWpm = clampFlowTarget(flowTargetWpm + (direction * magnitude));
}

function flowIsCountableKey(e) {
    if (!e || typeof e.key !== 'string') return false;
    if (e.key === ' ' || e.key === 'Spacebar') return true;
    return e.key.length === 1;
}

function handleFlowKeydown(e) {
    if (!isFlowMode() || gameEnded || !timerInterval) return;

    if (e.key === 'Tab') {
        e.preventDefault();
        return;
    }

    if (!flowIsCountableKey(e) || e.repeat) return;

    flowKeyTimestamps.push(performance.now());
}

function updateFlowGauges() {
    const targetEl = document.getElementById('flow-target-wpm');
    const currentEl = document.getElementById('flow-current-wpm');
    if (targetEl) targetEl.textContent = String(flowTargetWpm);
    if (currentEl) currentEl.textContent = String(Math.round(flowCurrentWpm));
}

function updateFlowSecond() {
    flowElapsedSeconds += 1;

    if (flowElapsedSeconds % FLOW_TARGET_SHIFT_SECONDS === 0) {
        shiftFlowTarget();
    }

    const now = performance.now();
    const cutoff = now - 2000;
    flowKeyTimestamps = flowKeyTimestamps.filter((t) => t >= cutoff);

    const charsInWindow = flowKeyTimestamps.length;
    flowCurrentWpm = (charsInWindow / 5) * (60 / 2);

    const delta = Math.abs(flowCurrentWpm - flowTargetWpm);
    if (delta > FLOW_ALLOWED_BAND) {
        flowOutOfBandStreak += 1;
        flowSweetStreak = 0;
    } else {
        flowOutOfBandStreak = 0;
        if (delta <= FLOW_SWEET_BAND) {
            flowSweetStreak += 1;
            flowSweetTotalSeconds += 1;
            flowLastMultiplier = Math.floor(flowSweetStreak / 10) + 1;
            flowBestMultiplier = Math.max(flowBestMultiplier, flowLastMultiplier);
            flowScore += 10 * flowLastMultiplier;
        } else {
            flowSweetStreak = 0;
            flowLastMultiplier = 1;
        }
    }

    document.getElementById('score').textContent = String(flowScore);
    document.getElementById('last-speed').textContent = String(flowLastMultiplier);
    updateFlowGauges();

    if (flowOutOfBandStreak >= 2) {
        finalizeGame({
            reason: 'You drifted outside target tempo for 2 consecutive seconds.',
            score: flowScore,
            total_attempts: flowSweetTotalSeconds,
            avg_speed: 0,
            flow_target_wpm: flowTargetWpm,
            flow_current_wpm: flowCurrentWpm,
            flow_best_combo: flowBestMultiplier
        });
    }
}

function clearInterferenceTimeout() {
    if (interferenceDistractionTimeout) {
        clearTimeout(interferenceDistractionTimeout);
        interferenceDistractionTimeout = null;
    }
}

function getInterferenceAverageReactionTime() {
    if (!interferenceReactionTimes.length) return 0;
    const total = interferenceReactionTimes.reduce((sum, value) => sum + value, 0);
    return total / interferenceReactionTimes.length;
}

function updateInterferenceScore() {
    const input = document.getElementById('interference-input');
    if (!input) return;

    interferenceTypedLength = input.value.length;
    const elapsedMs = Math.max(1000, performance.now() - interferenceStartedAt);
    const elapsedMinutes = elapsedMs / 60000;
    interferenceCurrentWpm = elapsedMinutes > 0 ? (interferenceTypedLength / 5) / elapsedMinutes : 0;
    interferenceBaseScore = Math.floor(interferenceCurrentWpm * 100);

    const totalScore = interferenceBaseScore + interferenceReactionBonus;
    const scoreElement = document.getElementById('score');
    const metricValue = document.getElementById('last-speed');
    if (scoreElement) scoreElement.textContent = String(totalScore);
    if (metricValue) metricValue.textContent = String(interferenceReactionBonus);
}

function hideInterferenceModal() {
    const modal = document.getElementById('interference-modal');
    if (modal) modal.setAttribute('hidden', 'hidden');
    interferenceModalOpen = false;
}

function scheduleNextInterferenceDistraction() {
    clearInterferenceTimeout();
    if (!isInterferenceMode() || gameEnded) return;

    const delay = INTERFERENCE_MIN_DELAY + Math.floor(Math.random() * (INTERFERENCE_MAX_DELAY - INTERFERENCE_MIN_DELAY + 1));
    interferenceDistractionTimeout = setTimeout(() => {
        if (isInterferenceMode() && !gameEnded && !interferenceModalOpen) {
            const modal = document.getElementById('interference-modal');
            const input = document.getElementById('interference-input');
            if (!modal || !input) return;
            interferenceModalOpen = true;
            interferenceModalShownAt = Date.now();
            modal.removeAttribute('hidden');
            input.blur();
        }
    }, delay);
}

function closeInterferenceModal() {
    if (!interferenceModalOpen || gameEnded) return;

    const reactionTime = Math.max(1, Date.now() - interferenceModalShownAt);
    const bonus = Math.floor(500000 / reactionTime);
    interferenceReactionTimes.push(reactionTime);
    interferenceReactionBonus += bonus;
    interferenceReactionCount += 1;

    hideInterferenceModal();
    updateInterferenceScore();

    const input = document.getElementById('interference-input');
    if (input) input.focus();

    scheduleNextInterferenceDistraction();
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
        if (isInterferenceMode()) {
            const wpm = Number(result.interference_wpm || 0).toFixed(2);
            const bonus = Number(result.reaction_bonus || 0);
            const reactions = Number(result.reaction_count || 0);

            stat1Label.textContent = 'paragraph wpm';
            stat1Value.textContent = String(wpm);

            stat2Label.textContent = 'reaction bonus';
            stat2Value.textContent = `+${bonus}`;

            stat3Label.textContent = 'distractions closed';
            stat3Value.textContent = String(reactions);
            return;
        }
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
    setupModeHud();

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
        if (isMeltdownMode()) {
            if (e.key !== 'Enter') return;

            const input = this.value.trim();
            if (!input) {
                handleMeltdownPenalty('typo');
                this.value = '';
                return;
            }

            if (input === meltdownCurrentWord) {
                handleMeltdownSuccess();
            } else {
                handleMeltdownPenalty('typo');
            }
            this.value = '';
            return;
        }

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

    const flowInput = document.getElementById('flow-input');
    if (flowInput) {
        flowInput.addEventListener('keydown', handleFlowKeydown);
        flowInput.addEventListener('input', function () {
            // Keep this field clear; only rhythm and keystrokes matter.
            this.value = '';
        });
    }

    const interferenceInput = document.getElementById('interference-input');
    if (interferenceInput) {
        interferenceInput.addEventListener('input', function () {
            if (!isInterferenceMode()) return;
            updateInterferenceScore();
        });
        interferenceInput.addEventListener('keydown', function (e) {
            if (!isInterferenceMode()) return;
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    const interferenceClose = document.getElementById('interference-modal-close');
    if (interferenceClose) {
        interferenceClose.addEventListener('click', function () {
            if (isInterferenceMode()) closeInterferenceModal();
        });
    }

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

    if (isMeltdownMode()) {
        const livesLeft = Number(result.lives_left || 0);
        const survivalBonus = Number(result.survival_bonus || 0);

        stat1Label.textContent = 'words cleared';
        stat1Value.textContent = String(result.total_attempts || 0);

        stat2Label.textContent = 'lives remaining';
        stat2Value.textContent = String(livesLeft);

        stat3Label.textContent = 'survival bonus';
        stat3Value.textContent = survivalBonus > 0 ? `+${survivalBonus}` : 'none';
        return;
    }

    if (isFlowMode()) {
        const target = Math.round(Number(result.flow_target_wpm || 0));
        const current = Math.round(Number(result.flow_current_wpm || 0));
        const bestCombo = Number(result.flow_best_combo || 1);

        stat1Label.textContent = 'target / current wpm';
        stat1Value.textContent = `${target} / ${current}`;

        stat2Label.textContent = 'sweet spot seconds';
        stat2Value.textContent = String(result.total_attempts || 0);

        stat3Label.textContent = 'best combo multiplier';
        stat3Value.textContent = `x${bestCombo}`;
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

    clearMeltdownRoundTimer();
    clearInterferenceTimeout();
    hideInterferenceModal();

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
    meltdownLives = MELTDOWN_STARTING_LIVES;
    meltdownScore = 0;
    meltdownWordsCleared = 0;
    meltdownSurvivalBonus = 0;
    meltdownCurrentWord = "";
    meltdownPenaltyLock = false;

    if (typeof window.TelemetryEngine?.resetTelemetry === 'function') {
        window.TelemetryEngine.resetTelemetry();
    }

    const wordInput = document.getElementById('word-input');
    wordInput.disabled = false;
    wordInput.value = '';
    wordInput.focus();
    document.getElementById('last-speed').textContent = '-';

    if (timerInterval) clearInterval(timerInterval);
    clearMeltdownRoundTimer();

    if (isMeltdownMode()) {
        sessionId = null;
        timeLeft = MELTDOWN_GLOBAL_SECONDS;
        document.getElementById('score').textContent = '0';
        document.getElementById('time-left').textContent = String(MELTDOWN_GLOBAL_SECONDS);
        document.getElementById('last-speed').textContent = '0';
        wordInput.placeholder = 'type fast, submit before 3.00s';
        updateMeltdownHud();
        startMeltdownRound();
        timerInterval = setInterval(updateTimer, 1000);
        return;
    }

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

    if (isFlowMode()) {
        const flowInput = document.getElementById('flow-input');
        sessionId = null;
        timeLeft = FLOW_GLOBAL_SECONDS;
        flowTargetWpm = FLOW_TARGET_START;
        flowCurrentWpm = 0;
        flowScore = 0;
        flowKeyTimestamps = [];
        flowOutOfBandStreak = 0;
        flowSweetStreak = 0;
        flowSweetTotalSeconds = 0;
        flowElapsedSeconds = 0;
        flowLastMultiplier = 1;
        flowBestMultiplier = 1;

        document.getElementById('score').textContent = '0';
        document.getElementById('time-left').textContent = String(FLOW_GLOBAL_SECONDS);
        document.getElementById('last-speed').textContent = '1';
        initFlowMarquee();
        updateFlowGauges();

        if (flowInput) {
            flowInput.value = '';
            flowInput.focus();
        }

        timerInterval = setInterval(updateTimer, 1000);
        return;
    }

    if (isInterferenceMode()) {
        const interferenceInput = document.getElementById('interference-input');
        const interferenceParagraph = document.getElementById('interference-paragraph');
        const modal = document.getElementById('interference-modal');

        sessionId = null;
        timeLeft = INTERFERENCE_GLOBAL_SECONDS;
        interferenceStartedAt = performance.now();

        document.getElementById('score').textContent = '0';
        document.getElementById('time-left').textContent = String(INTERFERENCE_GLOBAL_SECONDS);
        document.getElementById('last-speed').textContent = '0';

        if (interferenceParagraph) {
            interferenceParagraph.textContent = INTERFERENCE_PARAGRAPH;
        }

        if (interferenceInput) {
            interferenceInput.value = '';
            interferenceInput.focus();
        }

        if (modal) {
            modal.setAttribute('hidden', 'hidden');
        }

        updateInterferenceScore();
        scheduleNextInterferenceDistraction();
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
    if (isOverloadMode() || isMeltdownMode() || isFlowMode() || isInterferenceMode()) return;

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

    if (isFlowMode() && timerInterval) {
        updateFlowSecond();
        if (!gameEnded) {
            const flowInput = document.getElementById('flow-input');
            if (flowInput) flowInput.focus();
        }

        if (t <= 0 && !gameEnded) {
            clearInterval(timerInterval);
            finalizeGame({
                reason: 'Flow session completed.',
                score: flowScore,
                total_attempts: flowSweetTotalSeconds,
                avg_speed: 0,
                flow_target_wpm: flowTargetWpm,
                flow_current_wpm: flowCurrentWpm,
                flow_best_combo: flowBestMultiplier
            });
        }
        return;
    }

    if (isInterferenceMode() && timerInterval) {
        updateInterferenceScore();
        if (!interferenceModalOpen) {
            const interferenceInput = document.getElementById('interference-input');
            if (interferenceInput) interferenceInput.focus();
        }

        if (t <= 0 && !gameEnded) {
            clearInterval(timerInterval);
            finalizeGame({
                reason: 'Interference session completed.',
                score: interferenceBaseScore + interferenceReactionBonus,
                total_attempts: interferenceReactionCount,
                avg_speed: 0,
                interference_wpm: interferenceCurrentWpm,
                reaction_bonus: interferenceReactionBonus,
                reaction_count: interferenceReactionCount,
                avg_reaction_time: getInterferenceAverageReactionTime()
            });
        }
        return;
    }

    if (t <= 0 && timerInterval) {
        clearInterval(timerInterval);

        if (isMeltdownMode()) {
            meltdownSurvivalBonus = MELTDOWN_SURVIVAL_BONUS;
            meltdownScore += MELTDOWN_SURVIVAL_BONUS;
            finalizeGame({
                reason: 'You survived the full 120s under pressure.',
                score: meltdownScore,
                total_attempts: meltdownWordsCleared,
                avg_speed: 0,
                lives_left: meltdownLives,
                survival_bonus: meltdownSurvivalBonus
            });
            return;
        }

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
