"""
Seed script for residents-service.
Run inside the container:
  docker exec -it residents-service python seed.py

Or locally (with correct .env):
  python seed.py
"""
import os
from dotenv import load_dotenv
from database import init_db, SessionLocal, Resident

load_dotenv()

RESIDENTS = [
    {
        "first_name": "Ana",
        "last_name": "Kovač",
        "email": "ana.kovac@example.com",
        "phone": "+386 41 111 222",
        "property_id": 1,
        "move_in_date": "2024-01-15",
    },
    {
        "first_name": "Bine",
        "last_name": "Novak",
        "email": "bine.novak@example.com",
        "phone": "+386 41 333 444",
        "property_id": 2,
        "move_in_date": "2024-03-01",
    },
    {
        "first_name": "Cvetka",
        "last_name": "Horvat",
        "email": "cvetka.horvat@example.com",
        "phone": None,
        "property_id": 3,
        "move_in_date": "2023-09-01",
    },
]


def seed():
    init_db()
    db = SessionLocal()
    try:
        existing = db.query(Resident).count()
        if existing > 0:
            print(f"Database already has {existing} residents – skipping seed.")
            return

        for data in RESIDENTS:
            db.add(Resident(**data))
        db.commit()
        print(f"Seeded {len(RESIDENTS)} residents successfully.")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
