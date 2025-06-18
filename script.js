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
        
        // Налаштування видимості UI
        document.getElementById('mass1-group').style.display = 'block';
        document.getElementById('mass2-group').style.display = 'none';
        document.getElementById('velocity-group').style.display = 'none';
        document.getElementById('angle-group').style.display = 'none';
        document.getElementById('length-group').style.display = 'none';
        this.collisionsP.style.display = 'none';

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
                this.collisionsP.style.display = 'block';
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
        const trajectory = document.getElementById('trajectory');
        const velocity = parseFloat(this.velocitySlider.value);
        const angle = parseFloat(this.angleSlider.value) * Math.PI / 180;
        const gravity = parseFloat(this.gravitySlider.value);
        
        let x = -10, y = 1;
        let vx = velocity * Math.cos(angle);
        let vy = velocity * Math.sin(angle);

        const animate = () => {
            if (!this.isRunning) return;
            const dt = 0.016;
            x += vx * dt;
            y += vy * dt;
            vy -= gravity * dt;
            projectile.setAttribute('position', `${x} ${y} 0`);
            
            if (y <= 0.3) { this.stopExperiment(); return; }
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    startPendulum() {
        const pendulumBall = document.getElementById('pendulum-ball');
        const pendulumString = document.getElementById('pendulum-string');
        const length = parseFloat(this.lengthSlider.value);
        const gravity = parseFloat(this.gravitySlider.value);
        
        let angle = Math.PI / 4;
        let angVelocity = 0;

        const animate = () => {
            if (!this.isRunning) return;
            const dt = 0.016;
            const acceleration = -(gravity / length) * Math.sin(angle);
            angVelocity += acceleration * dt;
            angle += angVelocity * dt;
            
            const x = length * Math.sin(angle);
            const y = 5 - length * Math.cos(angle);
            
            pendulumBall.setAttribute('position', `${x} ${y} 0`);
            pendulumString.setAttribute('line', 'end', `${x} ${y} 0`);
            
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

        const leftWallX = -15 + 0.5; // Позиція лівої стіни + півширини куба
        const rightWallX = 15 - 0.5; // Позиція правої стіни - півширини куба
        const boxWidth = 1.0;

        const timeStep = 0.001;
        const stepsPerFrame = 15;

        const animate = () => {
            if (!this.isRunning) return;

            for (let i = 0; i < stepsPerFrame; i++) {
                // Зіткнення кубів
                if (x2 - x1 <= boxWidth && v1 > v2) {
                    collisionCount++;
                    const u1 = v1, u2 = v2;
                    v1 = (u1 * (m1 - m2) + 2 * m2 * u2) / (m1 + m2);
                    v2 = (u2 * (m2 - m1) + 2 * m1 * u1) / (m1 + m2);
                }

                // Зіткнення зі стінами
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
        
        if(this.collisionsSpan) this.collisionsSpan.textContent = '0';
        
        document.getElementById('time').textContent = '0';
        document.getElementById('kinetic-energy').textContent = '0';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MechanicsSimulation();
});
