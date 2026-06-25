class ParticleNetwork {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.opts = {
            particleCount: options.particleCount || 120,
            maxDistance: options.maxDistance || 130,
            speed: options.speed || 0.35,
            ...options
        };

        this.mouse = new THREE.Vector2(9999, 9999);
        this.mouseWorld = new THREE.Vector3(9999, 9999, 0);
        this.clock = new THREE.Clock();
        this.glowMeshes = [];
        this.orbitRings = [];

        this.init();
        this.createParticles();
        this.createCentralSphere();
        this.createGlowOrbs();
        this.createOrbitRings();
        this.createLightBeams();
        this.animate();
        this.bindEvents();
    }

    init() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 1, 1000);
        this.camera.position.z = 350;

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
        this.velocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.width * 0.9;
            positions[i * 3 + 1] = (Math.random() - 0.5) * this.height * 0.9;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

            this.velocities.push({
                x: (Math.random() - 0.5) * this.opts.speed,
                y: (Math.random() - 0.5) * this.opts.speed,
                z: (Math.random() - 0.5) * this.opts.speed * 0.3
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xc8a951,
            size: 3,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.points = new THREE.Points(geometry, material);
        this.scene.add(this.points);

        const maxLines = count * count;
        const lineGeo = new THREE.BufferGeometry();
        const linePos = new Float32Array(maxLines * 6);
        const lineCol = new Float32Array(maxLines * 6);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
        lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));

        this.lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        }));
        this.scene.add(this.lines);
    }

    createCentralSphere() {
        this.centralGroup = new THREE.Group();

        const sphere = new THREE.IcosahedronGeometry(55, 2);
        const mat1 = new THREE.MeshBasicMaterial({
            color: 0xc8a951, wireframe: true, transparent: true,
            opacity: 0.08, blending: THREE.AdditiveBlending
        });
        this.innerSphere = new THREE.Mesh(sphere, mat1);
        this.centralGroup.add(this.innerSphere);

        const outer = new THREE.IcosahedronGeometry(80, 1);
        const mat2 = new THREE.MeshBasicMaterial({
            color: 0xc8a951, wireframe: true, transparent: true,
            opacity: 0.04, blending: THREE.AdditiveBlending
        });
        this.outerSphere = new THREE.Mesh(outer, mat2);
        this.centralGroup.add(this.outerSphere);

        const shell = new THREE.IcosahedronGeometry(110, 0);
        const mat3 = new THREE.MeshBasicMaterial({
            color: 0xc8a951, wireframe: true, transparent: true,
            opacity: 0.02, blending: THREE.AdditiveBlending
        });
        this.shellSphere = new THREE.Mesh(shell, mat3);
        this.centralGroup.add(this.shellSphere);

        this.scene.add(this.centralGroup);
    }

    createGlowOrbs() {
        const colors = [0xc8a951, 0x4a90d9, 0xc8a951, 0x6b5ce7, 0xc8a951];
        for (let i = 0; i < 5; i++) {
            const geo = new THREE.SphereGeometry(20 + i * 10, 16, 16);
            const mat = new THREE.MeshBasicMaterial({
                color: colors[i], transparent: true,
                opacity: 0.04, blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(geo, mat);
            const angle = (i / 5) * Math.PI * 2;
            const radius = 120 + Math.random() * 80;
            mesh.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius * 0.5,
                (Math.random() - 0.5) * 100
            );
            mesh.userData = {
                angle, radius,
                speed: 0.15 + Math.random() * 0.2,
                ySpeed: 0.1 + Math.random() * 0.15,
                yAmp: 30 + Math.random() * 40
            };
            this.scene.add(mesh);
            this.glowMeshes.push(mesh);
        }
    }

    createOrbitRings() {
        for (let i = 0; i < 4; i++) {
            const geo = new THREE.TorusGeometry(70 + i * 30, 0.4, 8, 100);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xc8a951, transparent: true,
                opacity: 0.05 - i * 0.008, blending: THREE.AdditiveBlending
            });
            const ring = new THREE.Mesh(geo, mat);
            ring.rotation.x = Math.PI * 0.3 + i * 0.25;
            ring.rotation.z = i * 0.4;
            ring.userData = { speed: 0.002 - i * 0.0003 };
            this.scene.add(ring);
            this.orbitRings.push(ring);
        }
    }

    createLightBeams() {
        this.beams = [];
        for (let i = 0; i < 6; i++) {
            const geo = new THREE.PlaneGeometry(1, 300);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xc8a951, transparent: true,
                opacity: 0.015, blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });
            const beam = new THREE.Mesh(geo, mat);
            const angle = (i / 6) * Math.PI;
            beam.rotation.z = angle;
            beam.position.z = -50;
            beam.userData = { baseAngle: angle, speed: 0.0005 + i * 0.0002 };
            this.scene.add(beam);
            this.beams.push(beam);
        }
    }

    updateLines() {
        const pos = this.points.geometry.attributes.position.array;
        const lPos = this.lines.geometry.attributes.position.array;
        const lCol = this.lines.geometry.attributes.color.array;
        let idx = 0;
        const count = this.opts.particleCount;
        const maxDist = this.opts.maxDistance;

        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const dx = pos[i*3] - pos[j*3];
                const dy = pos[i*3+1] - pos[j*3+1];
                const dz = pos[i*3+2] - pos[j*3+2];
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

                if (dist < maxDist) {
                    const alpha = 1 - dist / maxDist;
                    const p = idx * 6;
                    lPos[p]=pos[i*3]; lPos[p+1]=pos[i*3+1]; lPos[p+2]=pos[i*3+2];
                    lPos[p+3]=pos[j*3]; lPos[p+4]=pos[j*3+1]; lPos[p+5]=pos[j*3+2];
                    lCol[p]=0.78*alpha; lCol[p+1]=0.66*alpha; lCol[p+2]=0.32*alpha;
                    lCol[p+3]=0.78*alpha; lCol[p+4]=0.66*alpha; lCol[p+5]=0.32*alpha;
                    idx++;
                }
            }
        }
        this.lines.geometry.setDrawRange(0, idx * 2);
        this.lines.geometry.attributes.position.needsUpdate = true;
        this.lines.geometry.attributes.color.needsUpdate = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const t = this.clock.getElapsedTime();
        const pos = this.points.geometry.attributes.position.array;
        const halfW = this.width * 0.45;
        const halfH = this.height * 0.45;

        for (let i = 0; i < this.opts.particleCount; i++) {
            pos[i*3] += this.velocities[i].x;
            pos[i*3+1] += this.velocities[i].y;
            pos[i*3+2] += this.velocities[i].z;

            const dx = this.mouseWorld.x - pos[i*3];
            const dy = this.mouseWorld.y - pos[i*3+1];
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 120 && dist > 0) {
                const force = (120 - dist) / 120 * 0.03;
                pos[i*3] -= dx * force;
                pos[i*3+1] -= dy * force;
            }

            if (Math.abs(pos[i*3]) > halfW) this.velocities[i].x *= -1;
            if (Math.abs(pos[i*3+1]) > halfH) this.velocities[i].y *= -1;
            if (Math.abs(pos[i*3+2]) > 100) this.velocities[i].z *= -1;
        }
        this.points.geometry.attributes.position.needsUpdate = true;
        this.updateLines();

        this.innerSphere.rotation.x += 0.003;
        this.innerSphere.rotation.y += 0.004;
        this.innerSphere.material.opacity = 0.06 + Math.sin(t * 0.8) * 0.03;

        this.outerSphere.rotation.x -= 0.002;
        this.outerSphere.rotation.y -= 0.0025;
        this.outerSphere.material.opacity = 0.03 + Math.sin(t * 0.5) * 0.015;

        this.shellSphere.rotation.x += 0.001;
        this.shellSphere.rotation.z += 0.0008;

        const pulse = Math.sin(t * 0.6) * 0.08 + 1;
        this.innerSphere.scale.setScalar(pulse);
        this.outerSphere.scale.setScalar(1 + (pulse - 1) * 0.5);

        this.glowMeshes.forEach(mesh => {
            const d = mesh.userData;
            d.angle += d.speed * 0.01;
            mesh.position.x = Math.cos(d.angle + t * d.speed * 0.3) * d.radius;
            mesh.position.y = Math.sin(t * d.ySpeed) * d.yAmp;
            mesh.material.opacity = 0.03 + Math.sin(t * d.speed + d.angle) * 0.02;
            const s = 1 + Math.sin(t * d.speed * 2) * 0.3;
            mesh.scale.setScalar(s);
        });

        this.orbitRings.forEach(ring => {
            ring.rotation.z += ring.userData.speed;
            ring.rotation.y += ring.userData.speed * 0.7;
        });

        this.beams.forEach(beam => {
            beam.rotation.z = beam.userData.baseAngle + t * beam.userData.speed;
            beam.material.opacity = 0.01 + Math.sin(t * 0.3 + beam.userData.baseAngle) * 0.008;
        });

        this.scene.rotation.y = Math.sin(t * 0.08) * 0.03;
        this.scene.rotation.x = Math.cos(t * 0.06) * 0.015;

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
            this.mouseWorld.x = this.mouse.x * this.width * 0.45;
            this.mouseWorld.y = this.mouse.y * this.height * 0.45;
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
        this.rings = [];
        this.clock = new THREE.Clock();
        this.init();
        this.createShapes();
        this.createRings();
        this.createWavePlane();
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
        const geos = [
            new THREE.IcosahedronGeometry(35, 1),
            new THREE.OctahedronGeometry(28, 0),
            new THREE.TetrahedronGeometry(22, 0),
            new THREE.DodecahedronGeometry(20, 0),
            new THREE.TorusKnotGeometry(14, 5, 64, 8),
            new THREE.IcosahedronGeometry(18, 0),
            new THREE.OctahedronGeometry(25, 1),
            new THREE.TorusGeometry(16, 5, 8, 20),
            new THREE.DodecahedronGeometry(24, 1),
            new THREE.TetrahedronGeometry(18, 1),
        ];

        for (let i = 0; i < geos.length; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: i % 3 === 1 ? 0x4a90d9 : 0xc8a951,
                wireframe: true, transparent: true,
                opacity: 0.06 + Math.random() * 0.06,
                blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(geos[i], mat);
            mesh.position.set(
                (Math.random() - 0.5) * this.width * 0.8,
                (Math.random() - 0.5) * this.height * 0.8,
                (Math.random() - 0.5) * 300
            );
            mesh.userData = {
                rot: { x: (Math.random()-.5)*.008, y: (Math.random()-.5)*.008, z: (Math.random()-.5)*.004 },
                floatSpd: Math.random() * 0.4 + 0.2,
                floatAmp: Math.random() * 30 + 15,
                initY: mesh.position.y,
                pulseSpd: Math.random() * 0.5 + 0.2,
                baseOp: mat.opacity
            };
            this.scene.add(mesh);
            this.shapes.push(mesh);
        }
    }

    createRings() {
        for (let i = 0; i < 4; i++) {
            const geo = new THREE.TorusGeometry(50 + i * 35, 0.3, 8, 80);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xc8a951, transparent: true,
                opacity: 0.035, blending: THREE.AdditiveBlending
            });
            const ring = new THREE.Mesh(geo, mat);
            ring.rotation.x = Math.PI * 0.35 + i * 0.2;
            ring.rotation.y = i * 0.4;
            ring.userData = { speed: 0.0015 - i * 0.0002 };
            this.scene.add(ring);
            this.rings.push(ring);
        }
    }

    createWavePlane() {
        const geo = new THREE.PlaneGeometry(this.width * 0.8, this.height * 0.4, 60, 30);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xc8a951, wireframe: true, transparent: true,
            opacity: 0.02, blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        this.wavePlane = new THREE.Mesh(geo, mat);
        this.wavePlane.position.z = -150;
        this.wavePlane.rotation.x = -Math.PI * 0.3;
        this.wavePositions = geo.attributes.position.array.slice();
        this.scene.add(this.wavePlane);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const t = this.clock.getElapsedTime();

        this.shapes.forEach(s => {
            const d = s.userData;
            s.rotation.x += d.rot.x;
            s.rotation.y += d.rot.y;
            s.rotation.z += d.rot.z;
            s.position.y = d.initY + Math.sin(t * d.floatSpd) * d.floatAmp;
            s.material.opacity = d.baseOp + Math.sin(t * d.pulseSpd) * 0.025;
        });

        this.rings.forEach(r => {
            r.rotation.z += r.userData.speed;
            r.rotation.y += r.userData.speed * 0.5;
        });

        if (this.wavePlane) {
            const pos = this.wavePlane.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const origX = this.wavePositions[i * 3];
                const origY = this.wavePositions[i * 3 + 1];
                pos.array[i * 3 + 2] = Math.sin(origX * 0.015 + t * 0.8) * 8 +
                                        Math.cos(origY * 0.02 + t * 0.6) * 6;
            }
            pos.needsUpdate = true;
        }

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
