// this file is for the game logic and steps

let socket;
let playerName = "";
let timerInterval = null;
let lastWordStart = null;

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
    // this is for the name step
    document.getElementById('name-next-btn').onclick = function() {
        const name = document.getElementById('player-name-input').value.trim();
        if (name.length > 0) {
            playerName = name;
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
        // this is for typing the word and pressing enter
        if (e.key === 'Enter') {
            const input = this.value.trim();
            if (input) {
                // this shows how fast the last word was typed
                if (lastWordStart) {
                    const speed = Date.now() - lastWordStart;
                    document.getElementById('last-speed').textContent = speed;
                }
                socket.send(JSON.stringify({ input: input }));
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

    // this shows the first step when the page loads
    showStep('name');
});

function startGame() {
    // this starts the websocket and handles the game logic
    socket = new WebSocket(`ws://${window.location.host}/game-socket`);
    socket.onopen = function() {
        socket.send(JSON.stringify({ name: playerName }));
    };
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.action === 'new_word') {
            // this shows the new word and updates score/time
            document.getElementById('current-word').textContent = data.word;
            document.getElementById('score').textContent = data.score;
            document.getElementById('time-left').textContent = Math.floor(data.time_left);
            document.getElementById('word-input').value = '';
            document.getElementById('word-input').focus();
            lastWordStart = Date.now();
        }
        else if (data.action === 'game_over') {
            // this shows the game over screen
            transitionStep('step-game', 'step-over', function() {
                document.getElementById('game-over-reason').textContent = data.reason === 'time_up'
                    ? 'Time is up!' : 'You misspelled the word!';
                document.getElementById('final-score').textContent = data.score;
                document.getElementById('final-words').textContent = data.total_attempts;
                document.getElementById('final-speed').textContent = data.avg_speed.toFixed(2);
                if (timerInterval) clearInterval(timerInterval);
            });
        }
    };
    document.getElementById('word-input').focus();
    document.getElementById('last-speed').textContent = '-';
    timerInterval = setInterval(function() {
        // this updates the timer every second
        const timeElement = document.getElementById('time-left');
        let timeLeft = parseInt(timeElement.textContent);
        if (timeLeft > 0) timeElement.textContent = timeLeft - 1;
    }, 1000);
}
