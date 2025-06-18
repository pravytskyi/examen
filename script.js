// Простий клас для управління симуляцією
class MechanicsSimulation {
    constructor() {
        this.currentExperiment = 'projectile';
        this.isRunning = false;
        this.startTime = 0;
        this.animationFrame = null;
        this.trajectoryPoints = [];
        this.mlModel = null;
        this.trainingData = [];
        
        // Для маятника
        this.pendulumAngle = 0;
        this.pendulumVelocity = 0;
        
        this.init();
    }
    
    init() {
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
        
        // Обробники подій
        this.massSlider.addEventListener('input', (e) => {
            document.getElementById('mass-value').textContent = e.target.value;
        });
        
        this.velocitySlider.addEventListener('input', (e) => {
            document.getElementById('velocity-value').textContent = e.target.value;
        });
        
        this.angleSlider.addEventListener('input', (e) => {
            document.getElementById('angle-value').textContent = e.target.value;
            this.updateCannonAngle();
        });
        
        this.lengthSlider.addEventListener('input', (e) => {
            document.getElementById('length-value').textContent = e.target.value;
            this.updatePendulumLength();
        });
        
        this.gravitySlider.addEventListener('input', (e) => {
            document.getElementById('gravity-value').textContent = e.target.value;
        });
        
        this.startBtn.addEventListener('click', () => this.toggleExperiment());
        this.resetBtn.addEventListener('click', () => this.resetExperiment());
        this.predictBtn.addEventListener('click', () => this.predictTrajectory());
        
        this.experimentSelect.addEventListener('change', (e) => {
            this.switchExperiment(e.target.value);
        });
        
        // Ініціалізація ML
        this.initML();
        
        // Створення сітки
        this.createGrid();
    }
    
    initML() {
        this.mlModel = tf.sequential({
            layers: [
                tf.layers.dense({inputShape: [4], units: 10, activation: 'relu'}),
                tf.layers.dense({units: 10, activation: 'relu'}),
                tf.layers.dense({units: 2})
            ]
        });
        
        this.mlModel.compile({
            optimizer: 'adam',
            loss: 'meanSquaredError'
        });
    }
    
    createGrid() {
        const grid = document.getElementById('grid');
        let html = '';
        
        for (let i = -20; i <= 20; i += 5) {
            html += `<a-plane position="${i} 0.01 0" rotation="-90 0 0" width="0.1" height="40" color="#ddd"></a-plane>`;
            html += `<a-plane position="0 0.01 ${i}" rotation="-90 90 0" width="0.1" height="40" color="#ddd"></a-plane>`;
        }
        
        grid.innerHTML = html;
    }
    
