import os
import random
import time
import json
import uuid
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sock import Sock
from config import Config

from models import db, HighScore  # this imports the database and highscore model

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)  # this connects the database to the app
sock = Sock(app)

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
    # this shows the main menu page
    return render_template('index.html')

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
    scores = HighScore.query.order_by(HighScore.score.desc()).limit(10).all()
    return render_template('highscores.html', scores=scores)

@sock.route('/game-socket')
def game_socket(ws):
    # this function handles the websocket for the game
    data = ws.receive()
    if not data:
        return
    try:
        data = json.loads(data)
    except Exception:
        return
    if 'name' not in data:
        return

    name = data['name']
    session_id = str(uuid.uuid4())  # this makes a unique id for the session
    
    # this sets up the game session for the player
    active_sessions[session_id] = {
        'name': name,
        'score': 0,
        'total_attempts': 0,
        'total_speed': 0,
        'start_time': datetime.utcnow(),
        'current_word': None,
        'word_start_time': None
    }
    
    try:
        # this sends the first word to the player
        send_new_word(ws, session_id)
        
        while True:
            data = ws.receive()
            if not data:
                break
            try:
                data = json.loads(data)
            except Exception:
                continue
            if 'input' in data:
                process_input(ws, session_id, data['input'])
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # this removes the session and saves the score when the game ends
        if session_id in active_sessions:
            session = active_sessions.pop(session_id)
            save_high_score(session)

def send_new_word(ws, session_id):
    # this picks a random word and sends it to the player
    if session_id not in active_sessions:
        return
        
    session = active_sessions[session_id]
    word = random.choice(WORD_LIST)
    session['current_word'] = word
    session['word_start_time'] = datetime.utcnow()
    
    ws.send(json.dumps({
        'action': 'new_word',
        'word': word,
        'score': session['score'],
        'time_left': 120 - (datetime.utcnow() - session['start_time']).total_seconds()
    }))

def process_input(ws, session_id, user_input):
    # this checks if the player's input is correct or not
    if session_id not in active_sessions:
        return
        
    session = active_sessions[session_id]
    current_word = session['current_word']
    word_start_time = session['word_start_time']
    
    if not current_word or not word_start_time:
        return
        
    # this calculates how fast the player typed the word
    time_taken = (datetime.utcnow() - word_start_time).total_seconds() * 1000  # in ms
    
    if user_input == current_word:
        # if the word is correct, update stats and score
        session['total_attempts'] += 1
        session['total_speed'] += time_taken
        
        # this calculates the score for the word
        score = calculate_greedy_score(current_word, time_taken)
        session['score'] += score
        
        # this checks if the time is up
        elapsed_time = (datetime.utcnow() - session['start_time']).total_seconds()
        if elapsed_time >= 120:
            # if time is up, end the game
            ws.send(json.dumps({
                'action': 'game_over',
                'reason': 'time_up',
                'score': session['score'],
                'total_attempts': session['total_attempts'],
                'avg_speed': session['total_speed'] / session['total_attempts'] if session['total_attempts'] > 0 else 0
            }))
            return
        
        # if not, send a new word
        send_new_word(ws, session_id)
    else:
        # if the word is wrong, end the game
        avg_speed = session['total_speed'] / session['total_attempts'] if session['total_attempts'] > 0 else 0
        ws.send(json.dumps({
            'action': 'game_over',
            'reason': 'wrong_word',
            'score': session['score'],
            'total_attempts': session['total_attempts'],
            'avg_speed': avg_speed
        }))

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