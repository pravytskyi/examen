class MechanicsSimulation {
    constructor() {
        this.currentExperiment = 'projectile';
        this.isRunning = false;
        this.startTime = 0;
        this.animationFrame = null;
        this.trajectoryPoints = [];
        this.pendulumAngle = Math.PI / 6;
        this.pendulumVelocity = 0;
        this.model = null; // Для ML моделі
        
        // Ініціалізуємо основну логіку та ML
        this.init();
        this.initML().catch(err => console.error("Помилка ініціалізації ML:", err));
    }
    
    init() {
        // Отримуємо всі елементи керування
        this.experimentSelect = document.getElementById('experiment-select');
        this.mass1Slider = document.getElementById('mass1');
        this.mass2Slider = document.getElementById('mass2');
        this.velocitySlider = document.getElementById('velocity');
        this.angleSlider = document.getElementById('angle');
        this.lengthSlider = document.getElementById('length');
        this.gravitySlider = document.getElementById('gravity');
        this.startBtn = document.getElementById('start-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.predictBtn = document.getElementById('predict-btn');
        this.totalEnergyP = document.getElementById('total-energy-p');
        
        // Зберігаємо посилання на фізичні тіла для легкого доступу
        this.physicsBodies = {
            box1: document.getElementById('box1'),
            box2: document.getElementById('box2'),
            energyBall1: document.getElementById('energy-ball1'),
            energyBall2: document.getElementById('energy-ball2')
        };
        this.initialPositions = {
            box1: {x: -5, y: 0.5, z: 0},
            box2: {x: 5, y: 0.5, z: 0},
            energyBall1: {x: -6, y: 2.8, z: 0},
            energyBall2: {x: 5.5, y: 2.5, z: 0}
        };

        // Додаємо слухачів подій
        this.mass1Slider.addEventListener('input', (e) => {
            document.getElementById('mass1-value').textContent = e.target.value;
            this.updatePhysicsBodyMass();
        });
        this.mass2Slider.addEventListener('input', (e) => {
            document.getElementById('mass2-value').textContent = e.target.value;
            this.updatePhysicsBodyMass();
        });
        this.velocitySlider.addEventListener('input', (e) => document.getElementById('velocity-value').textContent = e.target.value);
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
            document.querySelector('a-scene').setAttribute('physics', 'gravity', -parseFloat(e.target.value));
        });
        
        this.startBtn.addEventListener('click', () => this.toggleExperiment());
        this.resetBtn.addEventListener('click', () => this.resetExperiment());
        this.predictBtn.addEventListener('click', () => this.predictTrajectory());
        this.experimentSelect.addEventListener('change', (e) => this.switchExperiment(e.target.value));
        
        this.createGrid();
        this.switchExperiment('projectile');
    }

    // Функція для оновлення маси тіл (навіть коли вони "сплять")
    updatePhysicsBodyMass() {
        if (this.currentExperiment === 'collision') {
            const box1 = this.physicsBodies.box1;
            const box2 = this.physicsBodies.box2;
            if (box1 && box1.body) {
                box1.body.mass = parseFloat(this.mass1Slider.value);
                box1.body.updateMassProperties();
            }
            if (box2 && box2.body) {
                box2.body.mass = parseFloat(this.mass2Slider.value);
                box2.body.updateMassProperties();
            }
        }
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
        this.currentExperiment = experiment;
        
        const allExperiments = ['projectile-experiment', 'pendulum-experiment', 'collision-experiment', 'energy-experiment'];
        allExperiments.forEach(id => document.getElementById(id).setAttribute('visible', false));
        document.getElementById(`${experiment}-experiment`).setAttribute('visible', true);
        
        // Налаштування видимості UI елементів
        document.getElementById('mass1-group').style.display = 'block';
        document.getElementById('mass2-group').style.display = 'none';
        document.getElementById('velocity-group').style.display = 'none';
        document.getElementById('angle-group').style.display = 'none';
        document.getElementById('length-group').style.display = 'none';
        this.predictBtn.style.display = 'none';
        document.getElementById('ml-prediction').style.display = 'none';
        this.totalEnergyP.style.display = 'none';

        switch(experiment) {
            case 'projectile':
                document.getElementById('velocity-group').style.display = 'block';
                document.getElementById('angle-group').style.display = 'block';
                this.predictBtn.style.display = 'inline-block';
                document.getElementById('mass1-group').querySelector('label').innerHTML = 'Маса (кг): <span id="mass1-value">1</span>';
                break;
            case 'pendulum':
                document.getElementById('length-group').style.display = 'block';
                document.getElementById('mass1-group').querySelector('label').innerHTML = 'Маса (кг): <span id="mass1-value">1</span>';
                break;
            case 'collision':
                document.getElementById('mass2-group').style.display = 'block';
                document.getElementById('velocity-group').style.display = 'block';
                document.getElementById('mass1-group').querySelector('label').innerHTML = 'Маса тіла 1 (кг): <span id="mass1-value">1</span>';
                break;
            case 'energy':
                this.totalEnergyP.style.display = 'block';
                document.getElementById('mass1-group').style.display = 'none';
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

        if (this.currentExperiment === 'collision') {
            const box1 = this.physicsBodies.box1;
            const box2 = this.physicsBodies.box2;
            if (box1.body && box2.body) {
                this.updatePhysicsBodyMass(); // Оновлюємо масу перед стартом
                const velocity = parseFloat(this.velocitySlider.value);
                // "Пробуджуємо" тіла, надаючи їм швидкість
                box1.body.velocity.set(velocity, 0, 0);
                box2.body.velocity.set(-velocity, 0, 0);
                box1.body.activate();
                box2.body.activate();
            }
        } else if (this.currentExperiment === 'energy') {
             // Просто "пробуджуємо" тіла, гравітація зробить свою справу
            this.physicsBodies.energyBall1.body.activate();
            this.physicsBodies.energyBall2.body.activate();
        } else if (this.currentExperiment === 'projectile') {
            this.projectileVelocity = null;
        }

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    animate() {
        if (!this.isRunning) return;
        
        this.updateStats();
        switch(this.currentExperiment) {
            case 'projectile': this.runProjectileStep(); break;
            case 'pendulum': this.runPendulumStep(); break;
            case 'collision': this.runCollisionStep(); break;
        }
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    stopExperiment() {
        this.isRunning = false;
        this.startBtn.textContent = 'Старт';
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    resetExperiment() {
        this.stopExperiment();
        
        // Скидаємо фізичні тіла: повертаємо на місце і "присипляємо"
        for (const key in this.physicsBodies) {
            const el = this.physicsBodies[key];
            if (el && el.body) {
                const pos = this.initialPositions[key];
                el.setAttribute('position', pos);
                el.body.position.copy(pos);
                el.body.velocity.set(0, 0, 0);
                el.body.angularVelocity.set(0, 0, 0);
                el.body.sleep();
            }
        }
        
        // Скидаємо позиції тексту
        document.getElementById('text1').setAttribute('position', '-5 1.7 0');
        document.getElementById('text2').setAttribute('position', '5 1.7 0');
        
        // Скидаємо інші експерименти
        document.getElementById('trajectory').innerHTML = '';
        this.trajectoryPoints = [];
        this.projectileVelocity = null;
        document.getElementById('projectile').setAttribute('position', '-10 1 0');
        
        this.pendulumAngle = Math.PI / 6;
        this.pendulumVelocity = 0;
        this.updatePendulumLength();
        
        this.updateCannonAngle();
        this.updateStats(true); // Примусове скидання статистики до нуля
    }
    
    updateStats(forceReset = false) {
        const time = (this.isRunning && !forceReset) ? ((Date.now() - this.startTime) / 1000).toFixed(2) : '0.00';
        document.getElementById('time').textContent = time;
        
        let ke = 0, pe = 0;
        
        if (this.currentExperiment === 'energy' && this.isRunning) {
            const balls = [this.physicsBodies.energyBall1, this.physicsBodies.energyBall2];
            const gravity = parseFloat(this.gravitySlider.value);
            
            balls.forEach(ball => {
                if (ball && ball.body) {
                    const mass = ball.body.mass;
                    const pos = ball.getAttribute('position');
                    const vel = ball.body.velocity;
                    const v = vel.length();
                    ke += 0.5 * mass * v * v;
                    pe += mass * gravity * (pos.y - ball.getAttribute('geometry').radius); 
                }
            });
            document.getElementById('total-energy').textContent = (ke + pe).toFixed(2);
        }
        
        document.getElementById('kinetic-energy').textContent = ke.toFixed(2);
        document.getElementById('potential-energy').textContent = pe.toFixed(2);
        if (forceReset) document.getElementById('total-energy').textContent = '0.00';
    }
    
    runProjectileStep() {
        const projectile = document.getElementById('projectile');
        if (!projectile || !this.isRunning) return;
        
        const pos = projectile.getAttribute('position');
        const gravity = parseFloat(this.gravitySlider.value);
        const dt = 0.016;
        
        if (!this.projectileVelocity) {
            const velocity = parseFloat(this.velocitySlider.value);
            const angle = parseFloat(this.angleSlider.value) * Math.PI / 180;
            this.projectileVelocity = { x: velocity * Math.cos(angle), y: velocity * Math.sin(angle) };
        }
        
        let vel = this.projectileVelocity;
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        vel.y -= gravity * dt;
        
        projectile.setAttribute('position', `${pos.x} ${pos.y} 0`);
        
        if (Date.now() - (this.lastPointTime || 0) > 100) {
            this.drawTrajectoryPoint(pos.x, pos.y);
            this.lastPointTime = Date.now();
        }
        
        if (pos.y <= 0.3) {
            this.stopExperiment();
        }
    }

    runPendulumStep() {
        const pendulum = document.getElementById('pendulum-ball');
        const string = document.getElementById('pendulum-string');
        if (!pendulum || !this.isRunning) return;

        const length = parseFloat(this.lengthSlider.value);
        const gravity = parseFloat(this.gravitySlider.value);
        const dt = 0.016;
        
        const acceleration = -(gravity / length) * Math.sin(this.pendulumAngle);
        this.pendulumVelocity += acceleration * dt;
        this.pendulumAngle += this.pendulumVelocity * dt;
        
        const x = length * Math.sin(this.pendulumAngle);
        const y = 5 - length * Math.cos(this.pendulumAngle);
        
        pendulum.setAttribute('position', `${x} ${y} 0`);
        string.setAttribute('line', 'end', `${x} ${y} 0`);
    }

    runCollisionStep() {
        const box1 = this.physicsBodies.box1;
        const text1 = document.getElementById('text1');
        const box2 = this.physicsBodies.box2;
        const text2 = document.getElementById('text2');

        if (box1 && text1) text1.setAttribute('position', `${box1.getAttribute('position').x} 1.7 0`);
        if (box2 && text2) text2.setAttribute('position', `${box2.getAttribute('position').x} 1.7 0`);
    }

    drawTrajectoryPoint(x, y) {
        const point = document.createElement('a-sphere');
        point.setAttribute('position', `${x} ${y} 0`);
        point.setAttribute('radius', '0.05');
        point.setAttribute('color', '#FFD93D');
        document.getElementById('trajectory').appendChild(point);
    }

    updateCannonAngle() {
        document.getElementById('cannon').setAttribute('rotation', `0 0 ${this.angleSlider.value}`);
    }

    updatePendulumLength() {
        if (this.isRunning) return;
        const length = parseFloat(this.lengthSlider.value);
        const angle = this.pendulumAngle;
        const x = length * Math.sin(angle);
        const y = 5 - length * Math.cos(angle);
        document.getElementById('pendulum-ball').setAttribute('position', `${x} ${y} 0`);
        document.getElementById('pendulum-string').setAttribute('line', 'end', `${x} ${y} 0`);
    }
    
    // *** НОВИЙ ВІДНОВЛЕНИЙ КОД ДЛЯ ML ***
    async initML() {
        this.mlPredictionDiv = document.getElementById('ml-prediction');
        this.modelAccuracyEl = document.getElementById('model-accuracy');
        this.predictedRangeEl = document.getElementById('predicted-range');
        this.predictedTimeEl = document.getElementById('predicted-time');

        this.modelAccuracyEl.textContent = `Ініціалізація...`;
        
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({units: 20, inputShape: [2], activation: 'relu'}));
        this.model.add(tf.layers.dense({units: 10, activation: 'relu'}));
        this.model.add(tf.layers.dense({units: 2}));

        this.model.compile({optimizer: 'adam', loss: 'meanSquaredError'});
        
        const trainData = [];
        const g = 9.8;
        for(let v = 1; v <= 20; v++) {
            for (let a = 0; a <= 90; a += 5) {
                const angleRad = a * Math.PI / 180;
                const time = (2 * v * Math.sin(angleRad)) / g;
                const range = (v * v * Math.sin(2 * angleRad)) / g;
                trainData.push({ v, a, time, range });
            }
        }

        const inputs = trainData.map(d => [d.v / 20, d.a / 90]);
        const outputs = trainData.map(d => [d.range / 41, d.time / 4.1]);

        const tensorInputs = tf.tensor2d(inputs);
        const tensorOutputs = tf.tensor2d(outputs);

        console.log('Починається навчання ML моделі...');
        const history = await this.model.fit(tensorInputs, tensorOutputs, {
            epochs: 50,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    this.modelAccuracyEl.textContent = `Навчання... ${(100*(epoch+1)/50).toFixed(0)}%`;
                }
            }
        });
        const finalLoss = history.history.loss.pop();
        this.modelAccuracyEl.textContent = `Готово (точність: ${((1-finalLoss)*100).toFixed(1)}%)`;
        console.log('Навчання завершено.');
        
        tf.dispose([tensorInputs, tensorOutputs]);
    }

    predictTrajectory() {
        if (!this.model) {
            alert('Модель ще не навчена. Зачекайте, поки зникне напис "Навчання...".');
            return;
        }

        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value);

        const inputTensor = tf.tensor2d([[velocity / 20, angle / 90]]);
        
        const prediction = this.model.predict(inputTensor);
        const [predictedRangeNorm, predictedTimeNorm] = prediction.dataSync();

        const predictedRange = predictedRangeNorm * 41;
        const predictedTime = predictedTimeNorm * 4.1;
        
        this.mlPredictionDiv.style.display = 'block';
        this.predictedRangeEl.textContent = predictedRange.toFixed(2);
        this.predictedTimeEl.textContent = predictedTime.toFixed(2);
        
        tf.dispose([inputTensor, prediction]);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MechanicsSimulation();
});
