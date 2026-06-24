class ParticleNetwork {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.opts = {
            particleCount: options.particleCount || 100,
            particleColor: options.particleColor || 0xc8a951,
            lineColor: options.lineColor || 0xc8a951,
            maxDistance: options.maxDistance || 140,
            speed: options.speed || 0.3,
            ...options
        };

        this.mouse = new THREE.Vector2(9999, 9999);
        this.mouseWorld = new THREE.Vector3(9999, 9999, 0);
        this.particles = [];
        this.clock = new THREE.Clock();
        this.glowMeshes = [];

        this.init();
        this.createParticles();
        this.createGlowOrbs();
        this.createCentralGeometry();
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
        const count = this.opts.particleCount;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        this.velocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.width * 0.8;
            positions[i * 3 + 1] = (Math.random() - 0.5) * this.height * 0.8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
            sizes[i] = Math.random() * 2 + 1;

            this.velocities.push({
                x: (Math.random() - 0.5) * this.opts.speed,
                y: (Math.random() - 0.5) * this.opts.speed,
                z: (Math.random() - 0.5) * this.opts.speed * 0.3
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: this.opts.particleColor,
            size: 2.5,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.points = new THREE.Points(geometry, material);
        this.scene.add(this.points);

        const maxLines = count * count;
        const lineGeometry = new THREE.BufferGeometry();
        const linePositions = new Float32Array(maxLines * 6);
        const lineColors = new Float32Array(maxLines * 6);
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
        lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending
        });

        this.lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        this.scene.add(this.lines);
    }

    createGlowOrbs() {
        const colors = [0xc8a951, 0x4a90d9, 0xc8a951];
        for (let i = 0; i < 3; i++) {
            const geometry = new THREE.SphereGeometry(30 + i * 15, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: colors[i],
                transparent: true,
                opacity: 0.03,
                blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(
                (Math.random() - 0.5) * this.width * 0.4,
                (Math.random() - 0.5) * this.height * 0.4,
                -50
            );
            mesh.userData = {
                speed: 0.2 + Math.random() * 0.3,
                amp: 40 + Math.random() * 60,
                offset: Math.random() * Math.PI * 2,
                initialPos: mesh.position.clone()
            };
            this.scene.add(mesh);
            this.glowMeshes.push(mesh);
        }
    }

    createCentralGeometry() {
        const geometry = new THREE.IcosahedronGeometry(45, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0xc8a951,
            wireframe: true,
            transparent: true,
            opacity: 0.06,
            blending: THREE.AdditiveBlending
        });
        this.centralMesh = new THREE.Mesh(geometry, material);
        this.centralMesh.position.set(0, 0, -30);
        this.scene.add(this.centralMesh);

        const outerGeometry = new THREE.IcosahedronGeometry(70, 0);
        const outerMaterial = new THREE.MeshBasicMaterial({
            color: 0xc8a951,
            wireframe: true,
            transparent: true,
            opacity: 0.03,
            blending: THREE.AdditiveBlending
        });
        this.outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
        this.outerMesh.position.set(0, 0, -30);
        this.scene.add(this.outerMesh);
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
        const time = this.clock.getElapsedTime();
        const positions = this.points.geometry.attributes.position.array;
        const halfW = this.width * 0.4;
        const halfH = this.height * 0.4;
        const mouseInfluence = 80;

        for (let i = 0; i < this.opts.particleCount; i++) {
            positions[i * 3] += this.velocities[i].x;
            positions[i * 3 + 1] += this.velocities[i].y;
            positions[i * 3 + 2] += this.velocities[i].z;

            const dx = this.mouseWorld.x - positions[i * 3];
            const dy = this.mouseWorld.y - positions[i * 3 + 1];
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouseInfluence && dist > 0) {
                const force = (mouseInfluence - dist) / mouseInfluence * 0.02;
                positions[i * 3] -= dx * force;
                positions[i * 3 + 1] -= dy * force;
            }

            if (Math.abs(positions[i * 3]) > halfW) this.velocities[i].x *= -1;
            if (Math.abs(positions[i * 3 + 1]) > halfH) this.velocities[i].y *= -1;
            if (Math.abs(positions[i * 3 + 2]) > 75) this.velocities[i].z *= -1;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
        this.updateLines();

        this.glowMeshes.forEach(mesh => {
            const d = mesh.userData;
            mesh.position.x = d.initialPos.x + Math.sin(time * d.speed + d.offset) * d.amp;
            mesh.position.y = d.initialPos.y + Math.cos(time * d.speed * 0.7 + d.offset) * d.amp * 0.6;
            mesh.material.opacity = 0.02 + Math.sin(time * 0.5 + d.offset) * 0.015;
        });

        if (this.centralMesh) {
            this.centralMesh.rotation.x += 0.002;
            this.centralMesh.rotation.y += 0.003;
            this.centralMesh.material.opacity = 0.04 + Math.sin(time * 0.8) * 0.02;
        }
        if (this.outerMesh) {
            this.outerMesh.rotation.x -= 0.001;
            this.outerMesh.rotation.y -= 0.0015;
            this.outerMesh.material.opacity = 0.02 + Math.sin(time * 0.5) * 0.01;
        }

        this.scene.rotation.y = Math.sin(time * 0.1) * 0.02;
        this.scene.rotation.x = Math.cos(time * 0.08) * 0.01;

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

        this.canvas.parentElement.addEventListener('mousemove', (e) => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.mouseWorld.x = this.mouse.x * this.width * 0.4;
            this.mouseWorld.y = this.mouse.y * this.height * 0.4;
        });

        this.canvas.parentElement.addEventListener('mouseleave', () => {
            this.mouseWorld.set(9999, 9999, 0);
        });
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
        this.createRings();
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
        const material = new THREE.MeshBasicMaterial({
            color: 0xc8a951,
            wireframe: true,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending
        });

        const geometries = [
            new THREE.IcosahedronGeometry(35, 1),
            new THREE.OctahedronGeometry(28, 0),
            new THREE.TetrahedronGeometry(22, 0),
            new THREE.IcosahedronGeometry(20, 0),
            new THREE.OctahedronGeometry(25, 1),
            new THREE.DodecahedronGeometry(18, 0),
            new THREE.TorusGeometry(18, 5, 8, 20),
            new THREE.TorusKnotGeometry(12, 4, 48, 8),
        ];

        for (let i = 0; i < geometries.length; i++) {
            const mat = material.clone();
            mat.opacity = 0.06 + Math.random() * 0.08;
            const mesh = new THREE.Mesh(geometries[i], mat);
            mesh.position.set(
                (Math.random() - 0.5) * this.width * 0.7,
                (Math.random() - 0.5) * this.height * 0.7,
                (Math.random() - 0.5) * 250
            );
            mesh.userData = {
                rotSpeed: {
                    x: (Math.random() - 0.5) * 0.008,
                    y: (Math.random() - 0.5) * 0.008,
                    z: (Math.random() - 0.5) * 0.004
                },
                floatSpeed: Math.random() * 0.4 + 0.3,
                floatAmp: Math.random() * 25 + 15,
                initialY: mesh.position.y,
                pulseSpeed: Math.random() * 0.5 + 0.3,
                baseOpacity: mat.opacity
            };
            this.scene.add(mesh);
            this.shapes.push(mesh);
        }
    }

    createRings() {
        this.rings = [];
        for (let i = 0; i < 3; i++) {
            const geometry = new THREE.TorusGeometry(60 + i * 40, 0.5, 8, 64);
            const material = new THREE.MeshBasicMaterial({
                color: 0xc8a951,
                transparent: true,
                opacity: 0.04,
                blending: THREE.AdditiveBlending
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = Math.PI * 0.4 + i * 0.2;
            ring.rotation.y = i * 0.5;
            ring.userData = { rotSpeed: 0.001 + i * 0.0005 };
            this.scene.add(ring);
            this.rings.push(ring);
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
            shape.material.opacity = d.baseOpacity + Math.sin(time * d.pulseSpeed) * 0.03;
        });

        this.rings.forEach(ring => {
            ring.rotation.z += ring.userData.rotSpeed;
            ring.rotation.y += ring.userData.rotSpeed * 0.5;
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
