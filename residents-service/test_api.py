import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app, get_db
from database import Base, Resident

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


def setup_function():
    """Clear database before each test"""
    with TestingSessionLocal() as db:
        db.query(Resident).delete()
        db.commit()


def get_unique_email():
    """Generate unique email for tests"""
    return f"resident_{uuid.uuid4().hex[:8]}@example.com"


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_resident():
    """Test creating a resident"""
    response = client.post(
        "/residents",
        json={
            "first_name": "Janez",
            "last_name": "Novak",
            "email": get_unique_email(),
            "phone": "+386 1 234 5678",
            "property_id": 1,
            "move_in_date": "2024-01-15",
        },
    )
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["data"]["first_name"] == "Janez"


def test_get_resident():
    """Test getting a resident"""
    # Create a resident first
    create_response = client.post(
        "/residents",
        json={
            "first_name": "Marija",
            "last_name": "Horvat",
            "email": get_unique_email(),
            "phone": "+386 1 987 6543",
            "property_id": 1,
            "move_in_date": "2024-02-01",
        },
    )
    assert create_response.status_code == 201, f"Create failed: {create_response.json()}"
    resident_id = create_response.json()["data"]["id"]

    # Get the resident
    response = client.get(f"/residents/{resident_id}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["first_name"] == "Marija"


def test_list_residents():
    """Test listing residents"""
    response = client.get("/residents?limit=10&offset=0")
    assert response.status_code == 200
    assert "residents" in response.json()
    assert "total" in response.json()


def test_update_resident():
    """Test updating a resident"""
    # Create a resident first
    create_response = client.post(
        "/residents",
        json={
            "first_name": "Petrov",
            "last_name": "Petrović",
            "email": get_unique_email(),
            "phone": "+386 1 111 1111",
            "property_id": 2,
            "move_in_date": "2024-03-01",
        },
    )
    assert create_response.status_code == 201, f"Create failed: {create_response.json()}"
    resident_id = create_response.json()["data"]["id"]

    # Update the resident
    response = client.put(
        f"/residents/{resident_id}",
        json={
            "phone": "+386 1 222 2222",
        },
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["phone"] == "+386 1 222 2222"


def test_delete_resident():
    """Test deleting a resident"""
    # Create a resident first
    create_response = client.post(
        "/residents",
        json={
            "first_name": "Ana",
            "last_name": "Anurag",
            "email": get_unique_email(),
            "phone": "+386 1 555 5555",
            "property_id": 1,
            "move_in_date": "2024-04-01",
        },
    )
    assert create_response.status_code == 201, f"Create failed: {create_response.json()}"
    resident_id = create_response.json()["data"]["id"]

    # Delete the resident
    response = client.delete(f"/residents/{resident_id}")
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Verify it's deleted
    response = client.get(f"/residents/{resident_id}")
    assert response.status_code == 404
