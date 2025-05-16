from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class HighScore(db.Model):
    # this is the model for the high scores table
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    avg_speed = db.Column(db.Float, nullable=False)
    words_typed = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        # this is just for printing the high score object
        return f'<HighScore {self.name}: {self.score}>'

    def to_dict(self):
        # this turns the high score into a dictionary
        return {
            'name': self.name,
            'score': self.score,
            'avg_speed': self.avg_speed,
            'words_typed': self.words_typed
        }