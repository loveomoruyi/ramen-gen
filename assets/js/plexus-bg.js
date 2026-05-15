(function() {
    const canvas = document.createElement('canvas');
    canvas.id = 'plexus-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);
    const ctx = canvas.getContext('2d');
    const config = { count: 80, size: 2, lineDist: 150, speed: 0.5, color: '200,180,130' };
    let W, H, particles = [], streams = [], mouse = { x: -1000, y: -1000 }, breathCycle = 0, glowPoints = [];

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; initGlowPoints(); }

    function initGlowPoints() {
        glowPoints = [];
        for (let i = 0; i < 4; i++) {
            glowPoints.push({ x: Math.random() * W, y: Math.random() * H, radius: 150 + Math.random() * 100, phase: Math.random() * Math.PI * 2, speedX: (Math.random() - 0.5) * 0.3, speedY: (Math.random() - 0.5) * 0.3 });
        }
    }

    class Particle {
        constructor() {
            this.x = Math.random() * W; this.y = Math.random() * H;
            this.vx = (Math.random() - 0.5) * config.speed; this.vy = (Math.random() - 0.5) * config.speed;
            this.baseSize = config.size * (0.5 + Math.random() * 0.5);
            this.breathPhase = Math.random() * Math.PI * 2;
            this.breathSpeed = 0.01 + Math.random() * 0.02;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > W) this.vx *= -1;
            if (this.y < 0 || this.y > H) this.vy *= -1;
            this.breathPhase += this.breathSpeed;
            let dx = this.x - mouse.x, dy = this.y - mouse.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) { let force = (150 - dist) / 150 * 0.5; this.vx += (dx / dist) * force; this.vy += (dy / dist) * force; }
            this.vx *= 0.99; this.vy *= 0.99;
        }
        draw() {
            let breathAlpha = 0.3 + Math.sin(this.breathPhase) * 0.2;
            let breathSize = this.baseSize * (1 + Math.sin(this.breathPhase) * 0.3);
            ctx.beginPath(); ctx.arc(this.x, this.y, breathSize, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(' + config.color + ',' + breathAlpha + ')';
            ctx.fill();
        }
    }

    function createStream() {
        return { from: Math.floor(Math.random() * config.count), to: Math.floor(Math.random() * config.count), progress: 0, speed: 0.012 + Math.random() * 0.018, delay: Math.random() * 80, trail: [] };
    }

    function init() {
        particles = []; streams = [];
        for (let i = 0; i < config.count; i++) particles.push(new Particle());
        for (let i = 0; i < 12; i++) streams.push(createStream());
    }

    function getDist(a, b) { let dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

    function findShapes() {
        let shapes = [], len = particles.length;
        for (let i = 0; i < len; i++) {
            for (let j = i + 1; j < len; j++) {
                let d1 = getDist(particles[i], particles[j]);
                if (d1 > config.lineDist) continue;
                for (let k = j + 1; k < len; k++) {
                    let d2 = getDist(particles[i], particles[k]);
                    let d3 = getDist(particles[j], particles[k]);
                    if (d2 < config.lineDist && d3 < config.lineDist) {
                        shapes.push([particles[i], particles[j], particles[k]]);
                        if (shapes.length > 15) return shapes;
                    }
                }
            }
        }
        return shapes;
    }

    function drawShapes() {
        let shapes = findShapes();
        let pulse = Math.sin(breathCycle * 0.5) * 0.5 + 0.5;
        for (let i = 0; i < shapes.length; i++) {
            let s = shapes[i];
            ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y); ctx.lineTo(s[1].x, s[1].y); ctx.lineTo(s[2].x, s[2].y); ctx.closePath();
            ctx.fillStyle = 'rgba(' + config.color + ',' + (0.02 + pulse * 0.02) + ')';
            ctx.fill();
        }
    }

    function drawLines() {
        let breathAlpha = 0.08 + Math.sin(breathCycle) * 0.03;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                let d = getDist(particles[i], particles[j]);
                if (d < config.lineDist) {
                    let alpha = (1 - d / config.lineDist) * breathAlpha;
                    ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = 'rgba(' + config.color + ',' + alpha + ')';
                    ctx.lineWidth = 0.5; ctx.stroke();
                }
            }
        }
    }

    function drawStreamingHighlights() {
        for (let i = 0; i < streams.length; i++) {
            let stream = streams[i];
            if (stream.delay > 0) { stream.delay--; continue; }
            stream.progress += stream.speed;
            if (stream.progress >= 1) { streams[i] = createStream(); streams[i].delay = Math.random() * 80; continue; }
            let p1 = particles[stream.from], p2 = particles[stream.to];
            if (!p1 || !p2) continue;
            let currentX = p1.x + (p2.x - p1.x) * stream.progress;
            let currentY = p1.y + (p2.y - p1.y) * stream.progress;
            stream.trail.push({ x: currentX, y: currentY });
            if (stream.trail.length > 10) stream.trail.shift();
            let streamAlpha = Math.sin(stream.progress * Math.PI) * 0.85;
            for (let t = 0; t < stream.trail.length; t++) {
                let tp = stream.trail[t];
                let tf = t / stream.trail.length;
                let ta = streamAlpha * tf * 0.6;
                if (ta <= 0) continue;
                let tr = 8 + tf * 12;
                let grad = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, tr);
                grad.addColorStop(0, 'rgba(' + config.color + ',' + ta + ')');
                grad.addColorStop(1, 'rgba(' + config.color + ',0)');
                ctx.beginPath(); ctx.arc(tp.x, tp.y, tr, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
            }
            if (stream.trail.length > 1) {
                ctx.beginPath(); ctx.moveTo(stream.trail[0].x, stream.trail[0].y);
                for (let t = 1; t < stream.trail.length; t++) ctx.lineTo(stream.trail[t].x, stream.trail[t].y);
                ctx.strokeStyle = 'rgba(' + config.color + ',' + (streamAlpha * 0.4) + ')';
                ctx.lineWidth = 2; ctx.stroke();
            }
            let mg = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 25);
            mg.addColorStop(0, 'rgba(' + config.color + ',' + streamAlpha + ')');
            mg.addColorStop(0.4, 'rgba(' + config.color + ',' + (streamAlpha * 0.5) + ')');
            mg.addColorStop(1, 'rgba(' + config.color + ',0)');
            ctx.beginPath(); ctx.arc(currentX, currentY, 25, 0, Math.PI * 2); ctx.fillStyle = mg; ctx.fill();
            let segStart = Math.max(0, stream.progress - 0.15);
            let sx = p1.x + (p2.x - p1.x) * segStart, sy = p1.y + (p2.y - p1.y) * segStart;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(currentX, currentY);
            ctx.strokeStyle = 'rgba(' + config.color + ',' + (streamAlpha * 0.7) + ')';
            ctx.lineWidth = 2; ctx.stroke();
        }
    }

    function drawAmbientGlow() {
        for (let i = 0; i < glowPoints.length; i++) {
            let gp = glowPoints[i];
            gp.x += gp.speedX; gp.y += gp.speedY;
            if (gp.x < 0 || gp.x > W) gp.speedX *= -1;
            if (gp.y < 0 || gp.y > H) gp.speedY *= -1;
            let alpha = 0.03 + Math.sin(breathCycle + gp.phase) * 0.015;
            let grad = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, gp.radius);
            grad.addColorStop(0, 'rgba(' + config.color + ',' + alpha + ')');
            grad.addColorStop(1, 'rgba(' + config.color + ',0)');
            ctx.beginPath(); ctx.arc(gp.x, gp.y, gp.radius, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
        }
    }

    function animate() {
        ctx.clearRect(0, 0, W, H);
        breathCycle += 0.015;
        for (let i = 0; i < particles.length; i++) particles[i].update();
        drawAmbientGlow(); drawShapes(); drawLines(); drawStreamingHighlights();
        for (let i = 0; i < particles.length; i++) particles[i].draw();
        requestAnimationFrame(animate);
    }

    document.addEventListener('mousemove', function(e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    document.addEventListener('mouseleave', function() { mouse.x = -1000; mouse.y = -1000; });
    window.addEventListener('resize', function() { resize(); });

    resize(); init(); animate();

    function initTextAnim() {
        var lines = document.querySelectorAll('.title-line');
        lines.forEach(function(line, i) {
            line.style.opacity = '0'; line.style.transform = 'translateY(20px)';
            line.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            line.style.transitionDelay = (i * 0.2) + 's';
            setTimeout(function() { line.style.opacity = '1'; line.style.transform = 'translateY(0)'; }, 100);
        });
        var subtitle = document.querySelector('.hero-subtitle');
        if (subtitle) { subtitle.style.opacity = '0'; subtitle.style.transition = 'opacity 1.2s ease'; subtitle.style.transitionDelay = '0.8s'; setTimeout(function() { subtitle.style.opacity = '1'; }, 100); }
        var cta = document.querySelector('.hero-cta');
        if (cta) { cta.style.opacity = '0'; cta.style.transition = 'opacity 1s ease'; cta.style.transitionDelay = '1.2s'; setTimeout(function() { cta.style.opacity = '1'; }, 100); }
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initTextAnim); } else { initTextAnim(); }
})();
