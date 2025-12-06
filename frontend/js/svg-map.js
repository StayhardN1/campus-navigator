// js/svg-map.js - Управление SVG картами этажей с использованием <img>
class SVGMapRenderer {
    constructor() {
        this.currentFloor = 1;
        this.currentMap = null;
        this.points = [];
        this.routePoints = [];
        console.log('🗺️ SVG Map Renderer инициализирован');
    }

    async init() {
        console.log('🔄 Инициализация SVG карт...');
        await this.loadFloorMap(this.currentFloor);
        this.setupFloorSwitcher();
        console.log('✅ SVG карты готовы');
        return this;
    }

    async loadFloorMap(floorNumber) {
        console.log(`🔄 Загрузка карты этажа ${floorNumber}...`);
        
        const svgContainer = document.getElementById('svg-map-container');
        const mapLoader = document.getElementById('map-loader');
        
        if (!svgContainer) {
            console.error('❌ Не найден контейнер для SVG');
            return;
        }

        // Показываем лоадер, скрываем SVG контейнер
        if (mapLoader) {
            mapLoader.style.display = 'flex';
        }
        svgContainer.style.display = 'none';

        // Очищаем контейнер
        svgContainer.innerHTML = '';

        // Создаем изображение для загрузки SVG
        const img = document.createElement('img');
        img.src = `assets/floor${floorNumber}_without_corridors.svg`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.classList.add('svg-map');
        img.alt = `Схема ${floorNumber} этажа`;

        img.onload = () => {
            console.log(`✅ Карта этажа ${floorNumber} загружена`);
            this.currentMap = img;
            
            // Скрываем лоадер, показываем SVG контейнер
            if (mapLoader) {
                mapLoader.style.display = 'none';
            }
            svgContainer.style.display = 'block';
            
            this.addMapInteractions(floorNumber);
        };

        img.onerror = (error) => {
            console.error(`❌ Ошибка загрузки SVG этажа ${floorNumber}:`, error);
            console.log(`🔍 Попытка загрузить из: assets/floor${floorNumber}_without_corridors.svg`);
            
            // Скрываем лоадер, показываем fallback
            if (mapLoader) {
                mapLoader.style.display = 'none';
            }
            svgContainer.style.display = 'block';
            
            this.showFallbackMap(floorNumber, svgContainer);
        };

        svgContainer.appendChild(img);
        this.currentFloor = floorNumber;
    }

    showFallbackMap(floorNumber, container) {
        console.log(`🔄 Показ резервной карты для этажа ${floorNumber}`);
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #64748b; padding: 40px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
                <h3 style="margin-bottom: 8px; color: #1e293b;">Этаж ${floorNumber}</h3>
                <p style="margin-bottom: 20px;">Схема этажа</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 2px dashed #e2e8f0; max-width: 400px;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>Этаж ${floorNumber}</strong><br>
                        • Используйте навигацию слева<br>
                        • Выбирайте точки для построения маршрутов<br>
                        • Инструкции появятся ниже карты
                    </p>
                </div>
                <div style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
                    SVG схема загружается из: assets/floor${floorNumber}_without_corridors.svg
                </div>
            </div>
        `;
    }

    addMapInteractions(floorNumber) {
        console.log(`🎯 Добавление интерактивности для этажа ${floorNumber}`);
        
        // Добавляем информационную панель поверх карты
        const svgContainer = document.getElementById('svg-map-container');
        if (!svgContainer) return;

        // Создаем слой для интерактивных элементов
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none'; // Пропускаем события через overlay
        overlay.id = 'map-overlay';

        svgContainer.appendChild(overlay);
    }

    setupFloorSwitcher() {
        const floorSelect = document.getElementById('floor-select');
        if (floorSelect) {
            floorSelect.addEventListener('change', (e) => {
                const newFloor = parseInt(e.target.value);
                console.log(`🔀 Переключение на этаж ${newFloor}`);
                this.loadFloorMap(newFloor);
            });
        } else {
            console.error('❌ Не найден элемент для переключения этажей');
        }
    }

    drawRoute(routePath) {
        console.log('🔄 Отрисовка маршрута на карте:', routePath);
        
        // Очищаем предыдущий маршрут
        this.clearRoute();
        
        if (!routePath || routePath.length < 2) {
            console.warn('⚠️ Недостаточно точек для отрисовки маршрута');
            return;
        }

        // Показываем информационную панель
        this.showRouteInfo(routePath);
        
        console.log('✅ Маршрут отображен на карте');
    }

    showRouteInfo(routePath) {
        const mapContainer = document.getElementById('svg-map-container');
        if (!mapContainer) return;

        // Удаляем старую информационную панель
        const oldPanel = mapContainer.querySelector('.map-info-panel');
        if (oldPanel) {
            oldPanel.remove();
        }

        // Создаем новую информационную панель
        const infoPanel = document.createElement('div');
        infoPanel.className = 'map-info-panel';
        infoPanel.innerHTML = `
            <strong>📍 Маршрут построен</strong><br>
            <span style="font-size: 12px;">Точек в пути: ${routePath.length}</span>
            <br>
            <span style="font-size: 10px; color: #64748b;">Этаж ${this.currentFloor}</span>
        `;

        mapContainer.appendChild(infoPanel);

        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            if (infoPanel && infoPanel.parentNode) {
                infoPanel.remove();
            }
        }, 5000);
    }

    clearRoute() {
        console.log('🧹 Очистка маршрута с карты');
        
        // Очищаем информационную панель
        const mapContainer = document.getElementById('svg-map-container');
        if (mapContainer) {
            const infoPanel = mapContainer.querySelector('.map-info-panel');
            if (infoPanel) {
                infoPanel.remove();
            }
        }
    }

    // Метод для обновления текущего местоположения на карте
    updateCurrentLocation(location) {
        if (location && location.floor === this.currentFloor) {
            console.log('📍 Обновление текущего местоположения на карте:', location.name);
            this.showLocationInfo(location);
        } else if (location) {
            console.log(`📍 Текущее местоположение на другом этаже (${location.floor}), переключите этаж чтобы увидеть`);
        }
    }

    showLocationInfo(location) {
        const mapContainer = document.getElementById('svg-map-container');
        if (!mapContainer) return;

        // Удаляем старую панель местоположения
        const oldPanel = mapContainer.querySelector('.location-panel');
        if (oldPanel) {
            oldPanel.remove();
        }

        // Создаем панель местоположения
        const locationPanel = document.createElement('div');
        locationPanel.className = 'map-info-panel location-panel';
        locationPanel.style.top = '60px'; // Размещаем ниже маршрутной панели
        locationPanel.innerHTML = `
            <strong>📍 Вы находитесь здесь</strong><br>
            <span style="font-size: 12px;">${location.name}</span>
            <br>
            <span style="font-size: 10px; color: #64748b;">${this.getLocationType(location.type)}</span>
        `;

        mapContainer.appendChild(locationPanel);
    }

    getLocationType(type) {
        const types = {
            'classroom': 'Аудитория',
            'office': 'Офис',
            'entrance': 'Вход',
            'exit': 'Выход',
            'stair': 'Лестница',
            'elevator': 'Лифт',
            'toilet': 'Туалет',
            'cafeteria': 'Столовая',
            'qr_node': 'QR-код'
        };
        return types[type] || type;
    }

    // Метод для получения текущего этажа
    getCurrentFloor() {
        return this.currentFloor;
    }

    // Метод для проверки доступности карты
    isMapLoaded() {
        return this.currentMap !== null;
    }
}

// Создаем глобальный экземпляр
window.SVGMapRenderer = SVGMapRenderer;