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
let overloadLastCountedKey = '';
let overloadSameKeyStreak = 0;
let meltdownLives = 3;
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
let flowSubmissionHistory = [];
let flowKeyTimestamps = [];
let flowMarqueeWords = [];
let flowMarqueeNextIndex = 0;
let flowMarqueeOffsetX = 0;
let flowOnTargetSeconds = 0;
let flowClosenessAccumulator = 0;
let flowElapsedSeconds = 0;
let flowLastAccuracyPct = 0;
let flowBestAccuracyPct = 0;
let flowDisplayWpm = 0;
let flowMeterRafId = null;
let flowCoachState = 'maintain';
let flowBlockVisualState = 'on';
let flowScoreInterval = null;
let flowTempoPoints = 0;
let flowWordPoints = 0;
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
let interferenceTypedIndex = 0;
let interferenceChallengeType = 'x';
let interferenceCaptchaCode = '';
let interferenceBestWpm = 0;
const OVERLOAD_TARGET = 800;
const PLAYER_NAME_STORAGE_KEY = "typefighters_player_name";
const MELTDOWN_ROUND_MS = 10000;
const MELTDOWN_STARTING_LIVES = 3;
const MELTDOWN_DANGER_THRESHOLD_MS = 5000;
const FLOW_GLOBAL_SECONDS = 120;
const FLOW_TARGET_START = 50;
const FLOW_TARGET_SHIFT_SECONDS = 20;
const FLOW_WPM_MIN = 0;
const FLOW_WPM_MAX = 100;
const FLOW_ALLOWED_BAND = 15;
const FLOW_SWEET_BAND = 3;
const FLOW_WORD_POINTS = 50;
const FLOW_TEMPO_TICK_POINTS = 10;
const FLOW_WPM_WINDOW_MS = 5000;
const FLOW_KEY_WINDOW_MS = 2500;
const FLOW_MARQUEE_ANCHOR_RATIO = 0.24;
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
    if (mode === "interference") return "interference";
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

function setMeltdownDangerState(inDanger) {
    const gameBox = document.getElementById('game-box');
    if (gameBox) gameBox.classList.toggle('meltdown-danger', inDanger);

    const body = document.body;
    if (body) body.classList.toggle('meltdown-danger', inDanger);

    const vignette = document.getElementById('meltdown-screen-vignette');
    if (!vignette) return;

    if (inDanger) {
        vignette.style.opacity = '1';
        vignette.style.background = 'radial-gradient(circle at center, rgba(255, 0, 0, 0.02) 18%, rgba(140, 0, 0, 0.24) 58%, rgba(95, 0, 0, 0.42) 100%)';
        vignette.style.animation = 'meltdownPulse 0.75s ease-in-out infinite';
        return;
    }

    vignette.style.opacity = '0';
    vignette.style.background = '';
    vignette.style.animation = 'none';
}

