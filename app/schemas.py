from pydantic import BaseModel
from typing import List, Optional

class PointBase(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    qr_code: str
    floor: int
    type: str

class PointResponse(PointBase):
    class Config:
        from_attributes = True

class QRScanResponse(BaseModel):
    point: PointResponse
    message: str
    success: bool

class RouteRequest(BaseModel):
    start_point_id: str
    end_point_id: str

class RouteResponse(BaseModel):
    route: List[PointResponse]
    instructions: List[str]
    total_distance: float
    estimated_time: float
    total_points: int
    start_point: PointResponse
    end_point: PointResponse