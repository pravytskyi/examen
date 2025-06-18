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

        // UI для лічильників
        this.cubeCollisionsP = document.getElementById('cube-collisions-p');
        this.wallCollisionsP = document.getElementById('wall-collisions-p');
        this.cubeCollisionsSpan = document.getElementById('cube-collisions');
        this.wallCollisionsSpan = document.getElementById('wall-collisions');
        
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
        this.cubeCollisionsP.style.display = 'none';
        this.wallCollisionsP.style.display = 'none';

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
                this.cubeCollisionsP.style.display = 'block';
                this.wallCollisionsP.style.display = 'block';
                break;
            case 'energy':
                // Цей експеримент поки не працює
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
            
            switch(this.currentExperiment) {
                case 'projectile': this.startProjectile(); break;
                case 'pendulum': this.startPendulum(); break;
                case 'collision': this.startCollision(); break;
                case 'energy': this.stopExperiment(); alert("Цей експеримент тимчасово не працює."); break; // Заглушка
            }
        }
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
        let v1 = velocity, v2 = -velocity;
        
        // Лічильники
        let cubeCollisions = 0;
        let wallCollisions = 0;

        // Позиції стін (центр стіни)
        const leftWallPos = -15;
        const rightWallPos = 15;
        const halfBoxWidth = 0.5; // половина ширини куба

        // Для дуже точних розрахунків, особливо для числа Пі
        const timeStep = 0.001; 
        const stepsPerFrame = 10; // Робимо кілька кроків за кадр для стабільності

        const animate = () => {
            if (!this.isRunning) return;

            for (let i = 0; i < stepsPerFrame; i++) {
                // 1. Перевірка зіткнення кубів
                // Умова: вони достатньо близько І рухаються назустріч (v1 > v2)
                if (x2 - x1 <= (halfBoxWidth * 2) && v1 > v2) {
                    cubeCollisions++;
                    const u1 = v1, u2 = v2;
                    v1 = (u1 * (m1 - m2) + 2 * m2 * u2) / (m1 + m2);
                    v2 = (u2 * (m2 - m1) + 2 * m1 * u1) / (m1 + m2);
                }

                // 2. Перевірка зіткнення зі стінами
                // Лівий куб об ліву стіну
                if (x1 - halfBoxWidth <= leftWallPos + 0.1 && v1 < 0) {
                    wallCollisions++;
                    v1 = -v1;
                }
                // Правий куб об праву стіну
                if (x2 + halfBoxWidth >= rightWallPos - 0.1 && v2 > 0) {
                    // Цей лічильник можна додати окремо, якщо потрібно
                    v2 = -v2;
                }
                
                // 3. Рух
                x1 += v1 * timeStep;
                x2 += v2 * timeStep;
            }

            // 4. Оновлення позицій та лічильників в A-Frame
            box1.setAttribute('position', `${x1} 0.5 0`);
            box2.setAttribute('position', `${x2} 0.5 0`);
            text1.setAttribute('position', `${x1} 1.7 0`);
            text2.setAttribute('position', `${x2} 1.7 0`);
            this.cubeCollisionsSpan.textContent = cubeCollisions;
            this.wallCollisionsSpan.textContent = wallCollisions;
            
            this.updateStats({ v1, v2, m1, m2 });
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }
    
    // Інші функції start... та допоміжні функції залишаються тут
    // ... (код з попередньої відповіді для startProjectile, startPendulum, stop, reset, updateStats) ...

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
        
        document.getElementById('projectile').setAttribute('position', '-10 1 0');
        document.getElementById('pendulum-ball').setAttribute('position', '0 3 0');
        document.getElementById('pendulum-string').setAttribute('line', 'start: 0 5 0; end: 0 3 0');
        document.getElementById('box1').setAttribute('position', '-5 0.5 0');
        document.getElementById('box2').setAttribute('position', '5 0.5 0');
        document.getElementById('text1').setAttribute('position', '-5 1.7 0');
        document.getElementById('text2').setAttribute('position', '5 1.7 0');
        
        if(this.cubeCollisionsSpan) this.cubeCollisionsSpan.textContent = '0';
        if(this.wallCollisionsSpan) this.wallCollisionsSpan.textContent = '0';
        
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
        const g = parseFloat(this.gravitySlider.value);
        
        switch(this.currentExperiment) {
            case 'projectile':
                const m_proj = parseFloat(this.mass1Slider.value);
                height = data.y;
                velocity = Math.sqrt(data.vx*data.vx + data.vy*data.vy);
                ke = 0.5 * m_proj * velocity * velocity;
                pe = m_proj * g * height;
                break;
            case 'pendulum':
                const m_pend = parseFloat(this.mass1Slider.value);
                height = data.y;
                velocity = data.v;
                ke = 0.5 * m_pend * velocity * velocity;
                pe = m_pend * g * height;
                break;
            case 'collision':
                const m1 = data.m1;
                const m2 = data.m2;
                height = 0.5;
                ke = 0.5 * m1 * data.v1*data.v1 + 0.5 * m2 * data.v2*data.v2;
                pe = (m1 + m2) * g * height;
                velocity = (Math.abs(data.v1) + Math.abs(data.v2)) / 2;
                break;
        }

        document.getElementById('current-velocity').textContent = velocity.toFixed(2);
        document.getElementById('height').textContent = height.toFixed(2);
        document.getElementById('kinetic-energy').textContent = ke.toFixed(2);
        document.getElementById('potential-energy').textContent = pe.toFixed(2);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MechanicsSimulation();
});
