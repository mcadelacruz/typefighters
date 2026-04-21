import os


def _normalize_database_url(database_url):
    if database_url and database_url.startswith('postgres://'):
        # Render may provide postgres://, but SQLAlchemy expects postgresql://
        return database_url.replace('postgres://', 'postgresql://', 1)
    return database_url

class Config:
    # this is the config for the flask app and database
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-123'
    _sqlite_fallback = 'sqlite:///' + os.path.join(
        os.path.abspath(os.path.dirname(__file__)),
        'instance',
        'app.db'
    )
    SQLALCHEMY_DATABASE_URI = _normalize_database_url(os.environ.get('DATABASE_URL')) or _sqlite_fallback
    SQLALCHEMY_TRACK_MODIFICATIONS = False
