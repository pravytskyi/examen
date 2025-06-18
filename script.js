class MechanicsSimulation {
    constructor() {
        this.currentExperiment = 'projectile';
        this.isRunning = false;
        this.startTime = 0;
        this.animationFrame = null;
        this.trajectoryPoints = [];
        this.mlModel = null;
        this.trainingData = [];
        this.pendulumAngle = Math.PI / 6;
        this.pendulumVelocity = 0;
        
        this.init();
    }
    
    init() {
        // Елементи DOM
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

        // Обробники подій
        this.mass1Slider.addEventListener('input', (e) => {
            document.getElementById('mass1-value').textContent = e.target.value;
            this.updatePhysicsBodies();
        });
        this.mass2Slider.addEventListener('input', (e) => {
            document.getElementById('mass2-value').textContent = e.target.value;
            this.updatePhysicsBodies();
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
        
        this.initML();
        this.createGrid();
        this.switchExperiment('projectile');
    }

    updatePhysicsBodies() {
        // Зачекаємо, поки тіла будуть готові
        setTimeout(() => {
            const box1 = document.getElementById('box1');
            const box2 = document.getElementById('box2');
            if (this.currentExperiment === 'collision') {
                if (box1 && box1.body) {
                    box1.setAttribute('dynamic-body', 'mass', this.mass1Slider.value);
                }
                if (box2 && box2.body) {
                    box2.setAttribute('dynamic-body', 'mass', this.mass2Slider.value);
                }
            }
        }, 100);
    }
    
    initML() {
        this.mlModel = tf.sequential({
            layers: [
                tf.layers.dense({inputShape: [4], units: 10, activation: 'relu'}),
                tf.layers.dense({units: 10, activation: 'relu'}),
                tf.layers.dense({units: 2})
            ]
        });
        this.mlModel.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
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
        
        document.getElementById('mass1-group').style.display = 'block';
        document.getElementById('mass2-group').style.display = 'none';
        document.getElementById('velocity-group').style.display = 'none';
        document.getElementById('angle-group').style.display = 'none';
        document.getElementById('length-group').style.display = 'none';
        this.predictBtn.style.display = 'none';
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
                this.updatePhysicsBodies();
                break;
            case 'energy':
                this.totalEnergyP.style.display = 'block';
                document.getElementById('mass1-group').style.display = 'none';
                break;
        }
        document.getElementById('mass1-value').textContent = this.mass1Slider.value;
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
            const velocity = parseFloat(this.velocitySlider.value);
            const box1 = document.getElementById('box1');
            const box2 = document.getElementById('box2');
            
            // Переконуємось, що тіла готові перед наданням швидкості
            if (box1.body && box2.body) {
                box1.body.velocity.set(velocity, 0, 0);
                box2.body.velocity.set(-velocity, 0, 0);
            } else {
                console.warn("Тіла для зіткнення ще не ініціалізовані.");
            }
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
        this.updatePendulumLength();
        
        this.resetBody(document.getElementById('box1'), {x: -5, y: 0.5, z: 0});
        this.resetBody(document.getElementById('box2'), {x: 5, y: 0.5, z: 0});
        this.runCollisionStep(); // Оновити позицію тексту після скидання
        this.updatePhysicsBodies();

        this.resetBody(document.getElementById('energy-ball1'), {x: -6, y: 2.8, z: 0});
        this.resetBody(document.getElementById('energy-ball2'), {x: 5.5, y: 2.5, z: 0});
        
        this.updateCannonAngle();
        this.updateStats();
    }

    resetBody(el, pos) {
        if (el && el.body) {
            el.body.velocity.set(0, 0, 0);
            el.body.angularVelocity.set(0, 0, 0);
            el.setAttribute('position', pos);
            el.setAttribute('rotation', '0 0 0');
        } else if (el) {
            // Якщо тіло ще не готове, просто встановлюємо атрибут
            el.setAttribute('position', pos);
        }
    }
    
    updateStats() {
        const time = this.isRunning ? ((Date.now() - this.startTime) / 1000).toFixed(2) : '0.00';
        document.getElementById('time').textContent = time;
        
        const gravity = parseFloat(this.gravitySlider.value);
        let ke = 0, pe = 0, totalEnergy = 0;

        if (this.currentExperiment === 'energy') {
            const balls = [document.getElementById('energy-ball1'), document.getElementById('energy-ball2')];
            balls.forEach(ball => {
                if (ball && ball.body) {
                    const mass = ball.body.mass;
                    const pos = ball.getAttribute('position');
                    const vel = ball.body.velocity;
                    const v = vel.length();
                    
                    ke += 0.5 * mass * v * v;
                    pe += mass * gravity * pos.y;
                }
            });
            totalEnergy = ke + pe;
            document.getElementById('total-energy').textContent = totalEnergy.toFixed(2);
        } else {
             // ... логіка для інших експериментів (можна додати за потреби)
        }
        
        document.getElementById('kinetic-energy').textContent = ke.toFixed(2);
        document.getElementById('potential-energy').textContent = pe.toFixed(2);
    }
    
    runProjectileStep() {
        const projectile = document.getElementById('projectile');
        const pos = projectile.getAttribute('position');
        const vel = this.projectileVelocity;
        const gravity = parseFloat(this.gravitySlider.value);
        const dt = 0.016;

        if (!vel) {
            const velocity = parseFloat(this.velocitySlider.value);
            const angle = parseFloat(this.angleSlider.value) * Math.PI / 180;
            this.projectileVelocity = { x: velocity * Math.cos(angle), y: velocity * Math.sin(angle) };
            this.trajectoryPoints = [];
            return;
        }

        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        vel.y -= gravity * dt;
        projectile.setAttribute('position', `${pos.x} ${pos.y} 0`);

        if (this.trajectoryPoints.length === 0 || Date.now() - (this.lastPointTime || 0) > 100) {
            this.trajectoryPoints.push({x: pos.x, y: pos.y});
            this.drawTrajectoryPoint(pos.x, pos.y);
            this.lastPointTime = Date.now();
        }

        if (pos.y <= 0.3 || pos.x > 30) this.stopExperiment();
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
        string.setAttribute('line', 'end', `${x} ${y} 0`);
    }
    
    // НОВИЙ МЕТОД
    runCollisionStep() {
        const box1 = document.getElementById('box1');
        const text1 = document.getElementById('text1');
        const box2 = document.getElementById('box2');
        const text2 = document.getElementById('text2');

        if (box1 && text1 && box1.body) {
            const pos1 = box1.getAttribute('position');
            text1.setAttribute('position', `${pos1.x} 1.7 ${pos1.z}`);
        }
        if (box2 && text2 && box2.body) {
            const pos2 = box2.getAttribute('position');
            text2.setAttribute('position', `${pos2.x} 1.7 ${pos2.z}`);
        }
    }

    drawTrajectoryPoint(x, y) {
        const trajectory = document.getElementById('trajectory');
        const point = document.createElement('a-sphere');
        point.setAttribute('position', `${x} ${y} 0`);
        point.setAttribute('radius', '0.05');
        point.setAttribute('color', '#FFD93D');
        trajectory.appendChild(point);
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
        const gravity = parseFloat(this.gravitySlider.value);
        const angleRad = angle * Math.PI / 180;
        const range = (velocity * velocity * Math.sin(2 * angleRad)) / gravity;
        const flightTime = (2 * velocity * Math.sin(angleRad)) / gravity;
        document.getElementById('predicted-range').textContent = range.toFixed(2);
        document.getElementById('predicted-time').textContent = flightTime.toFixed(2);
        document.getElementById('model-accuracy').textContent = '100% (формула)';
        document.getElementById('ml-prediction').style.display = 'block';
    }

    saveTrainingData() { /* ... */ }
    async trainModel() { /* ... */ }
}

document.addEventListener('DOMContentLoaded', () => {
    // Невелика затримка, щоб фізичний рушій встиг ініціалізуватися
    setTimeout(() => {
        new MechanicsSimulation();
    }, 500);
});
