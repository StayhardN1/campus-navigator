import heapq
import math
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

def calculate_distance(coord1, coord2):
    """Вычисление расстояния между двумя координатами в метрах"""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    
    # Упрощённая формула для небольших расстояний
    dx = (lon2 - lon1) * 111000 * math.cos(math.radians(lat1))
    dy = (lat2 - lat1) * 111000
    return math.sqrt(dx**2 + dy**2)

def get_graph_from_db(db: Session):
    """Загружает граф из базы данных"""
    from app import models
    
    graph = {}
    points = {}
    
    # Загружаем все точки
    db_points = db.query(models.Point).all()
    for point in db_points:
        points[point.id] = point
        graph[point.id] = []
    
    # Загружаем все рёбра
    edges = db.query(models.GraphEdge).all()
    for edge in edges:
        if edge.from_point_id in graph and edge.to_point_id in graph:
            graph[edge.from_point_id].append((edge.to_point_id, edge.weight))
            # Для неориентированного графа добавляем обратное ребро
            graph[edge.to_point_id].append((edge.from_point_id, edge.weight))
    
    return graph, points

def heuristic(node1_id: str, node2_id: str, points: Dict) -> float:
    """Эвристическая функция для A*"""
    point1 = points[node1_id]
    point2 = points[node2_id]
    
    # Вычисляем евклидово расстояние
    distance = calculate_distance(
        (point1.latitude, point1.longitude),
        (point2.latitude, point2.longitude)
    )
    
    # Штраф за смену этажа
    floor_penalty = 0
    if point1.floor != point2.floor:
        floor_penalty = 50  # дополнительный "вес" за смену этажа
    
    return distance + floor_penalty

def astar_route(db: Session, start_id: str, end_id: str) -> List[str]:
    """Алгоритм A* для поиска маршрута"""
    graph, points = get_graph_from_db(db)
    
    if start_id not in graph or end_id not in graph:
        return []
    
    open_set = []
    heapq.heappush(open_set, (0, start_id))
    
    came_from = {}
    g_score = {node: float('inf') for node in graph}
    g_score[start_id] = 0
    
    f_score = {node: float('inf') for node in graph}
    f_score[start_id] = heuristic(start_id, end_id, points)
    
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        if current == end_id:
            return reconstruct_path(came_from, current)
        
        for neighbor, weight in graph[current]:
            tentative_g_score = g_score[current] + weight
            
            if tentative_g_score < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = tentative_g_score + heuristic(neighbor, end_id, points)
                heapq.heappush(open_set, (f_score[neighbor], neighbor))
    
    return []

def reconstruct_path(came_from: Dict[str, str], current: str) -> List[str]:
    """Восстанавливает путь из словаря came_from"""
    total_path = [current]
    while current in came_from:
        current = came_from[current]
        total_path.append(current)
    return total_path[::-1]

def calculate_route(db: Session, start_point_id: str, end_point_id: str):
    """Основная функция для расчёта маршрута"""
    from app import models
    
    route_point_ids = astar_route(db, start_point_id, end_point_id)
    
    if not route_point_ids:
        return None
    
    # Получаем полные объекты точек
    route_points = []
    for point_id in route_point_ids:
        point = db.query(models.Point).filter(models.Point.id == point_id).first()
        if point:
            route_points.append(point)
    
    return route_points

def generate_instructions(route_points: List) -> List[str]:
    """Генерация текстовых инструкций"""
    if len(route_points) < 2:
        return ["Маршрут слишком короткий"]
    
    instructions = []
    
    for i in range(len(route_points) - 1):
        current = route_points[i]
        next_point = route_points[i + 1]
        
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
    
    return instructions
