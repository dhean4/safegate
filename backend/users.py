import os

from dotenv import load_dotenv

from auth import hash_password

load_dotenv()

# NOTE: In production this should be a database lookup, not a hardcoded dict.
_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "safegate123")

_USERS: dict[str, dict] = {
    "admin": {
        "username": "admin",
        "hashed_password": hash_password(_ADMIN_PASSWORD),
    }
}


def get_user(username: str) -> dict | None:
    return _USERS.get(username)
