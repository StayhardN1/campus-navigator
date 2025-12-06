from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import math
import heapq
from typing import Dict, List

from ..database import get_db
from ..models import Point, GraphEdge
from ..schemas import RouteRequest, RouteResponse, Coordinate

router = APIRouter(prefix="/api/routes", tags=["routes"])

def calculate_distance(coord1, coord2):
    """Вычисление расстояния между двумя точками в пикселях"""
    x1, y1 = coord1
    x2, y2 = coord2
    distance_pixels = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
    # Преобразование: 1 пиксель = 0.1 метра
    distance_meters = distance_pixels * 0.1
    return distance_meters

def get_graph_from_db(db: Session):
    """Загружает граф из базы данных"""
    graph = {}
    points = {}
    
    # Загружаем все точки
    db_points = db.query(Point).all()
    for point in db_points:
        points[point.id] = point
        graph[point.id] = []
    
    # Загружаем все рёбра
    edges = db.query(GraphEdge).all()
    for edge in edges:
        if edge.from_point_id in graph and edge.to_point_id in graph:
            # Рассчитываем реальное расстояние для веса
            from_point = points[edge.from_point_id]
            to_point = points[edge.to_point_id]
            distance = calculate_distance(
                (from_point.latitude, from_point.longitude),
                (to_point.latitude, to_point.longitude)
            )
            graph[edge.from_point_id].append((edge.to_point_id, distance))
            # Для неориентированного графа добавляем обратное ребро
            graph[edge.to_point_id].append((edge.from_point_id, distance))
    
    return graph, points

def astar_route(graph, points, start_id: str, end_id: str) -> List[str]:
    """Алгоритм A* для поиска маршрута"""
    if start_id not in graph or end_id not in graph:
        return []
    
    open_set = []
    heapq.heappush(open_set, (0, start_id))
    
    came_from = {}
    g_score = {node: float('inf') for node in graph}
    g_score[start_id] = 0
    
    f_score = {node: float('inf') for node in graph}
    f_score[start_id] = heuristic(points[start_id], points[end_id])
    
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        if current == end_id:
            return reconstruct_path(came_from, current)
        
        for neighbor, weight in graph[current]:
            tentative_g_score = g_score[current] + weight
            
            if tentative_g_score < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = tentative_g_score + heuristic(points[neighbor], points[end_id])
                heapq.heappush(open_set, (f_score[neighbor], neighbor))
    
    return []

def heuristic(point1, point2):
    """Эвристическая функция для A*"""
    return calculate_distance(
        (point1.latitude, point1.longitude),
        (point2.latitude, point2.longitude)
    )

def reconstruct_path(came_from: Dict[str, str], current: str) -> List[str]:
    """Восстанавливает путь из словаря came_from"""
    total_path = [current]
    while current in came_from:
        current = came_from[current]
        total_path.append(current)
    return total_path[::-1]

def generate_instructions(route_points, points_dict):
    """Генерация текстовых инструкций для маршрута"""
    if len(route_points) < 2:
        return ["Маршрут слишком короткий"]
    
    instructions = []
    
    for i in range(len(route_points) - 1):
        current = points_dict[route_points[i]]
        next_point = points_dict[route_points[i + 1]]
        
        if current.floor != next_point.floor:
            instructions.append(f"Перейдите на {next_point.floor} этаж")
        else:
            # Простые направления по координатам
            lat_diff = next_point.latitude - current.latitude
            lon_diff = next_point.longitude - current.longitude
            
            if abs(lat_diff) > abs(lon_diff):
                direction = "север" if lat_diff > 0 else "юг"
            else:
                direction = "восток" if lon_diff > 0 else "запад"
            
            instructions.append(f"Двигайтесь на {direction} к {next_point.name}")
    
    instructions.append(f"Вы прибыли в {points_dict[route_points[-1]].name}")
    return instructions

@router.post("/calculate", response_model=RouteResponse)
def calculate_route(route_request: RouteRequest, db: Session = Depends(get_db)):
    start_point = db.query(Point).filter(Point.id == route_request.start_point_id).first()
    end_point = db.query(Point).filter(Point.id == route_request.end_point_id).first()
    
    if not start_point or not end_point:
        raise HTTPException(status_code=404, detail="Start or end point not found")
    
    # Загружаем граф и находим маршрут через A*
    graph, points_dict = get_graph_from_db(db)
    route_point_ids = astar_route(graph, points_dict, start_point.id, end_point.id)
    
    if not route_point_ids:
        # Fallback: прямой маршрут если A* не нашел путь
        route_point_ids = [start_point.id, end_point.id]
    
    # Рассчитываем общее расстояние
    total_distance = 0
    path_coordinates = []
    
    for i in range(len(route_point_ids)):
        point_id = route_point_ids[i]
        point = points_dict[point_id]
        path_coordinates.append(Coordinate(lat=point.latitude, lng=point.longitude))
        
        if i > 0:
            prev_point = points_dict[route_point_ids[i-1]]
            segment_distance = calculate_distance(
                (prev_point.latitude, prev_point.longitude),
                (point.latitude, point.longitude)
            )
            total_distance += segment_distance
    
    estimated_time = int(total_distance / 1.4)  # 1.4 м/с - скорость ходьбы
    
    instructions = generate_instructions(route_point_ids, points_dict)
    
    return RouteResponse(
        start_point_id=start_point.id,
        end_point_id=end_point.id,
        path=path_coordinates,
        distance=total_distance,
        estimated_time=estimated_time,
        instructions=instructions
    )