from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class HighScore(db.Model):
    # this is the model for the high scores table
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    game_mode = db.Column(db.String(20), nullable=False, default='Classic')
    score = db.Column(db.Integer, nullable=False)
    avg_speed = db.Column(db.Float, nullable=False)
    words_typed = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        # this is just for printing the high score object
        return f'<HighScore {self.name} [{self.game_mode}]: {self.score}>'

    def to_dict(self):
        # this turns the high score into a dictionary
        return {
            'name': self.name,
            'game_mode': self.game_mode,
            'score': self.score,
            'avg_speed': self.avg_speed,
            'words_typed': self.words_typed
        }


class TelemetryData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_name = db.Column(db.String(50))
    game_mode = db.Column(db.String(20))
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