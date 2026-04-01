import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY: str = os.environ["ANTHROPIC_API_KEY"]

# Change ADMIN_PASSWORD in .env to set a custom admin password.
ADMIN_PASSWORD: str = os.environ.get("ADMIN_PASSWORD", "safegate123")

CLASSIFIER_MODEL = "claude-opus-4-6"
RESPONDER_MODEL = "claude-sonnet-4-6"

BLOCK_THRESHOLD = 0.8
REWRITE_THRESHOLD = 0.5

DB_PATH = "safegate.db"
