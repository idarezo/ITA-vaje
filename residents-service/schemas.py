from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


class ResidentBase(BaseModel):
    user_id: Optional[int] = None
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    property_id: int = Field(..., gt=0)
    move_in_date: Optional[str] = None


class ResidentCreate(ResidentBase):
    pass


class ResidentUpdate(BaseModel):
    user_id: Optional[int] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    property_id: Optional[int] = Field(None, gt=0)
    move_in_date: Optional[str] = None
    is_active: Optional[bool] = None


class Resident(ResidentBase):
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResidentList(BaseModel):
    residents: List[Resident]
    total: int


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
