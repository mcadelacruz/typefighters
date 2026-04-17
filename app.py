import os
import random
import time
import json
import uuid
import csv
import io
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, jsonify, session as flask_session, Response, stream_with_context
from config import Config

from models import db, HighScore, TelemetryData  # this imports the database and models

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)  # this connects the database to the app

# this is the list of words for the typing game
WORD_LIST = [
    "apple", "banana", "orange", "grapes", "cherry", "antidisestablishmentarianism",
    "pneumonoultramicroscopicsilicovolcanoconiosis", "hippopotomonstrosesquippedaliophobia",
    "supercalifragilisticexpialidocious", "incomprehensibilities", "parasternocleidomastoid",
    "psychoneuroendocrinological", "electroencephalographically", "gastrointestinal",
    "disproportionableness", "microspectrophotometrically", "ultramicroscopically",
    "quasiperiodically", "immunoelectrophoretically", "uncharacteristically",
    "micrometeorological", "unintelligibleness", "interconnectedness", "deinstitutionalization",
    "photophosphorylation", "counterdemonstration", "dihydroxyacetonephosphate",
    "palaeogeographically", "extemporaneousness", "overintellectualization",
    "indistinguishableness", "counterproliferation", "immunohematologically",
    "chromolithographically", "nondiscrimination", "thermoelectrically", "antirevolutionaries",
    "inconsequentialities", "mischaracterization", "electroretinographies",
    "psychopathologically", "microencapsulations", "immunoelectrophoresis",
    "counterintelligence", "incommensurabilities", "disproportionateness",
    "ultramicroscopical", "phenomenalistically", "immunocytochemistry",
    "irreconcilabilities", "unintelligibilities", "overenthusiastically",
    "pseudopseudohypoparathyroidism", "photointerpretation", "underrepresentation",
    "ultrasonographically", "neuroradiologically", "anthropomorphologically",
    "counterinflationary", "phosphatidylethanolamine", "immunoprecipitation",
    "overcommunication", "unintelligibility", "circumlocutionary", "electrooculographic",
    "anticonstitutional", "unconstitutionality", "neuropharmacological", "counterproductive",
    "irreproachableness", "spectrophotometries", "microphotometrically", "immunohistochemistry",
    "counterpropagations", "stereomicroscopical", "uncontrollableness", "photoreconnaissance",
    "incontrovertibility", "inconspicuousnesses", "immunopathological", "uncontroversially",
    "incomprehensibility", "immunomodulations", "suprasegmentalities", "contradistinctively",
    "antiestablishmentarian", "psychobiographical", "unconscionableness", "overproportionately",
    "microcalorimetrical", "unquestionableness", "ultracentrifugation", "counterinsurgencies",
    "neurotransmitter", "counterprogramming", "multidimensionality", "disestablishmentarian",
    "photogrammetries", "countercultural", "uncharacterized", "microelectronically",
    "noncontroversial", "uncharacteristic", "thermoluminescent", "inefficaciousnesses",
    "counterinstitutional", "electrocardiographic", "immunocompetent", "counterretaliation",
    "microcrystalline", "indistinguishability", "antireductionism", "immunogenetically",
    "thermoregulations", "photomicrography", "countercondensation", "psychopathological",
    "microcirculation", "counteraccusation", "hyperintellectual", "electroacoustic",
    "counterreformation", "noninterventional", "superinjunction", "neuropeptidases",
    "deoxyribonucleotide", "microlepidopterous", "ultrarevolutionary", "immunoperoxidase",
    "hyperaggressiveness", "supercontinental", "dehydrochlorinate", "unconventionality",
    "indistinctiveness", "counterdemonstrator", "extraterrestrial", "counterexplanation",
    "microinstruction", "thermoperiodicity", "overidentification", "photosynthetically",
    "psychophysiological", "immunocompromised", "indeterminateness", "nonreproducibility",
    "counterdisengagement", "microvasculature", "psychotomimetic", "deindustrialization",
    "underutilization", "counterguerilla", "counterdeployment", "antiparliamentarian",
    "ultraradicalism", "counterproliferative", "microevolutionary", "supererogatorily",
    "immunodiagnostic", "intercontinental", "photosensitization", "counterespionage",
    "deconstructionist", "psychophysicist", "microenvironmental", "ultrarevolutionaries",
    "counterdeployment", "immunosuppressive", "mispronunciation", "counterirritation",
    "noncomprehension", "antinationalistic", "photosensitivity", "counterinstitutional",
    "neurofibromatosis", "ultrasegregationist", "immunogenicity", "misinterpretation",
    "microsporogenesis", "counterprogramming", "decontamination", "photodissociation",
    "interdependence", "anticonventional", "counterprojection", "deindustrialization",
    "ultracrepidarianism", "immunotherapeutic", "intergovernmental", "counterreformation",
    "photosynthetize", "electrotherapeutic", "ultramicroanalysis", "counteraggression",
    "misidentification", "micropropagation", "counterproposition", "superregeneration",
    "indiscernibility", "counterrecruitment", "photosynthesizing", "hyperstimulation",
    "immunohematologist", "interrelationship", "microdissection", "psychotomimetically",
    "indigestibleness", "counterretaliate", "ultrafastidiousness", "counterrevelation",
    "photosynthetically", "immunoreactivity", "superparamagnetic", "indubitableness",
    "photoperiodically", "countersecessionist", "interconvertibility", "microfabrication",
    "counterreformationist", "antiparliamentarianism", "photosynthesizer",
    "psycholinguistically", "superregenerative", "ulrarevolutionary", "counterdeclaration",
    "immunohematological", "indemonstrability", "counterincitement", "photomechanically",
    "microaerophilic", "hyperimmunizations", "counterattraction", "immunomodulation",
    "antipersonnel", "photophosphorylating", "microcalorimetrically",
    "counterestablishment", "ultramicrotomist", "dehydrochlorinase", "counterespionages",
    "immunopathologically", "neurophysiological", "intercommunication", "psychogeriatrician",
    "microearthquake", "counterreformationary", "indistinctivenesses", "antiperspirant",
    "counteraggression", "dehydrochlorination", "ultrarightist", "immunodiagnoses",
    "psychopathological", "neurofibromatoses", "microphotographic", "counterirritations",
    "mispronunciations", "superintelligence", "immunocytochemical", "interprofessional",
    "photosynthetically", "counterrevelations", "ultrasegregationists",
    "counterreformations", "microspectrophotometer", "deindustrializations",
    "immunohematologists", "superindustrialization", "interdenominational",
    "counterconditioning", "psychobiographical", "neurophysiologically",
    "antiferromagnetic", "counterproliferations", "dehydrochlorinations",
    "immunoelectrophoresis", "indistinctiveness", "counterdemonstrations",
    "ultramicroscopical", "counterintuitive", "photosynthetically", "immunomodulatory",
    "hyperpigmentation", "superconglomerate", "counterconditioned", "microphotographers",
    "deindustrializing", "counterdeployment", "psychophysiological", "neuroendocrinologist",
    "immunomodulating", "ultrarevolutionary", "photosensitivities", "indeterminatenesses",
    "counterexplanation", "antiepileptically", "counterinfluences", "photosynthetically",
    "microcircuitry", "interconnectivity", "counterinhibition"
]

