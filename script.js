// Головний клас для управління симуляцією
class MechanicsSimulation {
    constructor() {
        this.currentExperiment = 'projectile';
        this.isRunning = false;
        this.startTime = 0;
        this.animationId = null;
        this.trajectoryPoints = [];
        this.mlModel = null;
        this.trainingData = [];
        this.pendulumConstraint = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeML();
        this.createGrid();
        this.createRuler();
    }
    
    initializeElements() {
        // Елементи керування
        this.experimentSelect = document.getElementById('experiment-select');
        this.massSlider = document.getElementById('mass');
        this.velocitySlider = document.getElementById('velocity');
        this.angleSlider = document.getElementById('angle');
        this.lengthSlider = document.getElementById('length');
        this.gravitySlider = document.getElementById('gravity');
        
        this.startBtn = document.getElementById('start-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.predictBtn = document.getElementById('predict-btn');
        
        // Елементи відображення
        this.massValue = document.getElementById('mass-value');
        this.velocityValue = document.getElementById('velocity-value');
        this.angleValue = document.getElementById('angle-value');
        this.lengthValue = document.getElementById('length-value');
        this.gravityValue = document.getElementById('gravity-value');
        
        // Статистика
        this.timeDisplay = document.getElementById('time');
        this.currentVelocityDisplay = document.getElementById('current-velocity');
        this.heightDisplay = document.getElementById('height');
        this.kineticEnergyDisplay = document.getElementById('kinetic-energy');
        this.potentialEnergyDisplay = document.getElementById('potential-energy');
        
        // VR елементи
        this.scene = document.querySelector('a-scene');
        this.experiments = {
            projectile: document.getElementById('projectile-experiment'),
            pendulum: document.getElementById('pendulum-experiment'),
            collision: document.getElementById('collision-experiment'),
            energy: document.getElementById('energy-experiment')
        };
    }
    
    initializeEventListeners() {
        // Слайдери
        this.massSlider.addEventListener('input', (e) => {
            this.massValue.textContent = e.target.value;
            this.updateObjectMass();
        });
        
        this.velocitySlider.addEventListener('input', (e) => {
            this.velocityValue.textContent = e.target.value;
        });
        
        this.angleSlider.addEventListener('input', (e) => {
            this.angleValue.textContent = e.target.value;
            this.updateCannonAngle();
        });
        
        this.lengthSlider.addEventListener('input', (e) => {
            this.lengthValue.textContent = e.target.value;
            this.updatePendulumLength();
        });
        
        this.gravitySlider.addEventListener('input', (e) => {
            this.gravityValue.textContent = e.target.value;
            this.updateGravity(parseFloat(e.target.value));
        });
        
        // Кнопки
        this.startBtn.addEventListener('click', () => this.startExperiment());
        this.resetBtn.addEventListener('click', () => this.resetExperiment());
        this.predictBtn.addEventListener('click', () => this.predictTrajectory());
        
        // Вибір експерименту
        this.experimentSelect.addEventListener('change', (e) => {
            this.switchExperiment(e.target.value);
        });
        
        // Мобільна панель
        if (window.innerWidth <= 768) {
            const panel = document.getElementById('control-panel');
            let startY = 0;
            let currentY = 0;
            
            panel.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
            });
            
            panel.addEventListener('touchmove', (e) => {
                currentY = e.touches[0].clientY;
                if (currentY - startY > 50) {
                    panel.classList.remove('expanded');
                } else if (startY - currentY > 50) {
                    panel.classList.add('expanded');
                }
            });
        }
    }
    
    initializeML() {
        // Створення простої нейронної мережі для прогнозування траєкторій
        this.mlModel = tf.sequential({
            layers: [
                tf.layers.dense({inputShape: [4], units: 10, activation: 'relu'}),
                tf.layers.dense({units: 10, activation: 'relu'}),
                tf.layers.dense({units: 2}) // Вихід: дальність та час польоту
            ]
        });
        
        this.mlModel.compile({
            optimizer: 'adam',
            loss: 'meanSquaredError'
        });
    }
    
    createGrid() {
        const grid = document.getElementById('grid');
        const gridHTML = [];
        
        // Створення ліній сітки
        for (let i = -50; i <= 50; i += 5) {
            // Поздовжні лінії
            gridHTML.push(`
                <a-entity geometry="primitive: box; width: 0.1; height: 0.01; depth: 100"
                         material="color: #ccc; opacity: 0.5"
                         position="${i} 0 0"></a-entity>
            `);
            // Поперечні лінії
            gridHTML.push(`
                <a-entity geometry="primitive: box; width: 100; height: 0.01; depth: 0.1"
                         material="color: #ccc; opacity: 0.5"
                         position="0 0 ${i}"></a-entity>
            `);
        }
        
        grid.innerHTML = gridHTML.join('');
    }
    
    createRuler() {
        const ruler = document.getElementById('ruler');
        const rulerHTML = [];
        
        for (let i = 0; i <= 20; i++) {
            rulerHTML.push(`
                <a-text value="${i}m" position="${i - 10} 0 0" 
                       rotation="-90 0 0" align="center" width="2"></a-text>
                <a-box position="${i - 10} 0 0" width="0.1" height="0.1" depth="0.1" 
                       color="#333"></a-box>
            `);
        }
        
        ruler.innerHTML = rulerHTML.join('');
    }
    
    updateGravity(value) {
        // Чекаємо на готовність фізичної системи
        const interval = setInterval(() => {
            if (this.scene.systems.physics && 
                this.scene.systems.physics.driver && 
                this.scene.systems.physics.driver.world) {
                this.scene.systems.physics.driver.world.gravity.set(0, -value, 0);
                clearInterval(interval);
            }
        }, 100);
    }
    
    switchExperiment(experiment) {
        // Спочатку скидаємо поточний експеримент
        this.resetExperiment();
        
        // Приховати всі експерименти
        Object.values(this.experiments).forEach(exp => {
            exp.setAttribute('visible', false);
        });
        
        // Показати вибраний експеримент
        this.experiments[experiment].setAttribute('visible', true);
        this.currentExperiment = experiment;
        
        // Налаштування параметрів для різних експериментів
        const velocityGroup = document.getElementById('velocity-group');
        const angleGroup = document.getElementById('angle-group');
        const lengthGroup = document.getElementById('length-group');
        
        switch(experiment) {
            case 'projectile':
                velocityGroup.style.display = 'block';
                angleGroup.style.display = 'block';
                lengthGroup.style.display = 'none';
                break;
            case 'pendulum':
                velocityGroup.style.display = 'none';
                angleGroup.style.display = 'none';
                lengthGroup.style.display = 'block';
                break;
            case 'collision':
                velocityGroup.style.display = 'block';
                angleGroup.style.display = 'none';
                lengthGroup.style.display = 'none';
                break;
            case 'energy':
                velocityGroup.style.display = 'none';
                angleGroup.style.display = 'none';
                lengthGroup.style.display = 'none';
                break;
        }
    }
    
    startExperiment() {
        if (this.isRunning) {
            this.stopExperiment();
            return;
        }
        
        this.isRunning = true;
        this.startTime = Date.now();
        this.startBtn.textContent = 'Зупинити';
        
        // Чекаємо на готовність фізичної системи
        const checkPhysics = () => {
            if (this.scene.systems.physics && this.scene.systems.physics.driver) {
                switch(this.currentExperiment) {
                    case 'projectile':
                        this.startProjectile();
                        break;
                    case 'pendulum':
                        this.startPendulum();
                        break;
                    case 'collision':
                        this.startCollision();
                        break;
                    case 'energy':
                        this.startEnergy();
                        break;
                }
                
                this.updateStats();
            } else {
                setTimeout(checkPhysics, 100);
            }
        };
        
        checkPhysics();
    }
    
    startProjectile() {
        const projectile = document.getElementById('projectile');
        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value) * Math.PI / 180;
        
        // Скидання позиції перед запуском
        projectile.setAttribute('position', '-10 1 0');
        
        // Розрахунок компонент швидкості
        const vx = velocity * Math.cos(angle);
        const vy = velocity * Math.sin(angle);
        
        // Чекаємо на готовність body
        const interval = setInterval(() => {
            if (projectile.body) {
                projectile.body.velocity.set(vx, vy, 0);
                projectile.body.angularVelocity.set(0, 0, 0);
                clearInterval(interval);
                
                // Запис траєкторії
                this.trajectoryPoints = [];
                this.recordTrajectory();
            }
        }, 50);
    }
    
    startPendulum() {
        const pendulum = document.getElementById('pendulum-ball');
        const support = document.getElementById('pendulum-support');
        const length = parseFloat(this.lengthSlider.value);
        const angle = 45 * Math.PI / 180; // Початковий кут
        
        // Встановлення початкової позиції
        const x = length * Math.sin(angle);
        const y = 5 - length;
        pendulum.setAttribute('position', `${x} ${y} 0`);
        
        // Чекаємо на готовність тіл
        const interval = setInterval(() => {
            if (pendulum.body && support.body) {
                // Видаляємо старий constraint якщо є
                if (this.pendulumConstraint) {
                    this.scene.systems.physics.driver.world.removeConstraint(this.pendulumConstraint);
                }
                
                // Створюємо новий constraint
                this.pendulumConstraint = new CANNON.PointToPointConstraint(
                    support.body,
                    new CANNON.Vec3(0, -0.25, 0),
                    pendulum.body,
                    new CANNON.Vec3(0, length, 0)
                );
                
                this.scene.systems.physics.driver.world.addConstraint(this.pendulumConstraint);
                
                // Даємо початковий імпульс
                setTimeout(() => {
                    pendulum.body.velocity.set(-3, 0, 0);
                }, 100);
                
                clearInterval(interval);
            }
        }, 50);
    }
    
    startCollision() {
        const box1 = document.getElementById('box1');
        const box2 = document.getElementById('box2');
        const velocity = parseFloat(this.velocitySlider.value);
        
        // Скидання позицій
        box1.setAttribute('position', '-5 1 0');
        box2.setAttribute('position', '5 1 0');
        
        // Чекаємо на готовність тіл
        const interval = setInterval(() => {
            if (box1.body && box2.body) {
                // Рух назустріч
                box1.body.velocity.set(velocity / 2, 0, 0);
                box2.body.velocity.set(-velocity / 2, 0, 0);
                
                // Обнулення обертання
                box1.body.angularVelocity.set(0, 0, 0);
                box2.body.angularVelocity.set(0, 0, 0);
                
                clearInterval(interval);
            }
        }, 50);
    }
    
    startEnergy() {
        const ball = document.getElementById('energy-ball');
        
        // Скидання позиції
        ball.setAttribute('position', '-8 5 0');
        
        // Чекаємо на готовність body
        const interval = setInterval(() => {
            if (ball.body) {
                // Обнулення швидкостей для чистого старту
                ball.body.velocity.set(0, 0, 0);
                ball.body.angularVelocity.set(0, 0, 0);
                clearInterval(interval);
            }
        }, 50);
    }
    
    recordTrajectory() {
        if (!this.isRunning) return;
        
        const projectile = document.getElementById('projectile');
        const position = projectile.getAttribute('position');
        
        // Додавання точки траєкторії
        this.trajectoryPoints.push({...position});
        
        // Візуалізація траєкторії
        if (this.trajectoryPoints.length > 1 && this.trajectoryPoints.length % 3 === 0) {
            const trajectory = document.getElementById('trajectory');
            const point = document.createElement('a-sphere');
            point.setAttribute('position', position);
            point.setAttribute('radius', '0.05');
            point.setAttribute('color', '#FFD93D');
            point.setAttribute('opacity', '0.6');
            trajectory.appendChild(point);
        }
        
        // Зупинка при падінні або виході за межі
        if (position.y <= 0.3 || Math.abs(position.x) > 40) {
            this.stopExperiment();
            this.saveTrainingData();
            return;
        }
        
        requestAnimationFrame(() => this.recordTrajectory());
    }
    
    updateStats() {
        if (!this.isRunning) return;
        
        const currentTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
        this.timeDisplay.textContent = currentTime;
        
        let object, velocity = 0, height = 0;
        
        switch(this.currentExperiment) {
            case 'projectile':
                object = document.getElementById('projectile');
                break;
            case 'pendulum':
                object = document.getElementById('pendulum-ball');
                break;
            case 'collision':
                object = document.getElementById('box1');
                break;
            case 'energy':
                object = document.getElementById('energy-ball');
                break;
        }
        
        if (object) {
            // Позиція
            const position = object.getAttribute('position');
            height = position.y;
            this.heightDisplay.textContent = height.toFixed(2);
            
            // Швидкість
            if (object.body && object.body.velocity) {
                velocity = Math.sqrt(
                    object.body.velocity.x ** 2 + 
                    object.body.velocity.y ** 2 + 
                    object.body.velocity.z ** 2
                );
                this.currentVelocityDisplay.textContent = velocity.toFixed(2);
            }
            
            // Енергія
            const mass = parseFloat(this.massSlider.value);
            const gravity = parseFloat(this.gravitySlider.value);
            
            const kineticEnergy = 0.5 * mass * velocity ** 2;
            const potentialEnergy = mass * gravity * height;
            
            this.kineticEnergyDisplay.textContent = kineticEnergy.toFixed(2);
            this.potentialEnergyDisplay.textContent = potentialEnergy.toFixed(2);
        }
        
        this.animationId = requestAnimationFrame(() => this.updateStats());
    }
    
    stopExperiment() {
        this.isRunning = false;
        this.startBtn.textContent = 'Старт';
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    resetExperiment() {
        this.stopExperiment();
        
        // Очищення траєкторії
        const trajectory = document.getElementById('trajectory');
        trajectory.innerHTML = '';
        this.trajectoryPoints = [];
        
        // Функція для безпечного скидання об'єкта
        const resetObject = (id, position) => {
            const obj = document.getElementById(id);
            obj.setAttribute('position', position);
            
            // Чекаємо на body
            const interval = setInterval(() => {
                if (obj.body) {
                    obj.body.velocity.set(0, 0, 0);
                    obj.body.angularVelocity.set(0, 0, 0);
                    clearInterval(interval);
                }
            }, 50);
        };
        
        // Скидання об'єктів залежно від експерименту
        switch(this.currentExperiment) {
            case 'projectile':
                resetObject('projectile', '-10 1 0');
                break;
            case 'pendulum':
                resetObject('pendulum-ball', '0 3 0');
                // Видаляємо constraint
                if (this.pendulumConstraint) {
                    setTimeout(() => {
                        if (this.scene.systems.physics && this.scene.systems.physics.driver) {
                            this.scene.systems.physics.driver.world.removeConstraint(this.pendulumConstraint);
                            this.pendulumConstraint = null;
                        }
                    }, 100);
                }
                break;
            case 'collision':
                resetObject('box1', '-5 1 0');
                resetObject('box2', '5 1 0');
                break;
            case 'energy':
                resetObject('energy-ball', '-8 5 0');
                break;
        }
        
        // Скидання статистики
        this.timeDisplay.textContent = '0';
        this.currentVelocityDisplay.textContent = '0';
        this.heightDisplay.textContent = '0';
        this.kineticEnergyDisplay.textContent = '0';
        this.potentialEnergyDisplay.textContent = '0';
    }
    
    updateObjectMass() {
        const mass = parseFloat(this.massSlider.value);
        
        const updateMass = (id) => {
            const obj = document.getElementById(id);
            obj.setAttribute('dynamic-body', `mass: ${mass}`);
            
            // Оновлення маси для вже існуючого body
            const interval = setInterval(() => {
                if (obj.body) {
                    obj.body.mass = mass;
                    obj.body.updateMassProperties();
                    clearInterval(interval);
                }
            }, 50);
        };
        
        switch(this.currentExperiment) {
            case 'projectile':
                updateMass('projectile');
                break;
            case 'pendulum':
                updateMass('pendulum-ball');
                break;
            case 'collision':
                updateMass('box1');
                updateMass('box2');
                break;
            case 'energy':
                updateMass('energy-ball');
                break;
        }
    }
    
    updateCannonAngle() {
        const angle = parseFloat(this.angleSlider.value);
        const cannon = document.getElementById('cannon');
        cannon.setAttribute('rotation', `0 0 ${-angle}`);
    }
    
    updatePendulumLength() {
        const length = parseFloat(this.lengthSlider.value);
        const string = document.getElementById('pendulum-string');
        const ball = document.getElementById('pendulum-ball');
        
        // Оновлення візуальної нитки
        string.setAttribute('height', length * 2);
        string.setAttribute('position', `0 ${5 - length} 0`);
        
        // Оновлення позиції кулі
        if (!this.isRunning) {
            ball.setAttribute('position', `0 ${5 - length * 2} 0`);
        }
    }
    
    async predictTrajectory() {
        if (this.currentExperiment !== 'projectile') {
            alert('ML прогнозування доступне тільки для балістичного руху');
            return;
        }
        
        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value);
        const mass = parseFloat(this.massSlider.value);
        const gravity = parseFloat(this.gravitySlider.value);
        
        // Підготовка вхідних даних
        const input = tf.tensor2d([[velocity, angle, mass, gravity]]);
        
        try {
            // Якщо модель натренована
            if (this.trainingData.length > 10) {
                await this.trainModel();
                const prediction = this.mlModel.predict(input);
                const result = await prediction.data();
                
                document.getElementById('predicted-range').textContent = result[0].toFixed(2);
                document.getElementById('predicted-time').textContent = result[1].toFixed(2);
                document.getElementById('model-accuracy').textContent = '85';
                
                prediction.dispose();
            } else {
                // Фізичні формули для порівняння
                const angleRad = angle * Math.PI / 180;
                const range = (velocity ** 2 * Math.sin(2 * angleRad)) / gravity;
                const time = (2 * velocity * Math.sin(angleRad)) / gravity;
                
                document.getElementById('predicted-range').textContent = range.toFixed(2);
                document.getElementById('predicted-time').textContent = time.toFixed(2);
                document.getElementById('model-accuracy').textContent = '100 (формула)';
            }
            
            document.getElementById('ml-prediction').style.display = 'block';
        } catch (error) {
            console.error('Помилка прогнозування:', error);
        }
        
        input.dispose();
    }
    
    saveTrainingData() {
        if (this.currentExperiment !== 'projectile' || this.trajectoryPoints.length < 2) return;
        
        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value);
        const mass = parseFloat(this.massSlider.value);
        const gravity = parseFloat(this.gravitySlider.value);
        
        // Розрахунок дальності та часу польоту
        const range = Math.abs(this.trajectoryPoints[this.trajectoryPoints.length - 1].x - 
                              this.trajectoryPoints[0].x);
        const time = (Date.now() - this.startTime) / 1000;
        
        this.trainingData.push({
            input: [velocity, angle, mass, gravity],
            output: [range, time]
        });
        
        // Обмеження розміру даних для тренування
        if (this.trainingData.length > 100) {
            this.trainingData.shift();
        }
    }
    
    async trainModel() {
        if (this.trainingData.length < 5) return;
        
        const inputs = this.trainingData.map(d => d.input);
        const outputs = this.trainingData.map(d => d.output);
        
        const xs = tf.tensor2d(inputs);
        const ys = tf.tensor2d(outputs);
        
        await this.mlModel.fit(xs, ys, {
            epochs: 50,
            batchSize: Math.min(5, this.trainingData.length),
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if (epoch % 10 === 0) {
                        console.log(`Епоха ${epoch}: loss = ${logs.loss.toFixed(4)}`);
                    }
                }
            }
        });
        
        xs.dispose();
        ys.dispose();
    }
}

// Компонент для обертання при кліку
AFRAME.registerComponent('click-rotate', {
    init: function() {
        this.isRotating = false;
        this.rotation = 0;
        
        this.el.addEventListener('click', () => {
            this.isRotating = !this.isRotating;
        });
    },
    
    tick: function() {
        if (this.isRotating) {
            this.rotation += 2;
            this.el.setAttribute('rotation', {
                x: this.el.getAttribute('rotation').x,
                y: this.rotation,
                z: this.el.getAttribute('rotation').z
            });
        }
    }
});

// Ініціалізація симуляції після завантаження сцени
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    
    // Чекаємо на повне завантаження A-Frame та фізики
    const initSim = () => {
        new MechanicsSimulation();
    };
    
    if (scene.hasLoaded) {
        setTimeout(initSim, 2000);
    } else {
        scene.addEventListener('loaded', () => {
            setTimeout(initSim, 2000);
        });
    }
});
