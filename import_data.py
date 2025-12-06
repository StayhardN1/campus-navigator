import sqlite3
import pandas as pd
import os

def recreate_database():
    """Полностью пересоздаем базу данных"""
    # Удаляем старую базу
    if os.path.exists('campus.db'):
        os.remove('campus.db')
        print("🗑️ Старая база данных удалена")
    
    conn = sqlite3.connect('campus.db')
    cursor = conn.cursor()
    
    try:
        # Создаем таблицу points
        cursor.execute("""
            CREATE TABLE points (
                id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                latitude REAL,
                longitude REAL,
                qr_code TEXT,
                floor INTEGER,
                type TEXT
            )
        """)
        
        # Создаем таблицу graph_edges
        cursor.execute("""
            CREATE TABLE graph_edges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_point_id TEXT,
                to_point_id TEXT,
                weight REAL,
                accessible BOOLEAN
            )
        """)
        
        conn.commit()
        print("✅ Новая база данных создана")
        
    except Exception as e:
        print(f"❌ Ошибка создания базы: {e}")
        conn.rollback()
    finally:
        conn.close()

def import_data_from_csv():
    """Импорт данных из CSV в SQLite"""
    
    recreate_database()  # Полностью пересоздаем базу
    
    conn = sqlite3.connect('campus.db')
    
    try:
        # 1. Импорт точек из nodes.csv
        print("\n📥 Импорт точек из nodes.csv...")
        nodes_df = pd.read_csv('ml_data/nodes.csv')
        
        success_count = 0
        error_count = 0
        
        for index, row in nodes_df.iterrows():
            try:
                # Правильные названия колонок из вашего CSV
                point_id = str(row['id'])
                name = str(row['name'])
                floor_val = int(row['floor'])
                longitude = float(row['x'])  # x -> longitude
                latitude = float(row['y'])   # y -> latitude  
                type_val = str(row['type'])
                qr_code = f'qr_{point_id}'
                
                conn.execute("""
                    INSERT INTO points (id, name, description, latitude, longitude, qr_code, floor, type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    point_id, 
                    name, 
                    name,  # description = name
                    latitude, 
                    longitude, 
                    qr_code, 
                    floor_val, 
                    type_val
                ))
                
                success_count += 1
                if success_count <= 5:  # Покажем первые 5 для проверки
                    print(f"✅ {point_id}: {name}")
                
            except Exception as e:
                print(f"❌ Ошибка в строке {index} ({row['id']}): {e}")
                error_count += 1
        
        print(f"📊 Точки: {success_count} успешно, {error_count} с ошибками")
        
        # 2. Импорт рёбер из edges.csv
        print("\n📥 Импорт рёбер из edges.csv...")
        edges_df = pd.read_csv('ml_data/edges.csv')
        
        success_count = 0
        error_count = 0
        
        for index, row in edges_df.iterrows():
            try:
                from_id = str(row['from'])
                to_id = str(row['to'])
                accessible = int(row['accessible'])
                
                weight = 1.0  # Все рёбра доступны (accessible = 1)
                
                conn.execute("""
                    INSERT INTO graph_edges (from_point_id, to_point_id, weight, accessible)
                    VALUES (?, ?, ?, ?)
                """, (from_id, to_id, weight, bool(accessible)))
                
                success_count += 1
            except Exception as e:
                print(f"❌ Ошибка в ребре {index}: {e}")
                error_count += 1
        
        print(f"📊 Рёбра: {success_count} успешно, {error_count} с ошибками")
        
        conn.commit()
        
        # Финальная статистика
        points_count = conn.execute("SELECT COUNT(*) FROM points").fetchone()[0]
        edges_count = conn.execute("SELECT COUNT(*) FROM graph_edges").fetchone()[0]
        
        print(f"\n🎯 Итог: {points_count} точек, {edges_count} рёбер")
        
    except Exception as e:
        print(f"❌ Критическая ошибка импорта: {e}")
        conn.rollback()
    finally:
        conn.close()

def verify_import():
    """Проверяем корректность импорта"""
    conn = sqlite3.connect('campus.db')
    cursor = conn.cursor()
    
    print("\n🔍 Проверка импорта:")
    
    # Проверяем точки
    cursor.execute("SELECT id, name, floor, type FROM points LIMIT 10")
    points = cursor.fetchall()
    print(f"\n📋 Первые 10 точек:")
    for point in points:
        print(f"  {point}")
    
    # Проверяем рёбра
    cursor.execute("SELECT from_point_id, to_point_id FROM graph_edges LIMIT 10")
    edges = cursor.fetchall()
    print(f"\n📋 Первые 10 рёбер:")
    for edge in edges:
        print(f"  {edge}")
    
    # Проверяем существование точек для рёбер
    cursor.execute("""
        SELECT COUNT(*) FROM graph_edges 
        WHERE from_point_id NOT IN (SELECT id FROM points)
        OR to_point_id NOT IN (SELECT id FROM points)
    """)
    missing_points = cursor.fetchone()[0]
    print(f"\n⚠️  Рёбер с отсутствующими точками: {missing_points}")
    
    conn.close()

if __name__ == "__main__":
    print("🚀 Запуск импорта данных...")
    import_data_from_csv()
    verify_import()
    print("✅ Импорт завершен!")