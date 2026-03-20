"""
gRPC Client example for residents service
This shows how to call the residents service from another microservice
"""

import grpc
from typing import Optional, List


class ResidentsGRPCClient:
    """Client for residents gRPC service"""

    def __init__(self, host: str = "localhost", port: int = 50051):
        """Initialize gRPC client"""
        # Note: Import these after generate_proto.py has been run
        try:
            import residents_pb2
            import residents_pb2_grpc
            self.residents_pb2 = residents_pb2
            self.residents_pb2_grpc = residents_pb2_grpc
        except ImportError:
            raise ImportError(
                "gRPC proto files not found. Run 'python generate_proto.py' first"
            )

        self.channel = grpc.aio.secure_channel(
            f"{host}:{port}",
            grpc.ssl_channel_credentials()
        ) if host != "localhost" else grpc.aio.insecure_channel(f"{host}:{port}")
        self.stub = self.residents_pb2_grpc.ResidentsServiceStub(self.channel)

    async def create_resident(
        self,
        first_name: str,
        last_name: str,
        email: str,
        phone: str,
        property_id: int,
        move_in_date: Optional[str] = None,
    ):
        """Create a new resident"""
        request = self.residents_pb2.CreateResidentRequest(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            property_id=property_id,
            move_in_date=move_in_date or "",
        )
        return await self.stub.CreateResident(request)

    async def get_resident(self, resident_id: int):
        """Get resident by ID"""
        request = self.residents_pb2.GetResidentRequest(id=resident_id)
        return await self.stub.GetResident(request)

    async def list_residents(self, limit: int = 10, offset: int = 0):
        """List residents with pagination"""
        request = self.residents_pb2.ListResidentsRequest(limit=limit, offset=offset)
        return await self.stub.ListResidents(request)

    async def update_resident(
        self,
        resident_id: int,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        property_id: Optional[int] = None,
        move_in_date: Optional[str] = None,
    ):
        """Update resident"""
        request = self.residents_pb2.UpdateResidentRequest(
            id=resident_id,
            first_name=first_name or "",
            last_name=last_name or "",
            email=email or "",
            phone=phone or "",
            property_id=property_id or 0,
            move_in_date=move_in_date or "",
        )
        return await self.stub.UpdateResident(request)

    async def delete_resident(self, resident_id: int):
        """Delete resident"""
        request = self.residents_pb2.DeleteResidentRequest(id=resident_id)
        return await self.stub.DeleteResident(request)

    async def get_residents_by_property(
        self, property_id: int, limit: int = 10, offset: int = 0
    ):
        """Get residents by property ID"""
        request = self.residents_pb2.GetResidentsByPropertyRequest(
            property_id=property_id, limit=limit, offset=offset
        )
        return await self.stub.GetResidentsByProperty(request)

    async def close(self):
        """Close gRPC channel"""
        await self.channel.close()


# Example usage
async def main():
    """Example of using the gRPC client"""
    client = ResidentsGRPCClient(host="localhost", port=50051)

    try:
        # Create resident
        print("Creating resident...")
        create_response = await client.create_resident(
            first_name="Janez",
            last_name="Novak",
            email="janez@example.com",
            phone="+386 1 234 5678",
            property_id=1,
            move_in_date="2024-01-15",
        )
        print(f"Response: {create_response}")
        resident_id = create_response.data.id if create_response.success else None

        # List residents
        print("\nListing residents...")
        list_response = await client.list_residents(limit=10, offset=0)
        print(f"Total residents: {list_response.total}")
        for resident in list_response.residents:
            print(f"  - {resident.first_name} {resident.last_name} (ID: {resident.id})")

        # Get specific resident
        if resident_id:
            print(f"\nGetting resident {resident_id}...")
            get_response = await client.get_resident(resident_id)
            print(f"Response: {get_response}")

            # Update resident
            print(f"\nUpdating resident {resident_id}...")
            update_response = await client.update_resident(
                resident_id=resident_id, phone="+386 1 987 6543"
            )
            print(f"Response: {update_response}")

            # Get residents by property
            print(f"\nGetting residents by property...")
            property_response = await client.get_residents_by_property(
                property_id=1, limit=10, offset=0
            )
            print(f"Residents in property 1: {property_response.total}")

            # Delete resident
            print(f"\nDeleting resident {resident_id}...")
            delete_response = await client.delete_resident(resident_id)
            print(f"Response: {delete_response}")

    finally:
        await client.close()


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
