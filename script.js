class MechanicsSimulation {
    constructor() {
        this.currentExperiment = 'projectile';
        this.isRunning = false;
        this.animationFrame = null;
        this.startTime = 0;
        
        // ML-специфічні властивості
        this.trainingData = { inputs: [], outputs: [] };
        this.model = null;
        this.lastProjectileParams = null;
        
        // Властивості для траєкторії
        this.trajectoryPoints = [];

        this.init();
        this.createModel();
    }
    
    init() {
        // ... (код отримання елементів керування без змін) ...
        this.experimentSelect = document.getElementById('experiment-select');
        this.mass1Slider = document.getElementById('mass1');
        this.mass2Slider = document.getElementById('mass2');
        this.velocitySlider = document.getElementById('velocity');
        this.angleSlider = document.getElementById('angle');
        this.lengthSlider = document.getElementById('length');
        this.gravitySlider = document.getElementById('gravity');
        this.startBtn = document.getElementById('start-btn');
        this.resetBtn = document.getElementById('reset-btn');
        
        // ... (код отримання елементів статистики без змін) ...
        this.timeSpan = document.getElementById('time');
        this.velocitySpan = document.getElementById('current-velocity');
        this.heightSpan = document.getElementById('height');
        this.keSpan = document.getElementById('kinetic-energy');
        this.peSpan = document.getElementById('potential-energy');
        this.totalEnergyP = document.getElementById('total-energy-p');
        this.totalEnergySpan = document.getElementById('total-energy');
        this.collisionsP = document.getElementById('collisions-p');
        this.collisionsSpan = document.getElementById('collisions-count');
        
        // Отримання ML елементів
        this.predictBtn = document.getElementById('predict-btn');
        this.batchTrainBtn = document.getElementById('batch-train-btn'); // Нова кнопка
        this.dataPointsSpan = document.getElementById('data-points');
        this.predictionOutputSpan = document.getElementById('prediction-output');
        
        // Слухачі подій
        this.experimentSelect.addEventListener('change', (e) => this.switchExperiment(e.target.value));
        this.startBtn.addEventListener('click', () => this.toggleExperiment());
        this.resetBtn.addEventListener('click', () => this.resetExperiment());
        this.predictBtn.addEventListener('click', () => this.predictRange());
        this.batchTrainBtn.addEventListener('click', () => this.runBatchSimulations(30)); // Новий слухач

        // ... (решта коду init без змін) ...
        const setupSlider = (sliderId, valueId) => {
            document.getElementById(sliderId).addEventListener('input', (e) => {
                document.getElementById(valueId).textContent = e.target.value;
            });
        };
        setupSlider('mass1', 'mass1-value');
        setupSlider('mass2', 'mass2-value');
        setupSlider('velocity', 'velocity-value');
        setupSlider('angle', 'angle-value');
        setupSlider('length', 'length-value');
        setupSlider('gravity', 'gravity-value');
        
        this.switchExperiment('projectile');
    }
    
    // --- НОВИЙ МЕТОД: Пакетна симуляція для навчання ---
    async runBatchSimulations(count) {
        if (this.isRunning) {
            alert('Будь ласка, зупиніть поточний експеримент перед навчанням.');
            return;
        }

        console.log(`Запуск ${count} симуляцій для навчання...`);
        this.batchTrainBtn.textContent = 'Навчання...';
        this.batchTrainBtn.disabled = true;
        this.predictBtn.disabled = true;

        const vMin = parseFloat(this.velocitySlider.min);
        const vMax = parseFloat(this.velocitySlider.max);
        const aMin = parseFloat(this.angleSlider.min);
        const aMax = parseFloat(this.angleSlider.max);

        for (let i = 0; i < count; i++) {
            const randomVelocity = Math.random() * (vMax - vMin) + vMin;
            const randomAngle = Math.random() * (aMax - aMin) + aMin;

            const range = this.calculateProjectileRange(randomVelocity, randomAngle);

            this.trainingData.inputs.push([randomVelocity, randomAngle]);
            this.trainingData.outputs.push([range]);
        }
        
        this.dataPointsSpan.textContent = this.trainingData.inputs.length;
        console.log(`Зібрано ${this.trainingData.inputs.length} точок даних.`);

        await this.trainModel(); // Чекаємо завершення навчання

        this.batchTrainBtn.textContent = 'Прискорити навчання';
        this.batchTrainBtn.disabled = false;
        this.predictBtn.disabled = false;
        this.predictionOutputSpan.textContent = 'Модель оновлено!';
    }

    // --- НОВИЙ МЕТОД: Розрахунок дальності без візуалізації ---
    calculateProjectileRange(velocity, angleDegrees) {
        const angleRad = angleDegrees * Math.PI / 180;
        const gravity = parseFloat(this.gravitySlider.value);
        const dt = 0.016; // Той самий крок часу

        const startX = -10, startY = 1;
        let x = startX, y = startY;
        let vx = velocity * Math.cos(angleRad);
        let vy = velocity * Math.sin(angleRad);

        while (y > 0.3) {
            x += vx * dt;
            y += vy * dt;
            vy -= gravity * dt;
        }
        
        return x - startX;
    }
    
    // --- Інші методи класу (з попереднього кроку) ---
    // createModel, trainModel, predictRange, switchExperiment, etc.
    // ... (весь інший код класу залишається без змін) ...
    // --- ML: Створення моделі ---
    createModel() {
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 10, inputShape: [2], activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
        model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
        this.model = model;
    }
    
    // --- ML: Навчання моделі ---
    async trainModel() {
        if (this.trainingData.inputs.length < 3) {
             console.log('Потрібно більше даних для навчання.');
             return;
        }
        
        const inputs = tf.tensor2d(this.trainingData.inputs);
        const outputs = tf.tensor2d(this.trainingData.outputs);
        
        console.log('Починаємо навчання моделі...');
        await this.model.fit(inputs, outputs, {
            epochs: 50,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Епоха ${epoch + 1}: Втрати = ${logs.loss.toFixed(4)}`);
                }
            }
        });
        console.log('Навчання завершено.');
    }
    
    // --- ML: Прогнозування ---
    predictRange() {
        if (!this.model) {
            this.predictionOutputSpan.textContent = "Модель не створена.";
            return;
        }
        if (this.trainingData.inputs.length === 0) {
            this.predictionOutputSpan.textContent = "Навчіть модель, запустивши симуляцію.";
            return;
        }
        
        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value);
        
        const inputTensor = tf.tensor2d([[velocity, angle]]);
        const prediction = this.model.predict(inputTensor);
        const range = prediction.dataSync()[0];
        
        this.predictionOutputSpan.textContent = `${range.toFixed(2)} м`;
    }

    switchExperiment(experiment) {
        this.resetExperiment();
        this.currentExperiment = experiment;
        
        document.getElementById('ml-prediction').style.display = 'none';

        const allExperiments = ['projectile-experiment', 'pendulum-experiment', 'collision-experiment'];
        allExperiments.forEach(id => document.getElementById(id).setAttribute('visible', false));
        document.getElementById(`${experiment}-experiment`).setAttribute('visible', true);
        
        document.getElementById('mass1-group').style.display = 'block';
        document.getElementById('mass2-group').style.display = 'none';
        document.getElementById('velocity-group').style.display = 'none';
        document.getElementById('angle-group').style.display = 'none';
        document.getElementById('length-group').style.display = 'none';
        this.collisionsP.style.display = 'none';
        this.totalEnergyP.style.display = 'none';

        switch(experiment) {
            case 'projectile':
                document.getElementById('velocity-group').style.display = 'block';
                document.getElementById('angle-group').style.display = 'block';
                this.totalEnergyP.style.display = 'block';
                document.getElementById('ml-prediction').style.display = 'block';
                break;
            case 'pendulum':
                document.getElementById('length-group').style.display = 'block';
                this.totalEnergyP.style.display = 'block';
                break;
            case 'collision':
                document.getElementById('mass2-group').style.display = 'block';
                document.getElementById('velocity-group').style.display = 'block';
                this.collisionsP.style.display = 'block';
                this.totalEnergyP.style.display = 'block';
                break;
        }
    }
    
    toggleExperiment() {
        if (this.isRunning) {
            this.stopExperiment();
        } else {
            this.isRunning = true;
            this.startBtn.textContent = 'Зупинити';
            this.startTime = Date.now();
            
            switch(this.currentExperiment) {
                case 'projectile': this.startProjectile(); break;
                case 'pendulum': this.startPendulum(); break;
                case 'collision': this.startCollision(); break;
            }
        }
    }

    startProjectile() {
        const projectile = document.getElementById('projectile');
        const trajectoryEl = document.getElementById('trajectory');
        const velocity = parseFloat(this.velocitySlider.value);
        const angleRad = parseFloat(this.angleSlider.value) * Math.PI / 180;
        
        this.lastProjectileParams = { velocity: velocity, angle: parseFloat(this.angleSlider.value) };
        this.trajectoryPoints = []; // Очищуємо попередню траєкторію
        
        const startX = -10, startY = 1;
        let x = startX, y = startY;
        let vx = velocity * Math.cos(angleRad);
        let vy = velocity * Math.sin(angleRad);

        const animate = () => {
            if (!this.isRunning) return;
            const dt = 0.016;
            const gravity = parseFloat(this.gravitySlider.value);
            
            x += vx * dt;
            y += vy * dt;
            vy -= gravity * dt;
            
            projectile.setAttribute('position', `${x} ${y} 0`);
            
            // --- Малювання траєкторії ---
            this.trajectoryPoints.push(`${x} ${y} 0`);
            trajectoryEl.setAttribute('line', 'path', this.trajectoryPoints.join(', '));
            
            this.updateStats({ y, vx, vy });
            
            if (y <= 0.3) { 
                this.stopExperiment({ finalX: x, startX: startX }); 
                return;
            }
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    startPendulum() {
        const pendulumBall = document.getElementById('pendulum-ball');
        const pendulumString = document.getElementById('pendulum-string');
        const length = parseFloat(this.lengthSlider.value);
        
        let angle = Math.PI / 4;
        let angVelocity = 0;
        const pivotY = 5;

        const animate = () => {
            if (!this.isRunning) return;
            const dt = 0.016;
            const gravity = parseFloat(this.gravitySlider.value);

            const acceleration = -(gravity / length) * Math.sin(angle);
            angVelocity += acceleration * dt;
            angle += angVelocity * dt;
            
            const x = length * Math.sin(angle);
            const y = pivotY - length * Math.cos(angle);
            
            pendulumBall.setAttribute('position', `${x} ${y} 0`);
            pendulumString.setAttribute('line', 'end', `${x} ${y} 0`);
            
            const linearVelocity = Math.abs(angVelocity * length);
            this.updateStats({ y, v: linearVelocity, pivotY, length });
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    startCollision() {
        const box1El = document.getElementById('box1');
        const box2El = document.getElementById('box2');
        const text1El = document.getElementById('text1');
        const text2El = document.getElementById('text2');
        
        const m1 = parseFloat(this.mass1Slider.value);
        const m2 = parseFloat(this.mass2Slider.value);
        const initial_v = parseFloat(this.velocitySlider.value);

        let x1 = -5, x2 = 5;
        let v1 = initial_v, v2 = -initial_v;
        let collisionCount = 0;

        const leftWallX = -15 + 0.5;
        const rightWallX = 15 - 0.5;
        const boxWidth = 1.0;

        const timeStep = 0.001;
        const stepsPerFrame = 15;

        const animate = () => {
            if (!this.isRunning) return;

            for (let i = 0; i < stepsPerFrame; i++) {
                if (x2 - x1 <= boxWidth && v1 > v2) {
                    collisionCount++;
                    const u1 = v1, u2 = v2;
                    v1 = (u1 * (m1 - m2) + 2 * m2 * u2) / (m1 + m2);
                    v2 = (u2 * (m2 - m1) + 2 * m1 * u1) / (m1 + m2);
                }
                if (x1 <= leftWallX && v1 < 0) {
                    collisionCount++;
                    v1 = -v1;
                }
                if (x2 >= rightWallX && v2 > 0) {
                    collisionCount++;
                    v2 = -v2;
                }
                x1 += v1 * timeStep;
                x2 += v2 * timeStep;
            }

            box1El.object3D.position.x = x1;
            box2El.object3D.position.x = x2;
            text1El.object3D.position.x = x1;
            text2El.object3D.position.x = x2;
            
            this.collisionsSpan.textContent = collisionCount;
            this.updateStats({ v1, v2, m1, m2 });

            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    stopExperiment(stopData) {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.startBtn.textContent = 'Старт';
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // --- ML: Збір даних ---
        if (this.currentExperiment === 'projectile' && this.lastProjectileParams && stopData) {
            const range = stopData.finalX - stopData.startX;
            console.log(`Нова точка даних: V=${this.lastProjectileParams.velocity}, A=${this.lastProjectileParams.angle}, Range=${range}`);
            
            this.trainingData.inputs.push([this.lastProjectileParams.velocity, this.lastProjectileParams.angle]);
            this.trainingData.outputs.push([range]);
            this.dataPointsSpan.textContent = this.trainingData.inputs.length;
            
            this.lastProjectileParams = null;
            this.trainModel(); // Запускаємо навчання в фоні
        }
    }
    
    resetExperiment() {
        this.stopExperiment();
        document.getElementById('trajectory').setAttribute('line', 'path', '');
        document.getElementById('projectile').setAttribute('position', '-10 1 0');
        document.getElementById('pendulum-ball').setAttribute('position', '0 3 0');
        document.getElementById('pendulum-string').setAttribute('line', 'start: 0 5 0; end: 0 3 0');
        document.getElementById('box1').setAttribute('position', '-5 0.5 0');
        document.getElementById('box2').setAttribute('position', '5 0.5 0');
        document.getElementById('text1').setAttribute('position', '-5 1.7 0');
        document.getElementById('text2').setAttribute('position', '5 1.7 0');
        
        this.updateStats(null, true);
    }
    
    updateStats(data, forceReset = false) {
        if (forceReset) {
            this.timeSpan.textContent = '0';
            this.velocitySpan.textContent = '0';
            this.heightSpan.textContent = '0';
            this.keSpan.textContent = '0';
            this.peSpan.textContent = '0';
            this.totalEnergySpan.textContent = '0';
            this.collisionsSpan.textContent = '0';
            return;
        }

        if (!this.isRunning || !data) return;
        
        this.timeSpan.textContent = ((Date.now() - this.startTime) / 1000).toFixed(2);
        
        let velocity = 0, height = 0, ke = 0, pe = 0, totalEnergy = 0;
        const g = parseFloat(this.gravitySlider.value);
        
        switch(this.currentExperiment) {
            case 'projectile':
                const m_proj = parseFloat(this.mass1Slider.value);
                height = data.y > 0 ? data.y - 0.3 : 0;
                velocity = Math.sqrt(data.vx*data.vx + data.vy*data.vy);
                pe = m_proj * g * height;
                ke = 0.5 * m_proj * velocity * velocity;
                break;
            case 'pendulum':
                const m_pend = parseFloat(this.mass1Slider.value);
                const lowestPoint = data.pivotY - data.length;
                height = data.y - lowestPoint;
                velocity = data.v;
                pe = m_pend * g * height;
                ke = 0.5 * m_pend * velocity * velocity;
                break;
            case 'collision':
                const { m1, m2, v1, v2 } = data;
                height = 0;
                ke = 0.5 * m1 * v1*v1 + 0.5 * m2 * v2*v2;
                pe = (m1 + m2) * g * 0.5;
                velocity = (Math.abs(v1) + Math.abs(v2)) / 2;
                break;
        }
        
        totalEnergy = ke + pe;

        this.velocitySpan.textContent = velocity.toFixed(2);
        this.heightSpan.textContent = height.toFixed(2);
        this.keSpan.textContent = ke.toFixed(2);
        this.peSpan.textContent = pe.toFixed(2);
        this.totalEnergySpan.textContent = totalEnergy.toFixed(2);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MechanicsSimulation();
});
