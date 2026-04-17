TYPEFIGHTERS: Project Architecture & Implementation Plan

1. Overview

Typefighters is a gamified data collection web application built with Flask and JavaScript. Its primary purpose is to collect keystroke dynamics (telemetry) from users under 5 specific psychological/environmental conditions. This data will be exported as a CSV to train a Neural Network for multi-class classification.

2. The 5 Game Modes (The Classes)

Mode 1: FOCUSED (Game Name: "Classic")

Target State: Focused (High concentration, balancing extreme speed with perfect accuracy).

Description: This is the original game from the first iteration of the app.

UI/UX: Clean, dark, distraction-free environment. Large, complex words in the center of the screen.

Mechanics: * The user must type the displayed word exactly.

A single typo immediately ends the game.

Time limit: 2 minutes total.

Scoring System: Complexity Multiplier

Score = (Word Length) * (1000 / Time_Taken_In_ms)

Longer words typed faster yield exponentially higher scores.

Mode 2: TIME-PRESSURE (Game Name: "Meltdown")

Target State: High stress, panic, frequent rushed errors.

UI/UX: The screen has a red vignette that pulses. A large, ticking 3-second countdown is prominently displayed above the word.

Mechanics:

The player has 5 lives.

They have exactly 3 seconds to type the word.

If the timer hits 0, OR if they press a wrong key: the screen flashes brightly, a "buzzer" sound plays, they lose 1 life, and the next word instantly appears.

Game ends when 5 lives are lost or 2 minutes elapse.

Scoring System: Flat Rate + Time Bonus

Base: +100 points per correct word.

Bonus: +1 point for every millisecond left on the 3-second clock.

Survival Bonus: +5000 points if they survive the full 2 minutes.

Mode 3: BASELINE (Game Name: "Tempo Typist")

Target State: Normal, relaxed, rhythmic typing.

UI/UX: A horizontal marquee/conveyor belt of short, simple words scrolling smoothly from right to left. Two gauges on screen: "Target WPM" and "Current WPM".

Mechanics:

Typographical errors are completely ignored (pressing wrong keys doesn't stop them, it just records the key press).

The game generates a "Target WPM" (e.g., 40 WPM). Every 20 seconds, this target randomly shifts up or down by 5-10 WPM.

The player must type continuously to match the target.

If their "Current WPM" (calculated over the last 2 seconds) falls more than 10 WPM above or below the Target WPM for 2 consecutive seconds, the game ends.

Time limit: 2 minutes.

Scoring System: Rhythm Streaks

+10 points awarded for every second the player is in the "Sweet Spot" (Current WPM is within ±5 of Target WPM).

Combo Multiplier: Every 10 consecutive seconds in the sweet spot increases the multiplier (1x, 2x, 3x).

Mode 4: DISTRACTED (Game Name: "Interference")

Target State: Divided attention, broken rhythm, high flight-time variance.

UI/UX: A standard text area where the user is retyping a full paragraph.

Mechanics:

While typing, random interactive distractions occur every 5 to 10 seconds.

Examples: A large modal blocks the text saying "CLICK THE RED X TO CONTINUE", or the text area loses focus and they have to click back into it.

They cannot continue typing the paragraph until the distraction is cleared.

Time limit: 2 minutes.

Scoring System: Speed + Reaction Time

Base Score: Overall WPM * 100.

Reaction Bonus: For every pop-up, 5000 / Reaction_Time_In_ms to close it. Quick reactions yield massive points.

Mode 5: IRREGULAR INPUT (Game Name: "Overload")

Target State: Non-purposeful, chaotic keyboard mashing.

UI/UX: A giant, empty vertical "Power Bar" in the center of the screen. A massive 10-second countdown timer.

Mechanics:

Prompt: "FILL THE BAR! MASH 1000 KEYS!"

Timer is strictly 10 seconds.

The user must hit as many keys as physically possible.

The visual bar fills up as their total keystroke count approaches 1000.

Scoring System: Raw Count

1 point per keystroke.

Overcharge Bonus: If they hit 1000 characters before 10 seconds is up, their final score is multiplied by 2, and the screen glows golden.

3. Telemetry Collection Engine (Frontend JS)

We will build a background tracker in JavaScript that listens to every keystroke without saving the actual characters typed.

The Logic Map

State Arrays: We will maintain arrays for presses[] and releases[].

Event Listeners:

keydown: Record performance.now(), key identifier (e.g., 'char', 'Backspace', 'Space'), and set a flag so holding the key doesn't trigger multiple presses.

keyup: Record performance.now().

Feature Extraction (Calculated at Game Over):

Average Dwell Time: Sum(keyup_time - keydown_time for each key) / Total_Keystrokes

Average Flight Time: Sum(keydown_time_current - keyup_time_previous) / Total_Keystrokes

Flight Time Variance: Calculate the mathematical variance of the flight time array to see how erratic the rhythm was.

Error Correction Rate: (Count of Backspace + Delete keys) / Total_Keystrokes

Typing Speed: (Total 'char' keys / 5) / (Session_Length_in_minutes) (Standard WPM calculation).

Pause Frequency: Count the number of times Flight Time was greater than 1000ms.

Session Length: Total active time in seconds.

Total Keystrokes: presses.length.

4. Backend Architecture (Flask + SQLAlchemy)

Database Schema Update (models.py)

class TelemetryData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_name = db.Column(db.String(50))
    game_mode = db.Column(db.String(20)) # 'Classic', 'Panic Press', etc. (The Target Class)
    score = db.Column(db.Integer)
    
    # The 8 ML Features
    avg_dwell_time = db.Column(db.Float)
    avg_flight_time = db.Column(db.Float)
    flight_time_variance = db.Column(db.Float)
    error_correction_rate = db.Column(db.Float)
    typing_speed_wpm = db.Column(db.Float)
    pause_frequency = db.Column(db.Integer)
    session_length = db.Column(db.Float)
    total_keystrokes = db.Column(db.Integer)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)




API Endpoints Update (app.py)

/api/save_telemetry (POST):

Receives JSON from the frontend containing the player's name, mode, score, and the 8 calculated features.

Saves the data to the TelemetryData table and updates the Highscore table.

/admin/export_data (GET):

A hidden route for you to download the dataset.

Queries TelemetryData.query.all().

Uses Flask's stream_with_context to output a cleanly formatted CSV file ready for Neural Network training (Pandas/Scikit-learn).

5. Development Roadmap (Next Steps)

Step 1: Update models.py to include the TelemetryData table and update the Config if necessary.

Step 2: Build the Core Telemetry Tracker (telemetry.js). This will be a utility script loaded on all game pages to track and calculate the 8 features silently.

Step 3: Refactor the UI to have a "Mode Selection" screen on the main menu.

Step 4: Implement Mode 1 (Classic) and Mode 5 (Furious Fingers) first, as they are the easiest to build with the existing codebase.

Step 5: Implement Mode 2 (Panic Press) with the life system and 3-second timers.

Step 6: Implement Mode 3 (Tempo Typist) with the scrolling marquee and rolling WPM calculations.

Step 7: Implement Mode 4 (Modal Mayhem) with random HTML modals.

Step 8: Build the CSV export route and test the data collection pipeline.