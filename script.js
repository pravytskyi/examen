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

        // Початкове налаштування видимості
        this.switchExperiment('projectile');
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
        
        const allExperiments = ['projectile-experiment', 'pendulum-experiment', 'collision-experiment', 'energy-experiment'];
        allExperiments.forEach(id => {
            document.getElementById(id).setAttribute('visible', false);
        });
        
        document.getElementById(`${experiment}-experiment`).setAttribute('visible', true);
        this.currentExperiment = experiment;
        
        // Налаштування видимості параметрів
        document.getElementById('velocity-group').style.display = 'none';
        document.getElementById('angle-group').style.display = 'none';
        document.getElementById('length-group').style.display = 'none';
        
        switch(experiment) {
            case 'projectile':
                document.getElementById('velocity-group').style.display = 'block';
                document.getElementById('angle-group').style.display = 'block';
                break;
            case 'pendulum':
                document.getElementById('length-group').style.display = 'block';
                break;
            case 'collision':
                document.getElementById('velocity-group').style.display = 'block';
                break;
            case 'energy':
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
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
        this.updateStats();
    }

    animate() {
        if (!this.isRunning) return;

        switch(this.currentExperiment) {
            case 'projectile':
                this.runProjectileStep();
                break;
            case 'pendulum':
                this.runPendulumStep();
                break;
            case 'collision':
                this.runCollisionStep();
                break;
            case 'energy':
                this.runEnergyStep();
                break;
        }

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    runProjectileStep() {
        const projectile = document.getElementById('projectile');
        const pos = projectile.getAttribute('position');
        const vel = this.projectileVelocity;
        const gravity = parseFloat(this.gravitySlider.value);
        const dt = 0.016;

        if (!vel) { // Ініціалізація при першому запуску
            const velocity = parseFloat(this.velocitySlider.value);
            const angle = parseFloat(this.angleSlider.value) * Math.PI / 180;
            this.projectileVelocity = {
                x: velocity * Math.cos(angle),
                y: velocity * Math.sin(angle)
            };
            this.trajectoryPoints = [];
            return;
        }

        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        vel.y -= gravity * dt;

        projectile.setAttribute('position', `${pos.x} ${pos.y} 0`);

        if (this.trajectoryPoints.length === 0 || Date.now() - this.lastPointTime > 100) {
            this.trajectoryPoints.push({x: pos.x, y: pos.y});
            this.drawTrajectoryPoint(pos.x, pos.y);
            this.lastPointTime = Date.now();
        }

        if (pos.y <= 0.3 || pos.x > 30) {
            this.stopExperiment();
        }
    }
    
    runPendulumStep() {
        const pendulum = document.getElementById('pendulum-ball');
        const string = document.getElementById('pendulum-string');
        const length = parseFloat(this.lengthSlider.value);
        const gravity = parseFloat(this.gravitySlider.value);
        const dt = 0.016;

        const acceleration = -(gravity / length) * Math.sin(this.pendulumAngle);
        this.pendulumVelocity += acceleration * dt;
        this.pendulumAngle += this.pendulumVelocity * dt;

        const x = length * Math.sin(this.pendulumAngle);
        const y = 5 - length * Math.cos(this.pendulumAngle);
        
        pendulum.setAttribute('position', `${x} ${y} 0`);
        
        // Оновлюємо кінцеву точку лінії
        string.setAttribute('line', 'end', `${x} ${y} 0`);
    }

    runCollisionStep() {
        // Логіка для зіткнень, якщо буде реалізована
        // Поки що можна залишити пустою, бо анімація керується фізичним рушієм.
        // Для спрощеної версії без рушія, код був би тут.
        // Оскільки ми використовуємо aframe-physics-system, ця логіка не потрібна.
        // Залишаю заготовку, якщо ви вирішите робити це без фізичного рушія.
        this.stopExperiment(); // тимчасово
    }

    runEnergyStep() {
        // Теж саме, що й зіткнення. Фізичний рушій сам обробляє рух.
        // Логіка потрібна лише якщо ви хочете точно контролювати енергію.
        this.stopExperiment(); // тимчасово
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
            this.animationFrame = null;
        }
        
        if (this.currentExperiment === 'projectile' && this.trajectoryPoints.length > 0) {
            this.saveTrainingData();
        }
    }
    
    resetExperiment() {
        this.stopExperiment();
        
        document.getElementById('trajectory').innerHTML = '';
        this.trajectoryPoints = [];
        this.projectileVelocity = null;
        
        document.getElementById('projectile').setAttribute('position', '-10 1 0');
        
        this.pendulumAngle = Math.PI / 6;
        this.pendulumVelocity = 0;
        this.updatePendulumLength(); // Скидаємо позицію маятника
        
        document.getElementById('box1').setAttribute('position', '-5 1 0');
        document.getElementById('box2').setAttribute('position', '5 1 0');
        document.getElementById('text1').setAttribute('position', '-5 2 0');
        document.getElementById('text2').setAttribute('position', '5 2 0');

        document.getElementById('energy-ball').setAttribute('position', '-6 4 0');
        
        this.updateCannonAngle();
        
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
        
        const mass = parseFloat(this.massSlider.value);
        const gravity = parseFloat(this.gravitySlider.value);
        
        let velocity = 0, height = 0, ke = 0, pe = 0;
        
        switch(this.currentExperiment) {
            case 'projectile':
                const pos = document.getElementById('projectile').getAttribute('position');
                const vel = this.projectileVelocity;
                if (pos && vel) {
                    height = pos.y;
                    velocity = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
                }
                break;
            case 'pendulum':
                const pendPos = document.getElementById('pendulum-ball').getAttribute('position');
                const length = parseFloat(this.lengthSlider.value);
                if (pendPos) {
                    height = pendPos.y;
                    velocity = Math.abs(this.pendulumVelocity * length);
                }
                break;
        }
        
        ke = 0.5 * mass * velocity * velocity;
        pe = mass * gravity * height;
        
        document.getElementById('current-velocity').textContent = velocity.toFixed(2);
        document.getElementById('height').textContent = height.toFixed(2);
        document.getElementById('kinetic-energy').textContent = ke.toFixed(2);
        document.getElementById('potential-energy').textContent = pe.toFixed(2);
        
        requestAnimationFrame(() => this.updateStats());
    }
    
    updateCannonAngle() {
        const angle = parseFloat(this.angleSlider.value);
        document.getElementById('cannon').setAttribute('rotation', `0 0 ${angle}`);
    }
    
    updatePendulumLength() {
        if (this.isRunning) return;
        
        const length = parseFloat(this.lengthSlider.value);
        const string = document.getElementById('pendulum-string');
        const ball = document.getElementById('pendulum-ball');
        
        const angle = this.pendulumAngle;
        const x = length * Math.sin(angle);
        const y = 5 - length * Math.cos(angle);
        
        ball.setAttribute('position', `${x} ${y} 0`);
        string.setAttribute('line', 'end', `${x} ${y} 0`);
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
        document.getElementById('model-accuracy').textContent = '100% (формула)';
        document.getElementById('ml-prediction').style.display = 'block';
        
        if (this.trainingData.length >= 5) {
            await this.trainModel();
            
            const input = tf.tensor2d([[velocity, angle, mass, gravity]]);
            const prediction = this.mlModel.predict(input);
            const result = await prediction.data();
            
            document.getElementById('predicted-range').textContent = `${result[0].toFixed(2)} (ML)`;
            document.getElementById('predicted-time').textContent = `${result[1].toFixed(2)} (ML)`;
            document.getElementById('model-accuracy').textContent = `Навчено на ${this.trainingData.length} запусках`;
            
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
        
        const lastPoint = this.trajectoryPoints[this.trajectoryPoints.length - 1];
        const range = lastPoint.x + 10;
        const flightTime = (Date.now() - this.startTime) / 1000;
        
        this.trainingData.push({
            input: [velocity, angle, mass, gravity],
            output: [range, flightTime]
        });
        console.log('Training data point saved. Total:', this.trainingData.length);
    }
    
    async trainModel() {
        if (this.trainingData.length < 5) return;
        
        console.log('Starting ML model training...');
        const inputs = this.trainingData.map(d => d.input);
        const outputs = this.trainingData.map(d => d.output);
        
        const inputTensor = tf.tensor2d(inputs);
        const outputTensor = tf.tensor2d(outputs);
        
        const history = await this.mlModel.fit(inputTensor, outputTensor, {
            epochs: 50,
            batchSize: 4,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
                }
            }
        });
        
        console.log('Training finished.');
        inputTensor.dispose();
        outputTensor.dispose();
        return history;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MechanicsSimulation();
});
