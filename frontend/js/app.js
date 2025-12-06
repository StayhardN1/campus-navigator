// js/app.js - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ
class CampusNavigator {
    constructor() {
        this.api = window.campusAPI;
        this.currentLocation = null;
        this.locations = [];
        this.routeHistory = [];
        console.log('🚀 Campus Navigator инициализирован');
        this.init();
    }

    async init() {
        try {
            console.log('🔧 Инициализация приложения...');
            await this.loadLocations();
            this.setupEventListeners();
            this.updateUI();
            console.log('✅ Campus Navigator готов к работе!');
            console.log('📍 Загружено точек:', this.locations.length);
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }

    async loadLocations() {
        console.log('📍 Загрузка локаций...');
        this.locations = await this.api.getLocations();
        console.log('📊 Получены локации:', this.locations);
        this.populateDestinationSelect();
    }

    setupEventListeners() {
        console.log('🔧 Настройка обработчиков событий...');
        
        const scanBtn = document.getElementById('scan-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.openQRScanner());
        }

        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateRoute());
        }

        console.log('✅ Обработчики событий установлены');
    }

    openQRScanner() {
        console.log('📷 Открытие сканера QR-кодов...');
        this.showQRSelectionModal();
    }

    showQRSelectionModal() {
        // Показываем ВСЕ точки для выбора, не только QR
        const modal = document.createElement('div');
        modal.className = 'qr-scanner-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-bottom: 16px; color: #1e293b;">📍 Выберите ваше местоположение</h3>
                <div style="margin-bottom: 16px; color: #64748b; font-size: 14px;">
                    Выберите точку для установки текущего местоположения
                </div>
                <div id="location-options" style="margin-bottom: 20px;">
                    ${this.locations.map(location => `
                        <div class="location-option" 
                             style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; cursor: pointer;"
                             data-id="${location.id}">
                            <div style="font-weight: bold;">${location.name}</div>
                            <div style="font-size: 12px; color: #64748b;">
                                ID: ${location.id} | Этаж: ${location.floor} | Тип: ${this.getLocationType(location.type)}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button id="close-scanner" style="width: 100%; padding: 12px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Закрыть
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Обработчики для выбора локации
        modal.querySelectorAll('.location-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const locationId = e.currentTarget.getAttribute('data-id');
                this.setCurrentLocationById(locationId);
                modal.remove();
            });
        });

        modal.querySelector('#close-scanner').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    setCurrentLocationById(locationId) {
        console.log('📍 Установка местоположения по ID:', locationId);
        const location = this.locations.find(loc => loc.id === locationId);
        if (location) {
            this.setCurrentLocation(location);
            this.showNotification(`📍 Установлено местоположение: ${location.name}`, 'success');
        } else {
            console.error('❌ Локация не найдена:', locationId);
            this.showNotification('❌ Локация не найдена', 'error');
        }
    }

    setCurrentLocation(location) {
        console.log('📍 Установка текущей локации:', location);
        this.currentLocation = location;
        this.updateCurrentLocationUI();
        
        // Обновляем этаж на карте
        const floorSelect = document.getElementById('floor-select');
        if (floorSelect) {
            floorSelect.value = location.floor;
        }
    }

    updateCurrentLocationUI() {
        const container = document.getElementById('current-location');
        if (!container) {
            console.error('❌ Не найден элемент current-location');
            return;
        }

        if (!this.currentLocation) {
            container.innerHTML = '<p class="no-location">Нажмите "Сканировать QR-код" для выбора местоположения</p>';
            return;
        }

        console.log('🔄 Обновление UI текущей локации:', this.currentLocation);

        container.innerHTML = `
            <div style="font-weight: bold; color: #3b82f6; margin-bottom: 8px;">
                📍 ${this.currentLocation.name}
            </div>
            <div style="font-size: 14px; color: #64748b;">
                ID: ${this.currentLocation.id}<br>
                Этаж: ${this.currentLocation.floor}<br>
                Тип: ${this.getLocationType(this.currentLocation.type)}<br>
                ${this.currentLocation.description ? `Описание: ${this.currentLocation.description}` : ''}
            </div>
        `;
    }

    populateDestinationSelect() {
        const select = document.getElementById('destination-select');
        if (!select) {
            console.error('❌ Не найден элемент destination-select');
            return;
        }

        console.log('🔄 Заполнение выбора назначения...');

        select.innerHTML = '<option value="">Выберите точку назначения...</option>';
        
        this.locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = `${location.name} (${location.floor} этаж)`;
            option.setAttribute('data-id', location.id);
            select.appendChild(option);
        });

        select.disabled = false;
        
        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.disabled = false;
        }

        console.log('✅ Выбор назначения заполнен:', this.locations.length, 'опций');
    }

    async calculateRoute() {
        console.log('🔄 Расчет маршрута...');
        
        if (!this.currentLocation) {
            this.showNotification('❌ Сначала определите ваше местоположение', 'error');
            return;
        }

        const select = document.getElementById('destination-select');
        if (!select || !select.value) {
            this.showNotification('❌ Выберите точку назначения', 'error');
            return;
        }

        const destinationId = select.value;
        console.log('📍 Расчет маршрута:', this.currentLocation.id, '→', destinationId);

        try {
            this.showRouteLoading(true);
            const route = await this.api.calculateRoute(this.currentLocation.id, destinationId);
            console.log('✅ Маршрут получен:', route);
            this.displayRoute(route);
            this.addToHistory(route);
            this.showRouteLoading(false);
            this.showNotification('✅ Маршрут построен!');
        } catch (error) {
            console.error('❌ Ошибка построения маршрута:', error);
            this.showRouteLoading(false);
            this.showNotification('❌ Ошибка построения маршрута', 'error');
        }
    }

    // ДОБАВЛЕННЫЙ МЕТОД
    showRouteLoading(show) {
        const calculateBtn = document.getElementById('calculate-btn');
        const routeLoader = document.getElementById('route-loader');
        
        if (calculateBtn) {
            calculateBtn.disabled = show;
            if (show) {
                calculateBtn.textContent = '🔄 Расчет...';
                calculateBtn.classList.add('calculating');
            } else {
                calculateBtn.textContent = '🚀 Построить маршрут';
                calculateBtn.classList.remove('calculating');
            }
        }
        
        if (routeLoader) {
            routeLoader.style.display = show ? 'block' : 'none';
        }
    }

    displayRoute(route) {
        console.log('🔄 Отображение маршрута:', route);
        
        const instructionsContainer = document.getElementById('route-instructions');
        if (instructionsContainer) {
            instructionsContainer.style.display = 'block';
        }

        const instructionsList = document.getElementById('instructions-list');
        if (instructionsList) {
            instructionsList.innerHTML = `
                <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; font-size: 14px;">
                        <div><strong>📏 Дистанция:</strong> ${route.distance || route.total_distance} м</div>
                        <div><strong>⏱️ Время:</strong> ${route.estimated_time} сек</div>
                        <div><strong>📍 Точек:</strong> ${route.total_points || (route.route ? route.route.length : 2)}</div>
                    </div>
                </div>
                ${(route.instructions || []).map(instruction => 
                    `<li style="margin-bottom: 8px; padding: 8px; background: rgba(59, 130, 246, 0.05); border-radius: 6px; border-left: 3px solid #3b82f6;">
                        ${instruction}
                    </li>`
                ).join('')}
            `;
        }
    }

    addToHistory(route) {
        const historyItem = {
            timestamp: new Date().toLocaleString(),
            from: this.getLocationName(route.start_point_id),
            to: this.getLocationName(route.end_point_id),
            distance: route.distance || route.total_distance,
            time: route.estimated_time
        };

        this.routeHistory.unshift(historyItem);
        this.routeHistory = this.routeHistory.slice(0, 5);
        this.updateHistoryUI();
    }

    // ДОБАВЛЕННЫЙ МЕТОД
    updateHistoryUI() {
        const container = document.getElementById('route-history');
        if (!container) return;

        if (this.routeHistory.length === 0) {
            container.innerHTML = '<p class="no-history">Здесь будут отображаться ваши последние маршруты</p>';
            return;
        }

        container.innerHTML = this.routeHistory.map(item => `
            <div class="history-item" onclick="navigator.selectFromHistory('${item.from}', '${item.to}')">
                <div style="font-weight: bold; font-size: 14px;">${item.from} → ${item.to}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                    📏 ${item.distance}m · ⏱️ ${item.time}сек · ${item.timestamp}
                </div>
            </div>
        `).join('');
    }

    selectFromHistory(from, to) {
        const fromLocation = this.locations.find(loc => loc.name === from);
        const toLocation = this.locations.find(loc => loc.name === to);
        
        if (fromLocation) {
            this.setCurrentLocation(fromLocation);
        }
        
        if (toLocation) {
            const select = document.getElementById('destination-select');
            if (select) {
                select.value = toLocation.id;
            }
        }
        
        this.showNotification(`🎯 Восстановлен маршрут: ${from} → ${to}`);
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'info' ? '#3b82f6' : '#10b981'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getLocationName(locationId) {
        const location = this.locations.find(l => l.id === locationId);
        return location ? location.name : 'Неизвестная локация';
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

    updateUI() {
        this.updateCurrentLocationUI();
        this.updateHistoryUI(); // Теперь этот метод существует
    }
}

// Добавляем CSS анимацию для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .history-item {
        transition: all 0.2s ease;
        cursor: pointer;
    }
    
    .history-item:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .calculating {
        animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(style);