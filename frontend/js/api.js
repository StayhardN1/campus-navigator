// js/api.js - ОБНОВЛЕННАЯ ВЕРСИЯ ДЛЯ НОВОГО БЕКЕНДА
class CampusAPI {
    constructor() {
        this.baseURL = 'http://localhost:8000';
        console.log('🏫 Campus API инициализирован');
    }

    async getLocations() {
        try {
            console.log('🔄 Загрузка локаций из API...');
            
            const response = await fetch(`${this.baseURL}/api/points/`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Локации загружены:', data);
            console.log('📊 Первые 3 точки:', data.slice(0, 3));
            return data;
        } catch (error) {
            console.error('❌ Ошибка загрузки локаций:', error);
            return this.getMockLocations();
        }
    }

    // Сканировать QR-код
async scanQRCode(qrCode) {
    try {
        console.log('📷 Сканирование QR-кода через API:', qrCode);
        
        const response = await fetch(`${this.baseURL}/api/points/qr/${qrCode}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ QR-код распознан через API:', data);
        return data;
        
    } catch (error) {
        console.error('❌ Ошибка сканирования QR-кода через API:', error);
        // Возвращаем fallback данные
        return this.getMockQRScan(qrCode);
    }
}

getMockQRScan(qrCode) {
    // Имитация ответа API для тестирования
    const mockPoints = this.getMockLocations();
    const point = mockPoints.find(p => p.qr_code === qrCode || p.id === qrCode);
    
    if (point) {
        return {
            point: point,
            message: `Location identified: ${point.name}`,
            success: true
        };
    }
    
    return {
        point: null,
        message: 'QR code not found',
        success: false
    };
}

    // Рассчитать маршрут
    async calculateRoute(startId, endId) {
        try {
            console.log('🔄 Расчет маршрута через API...', startId, '→', endId);
            
            const response = await fetch(`${this.baseURL}/api/routes/calculate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    start_point_id: startId,
                    end_point_id: endId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (this.isValidRoute(data)) {
                console.log('✅ Маршрут получен от API:', data);
                return this.transformRouteResponse(data);
            } else {
                console.warn('⚠️ API вернул некорректный маршрут, используем реалистичный');
                return this.getRealisticRoute(startId, endId);
            }
            
        } catch (error) {
            console.error('❌ Ошибка построения маршрута через API:', error);
            console.log('🔄 Используем реалистичный маршрут...');
            return this.getRealisticRoute(startId, endId);
        }
    }

    // Преобразовать ответ API в формат фронтенда
    transformRouteResponse(apiResponse) {
        return {
            start_point_id: apiResponse.start_point?.id || apiResponse.route[0]?.id,
            end_point_id: apiResponse.end_point?.id || apiResponse.route[apiResponse.route.length - 1]?.id,
            path: apiResponse.route.map(point => ({
                lat: point.latitude,
                lng: point.longitude
            })),
            distance: apiResponse.total_distance,
            estimated_time: apiResponse.estimated_time,
            instructions: apiResponse.instructions,
            route: apiResponse.route // сохраняем полный маршрут
        };
    }

    // Проверка корректности маршрута
    isValidRoute(routeData) {
        if (!routeData || typeof routeData !== 'object') return false;
        if (!routeData.total_distance || routeData.total_distance <= 0) return false;
        if (!routeData.estimated_time || routeData.estimated_time <= 0) return false;
        if (!routeData.instructions || !Array.isArray(routeData.instructions)) return false;
        if (!routeData.route || !Array.isArray(routeData.route)) return false;
        
        return true;
    }

    // Реалистичный расчет маршрута (fallback)
    getRealisticRoute(startId, endId) {
        console.log('🧮 Расчет реалистичного маршрута:', startId, '→', endId);
        
        const allLocations = this.getMockLocations();
        const startLoc = allLocations.find(l => l.id === startId);
        const endLoc = allLocations.find(l => l.id === endId);
        
        if (!startLoc || !endLoc) {
            console.error('❌ Не найдены точки для маршрута');
            return this.getFallbackRoute(startId, endId);
        }

        const rawDistance = Math.sqrt(
            Math.pow(endLoc.longitude - startLoc.longitude, 2) + 
            Math.pow(endLoc.latitude - startLoc.latitude, 2)
        );
        
        const distanceMeters = rawDistance * 0.1;
        const realisticDistance = Math.max(5, Math.min(200, Math.round(distanceMeters * 10) / 10));
        const estimatedTime = Math.max(10, Math.round(realisticDistance / 1.4));

        const instructions = this.generateRealisticInstructions(startLoc, endLoc, realisticDistance);

        return {
            start_point_id: startId,
            end_point_id: endId,
            path: [
                { lat: startLoc.latitude, lng: startLoc.longitude },
                { lat: endLoc.latitude, lng: endLoc.longitude }
            ],
            distance: realisticDistance,
            estimated_time: estimatedTime,
            instructions: instructions,
            route: [startLoc, endLoc]
        };
    }

    // Генерация реалистичных инструкций
    generateRealisticInstructions(startLoc, endLoc, distance) {
        const instructions = [];
        
        instructions.push(`Начните от "${startLoc.name}"`);
        
        const latDiff = endLoc.latitude - startLoc.latitude;
        const lonDiff = endLoc.longitude - startLoc.longitude;
        
        if (startLoc.floor !== endLoc.floor) {
            instructions.push(`Поднимитесь на ${endLoc.floor} этаж`);
        }
        
        if (Math.abs(latDiff) > Math.abs(lonDiff)) {
            if (latDiff > 0) {
                instructions.push("Двигайтесь на север по коридору");
            } else {
                instructions.push("Двигайтесь на юг по коридору");
            }
        } else {
            if (lonDiff > 0) {
                instructions.push("Двигайтесь на восток по коридору");
            } else {
                instructions.push("Двигайтесь на запад по коридору");
            }
        }
        
        if (distance > 50) {
            instructions.push(`Пройдите примерно ${Math.round(distance)} метров`);
        } else if (distance > 20) {
            instructions.push("Пройдите несколько десятков метров");
        }
        
        instructions.push(`Вы прибыли в "${endLoc.name}"`);
        
        return instructions;
    }

    // Мок-сканирование QR
    getMockQRScan(qrCode) {
        const allLocations = this.getMockLocations();
        const point = allLocations.find(loc => loc.qr_code === qrCode) || allLocations[0];
        
        return {
            point: point,
            message: `Location identified: ${point.name}`,
            success: true
        };
    }

    // Фолбэк маршрут на крайний случай
    getFallbackRoute(startId, endId) {
        console.warn('⚠️ Используем фолбэк маршрут');
        
        return {
            start_point_id: startId,
            end_point_id: endId,
            path: [
                { lat: 100, lng: 100 },
                { lat: 200, lng: 200 }
            ],
            distance: 45,
            estimated_time: 32,
            instructions: [
                "Начните движение от текущей точки",
                "Следуйте по указателям",
                "Вы прибыли в пункт назначения"
            ],
            route: []
        };
    }

    // Получить точки по этажу
    async getLocationsByFloor(floor) {
        try {
            const response = await fetch(`${this.baseURL}/api/points/floor/${floor}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Ошибка загрузки этажа:', error);
            return [];
        }
    }

    // Поиск точек по названию
    async searchPoints(name) {
        try {
            const response = await fetch(`${this.baseURL}/api/points/search/${name}`);
            return await response.json();
        } catch (error) {
            console.error('❌ Ошибка поиска точек:', error);
            return [];
        }
    }

    // Мок-данные для тестирования (fallback)
    getMockLocations() {
        return [
            {
                id: "F1_entrance", 
                name: "Вход", 
                floor: 1, 
                type: "entrance", 
                latitude: 560.26, 
                longitude: 1375.0,
                qr_code: "entrance_f1",
                description: "Главный вход в здание"
            },
            {
                id: "F1_emergency_exit", 
                name: "Аварийный выход 1 этаж", 
                floor: 1, 
                type: "exit", 
                latitude: 468.79, 
                longitude: 39.78,
                qr_code: "emergency_f1",
                description: "Аварийный выход"
            },
            {
                id: "F1_classroom101", 
                name: "Аудитория 101", 
                floor: 1, 
                type: "classroom", 
                latitude: 115.0, 
                longitude: 100.0,
                qr_code: "classroom_101",
                description: "Лекционная аудитория"
            },
            {
                id: "F1_qr_east", 
                name: "Восточный QR код на 1 этаже", 
                floor: 1, 
                type: "qr_node", 
                latitude: 371.84, 
                longitude: 1514.42,
                qr_code: "qr_east_f1",
                description: "Навигационный QR-код"
            },
            {
                id: "F2_classroom201", 
                name: "Аудитория 201", 
                floor: 2, 
                type: "classroom", 
                latitude: 115.0, 
                longitude: 100.0,
                qr_code: "classroom_201",
                description: "Лекционная аудитория"
            },
            {
                id: "F2_qr_east", 
                name: "Восточный QR код на 2 этаже", 
                floor: 2, 
                type: "qr_node", 
                latitude: 107.56, 
                longitude: 1331.26,
                qr_code: "qr_east_f2",
                description: "Навигационный QR-код"
            }
        ];
    }
}

// Создаем глобальный экземпляр API
window.campusAPI = new CampusAPI();