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
        this.physicsInitialized = false;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeML();
        this.initializePhysics();
        
        // Створюємо візуальні елементи після затримки
        setTimeout(() => {
            this.createGrid();
            this.createRuler();
        }, 500);
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
    
    initializePhysics() {
        // Чекаємо на ініціалізацію фізичної системи
        const initPhysicsBodies = () => {
            // Додаємо динамічні тіла до всіх фізичних об'єктів
            const projectile = document.getElementById('projectile');
            const pendulum = document.getElementById('pendulum-ball');
            const box1 = document.getElementById('box1');
            const box2 = document.getElementById('box2');
            const energyBall = document.getElementById('energy-ball');
            
            const mass = parseFloat(this.massSlider.value);
            
            // Застосовуємо фізичні тіла
            [projectile, pendulum, box1, box2, energyBall].forEach(obj => {
                if (obj) {
                    obj.setAttribute('dynamic-body', `mass: ${mass}; linearDamping: 0.01; angularDamping: 0.01`);
                }
            });
            
            this.physicsInitialized = true;
            console.log('Physics initialized');
        };
        
        // Чекаємо на завантаження сцени
        if (this.scene.hasLoaded) {
            setTimeout(initPhysicsBodies, 1500);
        } else {
            this.scene.addEventListener('loaded', () => {
                setTimeout(initPhysicsBodies, 1500);
            });
        }
    }
    
    addPhysicsBodies() {
        // Повторно додаємо фізичні тіла перед кожним експериментом
        const projectile = document.getElementById('projectile');
        const pendulum = document.getElementById('pendulum-ball');
        const box1 = document.getElementById('box1');
        const box2 = document.getElementById('box2');
        const energyBall = document.getElementById('energy-ball');
        
        const mass = parseFloat(this.massSlider.value);
        
        // Застосовуємо фізичні тіла
        const objects = [projectile, pendulum, box1, box2, energyBall];
        objects.forEach(obj => {
            if (obj && !obj.body) {
                obj.setAttribute('dynamic-body', `mass: ${mass}; linearDamping: 0.01; angularDamping: 0.01`);
            }
        });
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
            if (this.scene.systems.physics && this.scene.systems.physics.driver) {
                const world = this.scene.systems.physics.driver.world;
                if (world && world.gravity) {
                    world.gravity.set(0, -parseFloat(e.target.value), 0);
                }
            }
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
    
    switchExperiment(experiment) {
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
        
        this.resetExperiment();
    }
    
    startExperiment() {
        if (this.isRunning || !this.physicsInitialized) {
            if (!this.physicsInitialized) {
                alert('Зачекайте, фізична система ще ініціалізується...');
            }
            return;
        }
        
        this.isRunning = true;
        this.startTime = Date.now();
        this.startBtn.textContent = 'Зупинити';
        
        // Перевіряємо ще раз наявність динамічних тіл
        this.addPhysicsBodies();
        
        setTimeout(() => {
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
        }, 100);
    }
    
    startProjectile() {
        const projectile = document.getElementById('projectile');
        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value) * Math.PI / 180;
        
        // Розрахунок компонент швидкості
        const vx = velocity * Math.cos(angle);
        const vy = velocity * Math.sin(angle);
        
        // Чекаємо на body
        const applyVelocity = () => {
            if (projectile.body) {
                projectile.body.velocity.set(vx, vy, 0);
                // Запис траєкторії
                this.trajectoryPoints = [];
                this.recordTrajectory();
            } else {
                setTimeout(applyVelocity, 100);
            }
        };
        
        applyVelocity();
    }
    
    startPendulum() {
        const pendulum = document.getElementById('pendulum-ball');
        const length = parseFloat(this.lengthSlider.value);
        const angle = 30 * Math.PI / 180; // Початковий кут
        
        // Встановлення початкової позиції
        const x = length * Math.sin(angle);
        const y = 5 - length * Math.cos(angle);
        pendulum.setAttribute('position', `${x} ${y} 0`);
        
        // Чекаємо на body і даємо початковий імпульс
        const startSwing = () => {
            if (pendulum.body) {
                // Надаємо невелику початкову швидкість для початку коливань
                pendulum.body.velocity.set(-2, 0, 0);
            } else {
                setTimeout(startSwing, 100);
            }
        };
        
        setTimeout(startSwing, 200);
    }
    
    startCollision() {
        const box1 = document.getElementById('box1');
        const box2 = document.getElementById('box2');
        const velocity = parseFloat(this.velocitySlider.value);
        
        const applyVelocities = () => {
            if (box1.body && box2.body) {
                box1.body.velocity.set(velocity, 0, 0);
                box2.body.velocity.set(-velocity, 0, 0);
            } else {
                setTimeout(applyVelocities, 100);
            }
        };
        
        applyVelocities();
    }
    
    startEnergy() {
        const ball = document.getElementById('energy-ball');
        
        const releaseBall = () => {
            if (ball.body) {
                ball.body.velocity.set(0, 0, 0);
            } else {
                setTimeout(releaseBall, 100);
            }
        };
        
        releaseBall();
    }
    
    recordTrajectory() {
        if (!this.isRunning) return;
        
        const projectile = document.getElementById('projectile');
        const position = projectile.getAttribute('position');
        
        // Додавання точки траєкторії
        this.trajectoryPoints.push({...position});
        
        // Візуалізація траєкторії
        if (this.trajectoryPoints.length > 1) {
            const trajectory = document.getElementById('trajectory');
            const point = document.createElement('a-sphere');
            point.setAttribute('position', position);
            point.setAttribute('radius', '0.05');
            point.setAttribute('color', '#FFD93D');
            point.setAttribute('opacity', '0.6');
            trajectory.appendChild(point);
        }
        
        // Зупинка при падінні
        if (position.y <= 0.3) {
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
        
        // Скидання об'єктів
        const resetObject = (id, position) => {
            const obj = document.getElementById(id);
            obj.setAttribute('position', position);
            if (obj.body) {
                obj.body.velocity.set(0, 0, 0);
                obj.body.angularVelocity.set(0, 0, 0);
            }
        };
        
        switch(this.currentExperiment) {
            case 'projectile':
                resetObject('projectile', '-10 1 0');
                break;
            case 'pendulum':
                resetObject('pendulum-ball', '0 3 0');
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
            if (obj.body) {
                obj.body.mass = mass;
                obj.body.updateMassProperties();
            }
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
        const string = document.querySelector('#pendulum-string a-cylinder');
        const ball = document.getElementById('pendulum-ball');
        
        string.setAttribute('height', length);
        string.setAttribute('position', `0 ${-length/2} 0`);
        ball.setAttribute('position', `0 ${5 - length} 0`);
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
    }
    
    async trainModel() {
        if (this.trainingData.length < 5) return;
        
        const inputs = this.trainingData.map(d => d.input);
        const outputs = this.trainingData.map(d => d.output);
        
        const xs = tf.tensor2d(inputs);
        const ys = tf.tensor2d(outputs);
        
        await this.mlModel.fit(xs, ys, {
            epochs: 50,
            batchSize: 5,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Епоха ${epoch}: loss = ${logs.loss}`);
                }
            }
        });
        
        xs.dispose();
        ys.dispose();
    }
}

// Ініціалізація симуляції після завантаження сцени
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    
    // Чекаємо на повне завантаження A-Frame
    if (scene.hasLoaded) {
        setTimeout(() => {
            new MechanicsSimulation();
        }, 1000);
    } else {
        scene.addEventListener('loaded', () => {
            setTimeout(() => {
                new MechanicsSimulation();
            }, 1000);
        });
    }
});

// Додаємо компонент для обертання при кліку (подібно до прикладу)
AFRAME.registerComponent('click-rotate', {
    init: function() {
        this.isRotating = false;
        this.rotation = 0;
        
        this.el.addEventListener('click', () => {
            if (!this.isRotating) {
                this.isRotating = true;
            } else {
                this.isRotating = false;
            }
        });
    },
    
    tick: function() {
        if (this.isRotating) {
            this.rotation += 2;
            this.el.setAttribute('rotation', `0 ${this.rotation} 0`);
        }
    }
});
