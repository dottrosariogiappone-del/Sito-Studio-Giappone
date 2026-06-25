class ParticleNetwork {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.opts = {
            particleCount: options.particleCount || 80,
            particleColor: options.particleColor || 0xc8a951,
            lineColor: options.lineColor || 0xc8a951,
            maxDistance: options.maxDistance || 150,
            speed: options.speed || 0.3,
            mouseInfluence: options.mouseInfluence || 100,
            ...options
        };

        this.mouse = { x: 9999, y: 9999 };
        this.particles = [];
        this.clock = new THREE.Clock();

        this.init();
        this.createParticles();
        this.animate();
        this.bindEvents();
    }

    init() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 1, 1000);
        this.camera.position.z = 300;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.opts.particleCount * 3);
        this.velocities = [];

        for (let i = 0; i < this.opts.particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.width * 0.8;
            positions[i * 3 + 1] = (Math.random() - 0.5) * this.height * 0.8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

            this.velocities.push({
                x: (Math.random() - 0.5) * this.opts.speed,
                y: (Math.random() - 0.5) * this.opts.speed,
                z: (Math.random() - 0.5) * this.opts.speed * 0.5
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: this.opts.particleColor,
            size: 2.5,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.points = new THREE.Points(geometry, material);
        this.scene.add(this.points);

        const maxLines = this.opts.particleCount * this.opts.particleCount;
        const lineGeometry = new THREE.BufferGeometry();
        const linePositions = new Float32Array(maxLines * 6);
        const lineColors = new Float32Array(maxLines * 6);
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });

        this.lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        this.scene.add(this.lines);
    }

    updateLines() {
        const positions = this.points.geometry.attributes.position.array;
        const linePositions = this.lines.geometry.attributes.position.array;
        const lineColors = this.lines.geometry.attributes.color.array;
        let lineIndex = 0;
        const count = this.opts.particleCount;
        const maxDist = this.opts.maxDistance;
        const goldR = 0.78, goldG = 0.66, goldB = 0.32;

        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < maxDist) {
                    const alpha = 1 - dist / maxDist;
                    const idx = lineIndex * 6;

                    linePositions[idx] = positions[i * 3];
                    linePositions[idx + 1] = positions[i * 3 + 1];
                    linePositions[idx + 2] = positions[i * 3 + 2];
                    linePositions[idx + 3] = positions[j * 3];
                    linePositions[idx + 4] = positions[j * 3 + 1];
                    linePositions[idx + 5] = positions[j * 3 + 2];

                    lineColors[idx] = goldR * alpha;
                    lineColors[idx + 1] = goldG * alpha;
                    lineColors[idx + 2] = goldB * alpha;
                    lineColors[idx + 3] = goldR * alpha;
                    lineColors[idx + 4] = goldG * alpha;
                    lineColors[idx + 5] = goldB * alpha;

                    lineIndex++;
                }
            }
        }

        this.lines.geometry.setDrawRange(0, lineIndex * 2);
        this.lines.geometry.attributes.position.needsUpdate = true;
        this.lines.geometry.attributes.color.needsUpdate = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const positions = this.points.geometry.attributes.position.array;
        const halfW = this.width * 0.4;
        const halfH = this.height * 0.4;

        for (let i = 0; i < this.opts.particleCount; i++) {
            positions[i * 3] += this.velocities[i].x;
            positions[i * 3 + 1] += this.velocities[i].y;
            positions[i * 3 + 2] += this.velocities[i].z;

            if (Math.abs(positions[i * 3]) > halfW) this.velocities[i].x *= -1;
            if (Math.abs(positions[i * 3 + 1]) > halfH) this.velocities[i].y *= -1;
            if (Math.abs(positions[i * 3 + 2]) > 50) this.velocities[i].z *= -1;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
        this.updateLines();

        this.scene.rotation.y += 0.0003;
        this.scene.rotation.x += 0.0001;

        this.renderer.render(this.scene, this.camera);
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.width = rect.width;
            this.height = rect.height;
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
        });
    }

    dispose() {
        this.renderer.dispose();
    }
}

class FloatingGeometry {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.shapes = [];
        this.clock = new THREE.Clock();
        this.init();
        this.createShapes();
        this.animate();
        this.bindEvents();
    }

    init() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 1, 1000);
        this.camera.position.z = 400;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    createShapes() {
        const goldColor = 0xc8a951;
        const material = new THREE.MeshBasicMaterial({
            color: goldColor,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });

        const geometries = [
            new THREE.IcosahedronGeometry(30, 1),
            new THREE.OctahedronGeometry(25, 0),
            new THREE.TetrahedronGeometry(20, 0),
            new THREE.IcosahedronGeometry(18, 0),
            new THREE.OctahedronGeometry(22, 1),
            new THREE.TorusGeometry(15, 5, 8, 16),
        ];

        for (let i = 0; i < geometries.length; i++) {
            const mesh = new THREE.Mesh(geometries[i], material.clone());
            mesh.position.set(
                (Math.random() - 0.5) * this.width * 0.6,
                (Math.random() - 0.5) * this.height * 0.6,
                (Math.random() - 0.5) * 200
            );
            mesh.userData = {
                rotSpeed: {
                    x: (Math.random() - 0.5) * 0.01,
                    y: (Math.random() - 0.5) * 0.01,
                    z: (Math.random() - 0.5) * 0.005
                },
                floatSpeed: Math.random() * 0.5 + 0.5,
                floatAmp: Math.random() * 20 + 10,
                initialY: mesh.position.y
            };
            this.scene.add(mesh);
            this.shapes.push(mesh);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const time = this.clock.getElapsedTime();

        this.shapes.forEach(shape => {
            const d = shape.userData;
            shape.rotation.x += d.rotSpeed.x;
            shape.rotation.y += d.rotSpeed.y;
            shape.rotation.z += d.rotSpeed.z;
            shape.position.y = d.initialY + Math.sin(time * d.floatSpeed) * d.floatAmp;
        });

        this.renderer.render(this.scene, this.camera);
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.width = rect.width;
            this.height = rect.height;
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
        });
    }
}
