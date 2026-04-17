(function () {

    const state = {
        presses: [],
        releases: [],
        strokes: [],
        activeKeydowns: new Map(),
        startedAt: performance.now(),
        attached: false,
        targetElement: null
    };

    function normalizeKey(key) {
        if (key === " " || key === "Spacebar") return "Space";

        const utilityKeys = new Set([
            "Backspace",
            "Delete",
            "Enter",
            "Tab",
            "Escape",
            "Shift",
            "Control",
            "Alt",
            "Meta",
            "CapsLock",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight"
        ]);

        if (utilityKeys.has(key)) return key;

        // Privacy-safe mapping: do not store raw characters.
        if (typeof key === "string" && key.length === 1) return "char";

        return "Other";
    }

    function shouldTrackEvent(event) {
        if (!state.targetElement) return true;
        return event.target === state.targetElement;
    }

    function onKeydown(event) {
        if (!shouldTrackEvent(event)) return;
        if (event.repeat) return;

        const timestamp = performance.now();
        const safeKey = normalizeKey(event.key);
        const code = event.code || event.key;

        if (state.activeKeydowns.has(code)) return;

        state.activeKeydowns.set(code, {
            t: timestamp,
            key: safeKey
        });

        state.presses.push({
            t: timestamp,
            key: safeKey
        });
    }

    function onKeyup(event) {
        if (!shouldTrackEvent(event)) return;

        const timestamp = performance.now();
        const safeKey = normalizeKey(event.key);
        const code = event.code || event.key;

        state.releases.push({
            t: timestamp,
            key: safeKey
        });

        const down = state.activeKeydowns.get(code);
        if (!down) return;

        state.strokes.push({
            key: down.key,
            down: down.t,
            up: timestamp
        });

        state.activeKeydowns.delete(code);
    }

    function getFlightTimes() {
        const flightTimes = [];

        for (let i = 1; i < state.strokes.length; i += 1) {
            const previous = state.strokes[i - 1];
            const current = state.strokes[i];
            const flight = current.down - previous.up;
            flightTimes.push(flight);
        }

        return flightTimes;
    }

    function mean(values) {
        if (!values.length) return 0;
        const total = values.reduce((sum, v) => sum + v, 0);
        return total / values.length;
    }

    function variance(values) {
        if (!values.length) return 0;
        const m = mean(values);
        const sq = values.reduce((sum, v) => sum + ((v - m) * (v - m)), 0);
        return sq / values.length;
    }

    function resetTelemetry() {
        state.presses = [];
        state.releases = [];
        state.strokes = [];
        state.activeKeydowns.clear();
        state.startedAt = performance.now();
    }

    function extractFeatures() {
        const dwellTimes = state.strokes
            .map((s) => s.up - s.down)
            .filter((v) => Number.isFinite(v) && v >= 0);

        const flightTimes = getFlightTimes().filter((v) => Number.isFinite(v));

        const totalKeystrokes = state.presses.length;
        const errorCorrections = state.presses.filter((p) => p.key === "Backspace" || p.key === "Delete").length;
        const charKeystrokes = state.presses.filter((p) => p.key === "char").length;

        let sessionLengthSeconds = 0;
        if (state.presses.length > 0) {
            const first = state.presses[0].t;
            const lastRelease = state.releases.length > 0 ? state.releases[state.releases.length - 1].t : state.presses[state.presses.length - 1].t;
            sessionLengthSeconds = Math.max(0, (lastRelease - first) / 1000);
        }

        const sessionMinutes = sessionLengthSeconds / 60;
        const typingSpeedWpm = sessionMinutes > 0 ? (charKeystrokes / 5) / sessionMinutes : 0;

        return {
            avg_dwell_time: mean(dwellTimes),
            avg_flight_time: mean(flightTimes),
            flight_time_variance: variance(flightTimes),
            error_correction_rate: totalKeystrokes > 0 ? (errorCorrections / totalKeystrokes) : 0,
            typing_speed_wpm: typingSpeedWpm,
            pause_frequency: flightTimes.filter((f) => f > 1000).length,
            session_length: sessionLengthSeconds,
            total_keystrokes: totalKeystrokes
        };
    }

    async function sendTelemetry(playerName, gameMode, score) {
        const features = extractFeatures();

        const payload = {
            player_name: String(playerName || "").trim(),
            game_mode: String(gameMode || "").trim(),
            score: Number(score) || 0,
            ...features
        };

        const response = await fetch("/api/save_telemetry", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let details = "Unknown telemetry error";
            try {
                const json = await response.json();
                details = json.error || details;
            } catch (e) {
                // Fallback for non-JSON responses.
            }
            throw new Error(details);
        }

        return response.json();
    }

    function startTelemetry(options) {
        const opts = options || {};
        state.targetElement = null;

        if (opts.inputSelector) {
            state.targetElement = document.querySelector(opts.inputSelector);
        }

        if (state.attached) return;

        window.addEventListener("keydown", onKeydown, true);
        window.addEventListener("keyup", onKeyup, true);
        state.attached = true;
    }

    function stopTelemetry() {
        if (!state.attached) return;
        window.removeEventListener("keydown", onKeydown, true);
        window.removeEventListener("keyup", onKeyup, true);
        state.attached = false;
    }

    window.TelemetryEngine = {
        startTelemetry,
        stopTelemetry,
        resetTelemetry,
        extractFeatures,
        sendTelemetry,
        getPresses: function () { return state.presses.slice(); },
        getReleases: function () { return state.releases.slice(); }
    };

    window.sendTelemetry = sendTelemetry;
    window.extractTelemetryFeatures = extractFeatures;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            startTelemetry();
        });
    } else {
        startTelemetry();
    }
})();