# this will store all the active game sessions
active_sessions = {}

@app.route('/')
def index():
    # this shows the loading screen page
    return render_template('index.html')

@app.route('/menu')
def menu():
    # this shows the main menu page
    return render_template('menu.html')

@app.route('/play', methods=['GET'])
def play():
    # this shows the game page
    return render_template('game.html')

@app.route('/about')
def about():
    # this shows the about page
    return render_template('about.html')

@app.route('/highscores')
def highscores():
    # this shows the high scores page
    scores = HighScore.query.order_by(HighScore.score.desc(), HighScore.created_at.desc()).limit(10).all()
    return render_template('highscores.html', scores=scores)

@app.route('/api/start_game', methods=['POST'])
def api_start_game():
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    game_mode = data.get('game_mode', 'Classic').strip() or 'Classic'

    if not name:
        name = flask_session.get('player_name', '').strip()

    if not name:
        return jsonify({'error': 'Name required'}), 400

    flask_session['player_name'] = name

    session_id = str(uuid.uuid4())
    active_sessions[session_id] = {
        'name': name,
        'game_mode': game_mode,
        'score': 0,
        'total_attempts': 0,
        'total_speed': 0,
        'start_time': datetime.utcnow(),
        'current_word': None,
        'word_start_time': None
    }

    word = random.choice(WORD_LIST)
    active_sessions[session_id]['current_word'] = word
    active_sessions[session_id]['word_start_time'] = datetime.utcnow()
    return jsonify({
        'session_id': session_id,
        'word': word,
        'score': 0,
        'time_left': 120
    })