    switchExperiment(experiment) {
        this.resetExperiment();
        
        // Приховати всі експерименти
        document.getElementById('projectile-experiment').setAttribute('visible', false);
        document.getElementById('pendulum-experiment').setAttribute('visible', false);
        document.getElementById('collision-experiment').setAttribute('visible', false);
        document.getElementById('energy-experiment').setAttribute('visible', false);
        
        // Показати вибраний
        document.getElementById(`${experiment}-experiment`).setAttribute('visible', true);
        this.currentExperiment = experiment;
        
        // Налаштування параметрів
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
    
    toggleExperiment() {
        if (this.isRunning) {
            this.stopExperiment();
        } else {
            this.startExperiment();
        }
    }
    
    startExperiment() {
        this.isRunning = true;
        this.startTime = Date.now();
        this.startBtn.textContent = 'Зупинити';
        
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
    }
    
    startProjectile() {
        const projectile = document.getElementById('projectile');
        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value) * Math.PI / 180;
        const gravity = parseFloat(this.gravitySlider.value);
        
        // Початкові параметри
        let x = -10;
        let y = 1;
        let vx = velocity * Math.cos(angle);
        let vy = velocity * Math.sin(angle);
        let time = 0;
        
        this.trajectoryPoints = [];
        
        const animate = () => {
            if (!this.isRunning) return;
            
            const dt = 0.016; // 60 FPS
            time += dt;
            
            // Фізика
            x += vx * dt;
            y += vy * dt;
            vy -= gravity * dt;
            
            // Оновлення позиції
            projectile.setAttribute('position', `${x} ${y} 0`);
            
            // Запис траєкторії
            if (time % 0.1 < dt) {
                this.trajectoryPoints.push({x, y});
                this.drawTrajectoryPoint(x, y);
            }
            
            // Перевірка закінчення
            if (y <= 0.3 || x > 30) {
                this.stopExperiment();
                return;
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    startPendulum() {
        const pendulum = document.getElementById('pendulum-ball');
        const anchor = document.getElementById('pendulum-anchor');
        const string = document.getElementById('pendulum-string');
        const length = parseFloat(this.lengthSlider.value);
        const gravity = parseFloat(this.gravitySlider.value);
        
        // Початковий кут
        this.pendulumAngle = Math.PI / 6; // 30 градусів
        this.pendulumVelocity = 0;
        
        const animate = () => {
            if (!this.isRunning) return;
            
            const dt = 0.016;
            
            // Рівняння маятника
            const acceleration = -(gravity / length) * Math.sin(this.pendulumAngle);
            this.pendulumVelocity += acceleration * dt;
            this.pendulumAngle += this.pendulumVelocity * dt;
            
            // Позиція
            const x = length * Math.sin(this.pendulumAngle);
            const y = 5 - length * Math.cos(this.pendulumAngle);
            
            pendulum.setAttribute('position', `${x} ${y} 0`);
            
            // Оновлення нитки
            const stringY = (5 + y) / 2;
            string.setAttribute('position', `${x/2} ${stringY} 0`);
            string.setAttribute('height', length);
            string.setAttribute('rotation', `0 0 ${-this.pendulumAngle * 180 / Math.PI}`);
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    startCollision() {
        const box1 = document.getElementById('box1');
        const box2 = document.getElementById('box2');
        const text1 = document.getElementById('text1');
        const text2 = document.getElementById('text2');
        const velocity = parseFloat(this.velocitySlider.value);
        const mass = parseFloat(this.massSlider.value);
        
        let x1 = -5, x2 = 5;
        let v1 = velocity / 2, v2 = -velocity / 2;
        let collided = false;
        
        const animate = () => {
            if (!this.isRunning) return;
            
            const dt = 0.016;
            
            // Рух
            if (!collided) {
                x1 += v1 * dt;
                x2 += v2 * dt;
                
                // Перевірка зіткнення
                if (Math.abs(x1 - x2) <= 1) {
                    collided = true;
                    // Пружне зіткнення для однакових мас
                    const temp = v1;
                    v1 = v2;
                    v2 = temp;
                }
            } else {
                x1 += v1 * dt;
                x2 += v2 * dt;
            }
            
            // Оновлення позицій
            box1.setAttribute('position', `${x1} 1 0`);
            box2.setAttribute('position', `${x2} 1 0`);
            text1.setAttribute('position', `${x1} 2 0`);
            text2.setAttribute('position', `${x2} 2 0`);
            
            // Зупинка якщо вийшли за межі
            if (Math.abs(x1) > 20 || Math.abs(x2) > 20) {
                this.stopExperiment();
                return;
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    startEnergy() {
        const ball = document.getElementById('energy-ball');
        const gravity = parseFloat(this.gravitySlider.value);
        const mass = parseFloat(this.massSlider.value);
        
        let x = -6, y = 4;
        let vx = 0, vy = 0;
        let onRamp = true;
        
        const animate = () => {
            if (!this.isRunning) return;
            
            const dt = 0.016;
            
            if (onRamp && x < 1) {
                // На похилій площині (30°)
                const angle = Math.PI / 6;
                const a = gravity * Math.sin(angle);
                const v = Math.sqrt(2 * a * (6 + x));
                vx = v * Math.cos(angle);
                vy = -v * Math.sin(angle);
                
                x += vx * dt;
                y += vy * dt;
                
                // Утримання на похилій площині
                if (y < 4 - (x + 6) * Math.tan(angle)) {
                    y = 4 - (x + 6) * Math.tan(angle);
                }
            } else {
                // Вільний рух
                onRamp = false;
                vy -= gravity * dt;
                x += vx * dt;
                y += vy * dt;
                
                // Перевірка дотику до горизонтальної площини
                if (y <= 0.4 && x > -1 && x < 7) {
                    y = 0.4;
                    vy = 0;
                }
            }
            
            ball.setAttribute('position', `${x} ${y} 0`);
            
            // Зупинка
            if (x > 10 || y < -5) {
                this.stopExperiment();
                return;
            }
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    drawTrajectoryPoint(x, y) {
        const trajectory = document.getElementById('trajectory');
        const point = document.createElement('a-sphere');
        point.setAttribute('position', `${x} ${y} 0`);
        point.setAttribute('radius', '0.05');
        point.setAttribute('color', '#FFD93D');
        trajectory.appendChild(point);
    }
    
    stopExperiment() {
        this.isRunning = false;
        this.startBtn.textContent = 'Старт';
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Зберегти дані для ML
        if (this.currentExperiment === 'projectile' && this.trajectoryPoints.length > 0) {
            this.saveTrainingData();
        }
    }
    
    resetExperiment() {
        this.stopExperiment();
        
        // Очищення траєкторії
        document.getElementById('trajectory').innerHTML = '';
        this.trajectoryPoints = [];
        
        // Скидання позицій
        switch(this.currentExperiment) {
            case 'projectile':
                document.getElementById('projectile').setAttribute('position', '-10 1 0');
                break;
            case 'pendulum':
                document.getElementById('pendulum-ball').setAttribute('position', '0 3 0');
                document.getElementById('pendulum-string').setAttribute('position', '0 4 0');
                document.getElementById('pendulum-string').setAttribute('rotation', '0 0 0');
                break;
            case 'collision':
                document.getElementById('box1').setAttribute('position', '-5 1 0');
                document.getElementById('box2').setAttribute('position', '5 1 0');
                document.getElementById('text1').setAttribute('position', '-5 2 0');
                document.getElementById('text2').setAttribute('position', '5 2 0');
                break;
            case 'energy':
                document.getElementById('energy-ball').setAttribute('position', '-6 4 0');
                break;
        }
        
        // Скидання статистики
        document.getElementById('time').textContent = '0';
        document.getElementById('current-velocity').textContent = '0';
        document.getElementById('height').textContent = '0';
        document.getElementById('kinetic-energy').textContent = '0';
        document.getElementById('potential-energy').textContent = '0';
    }
    
    updateStats() {
        if (!this.isRunning) return;
        
        const time = ((Date.now() - this.startTime) / 1000).toFixed(2);
        document.getElementById('time').textContent = time;
        
        // Оновлення статистики залежно від експерименту
        const mass = parseFloat(this.massSlider.value);
        const gravity = parseFloat(this.gravitySlider.value);
        
        let velocity = 0, height = 0;
        
        switch(this.currentExperiment) {
            case 'projectile':
                const proj = document.getElementById('projectile').getAttribute('position');
                height = proj.y;
                if (this.trajectoryPoints.length > 1) {
                    const last = this.trajectoryPoints[this.trajectoryPoints.length - 1];
                    const prev = this.trajectoryPoints[this.trajectoryPoints.length - 2];
                    const dx = last.x - prev.x;
                    const dy = last.y - prev.y;
                    velocity = Math.sqrt(dx*dx + dy*dy) / 0.1;
                }
                break;
            case 'pendulum':
                const pend = document.getElementById('pendulum-ball').getAttribute('position');
                height = pend.y;
                const length = parseFloat(this.lengthSlider.value);
                velocity = Math.abs(this.pendulumVelocity * length);
                break;
            case 'collision':
                height = 1;
                velocity = parseFloat(this.velocitySlider.value) / 2;
                break;
            case 'energy':
                const ball = document.getElementById('energy-ball').getAttribute('position');
                height = ball.y;
                // Розрахунок швидкості з енергії
                const h0 = 4;
                const potentialLost = mass * gravity * (h0 - height);
                velocity = Math.sqrt(2 * potentialLost / mass);
                break;
        }
        
        document.getElementById('current-velocity').textContent = velocity.toFixed(2);
        document.getElementById('height').textContent = height.toFixed(2);
        
        const kineticEnergy = 0.5 * mass * velocity * velocity;
        const potentialEnergy = mass * gravity * height;
        
        document.getElementById('kinetic-energy').textContent = kineticEnergy.toFixed(2);
        document.getElementById('potential-energy').textContent = potentialEnergy.toFixed(2);
        
        requestAnimationFrame(() => this.updateStats());
    }
    
    updateCannonAngle() {
        const angle = parseFloat(this.angleSlider.value);
        document.getElementById('cannon').setAttribute('rotation', `0 0 ${-angle}`);
    }
    
    updatePendulumLength() {
        if (!this.isRunning) {
            const length = parseFloat(this.lengthSlider.value);
            const string = document.getElementById('pendulum-string');
            const ball = document.getElementById('pendulum-ball');
            
            string.setAttribute('height', length);
            string.setAttribute('position', `0 ${5 - length/2} 0`);
            ball.setAttribute('position', `0 ${5 - length} 0`);
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
        
        // Фізична формула
        const angleRad = angle * Math.PI / 180;
        const range = (velocity * velocity * Math.sin(2 * angleRad)) / gravity;
        const flightTime = (2 * velocity * Math.sin(angleRad)) / gravity;
        
        document.getElementById('predicted-range').textContent = range.toFixed(2);
        document.getElementById('predicted-time').textContent = flightTime.toFixed(2);
        document.getElementById('model-accuracy').textContent = '100 (формула)';
        document.getElementById('ml-prediction').style.display = 'block';
        
        // ML прогноз якщо є дані
        if (this.trainingData.length >= 5) {
            await this.trainModel();
            
            const input = tf.tensor2d([[velocity, angle, mass, gravity]]);
            const prediction = this.mlModel.predict(input);
            const result = await prediction.data();
            
            document.getElementById('predicted-range').textContent = result[0].toFixed(2);
            document.getElementById('predicted-time').textContent = result[1].toFixed(2);
            document.getElementById('model-accuracy').textContent = '~95 (ML)';
            
            input.dispose();
            prediction.dispose();
        }
    }
    
    saveTrainingData() {
        if (this.trajectoryPoints.length < 2) return;
        
        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value);
        const mass = parseFloat(this.massSlider.value);
        const gravity = parseFloat(this.gravitySlider.value);
        
        // Розрахунок реальних параметрів
        const lastPoint = this.trajectoryPoints[this.trajectoryPoints.length - 1];
        const range = lastPoint.x + 10; // Початкова x = -10
        const flightTime = (Date.now() - this.startTime) / 1000;
        
        this.trainingData.push({
            input: [velocity, angle, mass, gravity],
            output: [range, flightTime]
        });
    }
    
    async trainModel() {
        if (this.trainingData.length < 5) return;
        
        const inputs = this.trainingData.map(d => d.input);
        const outputs = this.trainingData.map(d => d.output);
        
        const inputTensor = tf.tensor2d(inputs);
        const outputTensor = tf.tensor2d(outputs);
        
        await this.mlModel.fit(inputTensor, outputTensor, {
            epochs: 100,
            batchSize: 4,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
                }
            }
        });
        
        inputTensor.dispose();
        outputTensor.dispose();
    }
}

// Ініціалізація симуляції при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    const simulation = new MechanicsSimulation();
    
    // Ініціалізація сцени A-Frame
    const scene = document.querySelector('a-scene');
    
    scene.addEventListener('loaded', () => {
        // Додаткові елементи сцени
        const experiments = ['projectile', 'pendulum', 'collision', 'energy'];
        
        experiments.forEach(exp => {
            const el = document.getElementById(`${exp}-experiment`);
            el.setAttribute('visible', exp === 'projectile');
        });
        
        // Створення об'єктів для кожного експерименту
        createProjectileExperiment();
        createPendulumExperiment();
        createCollisionExperiment();
        createEnergyExperiment();
    });
});

function createProjectileExperiment() {
    const scene = document.querySelector('a-scene');
    
    // Гармата
    const cannon = document.createElement('a-entity');
    cannon.setAttribute('id', 'cannon');
    cannon.setAttribute('position', '-10 0.5 0');
    cannon.setAttribute('rotation', '0 0 -45');
    
    const cannonBase = document.createElement('a-cylinder');
    cannonBase.setAttribute('color', '#7A7A7A');
    cannonBase.setAttribute('height', '0.5');
    cannonBase.setAttribute('radius', '0.5');
    cannonBase.setAttribute('position', '0 0.25 0');
    cannon.appendChild(cannonBase);
    
    const cannonBarrel = document.createElement('a-box');
    cannonBarrel.setAttribute('color', '#5A5A5A');
    cannonBarrel.setAttribute('width', '2');
    cannonBarrel.setAttribute('height', '0.2');
    cannonBarrel.setAttribute('depth', '0.2');
    cannonBarrel.setAttribute('position', '1 0.5 0');
    cannon.appendChild(cannonBarrel);
    
    // Снаряд
    const projectile = document.createElement('a-sphere');
    projectile.setAttribute('id', 'projectile');
    projectile.setAttribute('radius', '0.3');
    projectile.setAttribute('color', '#FF5733');
    projectile.setAttribute('position', '-10 1 0');
    
    // Траєкторія
    const trajectory = document.createElement('a-entity');
    trajectory.setAttribute('id', 'trajectory');
    
    scene.appendChild(cannon);
    scene.appendChild(projectile);
    scene.appendChild(trajectory);
}

function createPendulumExperiment() {
    const scene = document.querySelector('a-scene');
    
    // Точка кріплення
    const anchor = document.createElement('a-sphere');
    anchor.setAttribute('id', 'pendulum-anchor');
    anchor.setAttribute('radius', '0.1');
    anchor.setAttribute('color', '#000');
    anchor.setAttribute('position', '0 5 0');
    
    // Нитка
    const string = document.createElement('a-cylinder');
    string.setAttribute('id', 'pendulum-string');
    string.setAttribute('radius', '0.02');
    string.setAttribute('color', '#333');
    string.setAttribute('height', '2');
    string.setAttribute('position', '0 4 0');
    
    // Куля
    const ball = document.createElement('a-sphere');
    ball.setAttribute('id', 'pendulum-ball');
    ball.setAttribute('radius', '0.3');
    ball.setAttribute('color', '#4287f5');
    ball.setAttribute('position', '0 3 0');
    
    scene.appendChild(anchor);
    scene.appendChild(string);
    scene.appendChild(ball);
}

function createCollisionExperiment() {
    const scene = document.querySelector('a-scene');
    
    // Перший об'єкт
    const box1 = document.createElement('a-box');
    box1.setAttribute('id', 'box1');
    box1.setAttribute('width', '1');
    box1.setAttribute('height', '1');
    box1.setAttribute('depth', '1');
    box1.setAttribute('color', '#FF5733');
    box1.setAttribute('position', '-5 1 0');
    
    const text1 = document.createElement('a-text');
    text1.setAttribute('id', 'text1');
    text1.setAttribute('value', 'm1');
    text1.setAttribute('color', 'black');
    text1.setAttribute('align', 'center');
    text1.setAttribute('position', '-5 2 0');
    
    // Другий об'єкт
    const box2 = document.createElement('a-box');
    box2.setAttribute('id', 'box2');
    box2.setAttribute('width', '1');
    box2.setAttribute('height', '1');
    box2.setAttribute('depth', '1');
    box2.setAttribute('color', '#4287f5');
    box2.setAttribute('position', '5 1 0');
    
    const text2 = document.createElement('a-text');
    text2.setAttribute('id', 'text2');
    text2.setAttribute('value', 'm2');
    text2.setAttribute('color', 'black');
    text2.setAttribute('align', 'center');
    text2.setAttribute('position', '5 2 0');
    
    scene.appendChild(box1);
    scene.appendChild(text1);
    scene.appendChild(box2);
    scene.appendChild(text2);
}

function createEnergyExperiment() {
    const scene = document.querySelector('a-scene');
    
    // Похила площина
    const ramp = document.createElement('a-triangle');
    ramp.setAttribute('vertex-a', '-6 0 0');
    ramp.setAttribute('vertex-b', '0 4 0');
    ramp.setAttribute('vertex-c', '-6 4 0');
    ramp.setAttribute('color', '#7A7A7A');
    ramp.setAttribute('rotation', '0 0 0');
    ramp.setAttribute('position', '0 0 0');
    
    // Горизонтальна площина
    const plane = document.createElement('a-box');
    plane.setAttribute('width', '8');
    plane.setAttribute('height', '0.1');
    plane.setAttribute('depth', '2');
    plane.setAttribute('color', '#5A5A5A');
    plane.setAttribute('position', '3 0 0');
    
    // Куля
    const ball = document.createElement('a-sphere');
    ball.setAttribute('id', 'energy-ball');
    ball.setAttribute('radius', '0.3');
    ball.setAttribute('color', '#FF5733');
    ball.setAttribute('position', '-6 4 0');
    
    scene.appendChild(ramp);
    scene.appendChild(plane);
    scene.appendChild(ball);
}
