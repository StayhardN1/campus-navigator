from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func  # Добавляем импорт func
from typing import List
import math
import csv
import os
from contextlib import asynccontextmanager

# Прямые импорты вместо app.models
from models import Point, GraphEdge, Base
from database import engine, SessionLocal
from schemas import PointResponse, QRScanResponse, RouteRequest, RouteResponse
from fastapi.middleware.cors import CORSMiddleware

def get_project_root():
    """Получаем корневую папку проекта"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)  # Поднимаемся на уровень выше из app/
    return project_root

def load_real_points():
    """Загружаем реальные точки из ml_data/nodes.csv"""
    points = []
    
    try:
        project_root = get_project_root()
        nodes_path = os.path.join(project_root, "ml_data", "nodes.csv")
        
        print(f"📁 Загружаем данные из: {nodes_path}")
        
        with open(nodes_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Преобразуем данные в наш формат
                point = {
                    'id': row['id'].strip(),
                    'name': row['name'].strip(),
                    'floor': int(row['floor']),
                    'latitude': float(row['y']),  # Обратите внимание: y = latitude
                    'longitude': float(row['x']), # x = longitude  
                    'type': row['type'].strip(),
                    'qr_code': f"qr_{row['id']}" if 'qr' in row['id'].lower() else row['id'],
                    'description': f"{row['name']} ({row['type']})"
                }
                points.append(point)
        
        print(f"✅ Загружено {len(points)} точек из nodes.csv")
        return points
        
    except Exception as e:
        print(f"❌ Ошибка загрузки данных: {e}")
        import traceback
        traceback.print_exc()
        return None

def load_graph_edges():
    """Загружаем рёбра графа из ml_data/edges.csv"""
    edges = []
    
    try:
        project_root = get_project_root()
        edges_path = os.path.join(project_root, "ml_data", "edges.csv")
        
        if not os.path.exists(edges_path):
            print(f"⚠️ Файл {edges_path} не найден, рёбра не будут загружены")
            return []
            
        print(f"📁 Загружаем рёбра из: {edges_path}")
        
        with open(edges_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                edge = {
                    'from_point_id': row['from'].strip(),
                    'to_point_id': row['to'].strip(),
                    'weight': 1.0,  # Базовая стоимость
                    'accessible': True
                }
                edges.append(edge)
        
        print(f"✅ Загружено {len(edges)} рёбер из edges.csv")
        return edges
        
    except Exception as e:
        print(f"❌ Ошибка загрузки рёбер: {e}")
        return []

def add_real_data():
    """Добавляем реальные данные в базу"""
    db = SessionLocal()
    try:
        # Очищаем старые данные
        db.query(GraphEdge).delete()
        db.query(Point).delete()
        
        # Загружаем реальные точки
        real_points = load_real_points()
        
        if real_points and len(real_points) > 0:
            # Добавляем точки
            for point_data in real_points:
                point = Point(**point_data)
                db.add(point)
            
            # Добавляем рёбра
            graph_edges = load_graph_edges()
            for edge_data in graph_edges:
                edge = GraphEdge(**edge_data)
                db.add(edge)
            
            db.commit()
            print(f"✅ Добавлено {len(real_points)} точек и {len(graph_edges)} рёбер в базу")
            
            # Показываем статистику - исправленная версия
            points_by_floor = db.query(Point.floor, func.count(Point.id)).group_by(Point.floor).all()
            points_by_type = db.query(Point.type, func.count(Point.id)).group_by(Point.type).all()
            
            print("📊 Статистика по этажам:")
            for floor, count in points_by_floor:
                print(f"  - Этаж {floor}: {count} точек")
                
            print("📊 Статистика по типам:")
            for type_, count in points_by_type:
                print(f"  - {type_}: {count} точек")
                
        else:
            # Резервные тестовые данные
            print("⚠️ Используем тестовые данные")
            add_test_data(db)
            
    except Exception as e:
        print(f"❌ Ошибка при добавлении данных: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

def add_test_data(db):
    """Резервные тестовые данные"""
    test_points = [
        {
            "id": "F1_entrance",
            "name": "Главный вход",
            "description": "Основной вход в здание",
            "latitude": 560.26,
            "longitude": 1375.0,
            "qr_code": "entrance_f1",
            "floor": 1,
            "type": "entrance"
        },
        {
            "id": "F1_classroom101", 
            "name": "Аудитория 101",
            "description": "Лекционная аудитория",
            "latitude": 115.0,
            "longitude": 100.0,
            "qr_code": "classroom_101",
            "floor": 1,
            "type": "classroom"
        }
    ]
    
    for point_data in test_points:
        point = Point(**point_data)
        db.add(point)
    
    db.commit()

def calculate_distance_route(start_point, end_point):
    """Рассчитываем расстояние между двумя точками"""
    return math.sqrt(
        (end_point.longitude - start_point.longitude)**2 + 
        (end_point.latitude - start_point.latitude)**2
    ) * 0.1  # Конвертируем в метры

def generate_instructions(start_point, end_point, route_points=None):
    """Генерируем инструкции для маршрута"""
    instructions = [f"Начните от {start_point.name}"]
    
    # Информация о смене этажа
    if start_point.floor != end_point.floor:
        instructions.append(f"Поднимитесь на {end_point.floor} этаж")
    
    # Основное движение
    lat_diff = end_point.latitude - start_point.latitude
    lon_diff = end_point.longitude - start_point.longitude
    
    if abs(lat_diff) > abs(lon_diff):
        direction = "север" if lat_diff > 0 else "юг"
    else:
        direction = "восток" if lon_diff > 0 else "запад"
    
    instructions.append(f"Двигайтесь на {direction} по коридору")
    instructions.append(f"Вы прибыли в {end_point.name}")
    
    return instructions

def find_route_a_star(db, start_id, end_id):
    """Упрощенный алгоритм A* для поиска маршрута"""
    # Пока используем прямые маршруты, можно улучшить используя рёбра из edges.csv
    start_point = db.query(Point).filter(Point.id == start_id).first()
    end_point = db.query(Point).filter(Point.id == end_id).first()
    
    if not start_point or not end_point:
        return None
    
    return [start_point, end_point]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Запуск Campus Navigator API...")
    Base.metadata.create_all(bind=engine)
    add_real_data()
    yield
    # Shutdown
    print("🛑 Остановка Campus Navigator API...")

app = FastAPI(
    title="Campus Navigator API",
    description="API для навигации по кампусу с QR-кодами",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== ENDPOINTS ====================

@app.get("/")
async def read_root():
    return {"message": "Campus Navigator API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "campus-navigator"}

@app.get("/api/points/", response_model=List[PointResponse])
def get_all_points(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    points = db.query(Point).offset(skip).limit(limit).all()
    return points

@app.get("/api/points/{point_id}", response_model=PointResponse)
def get_point_by_id(point_id: str, db: Session = Depends(get_db)):
    point = db.query(Point).filter(Point.id == point_id).first()
    if point is None:
        raise HTTPException(status_code=404, detail="Point not found")
    return point

@app.get("/api/points/qr/{qr_code}", response_model=QRScanResponse)
def scan_qr_code(qr_code: str, db: Session = Depends(get_db)):
    # Ищем по qr_code или по id (если qr_code = id точки)
    point = db.query(Point).filter(
        (Point.qr_code == qr_code) | (Point.id == qr_code)
    ).first()
    
    if point is None:
        raise HTTPException(status_code=404, detail="QR code not found")
    
    return QRScanResponse(
        point=point,
        message=f"Location identified: {point.name}",
        success=True
    )

@app.post("/api/routes/calculate", response_model=RouteResponse)
def calculate_route(route_request: RouteRequest, db: Session = Depends(get_db)):
    try:
        start_point = db.query(Point).filter(Point.id == route_request.start_point_id).first()
        end_point = db.query(Point).filter(Point.id == route_request.end_point_id).first()
        
        if not start_point:
            raise HTTPException(status_code=404, detail="Start point not found")
        if not end_point:
            raise HTTPException(status_code=404, detail="End point not found")
        
        # Находим маршрут
        route_points = find_route_a_star(db, start_point.id, end_point.id)
        
        if not route_points:
            raise HTTPException(status_code=404, detail="Route not found")
        
        # Рассчитываем расстояние
        total_distance = calculate_distance_route(start_point, end_point)
        
        # Генерируем инструкции
        instructions = generate_instructions(start_point, end_point, route_points)
        
        # Расчет времени (1.4 м/с - средняя скорость пешехода)
        estimated_time = total_distance / 1.4
        
        return RouteResponse(
            route=route_points,
            instructions=instructions,
            total_distance=round(total_distance, 2),
            estimated_time=round(estimated_time, 2),
            total_points=len(route_points),
            start_point=start_point,
            end_point=end_point
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route calculation error: {str(e)}")

@app.get("/api/points/floor/{floor}")
def get_points_by_floor(floor: int, db: Session = Depends(get_db)):
    points = db.query(Point).filter(Point.floor == floor).all()
    return points

@app.get("/api/points/search/{name}")
def search_points_by_name(name: str, db: Session = Depends(get_db)):
    points = db.query(Point).filter(Point.name.ilike(f"%{name}%")).all()
    return points

@app.get("/debug/points-count")
def get_points_count(db: Session = Depends(get_db)):
    """Отладочный endpoint для проверки количества точек"""
    count = db.query(Point).count()
    points_by_floor = db.query(Point.floor, func.count(Point.id)).group_by(Point.floor).all()
    points_by_type = db.query(Point.type, func.count(Point.id)).group_by(Point.type).all()
    
    return {
        "total_points": count,
        "points_by_floor": {floor: count for floor, count in points_by_floor},
        "points_by_type": {type_: count for type_, count in points_by_type},
        "all_points": [{"id": p.id, "name": p.name, "floor": p.floor, "type": p.type} for p in db.query(Point).all()]
    }

@app.get("/debug/graph-edges")
def get_graph_edges(db: Session = Depends(get_db)):
    """Отладочный endpoint для проверки рёбер графа"""
    edges = db.query(GraphEdge).all()
    return {
        "total_edges": len(edges),
        "edges": [{"from": e.from_point_id, "to": e.to_point_id, "weight": e.weight} for e in edges]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)