def _safe_float(value, field_name):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f'Invalid value for {field_name}')


def _safe_int(value, field_name):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValueError(f'Invalid value for {field_name}')

@app.route('/api/submit_word', methods=['POST'])
def api_submit_word():
    data = request.get_json(silent=True) or {}
    session_id = data.get('session_id')
    user_input = data.get('input', '')

    if not session_id or session_id not in active_sessions:
        return jsonify({'error': 'Invalid session'}), 400

    session = active_sessions[session_id]
    current_word = session.get('current_word')
    word_start_time = session.get('word_start_time')
    if not current_word or not word_start_time:
        return jsonify({'error': 'No active word'}), 400

    time_taken = (datetime.utcnow() - word_start_time).total_seconds() * 1000
    elapsed_time = (datetime.utcnow() - session['start_time']).total_seconds()
    time_left = max(0, 120 - int(elapsed_time))

    if elapsed_time >= 120:
        avg_speed = session['total_speed'] / session['total_attempts'] if session['total_attempts'] > 0 else 0
        result = {
            'action': 'game_over',
            'reason': 'time_up',
            'score': session['score'],
            'total_attempts': session['total_attempts'],
            'avg_speed': avg_speed
        }
        save_high_score(session)
        active_sessions.pop(session_id, None)
        return jsonify(result)

    if user_input == current_word:
        session['total_attempts'] += 1
        session['total_speed'] += time_taken
        score = calculate_greedy_score(current_word, time_taken)
        session['score'] += score

        word = random.choice(WORD_LIST)
        session['current_word'] = word
        session['word_start_time'] = datetime.utcnow()
        return jsonify({
            'action': 'new_word',
            'word': word,
            'score': session['score'],
            'time_left': time_left
        })

    avg_speed = session['total_speed'] / session['total_attempts'] if session['total_attempts'] > 0 else 0
    result = {
        'action': 'game_over',
        'reason': 'wrong_word',
        'score': session['score'],
        'total_attempts': session['total_attempts'],
        'avg_speed': avg_speed
    }
    save_high_score(session)
    active_sessions.pop(session_id, None)
    return jsonify(result)


