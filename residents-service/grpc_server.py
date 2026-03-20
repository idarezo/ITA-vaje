import grpc
from concurrent import futures
import os
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError

# Import generated gRPC code
import residents_pb2
import residents_pb2_grpc

from database import SessionLocal, Resident
from datetime import datetime

load_dotenv()

GRPC_PORT = os.getenv("GRPC_PORT", "50051")


class ResidentsServicer(residents_pb2_grpc.ResidentsServiceServicer):
    """gRPC service implementation for residents"""

    def CreateResident(self, request, context):
        """Create a new resident"""
        try:
            db = SessionLocal()
            
            resident = Resident(
                first_name=request.first_name,
                last_name=request.last_name,
                email=request.email,
                phone=request.phone,
                property_id=request.property_id,
                move_in_date=request.move_in_date,
            )
            
            db.add(resident)
            db.commit()
            db.refresh(resident)
            
            return residents_pb2.ResidentResponse(
                success=True,
                message="Resident created successfully",
                data=residents_pb2.Resident(
                    id=resident.id,
                    first_name=resident.first_name,
                    last_name=resident.last_name,
                    email=resident.email,
                    phone=resident.phone or "",
                    property_id=resident.property_id,
                    move_in_date=resident.move_in_date or "",
                    created_at=resident.created_at.isoformat(),
                    updated_at=resident.updated_at.isoformat(),
                ),
            )
        except IntegrityError:
            context.set_code(grpc.StatusCode.ALREADY_EXISTS)
            context.set_details("Email already exists")
            return residents_pb2.ResidentResponse(
                success=False,
                message="Email already exists",
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return residents_pb2.ResidentResponse(
                success=False,
                message=f"Error creating resident: {str(e)}",
            )
        finally:
            db.close()

    def GetResident(self, request, context):
        """Get resident by ID"""
        try:
            db = SessionLocal()
            resident = db.query(Resident).filter(Resident.id == request.id).first()
            
            if not resident:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details("Resident not found")
                return residents_pb2.ResidentResponse(
                    success=False,
                    message="Resident not found",
                )
            
            return residents_pb2.ResidentResponse(
                success=True,
                message="Resident retrieved successfully",
                data=residents_pb2.Resident(
                    id=resident.id,
                    first_name=resident.first_name,
                    last_name=resident.last_name,
                    email=resident.email,
                    phone=resident.phone or "",
                    property_id=resident.property_id,
                    move_in_date=resident.move_in_date or "",
                    created_at=resident.created_at.isoformat(),
                    updated_at=resident.updated_at.isoformat(),
                ),
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return residents_pb2.ResidentResponse(
                success=False,
                message=f"Error retrieving resident: {str(e)}",
            )
        finally:
            db.close()

    def ListResidents(self, request, context):
        """List all residents with pagination"""
        try:
            db = SessionLocal()
            limit = request.limit or 10
            offset = request.offset or 0
            
            residents = db.query(Resident).limit(limit).offset(offset).all()
            total = db.query(Resident).count()
            
            residents_list = [
                residents_pb2.Resident(
                    id=r.id,
                    first_name=r.first_name,
                    last_name=r.last_name,
                    email=r.email,
                    phone=r.phone or "",
                    property_id=r.property_id,
                    move_in_date=r.move_in_date or "",
                    created_at=r.created_at.isoformat(),
                    updated_at=r.updated_at.isoformat(),
                )
                for r in residents
            ]
            
            return residents_pb2.ListResidentsResponse(
                success=True,
                message="Residents retrieved successfully",
                residents=residents_list,
                total=total,
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return residents_pb2.ListResidentsResponse(
                success=False,
                message=f"Error listing residents: {str(e)}",
            )
        finally:
            db.close()

    def UpdateResident(self, request, context):
        """Update resident by ID"""
        try:
            db = SessionLocal()
            resident = db.query(Resident).filter(Resident.id == request.id).first()
            
            if not resident:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details("Resident not found")
                return residents_pb2.ResidentResponse(
                    success=False,
                    message="Resident not found",
                )
            
            # Update fields if provided
            if request.first_name:
                resident.first_name = request.first_name
            if request.last_name:
                resident.last_name = request.last_name
            if request.email:
                resident.email = request.email
            if request.phone:
                resident.phone = request.phone
            if request.property_id:
                resident.property_id = request.property_id
            if request.move_in_date:
                resident.move_in_date = request.move_in_date
            
            resident.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(resident)
            
            return residents_pb2.ResidentResponse(
                success=True,
                message="Resident updated successfully",
                data=residents_pb2.Resident(
                    id=resident.id,
                    first_name=resident.first_name,
                    last_name=resident.last_name,
                    email=resident.email,
                    phone=resident.phone or "",
                    property_id=resident.property_id,
                    move_in_date=resident.move_in_date or "",
                    created_at=resident.created_at.isoformat(),
                    updated_at=resident.updated_at.isoformat(),
                ),
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return residents_pb2.ResidentResponse(
                success=False,
                message=f"Error updating resident: {str(e)}",
            )
        finally:
            db.close()

    def DeleteResident(self, request, context):
        """Delete resident by ID"""
        try:
            db = SessionLocal()
            resident = db.query(Resident).filter(Resident.id == request.id).first()
            
            if not resident:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details("Resident not found")
                return residents_pb2.DeleteResidentResponse(
                    success=False,
                    message="Resident not found",
                )
            
            db.delete(resident)
            db.commit()
            
            return residents_pb2.DeleteResidentResponse(
                success=True,
                message="Resident deleted successfully",
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return residents_pb2.DeleteResidentResponse(
                success=False,
                message=f"Error deleting resident: {str(e)}",
            )
        finally:
            db.close()

    def GetResidentsByProperty(self, request, context):
        """Get residents by property ID"""
        try:
            db = SessionLocal()
            limit = request.limit or 10
            offset = request.offset or 0
            
            residents = (
                db.query(Resident)
                .filter(Resident.property_id == request.property_id)
                .limit(limit)
                .offset(offset)
                .all()
            )
            total = db.query(Resident).filter(Resident.property_id == request.property_id).count()
            
            residents_list = [
                residents_pb2.Resident(
                    id=r.id,
                    first_name=r.first_name,
                    last_name=r.last_name,
                    email=r.email,
                    phone=r.phone or "",
                    property_id=r.property_id,
                    move_in_date=r.move_in_date or "",
                    created_at=r.created_at.isoformat(),
                    updated_at=r.updated_at.isoformat(),
                )
                for r in residents
            ]
            
            return residents_pb2.ListResidentsResponse(
                success=True,
                message="Residents retrieved successfully",
                residents=residents_list,
                total=total,
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return residents_pb2.ListResidentsResponse(
                success=False,
                message=f"Error retrieving residents: {str(e)}",
            )
        finally:
            db.close()


def serve():
    """Start gRPC server"""
    print(f"Starting gRPC server on port {GRPC_PORT}...")
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    residents_pb2_grpc.add_ResidentsServiceServicer_to_server(
        ResidentsServicer(), server
    )
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()
    print(f"gRPC server started on port {GRPC_PORT}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
