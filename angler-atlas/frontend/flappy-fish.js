// ── Flappy Fish Mini-Game ────────────────────────────────────────
(function () {
    'use strict';

    const canvas = document.getElementById('flappyFishCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const W = canvas.width;
    const H = canvas.height;

    // ── Constants ────────────────────────────────────────────────
    const GRAVITY = 0.35;
    const FLAP_STRENGTH = -5.8;
    const PIPE_WIDTH = 42;
    const PIPE_GAP = 110;
    const PIPE_SPEED = 2;
    const PIPE_INTERVAL = 105; // frames between new pipes
    const BUBBLE_COUNT = 15;
    const FISH_X = 60;
    const FISH_W = 30;
    const FISH_H = 20;

    // ── State ────────────────────────────────────────────────────
    const STATE = { START: 0, PLAYING: 1, OVER: 2 };
    let state = STATE.START;
    let fish = { y: H / 2, vy: 0, angle: 0 };
    let pipes = [];
    let bubbles = [];
    let score = 0;
    let highScore = parseInt(localStorage.getItem('flappyFishHigh') || '0', 10);
    let frameCount = 0;
    let bobOffset = 0;
    let animId = null;
    let isVisible = true;

    // ── Bubbles ──────────────────────────────────────────────────
    function spawnBubble() {
        return {
            x: Math.random() * W,
            y: H + Math.random() * 20,
            r: 1.5 + Math.random() * 3,
            speed: 0.3 + Math.random() * 0.7,
            wobble: Math.random() * Math.PI * 2,
        };
    }
    for (let i = 0; i < BUBBLE_COUNT; i++) {
        const b = spawnBubble();
        b.y = Math.random() * H;
        bubbles.push(b);
    }

    // ── Drawing helpers ──────────────────────────────────────────
    function drawBackground() {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(1, '#1a6fa0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    function drawBubbles() {
        bubbles.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        });
    }

    function updateBubbles() {
        bubbles.forEach(b => {
            b.y -= b.speed;
            b.wobble += 0.03;
            b.x += Math.sin(b.wobble) * 0.3;
            if (b.y + b.r < 0) {
                b.x = Math.random() * W;
                b.y = H + b.r;
                b.wobble = Math.random() * Math.PI * 2;
            }
        });
    }

    function drawFish(x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Tail fin
        ctx.beginPath();
        ctx.moveTo(-FISH_W / 2 - 4, 0);
        ctx.lineTo(-FISH_W / 2 - 14, -9);
        ctx.lineTo(-FISH_W / 2 - 14, 9);
        ctx.closePath();
        ctx.fillStyle = '#e07830';
        ctx.fill();

        // Body (ellipse)
        ctx.beginPath();
        ctx.ellipse(0, 0, FISH_W / 2, FISH_H / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#C76C3A';
        ctx.fill();
        ctx.strokeStyle = '#a0522d';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Belly highlight
        ctx.beginPath();
        ctx.ellipse(2, 3, FISH_W / 2 - 5, FISH_H / 2 - 5, 0, 0, Math.PI);
        ctx.fillStyle = 'rgba(255,200,150,0.4)';
        ctx.fill();

        // Dorsal fin
        ctx.beginPath();
        ctx.moveTo(-3, -FISH_H / 2 + 1);
        ctx.lineTo(4, -FISH_H / 2 - 7);
        ctx.lineTo(10, -FISH_H / 2 + 1);
        ctx.closePath();
        ctx.fillStyle = '#e07830';
        ctx.fill();

        // Eye
        ctx.beginPath();
        ctx.arc(FISH_W / 2 - 8, -3, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(FISH_W / 2 - 7, -3, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Mouth
        ctx.beginPath();
        ctx.arc(FISH_W / 2 - 1, 2, 2, 0, Math.PI);
        ctx.strokeStyle = '#a0522d';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    function drawPipe(pipe) {
        const borderW = 3;
        // Top pipe
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topH);
        ctx.fillStyle = '#40916c';
        ctx.fillRect(pipe.x - borderW, pipe.topH - 18, PIPE_WIDTH + borderW * 2, 18);
        ctx.strokeStyle = '#1b4332';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pipe.x - borderW, pipe.topH - 18, PIPE_WIDTH + borderW * 2, 18);

        // Bottom pipe
        const bottomY = pipe.topH + PIPE_GAP;
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, H - bottomY);
        ctx.fillStyle = '#40916c';
        ctx.fillRect(pipe.x - borderW, bottomY, PIPE_WIDTH + borderW * 2, 18);
        ctx.strokeStyle = '#1b4332';
        ctx.strokeRect(pipe.x - borderW, bottomY, PIPE_WIDTH + borderW * 2, 18);
    }

    function drawScore() {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.fillText(score, 12, 36);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(score, 10, 34);
    }

    function drawText(main, sub, extra) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(main, W / 2, H / 2 - 30);

        if (sub) {
            ctx.font = '16px Inter, sans-serif';
            ctx.fillText(sub, W / 2, H / 2 + 5);
        }
        if (extra) {
            ctx.font = '14px Inter, sans-serif';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(extra, W / 2, H / 2 + 30);
        }

        ctx.font = '13px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText('Click or Space to ' + (state === STATE.OVER ? 'Restart' : 'Start'), W / 2, H / 2 + 60);

        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
    }

    // ── Game logic ───────────────────────────────────────────────
    function reset() {
        fish = { y: H / 2, vy: 0, angle: 0 };
        pipes = [];
        score = 0;
        frameCount = 0;
    }

    function flap() {
        if (state === STATE.START) {
            state = STATE.PLAYING;
            reset();
            fish.vy = FLAP_STRENGTH;
        } else if (state === STATE.PLAYING) {
            fish.vy = FLAP_STRENGTH;
        } else if (state === STATE.OVER) {
            state = STATE.PLAYING;
            reset();
            fish.vy = FLAP_STRENGTH;
        }
    }

    function checkCollision() {
        const fx = FISH_X;
        const fy = fish.y;
        const hr = FISH_H / 2 - 2; // vertical half-radius (tight)
        const wr = FISH_W / 2 - 2; // horizontal half-radius (tight)

        // Ceiling / floor
        if (fy - hr < 0 || fy + hr > H) return true;

        // Pipes
        for (const p of pipes) {
            if (fx + wr > p.x && fx - wr < p.x + PIPE_WIDTH) {
                if (fy - hr < p.topH || fy + hr > p.topH + PIPE_GAP) {
                    return true;
                }
            }
        }
        return false;
    }

    function update() {
        frameCount++;

        if (state === STATE.PLAYING) {
            // Fish physics
            fish.vy += GRAVITY;
            fish.y += fish.vy;
            fish.angle = Math.max(-0.4, Math.min(fish.vy * 0.06, 1.2));

            // Spawn pipes
            if (frameCount % PIPE_INTERVAL === 0) {
                const minTop = 40;
                const maxTop = H - PIPE_GAP - 40;
                const topH = minTop + Math.random() * (maxTop - minTop);
                pipes.push({ x: W, topH, scored: false });
            }

            // Move pipes
            for (let i = pipes.length - 1; i >= 0; i--) {
                pipes[i].x -= PIPE_SPEED;
                // Score
                if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < FISH_X) {
                    pipes[i].scored = true;
                    score++;
                }
                // Remove off-screen
                if (pipes[i].x + PIPE_WIDTH < -10) {
                    pipes.splice(i, 1);
                }
            }

            // Collision
            if (checkCollision()) {
                state = STATE.OVER;
                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem('flappyFishHigh', String(highScore));
                }
            }
        }

        updateBubbles();
    }

    function draw() {
        drawBackground();
        drawBubbles();

        if (state === STATE.START) {
            bobOffset += 0.04;
            const bobY = H / 2 + Math.sin(bobOffset) * 12;
            drawFish(FISH_X, bobY, 0);
            drawText('Flappy Fish', null, null);
        } else if (state === STATE.PLAYING) {
            pipes.forEach(drawPipe);
            drawFish(FISH_X, fish.y, fish.angle);
            drawScore();
        } else {
            pipes.forEach(drawPipe);
            drawFish(FISH_X, fish.y, fish.angle);
            drawText(
                'Game Over!',
                'Score: ' + score,
                'Best: ' + highScore
            );
        }
    }

    // ── Game loop ────────────────────────────────────────────────
    function loop() {
        if (!isVisible) {
            animId = null;
            return;
        }
        update();
        draw();
        animId = requestAnimationFrame(loop);
    }

    function startLoop() {
        if (!animId && isVisible) {
            animId = requestAnimationFrame(loop);
        }
    }

    // ── Visibility / IntersectionObserver ────────────────────────
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    isVisible = entry.isIntersecting;
                    if (isVisible) startLoop();
                });
            },
            { threshold: 0.1 }
        );
        observer.observe(canvas);
    }

    // Also pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isVisible = false;
        } else {
            // Re-check intersection
            const rect = canvas.getBoundingClientRect();
            isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            if (isVisible) startLoop();
        }
    });

    // ── Input ────────────────────────────────────────────────────
    canvas.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        flap();
    });

    canvas.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement === canvas) {
            e.preventDefault();
            flap();
        }
    });

    // Make canvas focusable for keyboard input
    canvas.setAttribute('tabindex', '0');

    // ── Start ────────────────────────────────────────────────────
    startLoop();
})();
