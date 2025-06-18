class MechanicsSimulation {
    constructor() {
        this.currentExperiment = 'projectile';
        this.isRunning = false;
        this.animationFrame = null;
        this.startTime = 0;
        
        this.init();
    }
    
    init() {
        // Отримання елементів DOM
        this.experimentSelect = document.getElementById('experiment-select');
        this.mass1Slider = document.getElementById('mass1');
        this.mass2Slider = document.getElementById('mass2');
        this.velocitySlider = document.getElementById('velocity');
        this.angleSlider = document.getElementById('angle');
        this.lengthSlider = document.getElementById('length');
        this.gravitySlider = document.getElementById('gravity');
        this.startBtn = document.getElementById('start-btn');
        this.resetBtn = document.getElementById('reset-btn');
        
        // Слухачі подій
        this.experimentSelect.addEventListener('change', (e) => this.switchExperiment(e.target.value));
        this.startBtn.addEventListener('click', () => this.toggleExperiment());
        this.resetBtn.addEventListener('click', () => this.resetExperiment());
        
        const updateValue = (sliderId, valueId) => {
            document.getElementById(sliderId).addEventListener('input', (e) => {
                document.getElementById(valueId).textContent = e.target.value;
            });
        };
        updateValue('mass1', 'mass1-value');
        updateValue('mass2', 'mass2-value');
        updateValue('velocity', 'velocity-value');
        updateValue('angle', 'angle-value');
        updateValue('length', 'length-value');
        updateValue('gravity', 'gravity-value');
        
        this.createGrid();
        this.switchExperiment('projectile');
    }

    createGrid() {
        const grid = document.getElementById('grid');
        for (let i = -20; i <= 20; i += 5) {
            grid.innerHTML += `<a-plane position="${i} 0.01 0" rotation="-90 0 0" width="0.1" height="40" color="#ddd"></a-plane>`;
            grid.innerHTML += `<a-plane position="0 0.01 ${i}" rotation="-90 90 0" width="0.1" height="40" color="#ddd"></a-plane>`;
        }
    }
    
    switchExperiment(experiment) {
        this.resetExperiment();
        this.currentExperiment = experiment;
        
        const allExperiments = ['projectile-experiment', 'pendulum-experiment', 'collision-experiment', 'energy-experiment'];
        allExperiments.forEach(id => document.getElementById(id).setAttribute('visible', false));
        document.getElementById(`${experiment}-experiment`).setAttribute('visible', true);
        
        // Налаштування видимості UI
        document.getElementById('mass1-group').style.display = 'block';
        document.getElementById('mass2-group').style.display = 'none';
        document.getElementById('velocity-group').style.display = 'none';
        document.getElementById('angle-group').style.display = 'none';
        document.getElementById('length-group').style.display = 'none';
        document.getElementById('total-energy-p').style.display = 'none';

        switch(experiment) {
            case 'projectile':
                document.getElementById('velocity-group').style.display = 'block';
                document.getElementById('angle-group').style.display = 'block';
                document.getElementById('mass1-group').querySelector('label').innerHTML = 'Маса снаряда (кг): <span id="mass1-value">1</span>';
                break;
            case 'pendulum':
                document.getElementById('length-group').style.display = 'block';
                document.getElementById('mass1-group').querySelector('label').innerHTML = 'Маса кульки (кг): <span id="mass1-value">1</span>';
                break;
            case 'collision':
                document.getElementById('mass2-group').style.display = 'block';
                document.getElementById('velocity-group').style.display = 'block';
                document.getElementById('mass1-group').querySelector('label').innerHTML = 'Маса тіла 1 (кг): <span id="mass1-value">1</span>';
                break;
            case 'energy':
                document.getElementById('total-energy-p').style.display = 'block';
                document.getElementById('mass1-group').querySelector('label').innerHTML = 'Маса кульки (кг): <span id="mass1-value">1</span>';
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
            
            // Запуск відповідної симуляції
            switch(this.currentExperiment) {
                case 'projectile': this.startProjectile(); break;
                case 'pendulum': this.startPendulum(); break;
                case 'collision': this.startCollision(); break;
                case 'energy': this.startEnergy(); break;
            }
        }
    }

    // --- ЛОГІКА СИМУЛЯЦІЙ ---

    startProjectile() {
        const projectile = document.getElementById('projectile');
        const trajectory = document.getElementById('trajectory');
        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value) * Math.PI / 180;
        const gravity = parseFloat(this.gravitySlider.value);
        
        let x = -10, y = 1;
        let vx = velocity * Math.cos(angle);
        let vy = velocity * Math.sin(angle);
        let lastPointTime = 0;

        const animate = () => {
            if (!this.isRunning) return;
            const dt = 0.016;
            
            x += vx * dt;
            y += vy * dt;
            vy -= gravity * dt;
            
            projectile.setAttribute('position', `${x} ${y} 0`);

            if (Date.now() - lastPointTime > 100) {
                const point = document.createElement('a-sphere');
                point.setAttribute('position', `${x} ${y} 0`);
                point.setAttribute('radius', '0.05');
                point.setAttribute('color', '#FFD93D');
                trajectory.appendChild(point);
                lastPointTime = Date.now();
            }
            
            if (y <= 0.3) {
                this.stopExperiment();
                return;
            }
            this.updateStats({x, y, vx, vy});
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    startPendulum() {
        const pendulumBall = document.getElementById('pendulum-ball');
        const pendulumString = document.getElementById('pendulum-string');
        const length = parseFloat(this.lengthSlider.value);
        const gravity = parseFloat(this.gravitySlider.value);
        
        let pendulumAngle = Math.PI / 4;
        let pendulumVelocity = 0;

        const animate = () => {
            if (!this.isRunning) return;
            const dt = 0.016;
            
            const acceleration = -(gravity / length) * Math.sin(pendulumAngle);
            pendulumVelocity += acceleration * dt;
            pendulumAngle += pendulumVelocity * dt;
            
            const x = length * Math.sin(pendulumAngle);
            const y = 5 - length * Math.cos(pendulumAngle);
            
            pendulumBall.setAttribute('position', `${x} ${y} 0`);
            pendulumString.setAttribute('line', 'end', `${x} ${y} 0`);
            
            this.updateStats({y, v: Math.abs(pendulumVelocity * length)});
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
        const m1 = parseFloat(this.mass1Slider.value);
        const m2 = parseFloat(this.mass2Slider.value);

        let x1 = -5, x2 = 5;
        let v1 = velocity, v2 = -velocity; // Рухаються назустріч
        let collided = false;

        const animate = () => {
            if (!this.isRunning) return;
            const dt = 0.016;

            // Перевірка зіткнення
            if (!collided && Math.abs(x1 - x2) <= 1.0) { // Ширина куба 1
                collided = true;
                
                // *** ВИПРАВЛЕНА ФОРМУЛА ПРУЖНОГО ЗІТКНЕННЯ ДЛЯ РІЗНИХ МАС ***
                const u1 = v1, u2 = v2; // Зберігаємо старі швидкості
                v1 = (u1 * (m1 - m2) + 2 * m2 * u2) / (m1 + m2);
                v2 = (u2 * (m2 - m1) + 2 * m1 * u1) / (m1 + m2);
            }
            
            x1 += v1 * dt;
            x2 += v2 * dt;

            box1.setAttribute('position', `${x1} 0.5 0`);
            box2.setAttribute('position', `${x2} 0.5 0`);
            text1.setAttribute('position', `${x1} 1.7 0`);
            text2.setAttribute('position', `${x2} 1.7 0`);

            if (Math.abs(x1) > 20 || Math.abs(x2) > 20) {
                this.stopExperiment();
                return;
            }
            
            this.updateStats({ v1, v2 });
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    startEnergy() {
        const ball = document.getElementById('energy-ball');
        const gravity = parseFloat(this.gravitySlider.value);
        const mass = parseFloat(this.mass1Slider.value);

        const h0 = 3.24; // Початкова висота
        const E_total = mass * gravity * h0;
        let x = -6.5, y = h0;
        let v = 0;
        let direction = 1; // 1 = вправо, -1 = вліво

        const animate = () => {
            if (!this.isRunning) return;
            const dt = 0.016;

            // Розрахунок швидкості з енергії
            const PE = mass * gravity * y;
            const KE = E_total - PE;
            
            if (KE < 0) { // Досягли максимальної висоти
                v = 0;
                direction *= -1; // Зміна напрямку
            } else {
                v = Math.sqrt(2 * KE / mass);
            }
            
            const dx = v * dt * direction;
            x += dx;

            // Розрахунок висоти y в залежності від x
            if (x < -1.5) { // Ліва гірка
                y = 3.24 - (x + 6.5) * Math.tan(25 * Math.PI / 180);
            } else if (x > 1.5) { // Права гірка
                y = 0.5 + (x - 1.5) * Math.tan(25 * Math.PI / 180);
            } else { // Центр
                y = 0.5;
            }

            ball.setAttribute('position', `${x} ${y} 0`);
            
            this.updateStats({ y, v });
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    // --- ДОПОМІЖНІ ФУНКЦІЇ ---

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
        document.getElementById('trajectory').innerHTML = '';
        
        // Скидання позицій
        document.getElementById('projectile').setAttribute('position', '-10 1 0');
        document.getElementById('pendulum-ball').setAttribute('position', '0 3 0');
        document.getElementById('pendulum-string').setAttribute('line', 'start: 0 5 0; end: 0 3 0');
        document.getElementById('box1').setAttribute('position', '-5 0.5 0');
        document.getElementById('box2').setAttribute('position', '5 0.5 0');
        document.getElementById('text1').setAttribute('position', '-5 1.7 0');
        document.getElementById('text2').setAttribute('position', '5 1.7 0');
        document.getElementById('energy-ball').setAttribute('position', '-6.5 3.24 0');
        
        this.updateStats(null, true);
    }
    
    updateStats(data, forceReset = false) {
        if (forceReset) {
            document.getElementById('time').textContent = '0';
            document.getElementById('current-velocity').textContent = '0';
            document.getElementById('height').textContent = '0';
            document.getElementById('kinetic-energy').textContent = '0';
            document.getElementById('potential-energy').textContent = '0';
            document.getElementById('total-energy').textContent = '0';
            return;
        }

        if (!this.isRunning || !data) return;
        
        document.getElementById('time').textContent = ((Date.now() - this.startTime) / 1000).toFixed(2);
        
        let velocity = 0, height = 0, ke = 0, pe = 0;
        const m1 = parseFloat(this.mass1Slider.value);
        const m2 = parseFloat(this.mass2Slider.value);
        const g = parseFloat(this.gravitySlider.value);
        
        switch(this.currentExperiment) {
            case 'projectile':
                height = data.y;
                velocity = Math.sqrt(data.vx*data.vx + data.vy*data.vy);
                ke = 0.5 * m1 * velocity * velocity;
                pe = m1 * g * height;
                break;
            case 'pendulum':
                height = data.y;
                velocity = data.v;
                ke = 0.5 * m1 * velocity * velocity;
                pe = m1 * g * height;
                break;
            case 'collision':
                height = 0.5;
                // Показуємо середню кінетичну енергію системи
                ke = 0.5 * m1 * data.v1*data.v1 + 0.5 * m2 * data.v2*data.v2;
                pe = (m1 + m2) * g * height;
                velocity = (Math.abs(data.v1) + Math.abs(data.v2)) / 2;
                break;
            case 'energy':
                height = data.y;
                velocity = data.v;
                ke = 0.5 * m1 * velocity * velocity;
                pe = m1 * g * height;
                document.getElementById('total-energy').textContent = (ke + pe).toFixed(2);
                break;
        }

        document.getElementById('current-velocity').textContent = velocity.toFixed(2);
        document.getElementById('height').textContent = height.toFixed(2);
        document.getElementById('kinetic-energy').textContent = ke.toFixed(2);
        document.getElementById('potential-energy').textContent = pe.toFixed(2);
    }
}

// Запускаємо симуляцію після завантаження сторінки
document.addEventListener('DOMContentLoaded', () => {
    new MechanicsSimulation();
});
