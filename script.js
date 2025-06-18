class MechanicsSimulation {
    constructor() {
        this.currentExperiment = 'projectile';
        this.isRunning = false;
        this.startTime = 0;
        this.animationFrame = null;
        this.trajectoryPoints = [];
        this.pendulumAngle = Math.PI / 6;
        this.pendulumVelocity = 0;
        
        this.init();
    }
    
    init() {
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
        
        this.createGrid();
        this.switchExperiment('projectile');
    }

    // Ця функція видаляє фізичні компоненти з об'єктів.
    // Використовується при скиданні експерименту.
    removePhysicsComponents() {
        const bodies = [
            document.getElementById('box1'), 
            document.getElementById('box2'),
            document.getElementById('energy-ball1'), 
            document.getElementById('energy-ball2')
        ];

        bodies.forEach(el => {
            if (el && el.hasAttribute('dynamic-body')) {
                el.removeAttribute('dynamic-body');
            }
        });
    }
    
    // Оновлює масу тіл, якщо вони вже ініціалізовані
    updatePhysicsBodies() {
        if (this.currentExperiment === 'collision' && this.isRunning) {
            const box1 = document.getElementById('box1');
            const box2 = document.getElementById('box2');
            if (box1 && box1.hasAttribute('dynamic-body')) box1.setAttribute('dynamic-body', 'mass', this.mass1Slider.value);
            if (box2 && box2.hasAttribute('dynamic-body')) box2.setAttribute('dynamic-body', 'mass', this.mass2Slider.value);
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

    // *** КЛЮЧОВІ ЗМІНИ ТУТ ***
    startExperiment() {
        this.isRunning = true;
        this.startTime = Date.now();
        this.startBtn.textContent = 'Зупинити';

        // 1. Додаємо фізичні компоненти ПРЯМО перед запуском
        if (this.currentExperiment === 'collision') {
            document.getElementById('box1').setAttribute('dynamic-body', `mass: ${this.mass1Slider.value}`);
            document.getElementById('box2').setAttribute('dynamic-body', `mass: ${this.mass2Slider.value}`);
        } else if (this.currentExperiment === 'energy') {
            document.getElementById('energy-ball1').setAttribute('dynamic-body', 'mass: 1'); // Маси можна зробити налаштовуваними
            document.getElementById('energy-ball2').setAttribute('dynamic-body', 'mass: 1.5');
        } else if (this.currentExperiment === 'projectile') {
            this.projectileVelocity = null;
        }
        
        // 2. Даємо рушію час на ініціалізацію .body
        setTimeout(() => {
            // Перевіряємо, чи експеримент ще запущено (користувач міг натиснути "Скинути")
            if (!this.isRunning) return;

            // 3. Надаємо початкові швидкості (тільки якщо потрібні)
            if (this.currentExperiment === 'collision') {
                const velocity = parseFloat(this.velocitySlider.value);
                const box1 = document.getElementById('box1');
                const box2 = document.getElementById('box2');
                
                // Перевіряємо, чи тіла були успішно ініціалізовані
                if (box1.body && box2.body) {
                    box1.body.velocity.set(velocity, 0, 0);
                    box2.body.velocity.set(-velocity, 0, 0);
                } else {
                    console.error("Помилка ініціалізації фізичних тіл. Спробуйте ще раз.");
                    this.stopExperiment();
                    return;
                }
            }
            
            // 4. Запускаємо цикл анімації
            this.animationFrame = requestAnimationFrame(() => this.animate());
        }, 100); // 100ms - зазвичай достатньо
    }

    animate() {
        if (!this.isRunning) return;
        
        // Оновлення статистики та анімація виконуються в кожному кадрі
        this.updateStats();
        switch(this.currentExperiment) {
            case 'projectile': this.runProjectileStep(); break;
            case 'pendulum': this.runPendulumStep(); break;
            case 'collision': this.runCollisionStep(); break;
            // для 'energy' окремий крок не потрібен, рушій робить все сам
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
    
    // *** КЛЮЧОВІ ЗМІНИ ТУТ ***
    resetExperiment() {
        this.stopExperiment();
        
        // 1. Повністю видаляємо фізичні компоненти
        this.removePhysicsComponents();
        
        // 2. Скидаємо позиції об'єктів
        this.resetBody(document.getElementById('box1'), {x: -5, y: 0.5, z: 0});
        this.resetBody(document.getElementById('box2'), {x: 5, y: 0.5, z: 0});
        document.getElementById('text1').setAttribute('position', '-5 1.7 0');
        document.getElementById('text2').setAttribute('position', '5 1.7 0');
        
        this.resetBody(document.getElementById('energy-ball1'), {x: -6, y: 2.8, z: 0});
        this.resetBody(document.getElementById('energy-ball2'), {x: 5.5, y: 2.5, z: 0});
        
        document.getElementById('trajectory').innerHTML = '';
        this.trajectoryPoints = [];
        this.projectileVelocity = null;
        this.resetBody(document.getElementById('projectile'), {x: -10, y: 1, z: 0});
        
        this.pendulumAngle = Math.PI / 6;
        this.pendulumVelocity = 0;
        this.updatePendulumLength();
        
        this.updateCannonAngle();
        this.updateStats(true); // Примусове скидання статистики до нуля
    }

    resetBody(el, pos) {
        if (el) {
            el.setAttribute('position', pos);
            // Також треба скинути швидкість, якщо тіло ще існує
            if (el.body) {
                el.body.velocity.set(0, 0, 0);
                el.body.angularVelocity.set(0, 0, 0);
            }
        }
    }
    
    updateStats(forceReset = false) {
        const time = (this.isRunning && !forceReset) ? ((Date.now() - this.startTime) / 1000).toFixed(2) : '0.00';
        document.getElementById('time').textContent = time;
        
        let ke = 0, pe = 0;
        
        if (this.currentExperiment === 'energy' && this.isRunning) {
            const balls = [document.getElementById('energy-ball1'), document.getElementById('energy-ball2')];
            const gravity = parseFloat(this.gravitySlider.value);
            
            balls.forEach(ball => {
                // Важлива перевірка: .body існує тільки під час симуляції
                if (ball && ball.body) {
                    const mass = ball.body.mass;
                    const pos = ball.getAttribute('position');
                    const vel = ball.body.velocity;
                    const v = vel.length();
                    ke += 0.5 * mass * v * v;
                    pe += mass * gravity * (pos.y - 0.3); // -0.3 для врахування радіусу
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
        const dt = 0.016; // Приблизний час кадру
        
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

    // Тепер ця функція просто оновлює позицію тексту, слідуючи за боксами
    runCollisionStep() {
        const box1 = document.getElementById('box1');
        const text1 = document.getElementById('text1');
        const box2 = document.getElementById('box2');
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
    
    predictTrajectory() { /* Ця частина не змінюється */ }
    initML() { /* Ця частина не змінюється */ }
}

document.addEventListener('DOMContentLoaded', () => {
    new MechanicsSimulation();
});
