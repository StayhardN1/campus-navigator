// js/qr-scanner.js - Управление сканированием QR-кодов
class QRScanner {
    constructor() {
        this.scanner = null;
        this.isScanning = false;
        console.log('📷 QR Scanner инициализирован');
        
        // Список ваших QR-кодов для валидации
        this.validQRCodes = [
            'F1_qr_center', 'F1_qr_east', 'F1_qr_north', 'F1_qr_west',
            'F2_qr_centre', 'F2_qr_east', 'F2_qr_west'
        ];
    }

    init() {
        this.setupModal();
        this.setupEventListeners();
        console.log('✅ QR Scanner готов к работе');
    }

    setupModal() {
        // Создаем модальное окно если его нет
        if (!document.getElementById('qr-scanner-modal')) {
            const modalHTML = `
                <div id="qr-scanner-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>📷 Сканирование QR-кода</h3>
                            <button class="close-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="qr-reader" style="width: 100%;"></div>
                            <div style="margin-top: 20px; text-align: center;">
                                <p style="color: #64748b; margin-bottom: 10px;">Или введите QR-код вручную:</p>
                                <input type="text" id="manual-qr-input" placeholder="Пример: F1_qr_east" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                <button id="submit-manual-qr" style="width: 100%; margin-top: 10px; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                    Определить местоположение
                                </button>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <div id="scanner-status" style="font-size: 14px; color: #64748b; text-align: center; padding: 10px;">
                                Наведите камеру на QR-код
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }

    setupEventListeners() {
        // Кнопка открытия сканера
        const scanBtn = document.getElementById('scan-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.openScanner());
        }

        // Закрытие модального окна
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-modal') || 
                e.target.id === 'qr-scanner-modal') {
                this.closeScanner();
            }
        });

        // Ручной ввод QR-кода
        document.addEventListener('click', (e) => {
            if (e.target.id === 'submit-manual-qr') {
                this.handleManualInput();
            }
        });

        // Enter для ручного ввода
        const manualInput = document.getElementById('manual-qr-input');
        if (manualInput) {
            manualInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleManualInput();
                }
            });
        }
    }

    openScanner() {
        console.log('📷 Открытие сканера QR-кодов');
        const modal = document.getElementById('qr-scanner-modal');
        if (!modal) return;

        modal.style.display = 'flex';
        this.startScanner();
    }

    closeScanner() {
        console.log('📷 Закрытие сканера QR-кодов');
        const modal = document.getElementById('qr-scanner-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        this.stopScanner();
        
        // Очищаем поле ручного ввода
        const manualInput = document.getElementById('manual-qr-input');
        if (manualInput) {
            manualInput.value = '';
        }
    }

    startScanner() {
        if (this.isScanning) {
            console.log('⚠️ Сканер уже запущен');
            return;
        }

        console.log('🔄 Запуск сканера QR-кодов');
        
        try {
            // Инициализируем сканер
            this.scanner = new Html5Qrcode("qr-reader");
            
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            this.scanner.start(
                { facingMode: "environment" }, // Используем заднюю камеру
                config,
                (decodedText) => {
                    console.log('✅ QR-код распознан:', decodedText);
                    this.handleQRCode(decodedText);
                },
                (errorMessage) => {
                    // Игнорируем ошибки при сканировании
                }
            ).then(() => {
                this.isScanning = true;
                this.updateStatus('Сканирование...', 'info');
            }).catch((err) => {
                console.error('❌ Ошибка запуска сканера:', err);
                this.updateStatus('Ошибка доступа к камере', 'error');
                this.showCameraError();
            });

        } catch (error) {
            console.error('❌ Ошибка инициализации сканера:', error);
            this.updateStatus('Браузер не поддерживает сканирование', 'error');
        }
    }

    stopScanner() {
        if (this.scanner && this.isScanning) {
            console.log('🛑 Остановка сканера');
            this.scanner.stop().then(() => {
                this.isScanning = false;
                this.scanner = null;
            }).catch((err) => {
                console.error('❌ Ошибка остановки сканера:', err);
            });
        }
    }

    handleQRCode(qrCode) {
        // Извлекаем ID из QR-кода (может быть полный URL или просто ID)
        let qrId = qrCode.trim();
        
        // Если QR содержит URL, извлекаем последнюю часть
        if (qrId.includes('/')) {
            qrId = qrId.split('/').pop();
        }
        
        console.log('🔍 Обработка QR-кода:', qrId);
        
        // Проверяем валидность QR-кода
        if (!this.isValidQRCode(qrId)) {
            this.updateStatus(`Неизвестный QR-код: ${qrId}`, 'error');
            this.playSound('error');
            return;
        }
        
        // Останавливаем сканер
        this.stopScanner();
        
        // Обновляем статус
        this.updateStatus(`QR-код распознан: ${qrId}`, 'success');
        this.playSound('success');
        
        // Закрываем сканер через секунду
        setTimeout(() => {
            this.closeScanner();
            this.processQRCode(qrId);
        }, 1000);
    }

    handleManualInput() {
        const manualInput = document.getElementById('manual-qr-input');
        if (!manualInput) return;
        
        const qrCode = manualInput.value.trim();
        if (!qrCode) {
            this.updateStatus('Введите QR-код', 'error');
            return;
        }
        
        console.log('🔍 Ручной ввод QR-кода:', qrCode);
        this.processQRCode(qrCode);
        this.closeScanner();
    }

    processQRCode(qrCode) {
        console.log('🔄 Обработка QR-кода:', qrCode);
        
        // Показываем уведомление
        this.showNotification(`QR-код распознан: ${qrCode}`, 'info');
        
        // Определяем местоположение через API
        if (window.navigator && window.navigator.api) {
            window.navigator.api.scanQRCode(qrCode)
                .then(result => {
                    if (result.success && result.point) {
                        // Устанавливаем текущее местоположение
                        window.navigator.setCurrentLocation(result.point);
                        this.showNotification(`📍 ${result.message}`, 'success');
                    } else {
                        this.showNotification('❌ QR-код не найден в системе', 'error');
                    }
                })
                .catch(error => {
                    console.error('❌ Ошибка сканирования QR:', error);
                    // Альтернатива: пытаемся найти точку по ID
                    this.findPointByQR(qrCode);
                });
        } else {
            // Альтернатива если API не доступен
            this.findPointByQR(qrCode);
        }
    }

    findPointByQR(qrId) {
        // Ищем точку по QR-коду в локальных данных
        if (window.navigator && window.navigator.locations) {
            const location = window.navigator.locations.find(
                loc => loc.qr_code === qrId || loc.id === qrId
            );
            
            if (location) {
                window.navigator.setCurrentLocation(location);
                this.showNotification(`📍 Определено местоположение: ${location.name}`, 'success');
            } else {
                this.showNotification('❌ Местоположение не найдено', 'error');
            }
        } else {
            this.showNotification('❌ Данные локаций не загружены', 'error');
        }
    }

    isValidQRCode(qrCode) {
        // Проверяем что QR-код есть в списке валидных
        return this.validQRCodes.includes(qrCode);
    }

    updateStatus(message, type = 'info') {
        const statusEl = document.getElementById('scanner-status');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.style.color = type === 'error' ? '#ef4444' : 
                              type === 'success' ? '#10b981' : '#64748b';
    }

    showCameraError() {
        const qrReader = document.getElementById('qr-reader');
        if (qrReader) {
            qrReader.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 250px; color: #64748b; text-align: center; padding: 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📵</div>
                    <h4 style="margin-bottom: 8px; color: #1e293b;">Доступ к камере запрещен</h4>
                    <p style="margin-bottom: 16px; font-size: 14px;">
                        Разрешите доступ к камере в настройках браузера<br>
                        или используйте ручной ввод QR-кода
                    </p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1; font-size: 12px;">
                        <strong>Доступные QR-коды:</strong><br>
                        ${this.validQRCodes.join(', ')}
                    </div>
                </div>
            `;
        }
    }

    playSound(type) {
        // Простые звуковые эффекты через Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = type === 'success' ? 800 : 300;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('⚠️ Звук не поддерживается');
        }
    }

    showNotification(message, type = 'info') {
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
}

// Создаем глобальный экземпляр
window.QRScanner = QRScanner;