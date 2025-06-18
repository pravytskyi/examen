class MechanicsSimulation {
    constructor() {
        this.currentExperiment = 'projectile';
        this.isRunning = false;
        this.animationFrame = null;
        this.startTime = 0;
        
        this.init();
    }
    
    init() {
        // Отримання елементів керування
        this.experimentSelect = document.getElementById('experiment-select');
        this.mass1Slider = document.getElementById('mass1');
        this.mass2Slider = document.getElementById('mass2');
        this.velocitySlider = document.getElementById('velocity');
        this.angleSlider = document.getElementById('angle');
        this.lengthSlider = document.getElementById('length');
        this.gravitySlider = document.getElementById('gravity');
        this.startBtn = document.getElementById('start-btn');
        this.resetBtn = document.getElementById('reset-btn');
        
        // Отримання елементів для виводу статистики
        this.timeSpan = document.getElementById('time');
        this.velocitySpan = document.getElementById('current-velocity');
        this.heightSpan = document.getElementById('height');
        this.keSpan = document.getElementById('kinetic-energy');
        this.peSpan = document.getElementById('potential-energy');
        this.totalEnergyP = document.getElementById('total-energy-p');
        this.totalEnergySpan = document.getElementById('total-energy');
        this.collisionsP = document.getElementById('collisions-p');
        this.collisionsSpan = document.getElementById('collisions-count');
        
        // Слухачі подій
        this.experimentSelect.addEventListener('change', (e) => this.switchExperiment(e.target.value));
        this.startBtn.addEventListener('click', () => this.toggleExperiment());
        this.resetBtn.addEventListener('click', () => this.resetExperiment());
        
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
    
    switchExperiment(experiment) {
        this.resetExperiment();
        this.currentExperiment = experiment;
        
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
        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value) * Math.PI / 180;
        
        let x = -10, y = 1;
        let vx = velocity * Math.cos(angle);
        let vy = velocity * Math.sin(angle);

        const animate = () => {
            if (!this.isRunning) return;
            const dt = 0.016;
            const gravity = parseFloat(this.gravitySlider.value);
            
            x += vx * dt;
            y += vy * dt;
            vy -= gravity * dt;
            
            projectile.setAttribute('position', `${x} ${y} 0`);
            
            this.updateStats({ y, vx, vy });
            
            if (y <= 0.3) { this.stopExperiment(); return; }
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
        
        // --- ВИПРАВЛЕННЯ ТУТ ---
        // Зчитуємо масу ОДИН РАЗ на початку симуляції.
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

            // Тепер маси m1 та m2 є константами всередині цього циклу
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
            // Передаємо m1 та m2 в статистику
            this.updateStats({ v1, v2, m1, m2 });

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
                // --- ВИПРАВЛЕННЯ ТУТ ---
                // Тепер ми беремо маси з об'єкта `data`, що передається з циклу
                const { m1, m2, v1, v2 } = data;
                height = 0;
                ke = 0.5 * m1 * v1*v1 + 0.5 * m2 * v2*v2;
                pe = (m1 + m2) * g * 0.5; // Невелика потенційна енергія, бо вони не на нульовій висоті
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