function triggerMeltdownFlash() {
    const body = document.body;
    if (!body) return;
    body.classList.remove('meltdown-flash');
    void body.offsetWidth;
    body.classList.add('meltdown-flash');
    setTimeout(() => {
        body.classList.remove('meltdown-flash');
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

    setMeltdownDangerState(false);

    clearMeltdownRoundTimer();
    meltdownRoundInterval = setInterval(() => {
        const remaining = meltdownRoundDeadline - performance.now();
        const inDanger = remaining <= MELTDOWN_DANGER_THRESHOLD_MS && remaining > 0;
        setMeltdownDangerState(inDanger);
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
    const wordPoints = 50 + (meltdownCurrentWord.length * 2);
    meltdownScore += wordPoints + bonus;
    meltdownWordsCleared += 1;
    document.getElementById('last-speed').textContent = String(bonus);
    updateMeltdownHud();
    startMeltdownRound();
}

function handleMeltdownPenalty(type) {
    if (gameEnded || meltdownPenaltyLock) return;
    meltdownPenaltyLock = true;

    setMeltdownDangerState(false);

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
    const overloadPanel = document.getElementById('overload-panel');
    const metricLabel = document.getElementById('live-metric-label');
    const metricUnit = document.getElementById('live-metric-unit');

    if (!gameBox || !meltdownHud || !flowPanel || !interferencePanel || !overloadPanel || !metricLabel || !metricUnit) return;

    if (isMeltdownMode()) {
        meltdownHud.removeAttribute('hidden');
        flowPanel.setAttribute('hidden', 'hidden');
        interferencePanel.setAttribute('hidden', 'hidden');
        overloadPanel.setAttribute('hidden', 'hidden');
        gameBox.classList.add('meltdown-active');
        document.body.classList.add('meltdown-active');
        metricLabel.textContent = 'bonus from remaining ms';
        metricUnit.textContent = 'pts';
        return;
    }

    meltdownHud.setAttribute('hidden', 'hidden');
    gameBox.classList.remove('meltdown-active');
    document.body.classList.remove('meltdown-active', 'meltdown-danger', 'meltdown-flash');
    setMeltdownDangerState(false);

    if (isFlowMode()) {
        overloadPanel.setAttribute('hidden', 'hidden');
        flowPanel.removeAttribute('hidden');
        interferencePanel.setAttribute('hidden', 'hidden');
        metricLabel.textContent = 'tempo accuracy';
        metricUnit.textContent = '%';
        return;
    }

    flowPanel.setAttribute('hidden', 'hidden');

    if (isInterferenceMode()) {
        overloadPanel.setAttribute('hidden', 'hidden');
        interferencePanel.removeAttribute('hidden');
        metricLabel.textContent = 'reaction bonus';
        metricUnit.textContent = 'pts';
        return;
    }

    interferencePanel.setAttribute('hidden', 'hidden');

    if (isOverloadMode()) {
        overloadPanel.removeAttribute('hidden');
        metricLabel.textContent = 'keystrokes';
        metricUnit.textContent = '';
        return;
    }

    overloadPanel.setAttribute('hidden', 'hidden');

    metricLabel.textContent = 'last word speed';
    metricUnit.textContent = 'ms';
}

function initFlowMarquee() {
    const source = [
        'steady', 'rhythm', 'tempo', 'baseline', 'typing', 'motion',
        'cadence', 'signal', 'pattern', 'focus', 'breath', 'flow'
    ];

    flowMarqueeWords = [];
    for (let i = 0; i < 42; i += 1) {
        flowMarqueeWords.push(source[Math.floor(Math.random() * source.length)]);
    }
    flowMarqueeNextIndex = 0;
    flowMarqueeOffsetX = 0;
    renderFlowMarquee(true);
    updateFlowCoach('maintain', 'maintain this tempo');
    setFlowSubmitFeedback('words submit automatically when correct', 'ok');
    updateFlowMeterTargetLine();
    updateFlowMeterPlayerBlock();
}

function flowWpmToRatio(wpm) {
    const clamped = Math.min(FLOW_WPM_MAX, Math.max(FLOW_WPM_MIN, wpm));
    return (clamped - FLOW_WPM_MIN) / (FLOW_WPM_MAX - FLOW_WPM_MIN);
}

function updateFlowMeterTargetLine() {
    const targetLine = document.getElementById('flow-tempo-target-line');
    if (!targetLine) return;
    const ratio = flowWpmToRatio(flowTargetWpm);
    targetLine.style.left = `${ratio * 100}%`;
}

function updateFlowMeterPlayerBlock() {
    const rail = document.getElementById('flow-tempo-rail');
    const block = document.getElementById('flow-tempo-player-block');
    if (!rail || !block) return null;

    const allowableRatio = Math.min(1, (FLOW_ALLOWED_BAND * 2) / (FLOW_WPM_MAX - FLOW_WPM_MIN));
    const blockWidth = rail.clientWidth * allowableRatio;
    block.style.width = `${blockWidth}px`;

    const ratio = flowWpmToRatio(flowDisplayWpm);
    const centerX = ratio * rail.clientWidth;
    const halfWidth = block.offsetWidth / 2;
    const maxLeft = Math.max(0, rail.clientWidth - block.offsetWidth);
    const left = Math.min(maxLeft, Math.max(0, centerX - halfWidth));
    block.style.transform = `translateX(${left}px)`;

    return {
        railWidth: rail.clientWidth,
        blockLeft: left,
        blockWidth: block.offsetWidth,
        blockCenter: left + (block.offsetWidth / 2)
    };
}

function setFlowBlockVisualState(state) {
    const block = document.getElementById('flow-tempo-player-block');
    if (!block) return;
    if (flowBlockVisualState === state) return;

    flowBlockVisualState = state;
    block.classList.remove('state-on', 'state-near', 'state-out');
    if (state === 'near') {
        block.classList.add('state-near');
        return;
    }
    if (state === 'out') {
        block.classList.add('state-out');
        return;
    }
    block.classList.add('state-on');
}

function updateFlowCoachRealtime(metrics) {
    if (!metrics) return;

    const targetX = flowWpmToRatio(flowTargetWpm) * metrics.railWidth;
    const blockLeft = metrics.blockLeft;
    const blockRight = blockLeft + metrics.blockWidth;
    const inside = targetX >= blockLeft && targetX <= blockRight;

    if (inside) {
        const distanceToEdge = Math.min(targetX - blockLeft, blockRight - targetX);
        const nearEdgeThreshold = metrics.blockWidth * 0.2;
        if (distanceToEdge <= nearEdgeThreshold) {
            setFlowBlockVisualState('near');
        } else {
            setFlowBlockVisualState('on');
        }

        if (flowCoachState !== 'maintain') {
            flowCoachState = 'maintain';
            updateFlowCoach('maintain', 'maintain that tempo');
        }
        return;
    }

    setFlowBlockVisualState('out');
    if (metrics.blockCenter < targetX) {
        if (flowCoachState !== 'slow') {
            flowCoachState = 'slow';
            updateFlowCoach('slow', 'speed up typing');
        }
        return;
    }

    if (flowCoachState !== 'fast') {
        flowCoachState = 'fast';
        updateFlowCoach('fast', 'slow down typing');
    }
}

function stopFlowMeterAnimation() {
    if (flowMeterRafId) {
        cancelAnimationFrame(flowMeterRafId);
        flowMeterRafId = null;
    }
}

function clearFlowScoreTimer() {
    if (flowScoreInterval) {
        clearInterval(flowScoreInterval);
        flowScoreInterval = null;
    }
}

function stepFlowMeterAnimation() {
    recomputeFlowCurrentWpm();

    // Smoothly chase real WPM so meter movement feels fluid instead of jumpy.
    flowDisplayWpm += (flowCurrentWpm - flowDisplayWpm) * 0.11;
    const meterMetrics = updateFlowMeterPlayerBlock();
    updateFlowCoachRealtime(meterMetrics);
    const currentEl = document.getElementById('flow-current-wpm');
    if (currentEl) currentEl.textContent = String(Math.round(flowCurrentWpm));
    if (!gameEnded && isFlowMode() && timerInterval) {
        flowMeterRafId = requestAnimationFrame(stepFlowMeterAnimation);
    } else {
        flowMeterRafId = null;
    }
}

function startFlowMeterAnimation() {
    stopFlowMeterAnimation();
    flowDisplayWpm = flowCurrentWpm;
    flowCoachState = 'maintain';
    flowBlockVisualState = 'on';
    updateFlowMeterTargetLine();
    const meterMetrics = updateFlowMeterPlayerBlock();
    updateFlowCoachRealtime(meterMetrics);
    flowMeterRafId = requestAnimationFrame(stepFlowMeterAnimation);
}

function extendFlowWords(minAdditionalWords = 24) {
    const source = [
        'steady', 'rhythm', 'tempo', 'baseline', 'typing', 'motion',
        'cadence', 'signal', 'pattern', 'focus', 'breath', 'flow'
    ];

    for (let i = 0; i < minAdditionalWords; i += 1) {
        flowMarqueeWords.push(source[Math.floor(Math.random() * source.length)]);
    }
}

function renderFlowMarquee(positionInstant = true) {
    const track = document.getElementById('flow-marquee-track');
    if (!track) return;

    track.innerHTML = '';
    flowMarqueeWords.forEach((word, idx) => {
        const span = document.createElement('span');
        span.className = 'flow-word-token';
        span.dataset.flowWordIndex = String(idx);
        span.textContent = word;
        track.appendChild(span);
    });

    updateFlowMarqueeState(positionInstant);
}

function updateFlowMarqueeState(positionInstant = false) {
    const track = document.getElementById('flow-marquee-track');
    if (!track) return;

    const words = track.querySelectorAll('.flow-word-token');
    words.forEach((token) => {
        const idx = Number(token.dataset.flowWordIndex || -1);
        token.classList.toggle('typed', idx >= 0 && idx < flowMarqueeNextIndex);
        token.classList.toggle('next', idx === flowMarqueeNextIndex);
    });

    updateFlowMarqueePosition(positionInstant);
}

function updateFlowMarqueePosition(positionInstant = false) {
    const wrap = document.querySelector('.flow-marquee-wrap');
    const track = document.getElementById('flow-marquee-track');
    if (!wrap || !track) return;

    const nextToken = track.querySelector(`[data-flow-word-index="${flowMarqueeNextIndex}"]`) || track.lastElementChild;
    if (!nextToken) return;

    const desiredX = wrap.clientWidth * FLOW_MARQUEE_ANCHOR_RATIO;
    const rawOffset = nextToken.offsetLeft - desiredX;
    const maxOffset = Math.max(0, track.scrollWidth - wrap.clientWidth);
    flowMarqueeOffsetX = Math.min(maxOffset, Math.max(0, rawOffset));

    if (positionInstant) {
        track.style.transition = 'none';
        track.style.transform = `translateX(${-flowMarqueeOffsetX}px)`;
        requestAnimationFrame(() => {
            track.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
        });
        return;
    }

    track.style.transform = `translateX(${-flowMarqueeOffsetX}px)`;
}

function setFlowSubmitFeedback(message, type = 'ok') {
    const feedback = document.getElementById('flow-submit-feedback');
    if (!feedback) return;

    feedback.textContent = message;
    feedback.classList.remove('feedback-ok', 'feedback-wrong');
    if (type === 'wrong') {
        feedback.classList.add('feedback-wrong');
    } else {
        feedback.classList.add('feedback-ok');
    }
}

function updateFlowCoach(state, message) {
    const coach = document.getElementById('flow-tempo-coach');
    if (!coach) return;

    coach.textContent = message;
    coach.classList.remove('tempo-fast', 'tempo-slow', 'tempo-maintain');
    if (state === 'fast') {
        coach.classList.add('tempo-fast');
        return;
    }
    if (state === 'slow') {
        coach.classList.add('tempo-slow');
        return;
    }
    coach.classList.add('tempo-maintain');
}

function handleFlowSubmit() {
    if (!isFlowMode() || gameEnded || !timerInterval) return;

    const flowInput = document.getElementById('flow-input');
    if (!flowInput) return;

    const typedWord = flowInput.value.trim().toLowerCase();
    const expected = (flowMarqueeWords[flowMarqueeNextIndex] || '').toLowerCase();

    if (!typedWord) {
        setFlowSubmitFeedback('type the underlined word', 'wrong');
        flowInput.classList.add('flow-input-error');
        return;
    }

    if (typedWord !== expected) {
        setFlowSubmitFeedback(`wrong word. expected: ${expected}`, 'wrong');
        flowInput.classList.add('flow-input-error');
        return;
    }

    flowInput.classList.remove('flow-input-error');
    setFlowSubmitFeedback(`accepted: ${expected}`, 'ok');

    recomputeFlowCurrentWpm();
    const submitDelta = Math.abs(flowCurrentWpm - flowTargetWpm);
    const wordPoints = submitDelta <= FLOW_SWEET_BAND
        ? FLOW_WORD_POINTS * 2
        : FLOW_WORD_POINTS;

    flowScore += wordPoints;
    flowWordPoints += wordPoints;
    document.getElementById('score').textContent = String(flowScore);

    flowSubmissionHistory.push({
        ts: performance.now(),
        chars: expected.length
    });

    flowMarqueeNextIndex += 1;
    if (flowMarqueeWords.length - flowMarqueeNextIndex <= 8) {
        extendFlowWords(24);
        renderFlowMarquee(false);
    } else {
        updateFlowMarqueeState(false);
    }

    flowInput.value = '';
}

function tryAutoSubmitFlowWord() {
    const flowInput = document.getElementById('flow-input');
    if (!flowInput || !isFlowMode() || gameEnded || !timerInterval) return;

    const typedWord = flowInput.value.trim().toLowerCase();
    const expected = (flowMarqueeWords[flowMarqueeNextIndex] || '').toLowerCase();
    if (!typedWord || !expected) return;

    if (typedWord === expected) {
        handleFlowSubmit();
    }
}

function clampFlowTarget(value) {
    return Math.min(FLOW_WPM_MAX, Math.max(FLOW_WPM_MIN, value));
}

function flowIsCountableKey(e) {
    if (!e || typeof e.key !== 'string') return false;
    if (e.key === 'Backspace') return true;
    if (e.key === ' ' || e.key === 'Spacebar') return true;
    return e.key.length === 1;
}

function recordFlowKeypress(ts = performance.now()) {
    flowKeyTimestamps.push(ts);
}

function recomputeFlowCurrentWpm(now = performance.now()) {
    const cutoff = now - FLOW_KEY_WINDOW_MS;
    flowKeyTimestamps = flowKeyTimestamps.filter((t) => t >= cutoff);
    const keysInWindow = flowKeyTimestamps.length;
    flowCurrentWpm = (keysInWindow / 5) * (60000 / FLOW_KEY_WINDOW_MS);
}

function shiftFlowTarget() {
    // Flow target is intentionally fixed for this mode.
    flowTargetWpm = FLOW_TARGET_START;
}

function updateFlowGauges() {
    const targetEl = document.getElementById('flow-target-wpm');
    const currentEl = document.getElementById('flow-current-wpm');
    if (targetEl) targetEl.textContent = String(flowTargetWpm);
    if (currentEl) currentEl.textContent = String(Math.round(flowCurrentWpm));
    updateFlowMeterTargetLine();
}

function updateFlowSecond() {
    flowElapsedSeconds += 1;

    updateFlowGauges();
}

function updateFlowScoreTick() {
    if (!isFlowMode() || gameEnded || !timerInterval) return;

    recomputeFlowCurrentWpm();

    const delta = Math.abs(flowCurrentWpm - flowTargetWpm);
    const closeness = Math.max(0, 1 - (delta / (FLOW_ALLOWED_BAND * 3)));
    flowClosenessAccumulator += (closeness * 0.5);

    if (delta <= FLOW_ALLOWED_BAND) {
        flowOnTargetSeconds += 0.5;
        const tickPoints = delta <= FLOW_SWEET_BAND
            ? FLOW_TEMPO_TICK_POINTS * 2
            : FLOW_TEMPO_TICK_POINTS;
        flowScore += tickPoints;
        flowTempoPoints += tickPoints;
    }

    flowLastAccuracyPct = Math.round(closeness * 100);
    flowBestAccuracyPct = Math.max(flowBestAccuracyPct, flowLastAccuracyPct);

    document.getElementById('score').textContent = String(flowScore);
    document.getElementById('last-speed').textContent = String(flowLastAccuracyPct);
    updateFlowGauges();
}

function clearInterferenceTimeout() {
    if (interferenceDistractionTimeout) {
        clearTimeout(interferenceDistractionTimeout);
        interferenceDistractionTimeout = null;
    }
}

function getInterferenceInput() {
    return document.getElementById('interference-paragraph') || document.getElementById('word-input');
}

const INTERFERENCE_TAUNTS = [
    'you call that focus?',
    'this is the easy part.',
    'the words are winning.',
    'maybe try blinking less.',
    'close me if you can.',
    'the paragraph is laughing at you.',
    'almost there, not really.',
    'you have seen worse popups.'
];

function getInterferenceAverageReactionTime() {
    if (!interferenceReactionTimes.length) return 0;
    const total = interferenceReactionTimes.reduce((sum, value) => sum + value, 0);
    return total / interferenceReactionTimes.length;
}

function renderInterferenceTarget() {
    const target = document.getElementById('interference-paragraph');
    if (!target) return;

    const chars = interferenceParagraphText.toLowerCase().split('');
    target.innerHTML = chars.map((ch, i) => {
        const safe = ch === ' ' ? '&nbsp;' : ch.replace('<', '&lt;').replace('>', '&gt;');
        return `<span class="interference-char" data-idx="${i}">${safe}</span>`;
    }).join('');
    updateInterferenceCursor();
}

function updateInterferenceCursor(wrongIndex = -1) {
    const target = document.getElementById('interference-paragraph');
    if (!target) return;

    const chars = target.querySelectorAll('.interference-char');
    chars.forEach((el, i) => {
        el.classList.remove('correct', 'current', 'wrong', 'shake');
        if (i < interferenceTypedIndex) el.classList.add('correct');
        if (i === interferenceTypedIndex) el.classList.add('current');
        if (i === wrongIndex) {
            el.classList.add('wrong', 'shake');
            setTimeout(() => {
                el.classList.remove('shake', 'wrong');
                if (i === interferenceTypedIndex) el.classList.add('current');
            }, 190);
        }
    });
}

function updateInterferenceScore() {
    interferenceTypedLength = interferenceTypedIndex;
    const elapsedMs = Math.max(1000, performance.now() - interferenceStartedAt);
    const elapsedMinutes = elapsedMs / 60000;
    interferenceCurrentWpm = elapsedMinutes > 0 ? (interferenceTypedLength / 5) / elapsedMinutes : 0;
    interferenceBestWpm = Math.max(interferenceBestWpm, interferenceCurrentWpm);
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
    const xPopup = document.getElementById('interference-x-popup');
    const captchaPopup = document.getElementById('interference-captcha-popup');
    if (xPopup) xPopup.setAttribute('hidden', 'hidden');
    if (captchaPopup) captchaPopup.setAttribute('hidden', 'hidden');
    interferenceModalOpen = false;
}

function randomCaptchaCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function randomizeModalPosition() {
    const popup = document.getElementById('interference-x-popup');
    if (!popup) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const maxOffsetX = Math.min(180, Math.max(32, viewportWidth * 0.14));
    const maxOffsetY = Math.min(140, Math.max(32, viewportHeight * 0.12));
    const offsetX = (Math.random() * 2 - 1) * maxOffsetX;
    const offsetY = (Math.random() * 2 - 1) * maxOffsetY;

    popup.style.setProperty('--popup-offset-x', `${Math.round(offsetX)}px`);
    popup.style.setProperty('--popup-offset-y', `${Math.round(offsetY)}px`);
}

function centerModalPosition() {
    const popup = document.getElementById('interference-captcha-popup');
    if (!popup) return;

    popup.style.setProperty('--popup-offset-x', '0px');
    popup.style.setProperty('--popup-offset-y', '0px');
}

function openInterferenceChallenge() {
    const captchaCodeEl = document.getElementById('interference-captcha-code');
    const captchaInput = document.getElementById('interference-captcha-input');
    const tauntEl = document.getElementById('interference-modal-taunt');
    const xPopup = document.getElementById('interference-x-popup');
    const captchaPopup = document.getElementById('interference-captcha-popup');

    if (!xPopup || !captchaPopup) return;

    xPopup.setAttribute('hidden', 'hidden');
    captchaPopup.setAttribute('hidden', 'hidden');

    interferenceChallengeType = Math.random() < 0.5 ? 'x' : 'captcha';

    if (interferenceChallengeType === 'x') {
        xPopup.removeAttribute('hidden');
        if (tauntEl) {
            const taunt = INTERFERENCE_TAUNTS[Math.floor(Math.random() * INTERFERENCE_TAUNTS.length)];
            tauntEl.textContent = `> ${taunt}`;
        }
        return;
    }

    interferenceCaptchaCode = randomCaptchaCode();
    captchaPopup.removeAttribute('hidden');
    if (tauntEl) tauntEl.textContent = '';
    if (captchaCodeEl) captchaCodeEl.textContent = interferenceCaptchaCode;
    if (captchaInput) {
        captchaInput.value = '';
        captchaInput.focus();
    }
}

function tryCloseInterferenceCaptcha() {
    const captchaInput = document.getElementById('interference-captcha-input');
    if (!captchaInput) return;
    const value = captchaInput.value.trim().toUpperCase();
    if (value !== interferenceCaptchaCode) {
        captchaInput.classList.add('shake');
        setTimeout(() => captchaInput.classList.remove('shake'), 160);
        return;
    }
    closeInterferenceModal();
}

function scheduleNextInterferenceDistraction() {
    clearInterferenceTimeout();
    if (!isInterferenceMode() || gameEnded) return;

    const delay = INTERFERENCE_MIN_DELAY + Math.floor(Math.random() * (INTERFERENCE_MAX_DELAY - INTERFERENCE_MIN_DELAY + 1));
    interferenceDistractionTimeout = setTimeout(() => {
        if (isInterferenceMode() && !gameEnded && !interferenceModalOpen) {
            const modal = document.getElementById('interference-modal');
            const input = getInterferenceInput();
            if (!modal || !input) return;
            interferenceModalOpen = true;
            interferenceModalShownAt = Date.now();
            modal.removeAttribute('hidden');
            openInterferenceChallenge();
            requestAnimationFrame(() => {
                if (interferenceChallengeType === 'captcha') {
                    centerModalPosition();
                } else {
                    randomizeModalPosition();
                }
            });
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

    const input = getInterferenceInput();
    if (input) input.focus();

    scheduleNextInterferenceDistraction();
}

function handleInterferenceTyping(e) {
    if (!isInterferenceMode() || gameEnded || interferenceModalOpen || !timerInterval) return;
    if (e.key === 'Tab') {
        e.preventDefault();
        return;
    }

    const expected = interferenceParagraphText.toLowerCase()[interferenceTypedIndex];
    if (expected === undefined) return;

    let typed = e.key;
    if (typed === 'Spacebar') typed = ' ';

    if (typed.length !== 1 && typed !== ' ') {
        return;
    }

    e.preventDefault();
    if (typed.toLowerCase() === expected) {
        interferenceTypedIndex += 1;
        updateInterferenceCursor();
        updateInterferenceScore();
        return;
    }

    updateInterferenceCursor(interferenceTypedIndex);
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

function resetAllModeState() {
    overloadKeystrokes = 0;
    overloadLastCountedKey = '';
    overloadSameKeyStreak = 0;

    meltdownLives = MELTDOWN_STARTING_LIVES;
    meltdownScore = 0;
    meltdownWordsCleared = 0;
    meltdownSurvivalBonus = 0;
    meltdownCurrentWord = "";
    meltdownPenaltyLock = false;

    flowTargetWpm = FLOW_TARGET_START;
    flowCurrentWpm = 0;
    flowScore = 0;
    flowSubmissionHistory = [];
    flowKeyTimestamps = [];
    flowMarqueeWords = [];
    flowMarqueeNextIndex = 0;
    flowMarqueeOffsetX = 0;
    flowOnTargetSeconds = 0;
    flowClosenessAccumulator = 0;
    flowElapsedSeconds = 0;
    flowLastAccuracyPct = 0;
    flowBestAccuracyPct = 0;
    flowDisplayWpm = FLOW_TARGET_START;
    stopFlowMeterAnimation();
    clearFlowScoreTimer();
    flowTempoPoints = 0;
    flowWordPoints = 0;

    interferenceParagraphText = INTERFERENCE_PARAGRAPH;
    interferenceModalOpen = false;
    interferenceModalShownAt = 0;
    interferenceDistractionTimeout = null;
    interferenceReactionBonus = 0;
    interferenceReactionCount = 0;
    interferenceReactionTimes = [];
    interferenceStartedAt = 0;
    interferenceCurrentWpm = 0;
    interferenceBaseScore = 0;
    interferenceTypedLength = 0;
    interferenceTypedIndex = 0;
    interferenceChallengeType = 'x';
    interferenceCaptchaCode = '';
    interferenceBestWpm = 0;
}

function configureModeInputs() {
    const wordInput = document.getElementById('word-input');
    const flowInput = document.getElementById('flow-input');
    const interferenceInput = getInterferenceInput();

    if (wordInput) {
        wordInput.disabled = isFlowMode() || isInterferenceMode();
    }
    if (flowInput) {
        flowInput.disabled = !isFlowMode();
    }
    if (interferenceInput) {
        interferenceInput.disabled = !isInterferenceMode();
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
    const gameBox = document.getElementById('game-box');
    const templateMode = gameBox?.dataset?.gameMode || '';
    currentMode = resolveMode(templateMode || searchParams.get('mode'));
    currentModeLabel = modeLabel(currentMode);

    const modeLabelEl = document.getElementById('current-mode-label');
    if (modeLabelEl) modeLabelEl.textContent = currentModeLabel.toLowerCase();
    setupModeHud();
    configureModeInputs();

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

    const wordInput = document.getElementById('word-input');
    if (wordInput && (isMeltdownMode() || isOverloadMode() || currentMode === 'classic')) {
        wordInput.addEventListener('keydown', function(e) {
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
    }

    const interferenceSurface = document.getElementById('interference-paragraph');
    if (interferenceSurface && isInterferenceMode()) {
        interferenceSurface.addEventListener('keydown', handleInterferenceTyping);
        interferenceSurface.addEventListener('mousedown', function () {
            this.focus();
        });
        interferenceSurface.addEventListener('paste', function (e) {
            e.preventDefault();
        });
    }

    const flowInput = document.getElementById('flow-input');
    if (flowInput && isFlowMode()) {
        flowInput.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                return;
            }

            if (flowIsCountableKey(e) && !e.repeat) {
                recordFlowKeypress();
            }
        });

        flowInput.addEventListener('input', function () {
            this.classList.remove('flow-input-error');
            const feedback = document.getElementById('flow-submit-feedback');
            if (feedback) {
                feedback.classList.remove('feedback-wrong');
            }
            tryAutoSubmitFlowWord();
        });
    }

    const interferenceClose = document.getElementById('interference-modal-close');
    if (interferenceClose && isInterferenceMode()) {
        interferenceClose.addEventListener('click', function () {
            closeInterferenceModal();
        });
    }

    const interferenceCaptchaInput = document.getElementById('interference-captcha-input');
    const interferenceCaptchaSubmit = document.getElementById('interference-captcha-submit');
    if (interferenceCaptchaInput && isInterferenceMode()) {
        interferenceCaptchaInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                tryCloseInterferenceCaptcha();
            }
        });
    }
    if (interferenceCaptchaSubmit && isInterferenceMode()) {
        interferenceCaptchaSubmit.addEventListener('click', tryCloseInterferenceCaptcha);
    }

    window.addEventListener('resize', function () {
        if (isFlowMode()) {
            updateFlowMeterTargetLine();
            updateFlowMeterPlayerBlock();
            updateFlowMarqueePosition(true);
        }

        if (isInterferenceMode() && interferenceModalOpen) {
            if (interferenceChallengeType === 'captcha') {
                centerModalPosition();
            } else {
                randomizeModalPosition();
            }
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
    const overloadFill = document.getElementById('overload-meter-fill');
    const overloadPercent = document.getElementById('overload-percent');
    const overloadStatus = document.getElementById('overload-status');
    const overloadMeter = document.querySelector('.overload-meter');

    if (!scoreElement || !wordDisplay || !speedElement) return;

    const pct = Math.min(100, Math.floor((overloadKeystrokes / OVERLOAD_TARGET) * 100));
    const bonusReady = overloadKeystrokes >= OVERLOAD_TARGET;

    scoreElement.textContent = overloadKeystrokes;
    speedElement.textContent = overloadKeystrokes;

    wordDisplay.textContent = bonusReady
        ? 'overload complete'
        : 'mash keys';
    wordDisplay.style.fontSize = window.innerWidth <= 600 ? '18px' : '24px';

    if (overloadFill) {
        overloadFill.style.width = `${pct}%`;
        overloadFill.classList.remove('state-low', 'state-mid', 'state-high', 'state-full');
        if (pct >= 100) overloadFill.classList.add('state-full');
        else if (pct >= 67) overloadFill.classList.add('state-high');
        else if (pct >= 34) overloadFill.classList.add('state-mid');
        else overloadFill.classList.add('state-low');
    }

    if (overloadPercent) overloadPercent.textContent = `${pct}%`;
    if (overloadStatus) {
        overloadStatus.textContent = bonusReady ? 'overcharge ready' : 'powering up...';
    }
    if (overloadMeter) overloadMeter.setAttribute('aria-valuenow', String(pct));
}

function handleOverloadKeydown(e) {
    if (gameEnded) return;
    if (!timerInterval) return;
    if (e.repeat) return;

    const key = typeof e.key === 'string' ? e.key.toLowerCase() : '';
    if (key && key === overloadLastCountedKey) {
        overloadSameKeyStreak += 1;
        if (overloadSameKeyStreak > 3) {
            return;
        }
    } else {
        overloadLastCountedKey = key;
        overloadSameKeyStreak = 1;
    }

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
    const stat2Row = document.getElementById('final-stat-2-row');
    const stat2Label = document.getElementById('final-stat-2-label');
    const stat2Value = document.getElementById('final-stat-2-value');
    const stat3Row = document.getElementById('final-stat-3-row');
    const stat3Label = document.getElementById('final-stat-3-label');
    const stat3Value = document.getElementById('final-stat-3-value');

    if (!stat1Label || !stat1Value || !stat2Row || !stat2Label || !stat2Value || !stat3Label || !stat3Value || !stat3Row) {
        return;
    }

    stat2Row.removeAttribute('hidden');
    stat3Row.removeAttribute('hidden');

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
        stat1Label.textContent = 'words cleared';
        stat1Value.textContent = String(result.total_attempts || 0);

        stat2Row.setAttribute('hidden', 'hidden');
        stat3Row.setAttribute('hidden', 'hidden');
        return;
    }

    if (isFlowMode()) {
        const tempoPoints = Number(result.flow_tempo_points || 0);
        const wordPoints = Number(result.flow_word_points || 0);
        const onTargetSeconds = Number(result.flow_on_target_seconds || 0);
        const avgClosenessPct = Number(result.flow_avg_closeness_pct || 0).toFixed(1);

        stat1Label.textContent = 'tempo points';
        stat1Value.textContent = String(tempoPoints);

        stat2Label.textContent = 'word points';
        stat2Value.textContent = String(wordPoints);

        stat3Label.textContent = 'on-target seconds';
        stat3Value.textContent = `${onTargetSeconds.toFixed(1)}s (${avgClosenessPct}% avg)`;
        return;
    }

    if (isInterferenceMode()) {
        const wpm = Number(result.interference_wpm || 0).toFixed(2);
        const avgReaction = Number(result.avg_reaction_time || 0).toFixed(0);

        stat1Label.textContent = 'paragraph wpm';
        stat1Value.textContent = String(wpm);

        stat2Label.textContent = 'reaction bonus';
        stat2Value.textContent = `+${Number(result.reaction_bonus || 0)}`;

        stat3Label.textContent = 'avg reaction (ms)';
        stat3Value.textContent = String(avgReaction);
        return;
    }

    stat1Label.textContent = 'words typed';
    stat1Value.textContent = String(result.total_attempts || 0);

    stat2Label.textContent = 'average speed';
    stat2Value.textContent = `${Number(result.avg_speed || 0).toFixed(2)} ms`;

    stat3Label.textContent = '';
    stat3Value.textContent = '';
    stat3Row.setAttribute('hidden', 'hidden');
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
    stopFlowMeterAnimation();
    clearFlowScoreTimer();
    hideInterferenceModal();
    document.body.classList.remove('meltdown-danger', 'meltdown-flash');

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
    resetAllModeState();

    if (typeof window.TelemetryEngine?.resetTelemetry === 'function') {
        window.TelemetryEngine.resetTelemetry();
    }

    const wordInput = document.getElementById('word-input');
    wordInput.disabled = false;
    wordInput.value = '';
    wordInput.focus();
    document.getElementById('last-speed').textContent = '-';
    configureModeInputs();

    if (timerInterval) clearInterval(timerInterval);
    clearMeltdownRoundTimer();
    clearInterferenceTimeout();
    hideInterferenceModal();

    if (isMeltdownMode()) {
        sessionId = null;
        timeLeft = 0;
        document.getElementById('score').textContent = '0';
        document.getElementById('time-left').textContent = 'inf';
        document.getElementById('last-speed').textContent = '0';
        wordInput.placeholder = 'type fast, submit before 10.00s';
        updateMeltdownHud();
        startMeltdownRound();
        timerInterval = null;
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
        flowSubmissionHistory = [];
        flowKeyTimestamps = [];
        flowMarqueeWords = [];
        flowMarqueeNextIndex = 0;
        flowMarqueeOffsetX = 0;
        flowOnTargetSeconds = 0;
        flowClosenessAccumulator = 0;
        flowElapsedSeconds = 0;
        flowLastAccuracyPct = 0;
        flowBestAccuracyPct = 0;
        flowDisplayWpm = FLOW_TARGET_START;

        document.getElementById('score').textContent = '0';
        document.getElementById('time-left').textContent = String(FLOW_GLOBAL_SECONDS);
        document.getElementById('last-speed').textContent = '0';
        initFlowMarquee();
        updateFlowGauges();
        startFlowMeterAnimation();

        if (flowInput) {
            flowInput.value = '';
            flowInput.classList.remove('flow-input-error');
            flowInput.focus();
        }

        clearFlowScoreTimer();
        flowScoreInterval = setInterval(updateFlowScoreTick, 500);
        timerInterval = setInterval(updateTimer, 1000);
        return;
    }

    if (isInterferenceMode()) {
        const interferenceInput = getInterferenceInput();
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

        interferenceTypedIndex = 0;
        renderInterferenceTarget();

        if (interferenceInput) interferenceInput.focus();

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
            const avgClosenessPct = flowElapsedSeconds > 0
                ? (flowClosenessAccumulator / flowElapsedSeconds) * 100
                : 0;
            finalizeGame({
                reason: 'Flow session completed.',
                score: flowScore,
                total_attempts: flowOnTargetSeconds,
                avg_speed: 0,
                flow_target_wpm: flowTargetWpm,
                flow_current_wpm: flowCurrentWpm,
                flow_on_target_seconds: flowOnTargetSeconds,
                flow_avg_closeness_pct: avgClosenessPct,
                flow_tempo_points: flowTempoPoints,
                flow_word_points: flowWordPoints
            });
        }
        return;
    }

    if (isInterferenceMode() && timerInterval) {
        updateInterferenceScore();
        if (!interferenceModalOpen) {
            const interferenceInput = getInterferenceInput();
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