@app.route('/api/save_telemetry', methods=['POST'])
def api_save_telemetry():
    data = request.get_json(silent=True) or {}

    required_fields = [
        'player_name',
        'game_mode',
        'score',
        'avg_dwell_time',
        'avg_flight_time',
        'flight_time_variance',
        'error_correction_rate',
        'typing_speed_wpm',
        'pause_frequency',
        'session_length',
        'total_keystrokes'
    ]

    missing = [field for field in required_fields if field not in data]
    if missing:
        return jsonify({'error': f"Missing fields: {', '.join(missing)}"}), 400

    player_name = str(data.get('player_name', '')).strip()
    game_mode = str(data.get('game_mode', '')).strip()

    if not player_name or not game_mode:
        return jsonify({'error': 'player_name and game_mode are required'}), 400

    try:
        score = _safe_int(data.get('score'), 'score')
        avg_dwell_time = _safe_float(data.get('avg_dwell_time'), 'avg_dwell_time')
        avg_flight_time = _safe_float(data.get('avg_flight_time'), 'avg_flight_time')
        flight_time_variance = _safe_float(data.get('flight_time_variance'), 'flight_time_variance')
        error_correction_rate = _safe_float(data.get('error_correction_rate'), 'error_correction_rate')
        typing_speed_wpm = _safe_float(data.get('typing_speed_wpm'), 'typing_speed_wpm')
        pause_frequency = _safe_int(data.get('pause_frequency'), 'pause_frequency')
        session_length = _safe_float(data.get('session_length'), 'session_length')
        total_keystrokes = _safe_int(data.get('total_keystrokes'), 'total_keystrokes')
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    telemetry_row = TelemetryData(
        player_name=player_name,
        game_mode=game_mode,
        score=score,
        avg_dwell_time=avg_dwell_time,
        avg_flight_time=avg_flight_time,
        flight_time_variance=flight_time_variance,
        error_correction_rate=error_correction_rate,
        typing_speed_wpm=typing_speed_wpm,
        pause_frequency=pause_frequency,
        session_length=session_length,
        total_keystrokes=total_keystrokes
    )

    # Keep HighScore in sync per mode while telemetry is collected for ML training.
    high_score = HighScore(
        name=player_name,
        game_mode=game_mode,
        score=score,
        avg_speed=typing_speed_wpm,
        words_typed=max(0, int(round(total_keystrokes / 5.0)))
    )

    db.session.add(telemetry_row)
    db.session.add(high_score)
    db.session.commit()

    return jsonify({'message': 'Telemetry saved', 'id': telemetry_row.id}), 201


@app.route('/admin/export_data', methods=['GET'])
def admin_export_data():
    # Basic health check that the query executes before starting a streamed response.
    try:
        TelemetryData.query.limit(1).all()
    except Exception as exc:
        return jsonify({'error': f'Unable to export telemetry data: {exc}'}), 500

    def generate_csv():
        buffer = io.StringIO()
        writer = csv.writer(buffer)

        writer.writerow([
            'id',
            'player_name',
            'game_mode',
            'score',
            'avg_dwell_time',
            'avg_flight_time',
            'flight_time_variance',
            'error_correction_rate',
            'typing_speed_wpm',
            'pause_frequency',
            'session_length',
            'total_keystrokes',
            'created_at'
        ])
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)

        for row in TelemetryData.query.order_by(TelemetryData.id.asc()).yield_per(200):
            writer.writerow([
                row.id,
                row.player_name,
                row.game_mode,
                row.score,
                row.avg_dwell_time,
                row.avg_flight_time,
                row.flight_time_variance,
                row.error_correction_rate,
                row.typing_speed_wpm,
                row.pause_frequency,
                row.session_length,
                row.total_keystrokes,
                row.created_at.isoformat() if row.created_at else ''
            ])
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)

    return Response(
        stream_with_context(generate_csv()),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=telemetry_data.csv'}
    )

def calculate_greedy_score(word, time_taken):
    # this function calculates the score based on word length and speed
    if time_taken <= 0:
        time_taken = 0.1
        
    word_complexity = len(word)
    speed_factor = 1000.0 / time_taken
    score = int(word_complexity * speed_factor * (word_complexity + 1) ** 0.5)
    return max(1, score)

def save_high_score(session):
    # this saves the player's score to the database
    if session['total_attempts'] == 0:
        return
        
    avg_speed = session['total_speed'] / session['total_attempts']
    high_score = HighScore(
        name=session['name'],
        game_mode=session.get('game_mode', 'Classic'),
        score=session['score'],
        avg_speed=avg_speed,
        words_typed=session['total_attempts']
    )
    db.session.add(high_score)
    db.session.commit()

if __name__ == '__main__':
    # this makes sure the database is created before running the app
    with app.app_context():
        db.create_all()
    app.run(debug=True)