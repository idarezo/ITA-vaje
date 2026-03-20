import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv
import threading

from database import init_db, get_db, Resident
from schemas import ResidentCreate, ResidentUpdate, Resident as ResidentSchema, ResidentList, ApiResponse
from grpc_server import serve as grpc_serve

load_dotenv()

API_PORT = int(os.getenv("API_PORT", "3003"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Start gRPC server in background thread
def start_grpc_server():
    grpc_thread = threading.Thread(target=grpc_serve, daemon=True)
    grpc_thread.start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database and start gRPC server
    init_db()
    start_grpc_server()
    print("Residents Service started successfully")
    yield
    # Shutdown
    print("Residents Service shutting down")


app = FastAPI(
    title="Residents Service",
    description="API za upravljanje rezidentov - CRUD operacije",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if ENVIRONMENT == "development" else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "residents-service",
        "version": "1.0.0",
    }


# Create resident
@app.post(
    "/residents",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Residents"],
    summary="Dodaj novega rezidenta",
    description="Ustvari novega rezidenta v bazi podatkov",
)
async def create_resident(
    resident_data: ResidentCreate, db: Session = Depends(get_db)
):
    """Create a new resident"""
    try:
        resident = Resident(
            first_name=resident_data.first_name,
            last_name=resident_data.last_name,
            email=resident_data.email,
            phone=resident_data.phone,
            property_id=resident_data.property_id,
            move_in_date=resident_data.move_in_date,
        )
        db.add(resident)
        db.commit()
        db.refresh(resident)

        return ApiResponse(
            success=True,
            message="Rezident uspešno ustvarjen",
            data=resident.to_dict(),
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resident s to e-pošto že obstaja",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Napaka pri ustvarjanju rezidenta: {str(e)}",
        )


# Get resident by ID
@app.get(
    "/residents/{resident_id}",
    response_model=ApiResponse,
    tags=["Residents"],
    summary="Pridobi rezidenta po ID-ju",
    description="Pridobi podrobnosti rezidenta glede na ID",
)
async def get_resident(resident_id: int, db: Session = Depends(get_db)):
    """Get resident by ID"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rezident ni bil najden",
        )
    return ApiResponse(
        success=True,
        message="Rezident uspešno pridobljen",
        data=resident.to_dict(),
    )


# List all residents
@app.get(
    "/residents",
    response_model=ResidentList,
    tags=["Residents"],
    summary="Pridobi seznam rezidentov",
    description="Pridobi seznam vseh rezidentov s paginacijo",
)
async def list_residents(
    limit: int = 10, offset: int = 0, db: Session = Depends(get_db)
):
    """List all residents with pagination"""
    residents = db.query(Resident).limit(limit).offset(offset).all()
    total = db.query(Resident).count()

    return ResidentList(
        residents=[ResidentSchema.from_orm(r) for r in residents],
        total=total,
    )


# Update resident
@app.put(
    "/residents/{resident_id}",
    response_model=ApiResponse,
    tags=["Residents"],
    summary="Posodobi rezidenta",
    description="Posodobi podatke obstoječega rezidenta",
)
async def update_resident(
    resident_id: int,
    resident_data: ResidentUpdate,
    db: Session = Depends(get_db),
):
    """Update resident by ID"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rezident ni bil najden",
        )

    try:
        # Update only provided fields
        update_data = resident_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(resident, field, value)

        db.commit()
        db.refresh(resident)

        return ApiResponse(
            success=True,
            message="Rezident uspešno posodobljen",
            data=resident.to_dict(),
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Resident s to e-pošto že obstaja",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Napaka pri posodobitvi rezidenta: {str(e)}",
        )


# Delete resident
@app.delete(
    "/residents/{resident_id}",
    response_model=ApiResponse,
    tags=["Residents"],
    summary="Izbriši rezidenta",
    description="Izbriši rezidenta iz baze podatkov",
)
async def delete_resident(resident_id: int, db: Session = Depends(get_db)):
    """Delete resident by ID"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rezident ni bil najden",
        )

    try:
        db.delete(resident)
        db.commit()

        return ApiResponse(
            success=True,
            message="Rezident uspešno izbrisan",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Napaka pri brisanju rezidenta: {str(e)}",
        )


# Get residents by property
@app.get(
    "/properties/{property_id}/residents",
    response_model=ResidentList,
    tags=["Residents"],
    summary="Pridobi rezidente za nepremičnino",
    description="Pridobi seznam vseh rezidentov za specifično nepremičnino",
)
async def get_residents_by_property(
    property_id: int, limit: int = 10, offset: int = 0, db: Session = Depends(get_db)
):
    """Get residents by property ID"""
    residents = (
        db.query(Resident)
        .filter(Resident.property_id == property_id)
        .limit(limit)
        .offset(offset)
        .all()
    )
    total = (
        db.query(Resident)
        .filter(Resident.property_id == property_id)
        .count()
    )

    return ResidentList(
        residents=[ResidentSchema.from_orm(r) for r in residents],
        total=total,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=API_PORT,
        reload=ENVIRONMENT == "development",
    )
