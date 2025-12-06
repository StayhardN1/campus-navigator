from app.database import SessionLocal, engine, Base  # ← Base импортируем ОТСЮДА
from app.models import Point  # ← только Point из models

# Создаем таблицы
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Очищаем старые данные
db.query(Point).delete()

# Добавляем тестовые точки
test_points = [
    Point(name="Главный вход", description="Основной вход", 
          latitude=55.751244, longitude=37.618423, qr_code="main_entrance"),
    Point(name="Аудитория 101", description="Лекционная аудитория", 
          latitude=55.751544, longitude=37.619523, qr_code="room_101"),
    Point(name="Библиотека", description="Главная библиотека", 
          latitude=55.752044, longitude=37.620623, qr_code="library"),
    Point(name="Столовая", description="Студенческая столовая", 
          latitude=55.752544, longitude=37.621723, qr_code="cafeteria"),
]

for point in test_points:
    db.add(point)

db.commit()
print("✅ Тестовые данные добавлены!")
db.close()