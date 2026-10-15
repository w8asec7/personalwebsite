(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    /* ---------- Whisper: a sticky note with a one-liner ---------- */

    const whisperEl = $('#whisper');
    let whisperTimer;
    let lastWhisper = 0;
    function whisper(text, force = false) {
        const now = Date.now();
        if (!force && now - lastWhisper < 2500) return;
        lastWhisper = now;
        whisperEl.textContent = text;
        whisperEl.classList.add('show');
        clearTimeout(whisperTimer);
        whisperTimer = setTimeout(() => whisperEl.classList.remove('show'), 3800);
    }

    /* ---------- Intro terminal ---------- */

    const introLines = [
        ['$ whoami', '<span class="t-prompt">$</span> whoami'],
        ['rishi_nigam', 'rishi_nigam'],
        ['$ ./open_case --subject "Rishi Nigam"', '<span class="t-prompt">$</span> ./open_case --subject "Rishi Nigam"'],
        ['> dusting for fingerprints...... done', '&gt; dusting for fingerprints...... <span class="t-ok">done</span>'],
        ['> 4 cases, 6 witnesses, 1 suspect', '&gt; 4 cases, 6 witnesses, <span class="t-red">1 suspect</span>'],
        ['> case status: OPEN', '&gt; case status: <span class="t-ok">OPEN</span>'],
    ];

    async function runIntro() {
        const intro = $('#intro');
        const body = $('#term-body');
        if (reducedMotion || sessionStorage.getItem('caseOpened')) {
            intro.remove();
            return;
        }
        document.body.classList.add('intro-active');
        let skipped = false;
        const finish = () => {
            if (skipped) return;
            skipped = true;
            sessionStorage.setItem('caseOpened', '1');
            intro.classList.add('done');
            document.body.classList.remove('intro-active');
            setTimeout(() => intro.remove(), 900);
        };
        intro.addEventListener('click', finish);
        document.addEventListener('keydown', finish, { once: true });

        let done = '';
        for (const [text, html] of introLines) {
            const fast = !text.startsWith('$');
            for (let i = 1; i <= text.length && !skipped; i++) {
                body.innerHTML = done + escapeHtml(text.slice(0, i));
                await wait(fast ? 12 : 38);
            }
            done += html + '\n';
            body.innerHTML = done;
            if (skipped) return;
            await wait(fast ? 220 : 320);
        }
        await wait(650);
        finish();
        await wait(300);
    }

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ---------- Hero catchphrases ---------- */

    const catchphrases = [
        "I don't read minds. I read stack traces.",
        "It's not a bug. It's a clue.",
        'Every bug leaves a trail. I just follow it.',
        "There's no such thing as magic. Only well-placed breakpoints.",
        'Works on my machine. Investigating yours.',
        'git blame never lies.',
        'Elementary, my dear compiler.',
    ];

    async function cycleCatchphrases() {
        const el = $('#catchphrase');
        if (reducedMotion) return;
        let i = 0;
        await wait(2600);
        for (;;) {
            const current = el.textContent;
            for (let n = current.length; n >= 0; n--) {
                el.textContent = current.slice(0, n);
                await wait(18);
            }
            i = (i + 1) % catchphrases.length;
            const next = catchphrases[i];
            await wait(250);
            for (let n = 1; n <= next.length; n++) {
                el.textContent = next.slice(0, n);
                await wait(42);
            }
            await wait(2800);
        }
    }

    /* ---------- Reveal: fade in and back out ---------- */

    function observeReveals() {
        const toggle = new IntersectionObserver((entries) => {
            entries.forEach((e) => e.target.classList.toggle('in', e.isIntersecting));
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        $$('.reveal').forEach((el) => toggle.observe(el));

        watchReversible($$('.case-card, .hero-board'), {
            enterAt: 0.2,
            onIn: (el) => el.classList.add('in'),
            onOut: (el) => el.classList.remove('in'),
        });
        // the stamp vanishes instantly when .in drops, so only reset it once it's fully off screen
        watchReversible($$('.verdict'), {
            enterAt: 0.2,
            exitAt: 0,
            onIn: (el) => el.classList.add('in'),
            onOut: (el) => el.classList.remove('in'),
        });
    }

    // Plays on the way down, rewinds only when the element drops out the bottom (user scrolled back up),
    // so content above you never vanishes while you're reading down the page.
    function watchReversible(els, { enterAt, exitAt = enterAt, onIn, onOut }) {
        const play = (el) => {
            played.set(el, onOut);
            onIn(el);
        };
        const rewind = (el) => {
            played.delete(el);
            onOut(el);
        };
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting && e.intersectionRatio >= enterAt) play(e.target);
                else if (e.boundingClientRect.top > 0 && (exitAt === 0 ? !e.isIntersecting : e.intersectionRatio < exitAt)) rewind(e.target);
            });
        }, { threshold: [...new Set([0, exitAt, enterAt])] });
        els.forEach((el) => obs.observe(el));
        return obs;
    }

    // a fast jump (nav link, Home key) can skip an element without the observer ever seeing it,
    // so anything still played but now entirely below the viewport gets rewound here
    const played = new Map();
    function sweepPlayed(vh) {
        played.forEach((onOut, el) => {
            if (el.getBoundingClientRect().top <= vh) return;
            played.delete(el);
            onOut(el);
        });
    }

    /* ---------- Section whispers ---------- */

    const sectionWhispers = {
        dossier: 'Reading the file first. Methodical. I like that.',
        timeline: 'Checking his alibis? Smart. They all hold up.',
        cases: 'Straight to the evidence. You don\'t like waiting, do you?',
        toolkit: 'Pick a card. Any card. They\'re all real skills.',
        contact: 'You made it this far. That\'s a tell, you know.',
    };

    function observeSections() {
        const seen = new Set();
        const navLinks = $$('.nav-links a');
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                const id = e.target.id;
                navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
                if (!seen.has(id) && sectionWhispers[id]) {
                    seen.add(id);
                    whisper(sectionWhispers[id]);
                }
            });
        }, { threshold: 0.3 });
        $$('main > section[id]').forEach((s) => obs.observe(s));
    }

    /* ---------- Folder cover swings open with scroll ---------- */

    const folder = $('#folder');
    const cover = $('.folder-cover');

    function updateFolder(vh) {
        const top = folder.getBoundingClientRect().top;
        const p = reducedMotion ? 1 : clamp((vh * 0.8 - top) / (vh * 0.55));
        cover.style.setProperty('--open', p.toFixed(3));
        cover.style.visibility = p >= 0.999 ? 'hidden' : 'visible';
        if (p > 0.3) folder.classList.add('open');
        else if (p < 0.15) folder.classList.remove('open');
    }

    /* ---------- Red thread between pins ---------- */

    function pinCenter(pin, container) {
        let x = pin.offsetWidth / 2;
        let y = pin.offsetHeight / 2;
        let el = pin;
        while (el && el !== container) {
            x += el.offsetLeft;
            y += el.offsetTop;
            el = el.offsetParent;
        }
        return { x, y };
    }

    function threadPath(points, wobble) {
        if (points.length < 2) return '';
        let d = `M${points[0].x},${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1];
            const c = points[i];
            const mx = (a.x + c.x) / 2;
            const my = (a.y + c.y) / 2;
            const dist = Math.hypot(c.x - a.x, c.y - a.y);
            const horizontal = Math.abs(c.x - a.x) > Math.abs(c.y - a.y);
            const sag = horizontal ? dist * 0.3 : dist * wobble * (i % 2 ? 1 : -1);
            d += ` Q${mx + (horizontal ? 0 : sag)},${my + (horizontal ? sag : 0)} ${c.x},${c.y}`;
        }
        return d;
    }

    const timelineBoard = $('#timeline-board');
    const timelineRope = $('#timeline-rope');
    const board = $('#board');
    const boardRope = $('#board-rope');

    const heroBoard = $('.hero-board');

    function measureHeroRopes() {
        const [top, a, b] = $$('[data-pin]', heroBoard).map((p) => pinCenter(p, heroBoard));
        const w = heroBoard.offsetWidth;
        const swing = (end, dir) =>
            `M${top.x},${top.y} C${top.x + dir * w * 0.62},${top.y} ${end.x + dir * w * 0.18},${end.y - w * 0.5} ${end.x},${end.y}`;
        $('#hero-rope-a').setAttribute('d', swing(a, -1));
        $('#hero-rope-b').setAttribute('d', swing(b, 1));
    }

    function measureThreads() {
        measureHeroRopes();
        const tPins = $$('[data-pin]', timelineBoard).map((p) => pinCenter(p, timelineBoard));
        timelineRope.setAttribute('d', threadPath(tPins, 0.06));

        const bPins = ['.cc-1', '.cc-2', '.cc-3', '.cc-4'].map((sel) => pinCenter($(`${sel} [data-pin]`, board), board));
        boardRope.setAttribute('d', threadPath(bPins, 0.05));
    }

    function drawThread(container, rope, vh, startAt, span) {
        const r = container.getBoundingClientRect();
        const p = reducedMotion ? 1 : clamp((vh * startAt - r.top) / (r.height * span));
        rope.style.strokeDashoffset = (1 - p).toFixed(4);
    }

    // finishes once the whole board is on screen (or its top nears the nav, if it's taller than the viewport)
    function drawBoardThread(vh) {
        const r = board.getBoundingClientRect();
        const startTop = vh * 0.85;
        const endTop = Math.max(vh * 0.92 - r.height, vh * 0.08);
        const p = reducedMotion ? 1 : clamp((startTop - r.top) / Math.max(startTop - endTop, vh * 0.25));
        boardRope.style.strokeDashoffset = (1 - p).toFixed(4);
    }

    /* ---------- Skill cards are dealt from the deck ---------- */

    const deck = $('#deck');
    const skillCards = $$('.skill-card');

    function measureDeal() {
        const deckVisible = deck && deck.offsetParent !== null;
        const d = deckVisible ? deck.getBoundingClientRect() : null;
        skillCards.forEach((card) => {
            if (card.classList.contains('in')) return;
            const prev = card.style.transform;
            card.style.transition = 'none';
            card.style.transform = 'none';
            const r = card.getBoundingClientRect();
            card.style.transform = prev;
            void card.offsetWidth;
            card.style.transition = '';
            const dx = d ? d.left + d.width / 2 - (r.left + r.width / 2) : 0;
            const dy = d ? d.top + d.height / 2 - (r.top + r.height / 2) : -80;
            card.style.setProperty('--dx', dx + 'px');
            card.style.setProperty('--dy', dy + 'px');
        });
    }

    function observeDeal() {
        const grid = $('#skill-grid');
        let dealt = false;
        let timers = [];
        const later = (fn, ms) => timers.push(setTimeout(fn, ms));
        const clearTimers = () => {
            timers.forEach(clearTimeout);
            timers = [];
        };

        const deal = () => {
            if (dealt) return;
            dealt = true;
            clearTimers();
            skillCards.forEach((card, i) => {
                later(() => card.classList.add('in'), i * 130);
                later(() => {
                    card.classList.add('flipped', 'flipping');
                    later(() => card.classList.remove('flipping'), 850);
                }, 700 + i * 130);
            });
        };

        // flip face-down, then sweep back onto the deck, last card first
        const gather = () => {
            if (!dealt) return;
            dealt = false;
            clearTimers();
            const n = skillCards.length;
            skillCards.forEach((card, i) => {
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
                card.classList.remove('flipped', 'flipping');
                later(() => card.classList.remove('in'), 300 + (n - 1 - i) * 90);
            });
            later(measureDeal, 300 + n * 90 + 950);
        };

        if (reducedMotion) {
            skillCards.forEach((card) => card.classList.add('in', 'flipped'));
        } else {
            watchReversible([grid], { enterAt: 0.2, onIn: deal, onOut: gather });
        }

        skillCards.forEach((card) => {
            card.addEventListener('pointermove', (e) => {
                if (e.pointerType !== 'mouse' || !card.classList.contains('flipped') || card.classList.contains('flipping')) return;
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                card.style.setProperty('--rx', `${-py * 10}deg`);
                card.style.setProperty('--ry', `${px * 12}deg`);
                card.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
                card.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
            });
            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
            });
        });
    }

    /* ---------- Evidence board: spotlight + whispers ---------- */

    function wireBoard() {
        const cases = $('#cases');
        cases.addEventListener('pointermove', (e) => {
            const r = cases.getBoundingClientRect();
            cases.style.setProperty('--mx', `${e.clientX - r.left}px`);
            cases.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
        $$('.case-card').forEach((card) => {
            card.addEventListener('pointerenter', () => whisper(card.dataset.whisper));
        });
    }

    /* ---------- Finale: the quote, then the wink ---------- */

    function setupFinale() {
        const finale = $('#finale');
        const quote = $('#f-quote');
        const wink = $('#wink');
        const text = quote.textContent;
        quote.setAttribute('aria-label', text);

        let idx = 0;
        quote.innerHTML = text.split(' ').map((word) => {
            const chars = [...word].map((c) => `<span class="ch" style="transition-delay:${(idx++) * 14}ms">${escapeHtml(c)}</span>`).join('');
            idx++;
            return `<span class="word" aria-hidden="true">${chars}</span>`;
        }).join(' ');

        let winkTimer;
        const doWink = () => {
            wink.classList.remove('winking');
            clearTimeout(winkTimer);
            winkTimer = setTimeout(() => wink.classList.add('winking'), 260);
        };

        if (reducedMotion) {
            finale.classList.add('in', 'drawn');
            wink.classList.add('winking');
        } else {
            let playing = false;
            let drawTimer;
            let startTimer;
            let winkLoop;
            const stop = () => {
                clearTimeout(drawTimer);
                clearTimeout(startTimer);
                clearTimeout(winkTimer);
                clearInterval(winkLoop);
            };
            watchReversible([finale], {
                enterAt: 0.45,
                exitAt: 0.2,
                onIn: () => {
                    if (playing) return;
                    playing = true;
                    stop();
                    finale.classList.add('in');
                    drawTimer = setTimeout(() => finale.classList.add('drawn'), idx * 14 + 200);
                    startTimer = setTimeout(() => {
                        wink.classList.add('winking');
                        winkLoop = setInterval(doWink, 3200);
                    }, idx * 14 + 200 + 1200);
                },
                onOut: () => {
                    if (!playing) return;
                    playing = false;
                    stop();
                    finale.classList.remove('in', 'drawn');
                    wink.classList.remove('winking');
                },
            });
        }

        const winkLines = [
            'You saw nothing.',
            'Our little secret.',
            'Case closed. Mostly.',
            'Told you there were no psychics.',
        ];
        let w = 0;
        wink.addEventListener('click', () => {
            doWink();
            whisper(winkLines[w++ % winkLines.length], true);
        });
    }

    /* ---------- Scroll loop ---------- */

    const progress = $('#progress');
    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const vh = window.innerHeight;
            const max = document.documentElement.scrollHeight - vh;
            progress.style.transform = `scaleX(${clamp(window.scrollY / max)})`;
            updateFolder(vh);
            drawThread(timelineBoard, timelineRope, vh, 0.75, 0.9);
            drawBoardThread(vh);
            sweepPlayed(vh);
            ticking = false;
        });
    }

    /* ---------- Boot ---------- */

    measureThreads();
    measureDeal();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
        measureThreads();
        measureDeal();
        onScroll();
    });
    document.fonts && document.fonts.ready.then(() => {
        measureThreads();
        measureDeal();
        onScroll();
    });

    wireBoard();
    observeDeal();
    setupFinale();

    runIntro().then(() => {
        observeReveals();
        observeSections();
        cycleCatchphrases();
    });

    console.log(
        '%c🔍 You opened the dev tools.%c\nGood instinct, detective. Most people never look behind the curtain.\nThe source is clean. The suspect is available: rishi.nigam4912@gmail.com',
        'font: 700 16px monospace; color: #f0b54a;',
        'font: 13px monospace; color: #e0303f;'
    );
})();
