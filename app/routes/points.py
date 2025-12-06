from fastapi import APIRouter
from typing import List
import sqlite3
from pydantic import BaseModel

class PointResponse(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    floor: int
    type: str

router = APIRouter(prefix="/api", tags=["points"])

@router.get("/points", response_model=List[PointResponse])
def get_all_points():
    """Получить все точки напрямую из SQLite"""
    try:
        conn = sqlite3.connect('campus.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, name, latitude, longitude, floor, type FROM points")
        rows = cursor.fetchall()
        
        points = []
        for row in rows:
            points.append(PointResponse(
                id=row['id'],
                name=row['name'],
                latitude=row['latitude'],
                longitude=row['longitude'],
                floor=row['floor'],
                type=row['type']
            ))
        
        conn.close()
        print(f"✅ Возвращаем {len(points)} точек")
        return points
        
    except Exception as e:
        print(f"❌ Ошибка SQLite: {e}")
        return []  # Возвращаем пустой список вместо ошибки