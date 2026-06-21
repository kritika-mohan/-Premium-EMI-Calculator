document.addEventListener('DOMContentLoaded', async () => {
    /* ══════════════════════════════════════════════════
       AUTH GUARD
    ══════════════════════════════════════════════════ */
    const supabase = window.supabaseClient;
    if (!supabase) { console.error("Supabase not loaded"); return; }

    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Auth is now OPTIONAL. If no session, we run as guest.
    let currentUserId = null;
    if (session && session.user) {
        currentUserId = session.user.id;
        const fullName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
        document.getElementById('user-greeting').textContent = `Hi, ${fullName.split(' ')[0]}`;
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) { logoutBtn.textContent = 'Log Out'; }
    } else {
        document.getElementById('user-greeting').textContent = `Hi, Guest`;
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) { 
            logoutBtn.textContent = 'Sign In'; 
            logoutBtn.classList.remove('btn-nav-danger');
        }
    }

    /* ══════════════════════════════════════════════════
       DOM REFS
    ══════════════════════════════════════════════════ */
    const $ = id => document.getElementById(id);
    const el = {
        themeToggle:   $('theme-toggle'),
        amtSlider:     $('amount-slider'),    amtNum:    $('amount-number'),   amtTip:   $('amount-tooltip'),
        rateSlider:    $('rate-slider'),       rateNum:   $('rate-number'),     rateTip:  $('rate-tooltip'),
        tenSlider:     $('tenure-slider'),     tenNum:    $('tenure-number'),   tenTip:   $('tenure-tooltip'),
        toggleYr:      $('toggle-yr'),         toggleMo:  $('toggle-mo'),
        tenLabels:     document.querySelectorAll('.tenure-label-text'),
        chips:         document.querySelectorAll('.preset-chip'),
        emiContainer:  $('emi-container'),     emiResult: $('emi-result'),
        emiTick:       $('emi-tick'),
        principal:     $('principal-amount'),  interest:  $('total-interest'),  total: $('total-payment'),
        donutArc:      $('donut-arc'),
        btnSchedule:   $('btn-toggle-schedule'), schedContainer: $('schedule-container'),
        schedBody:     document.querySelector('#schedule-table tbody'),
        btnSave:       $('btn-save-calc'),
        btnExport:     $('btn-export-pdf'),
        btnLogout:     $('btn-logout'),
        btnSaved:      $('btn-saved'), drawer: $('saved-drawer'), backdrop: $('drawer-backdrop'), closeDrawer: $('btn-close-drawer'), savedList: $('saved-list'),
        btnCompare:    $('btn-compare'), compareSection: $('compare-section'), closeCompare: $('btn-close-compare'),
        insightsGrid:  $('insights-grid'),
        /* compare */
        c1Emi:$('c1-emi'), c1Principal:$('c1-principal'), c1Rate:$('c1-rate'), c1Tenure:$('c1-tenure'), c1Interest:$('c1-interest'), c1Total:$('c1-total'),
        c2Amount:$('c2-amount'), c2Rate:$('c2-rate'), c2Tenure:$('c2-tenure'),
        c2Emi:$('c2-emi'), c2Interest:$('c2-interest'), c2Total:$('c2-total'),
        winnerCard:$('compare-winner-card'), winnerContent:$('winner-content')
    };

    /* ══════════════════════════════════════════════════
       STATE
    ══════════════════════════════════════════════════ */
    const PRESETS = {
        home:      { amount: 2500000, rate: 8.5,  tenure: 240 },
        car:       { amount:  800000, rate: 9.5,  tenure:  60 },
        personal:  { amount:  300000, rate: 14,   tenure:  36 },
        education: { amount: 1000000, rate: 10,   tenure:  84 }
    };
    let state = { amount: 500000, rate: 9.5, tenure: 60, isYr: false, results: { emi:0, interest:0, total:0 } };
    let isCalc = false;
    let rAFs   = {};

    const fmt  = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
    const curr = new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits: 0 });

    function prefersReducedMotion() { return window.matchMedia?.('(prefers-reduced-motion:reduce)').matches; }

    /* ══════════════════════════════════════════════════
       PARTICLE SYSTEM (subtle canvas dots)
    ══════════════════════════════════════════════════ */
    (() => {
        if (prefersReducedMotion()) return;
        const canvas = $('particles-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let W, H, particles = [];

        const resize = () => {
            W = canvas.width  = window.innerWidth;
            H = canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light';

        for (let i = 0; i < 55; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                r: Math.random() * 1.4 + .4,
                vx: (Math.random() - .5) * .18,
                vy: (Math.random() - .5) * .18,
                opacity: Math.random() * .18 + .04
            });
        }

        const tick = () => {
            ctx.clearRect(0, 0, W, H);
            const color = isDark() ? '180,170,255' : '100,60,200';
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${color},${p.opacity})`;
                ctx.fill();
            });
            requestAnimationFrame(tick);
        };
        tick();
    })();

    /* ══════════════════════════════════════════════════
       CONFETTI SYSTEM
    ══════════════════════════════════════════════════ */
    const confettiCanvas = $('confetti-canvas');
    const confettiCtx    = confettiCanvas?.getContext('2d');
    let confettiPieces   = [];

    function fireConfetti(x, y) {
        if (prefersReducedMotion() || !confettiCtx) return;
        confettiCanvas.width  = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        const colors = ['#7C3AED','#FF8A5B','#2DD4BF','#F5C842','#9B5CF6','#FF6B9D'];
        for (let i = 0; i < 90; i++) {
            confettiPieces.push({
                x: x || window.innerWidth / 2,
                y: y || window.innerHeight / 2,
                vx: (Math.random() - .5) * 14,
                vy: Math.random() * -12 - 3,
                gravity: .45,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 7 + 4,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - .5) * 10,
                opacity: 1,
                shape: Math.random() > .5 ? 'rect' : 'circle'
            });
        }
        animateConfetti();
    }

    function animateConfetti() {
        if (!confettiCtx) return;
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiPieces = confettiPieces.filter(p => p.opacity > 0);
        confettiPieces.forEach(p => {
            p.vy += p.gravity; p.x += p.vx; p.y += p.vy;
            p.rotation += p.rotSpeed; p.opacity -= .014;
            confettiCtx.save();
            confettiCtx.globalAlpha = Math.max(0, p.opacity);
            confettiCtx.translate(p.x, p.y);
            confettiCtx.rotate(p.rotation * Math.PI / 180);
            confettiCtx.fillStyle = p.color;
            if (p.shape === 'rect') confettiCtx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
            else { confettiCtx.beginPath(); confettiCtx.arc(0,0, p.size/2, 0, Math.PI*2); confettiCtx.fill(); }
            confettiCtx.restore();
        });
        if (confettiPieces.length > 0) requestAnimationFrame(animateConfetti);
        else confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }

    /* ══════════════════════════════════════════════════
       TOAST SYSTEM
    ══════════════════════════════════════════════════ */
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = type === 'success' 
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg> ${message}`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${message}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    /* ══════════════════════════════════════════════════
       LERP PARALLAX + MAGNETIC CARD TILT
    ══════════════════════════════════════════════════ */
    (() => {
        if (prefersReducedMotion()) return;
        const wrappers = document.querySelectorAll('.blob-wrapper');
        const cards    = document.querySelectorAll('.card-hover');
        let mouse = {x:0, y:0};
        let cur = Array.from({length: wrappers.length}, () => ({x:0, y:0}));
        const depths = [.35, .65, .5];
        const L = .05; // lerp factor

        document.addEventListener('mousemove', e => {
            mouse.x = (e.clientX / window.innerWidth  - .5) * 28;
            mouse.y = (e.clientY / window.innerHeight - .5) * 28;
        });

        (function tick() {
            wrappers.forEach((w, i) => {
                cur[i].x += (mouse.x * depths[i] - cur[i].x) * L;
                cur[i].y += (mouse.y * depths[i] - cur[i].y) * L;
                w.style.transform = `translate(${cur[i].x.toFixed(2)}px,${cur[i].y.toFixed(2)}px)`;
            });
            requestAnimationFrame(tick);
        })();

        cards.forEach(card => {
            card.addEventListener('mousemove', e => {
                const r  = card.getBoundingClientRect();
                const dx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
                const dy = (e.clientY - r.top   - r.height / 2) / (r.height / 2);
                card.style.transform = `perspective(900px) rotateY(${dx*3}deg) rotateX(${-dy*2}deg) translateY(-5px) scale(1.006)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transition = 'transform .6s cubic-bezier(.175,.885,.32,1.275)';
                card.style.transform  = '';
                setTimeout(() => card.style.transition = '', 660);
            });
        });
    })();

    /* ══════════════════════════════════════════════════
       MAGNETIC BUTTONS
    ══════════════════════════════════════════════════ */
    document.querySelectorAll('.magnetic-btn, .btn-primary').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const r  = btn.getBoundingClientRect();
            const dx = (e.clientX - r.left - r.width  / 2) * .18;
            const dy = (e.clientY - r.top  - r.height / 2) * .18;
            btn.style.transform = `translate(${dx}px,${dy}px) translateY(-2px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });

    /* ══════════════════════════════════════════════════
       RIPPLE
    ══════════════════════════════════════════════════ */
    function ripple(e, btn) {
        if (prefersReducedMotion()) return;
        const c = document.createElement('span');
        const d = Math.max(btn.clientWidth, btn.clientHeight);
        const r = btn.getBoundingClientRect();
        c.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
        c.className = 'ripple';
        btn.querySelector('.ripple')?.remove();
        btn.appendChild(c);
    }
    document.querySelectorAll('.ripple-btn').forEach(b => b.addEventListener('click', e => ripple(e,b)));

    /* ══════════════════════════════════════════════════
       THEME TOGGLE
    ══════════════════════════════════════════════════ */
    const initTheme = () => {
        if (document.documentElement.getAttribute('data-theme') === 'light')
            el.themeToggle.setAttribute('aria-pressed','true');
    };
    el.themeToggle.addEventListener('click', () => {
        const root = document.documentElement;
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        el.themeToggle.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
        try { localStorage.setItem('emi-theme', next); } catch(_) {}
    });

    /* ══════════════════════════════════════════════════
       NUMBER ANIMATIONS
    ══════════════════════════════════════════════════ */
    function animNum(id, start, end, dur = 500) {
        const obj = $(id); if (!obj) return;
        if (prefersReducedMotion()) { obj.textContent = fmt.format(end); return; }
        if (rAFs[id]) cancelAnimationFrame(rAFs[id]);
        let t0 = null;
        const ease = t => 1 - Math.pow(1-t, 3);
        const tick = ts => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / dur, 1);
            obj.textContent = fmt.format(start + (end - start) * ease(p));
            if (p < 1) rAFs[id] = requestAnimationFrame(tick);
            else obj.textContent = fmt.format(end);
        };
        rAFs[id] = requestAnimationFrame(tick);
    }

    function animCurr(id, start, end, dur = 500) {
        const obj = $(id); if (!obj) return;
        if (prefersReducedMotion()) { obj.textContent = curr.format(end); return; }
        if (rAFs[id]) cancelAnimationFrame(rAFs[id]);
        let t0 = null;
        const ease = t => 1 - Math.pow(1-t, 3);
        const tick = ts => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / dur, 1);
            obj.textContent = curr.format(start + (end - start) * ease(p));
            if (p < 1) rAFs[id] = requestAnimationFrame(tick);
            else obj.textContent = curr.format(end);
        };
        rAFs[id] = requestAnimationFrame(tick);
    }

    const parseVal = str => parseFloat((str || '0').replace(/[^0-9.]/g,'')) || 0;

    /* ══════════════════════════════════════════════════
       FEEDBACK (pulse + shimmer + tick)
    ══════════════════════════════════════════════════ */
    function feedback() {
        if (prefersReducedMotion() || isCalc) return;
        isCalc = true;
        document.querySelectorAll('.row-val,.chart-center-val').forEach(e => e.classList.add('shimmer'));
        el.emiContainer.classList.remove('pulse'); void el.emiContainer.offsetWidth;
        el.emiContainer.classList.add('pulse');
        setTimeout(() => {
            document.querySelectorAll('.row-val,.chart-center-val').forEach(e => e.classList.remove('shimmer'));
            el.emiContainer.classList.remove('pulse');
            isCalc = false;
            // Success tick
            el.emiTick?.classList.add('visible');
            setTimeout(() => el.emiTick?.classList.remove('visible'), 1400);
        }, 520);
    }

    /* ══════════════════════════════════════════════════
       EMI CALCULATION
    ══════════════════════════════════════════════════ */
    function calcEMI(anim = true) {
        if (anim) feedback();
        const P = state.amount, rate = state.rate, n = state.tenure;
        let emi=0, total=0, interest=0;
        if (P > 0 && n > 0) {
            if (rate === 0) { emi = P/n; total = P; interest = 0; }
            else {
                const r = rate/12/100;
                emi     = (P * r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
                total   = emi * n;
                interest= total - P;
            }
        }
        const prev = { emi: parseVal(el.emiResult.textContent), p: parseVal(el.principal.textContent), i: parseVal(el.interest.textContent), t: parseVal(el.total.textContent) };
        state.results = { emi, interest, total };

        animNum('emi-result',    prev.emi, emi);
        animCurr('principal-amount', prev.p, P);
        animCurr('total-interest',   prev.i, interest);
        animCurr('total-payment',    prev.t, total);
        updateChart(P, interest);
        if (el.btnSchedule.getAttribute('aria-expanded') === 'true') buildSchedule();
        updateInsights();
        updateCompare();
    }

    /* ══════════════════════════════════════════════════
       DONUT CHART
    ══════════════════════════════════════════════════ */
    function updateChart(p, i) {
        const circ = 2 * Math.PI * 70, total = p + i;
        const arc  = total === 0 ? 0 : (p / total) * circ;
        el.donutArc.setAttribute('stroke-dasharray', `${arc} ${circ}`);
    }

    /* ══════════════════════════════════════════════════
       SMART INSIGHTS
    ══════════════════════════════════════════════════ */
    function updateInsights() {
        const { amount, rate, tenure } = state;
        const { emi, interest, total } = state.results;
        if (!emi) { el.insightsGrid.innerHTML = ''; return; }

        const insights = [];

        // Daily cost
        const daily = total / (tenure * 30.4);
        insights.push({ icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', type:'', text: `This loan costs you <strong>${curr.format(Math.round(daily))}/day</strong> over ${tenure} months.` });

        // Interest ratio
        const ratio = interest / amount;
        if (ratio > 1) insights.push({ icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>', type:'warn', text: `You pay <strong>${(ratio*100).toFixed(0)}% extra</strong> in interest — consider a shorter tenure.` });
        else insights.push({ icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>', type:'good', text: `Interest is <strong>${(ratio*100).toFixed(0)}% of principal</strong> — within healthy range.` });

        // Tenure saving (reduce by 12 months)
        if (tenure > 12 && rate > 0) {
            const r   = rate/12/100;
            const n2  = tenure - 12;
            const emi2 = (amount * r * Math.pow(1+r,n2)) / (Math.pow(1+r,n2)-1);
            const saved = interest - (emi2 * n2 - amount);
            if (saved > 0) insights.push({ icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>', type:'good', text: `Reducing tenure by <strong>12 months</strong> saves <strong>${curr.format(Math.round(saved))}</strong> in interest.` });
        }

        // Rate benchmark
        if (rate > 12) insights.push({ icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>', type:'warn', text: `Rate of <strong>${rate}%</strong> is above market average. Try negotiating with your bank.` });
        else if (rate < 8) insights.push({ icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', type:'good', text: `Great rate of <strong>${rate}%</strong>! Well below the typical home loan average.` });

        el.insightsGrid.innerHTML = insights.map((ins,i) => `
            <div class="insight-card ${ins.type}" style="animation-delay:${i*.08}s">
                <span class="insight-icon">${ins.icon}</span>
                <span class="insight-text">${ins.text}</span>
            </div>
        `).join('');
    }

    /* ══════════════════════════════════════════════════
       AMORTIZATION SCHEDULE
    ══════════════════════════════════════════════════ */
    function buildSchedule() {
        const { amount:P, tenure:n, rate:annRate } = state;
        const r   = annRate/12/100;
        const emi = state.results.emi;
        let bal   = P, rows = '';
        for (let m=1; m<=n; m++) {
            let int = bal * r, princ = emi - int;
            if (m === n) { princ = bal; int = emi - princ; bal = 0; } else bal -= princ;
            rows += `<tr><td>${m}</td><td>${curr.format(emi)}</td><td>${curr.format(princ)}</td><td>${curr.format(int)}</td><td>${curr.format(Math.max(0,bal))}</td></tr>`;
        }
        el.schedBody.innerHTML = rows;
    }

    /* ══════════════════════════════════════════════════
       PDF EXPORT
    ══════════════════════════════════════════════════ */
    function exportPDF() {
        buildSchedule();
        const { amount, rate, tenure } = state;
        const { emi, interest, total } = state.results;
        const rows = el.schedBody.innerHTML;
        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head><title>EMI Schedule – FinCalc</title>
<style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,sans-serif; padding:32px; color:#1A1340; background:#fff; }
    h1 { font-size:22px; margin-bottom:4px; }
    .sub { color:#7870A8; font-size:13px; margin-bottom:24px; }
    .summary { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:28px; }
    .stat { background:#F5F2FF; padding:14px 16px; border-radius:10px; }
    .stat label { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#7870A8; margin-bottom:4px; }
    .stat strong { font-size:18px; color:#1A1340; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    th { background:#EDE8FF; padding:10px 12px; text-align:right; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#7870A8; }
    th:first-child, td:first-child { text-align:left; }
    td { padding:9px 12px; text-align:right; border-bottom:1px solid #EDE8FF; }
    .footer { margin-top:24px; text-align:center; color:#7870A8; font-size:11px; }
</style></head><body>
<h1>EMI Repayment Schedule</h1>
<p class="sub">Generated by FinCalc PRO · ${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})}</p>
<div class="summary">
    <div class="stat"><label>Principal</label><strong>${curr.format(amount)}</strong></div>
    <div class="stat"><label>Interest Rate</label><strong>${rate}% p.a.</strong></div>
    <div class="stat"><label>Tenure</label><strong>${tenure} months</strong></div>
    <div class="stat"><label>Monthly EMI</label><strong>${curr.format(emi)}</strong></div>
    <div class="stat"><label>Total Interest</label><strong>${curr.format(interest)}</strong></div>
    <div class="stat"><label>Total Payment</label><strong>${curr.format(total)}</strong></div>
</div>
<table><thead><tr><th>Month</th><th>EMI</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">FinCalc PRO · Built by Kritika Mohan · kritikamohan2005@gmail.com</div>
</body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 500);
    }

    /* ══════════════════════════════════════════════════
       COMPARE LOANS
    ══════════════════════════════════════════════════ */
    function calcLoan(P, rate, n) {
        if (!P || !n) return { emi:0, interest:0, total:0 };
        if (rate === 0) return { emi:P/n, interest:0, total:P };
        const r = rate/12/100;
        const emi = (P*r*Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
        const total = emi * n, interest = total - P;
        return { emi, interest, total };
    }

    function updateCompare() {
        // Loan 1 (always in sync with main state)
        const l1 = state.results;
        el.c1Emi.textContent       = curr.format(l1.emi);
        el.c1Principal.textContent = curr.format(state.amount);
        el.c1Rate.textContent      = `${state.rate}%`;
        el.c1Tenure.textContent    = `${state.tenure} mo`;
        el.c1Interest.textContent  = curr.format(l1.interest);
        el.c1Total.textContent     = curr.format(l1.total);

        // Loan 2
        const P2 = parseFloat(el.c2Amount.value) || 0;
        const r2 = parseFloat(el.c2Rate.value)   || 0;
        const n2 = parseInt(el.c2Tenure.value)   || 0;
        const l2 = calcLoan(P2, r2, n2);
        el.c2Emi.textContent      = curr.format(l2.emi);
        el.c2Interest.textContent = curr.format(l2.interest);
        el.c2Total.textContent    = curr.format(l2.total);

        // Winner
        if (!l1.emi || !l2.emi) {
            el.winnerCard.className   = 'compare-card compare-winner glass-panel';
            el.winnerContent.className = 'winner-placeholder';
            el.winnerContent.innerHTML = '<div class="winner-icon-wrap"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div><p>Fill in both loans to see the winner</p>';
            return;
        }
        const diff  = Math.abs(l1.total - l2.total);
        const l1win = l1.total <= l2.total;
        const saving = curr.format(Math.round(diff));
        const hasDiff = diff > 100;

        el.winnerCard.className = `compare-card compare-winner glass-panel ${l1win ? 'loan1-wins' : 'loan2-wins'}`;
        el.winnerContent.className = 'winner-result';
        el.winnerContent.innerHTML = `
            <div class="winner-trophy"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
            <div class="winner-label">Better Deal</div>
            <div class="winner-headline">Loan ${l1win ? '1' : '2'} saves you more money!</div>
            <div class="winner-saving ${hasDiff ? '' : 'no-diff'}">
                ${hasDiff ? `You save <strong>${saving}</strong> in total cost` : 'Both loans are nearly identical'}
            </div>
            <button type="button" class="confetti-btn ripple-btn" id="confetti-trigger">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 19 2 10 11 1 20 10 11 19"/><path d="M11 11h.01"/><path d="M16 16h.01"/><path d="M6 6h.01"/><path d="M16 6h.01"/><path d="M6 16h.01"/></svg>
                Celebrate Best Loan!
            </button>
        `;
        // Re-bind confetti button
        document.getElementById('confetti-trigger')?.addEventListener('click', e => {
            const r = e.target.getBoundingClientRect();
            fireConfetti(r.left + r.width/2, r.top);
        });
        // Re-bind ripple on new buttons
        document.querySelectorAll('.ripple-btn:not([data-ripple])').forEach(b => {
            b.dataset.ripple = 1;
            b.addEventListener('click', e => ripple(e, b));
        });
    }

    /* ══════════════════════════════════════════════════
       SLIDER VISUALS
    ══════════════════════════════════════════════════ */
    function sliderVis(slider, tip, pre='', suf='') {
        const min = +slider.min, max = +slider.max, val = +slider.value;
        const pct = ((val-min)/(max-min))*100;
        slider.style.setProperty('--p', `${pct}%`);
        tip.style.left = `${pct}%`;
        tip.firstElementChild.textContent = `${pre}${val.toLocaleString('en-IN')}${suf}`;
    }

    function syncDisplay() {
        el.amtSlider.value  = el.amtNum.value  = state.amount;
        sliderVis(el.amtSlider, el.amtTip, '₹');

        el.rateSlider.value = el.rateNum.value = state.rate;
        sliderVis(el.rateSlider, el.rateTip, '', '%');

        const disp = state.isYr ? +(state.tenure/12).toFixed(2) : state.tenure;
        el.tenSlider.value = el.tenNum.value = disp;
        if (state.isYr) {
            el.tenSlider.min = '.1'; el.tenSlider.max = '30'; el.tenSlider.step = '.1';
            el.tenLabels.forEach(l => l.textContent = 'Yr');
            sliderVis(el.tenSlider, el.tenTip, '', ' Yr');
        } else {
            el.tenSlider.min = '1'; el.tenSlider.max = '360'; el.tenSlider.step = '1';
            el.tenLabels.forEach(l => l.textContent = 'Mo');
            sliderVis(el.tenSlider, el.tenTip, '', ' Mo');
        }
    }

    function clearChips() { el.chips.forEach(c => c.classList.remove('active')); }

    /* ══════════════════════════════════════════════════
       SUPABASE CRUD OPERATIONS
    ══════════════════════════════════════════════════ */
    
    async function fetchCalculations() {
        el.savedList.innerHTML = `
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        `;
        
        try {
            // Fetch all records — RLS policies on the Supabase side handle per-user access.
            // (The calculations table does not have a user_id column.)
            const { data, error } = await supabase
                .from('calculations')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            
            displayCalculations(data);
        } catch (err) {
            console.error("Error fetching:", err);
            el.savedList.innerHTML = `<p style="color:#FF7B7B;padding:1rem;">Error loading calculations.<br><small>${err.message}</small></p>`;
        }
    }

    function displayCalculations(data) {
        if (!data || data.length === 0) {
            el.savedList.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-illustration" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <line x1="3" y1="9" x2="21" y2="9"/>
                        <line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    <h4>No scenarios saved</h4>
                    <p>Calculate your loan and hit "Save Scenario" to keep track of your options here.</p>
                </div>`;
            return;
        }
        
        el.savedList.innerHTML = data.map(c => `
            <div class="saved-item" data-id="${c.id}">
                <div class="saved-item-header">
                    <h4>${curr.format(c.amount)}</h4>
                    <button type="button" class="btn-delete-saved" title="Delete scenario" data-id="${c.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
                <p>${c.interest_rate}% · ${c.tenure} months · EMI: ${curr.format(c.emi)}</p>
                <p style="font-size:.72rem;opacity:.6;margin-top:.3rem">Saved ${new Date(c.created_at).toLocaleDateString('en-IN')}</p>
            </div>`).join('');
            
        document.querySelectorAll('.saved-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete-saved')) return;
                const calc = data.find(c => c.id === item.dataset.id);
                if (!calc) return;
                state.amount = calc.amount; state.rate = calc.interest_rate; state.tenure = calc.tenure;
                state.isYr = false; el.toggleMo.checked = true;
                syncDisplay(); calcEMI(); closeDrawer();
            });
        });
        
        document.querySelectorAll('.btn-delete-saved').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.dataset.id;
                const itemCard = btn.closest('.saved-item');
                deleteCalculation(id, itemCard);
            });
        });
    }

    async function deleteCalculation(id, itemCard) {
        itemCard.classList.add('removing');
        try {
            const { error } = await supabase.from('calculations').delete().eq('id', id);
            if (error) throw error;
            
            setTimeout(() => {
                itemCard.remove();
                if (el.savedList.children.length === 0) fetchCalculations();
            }, 400);
            showToast('Scenario deleted.', 'success');
        } catch (err) {
            itemCard.classList.remove('removing');
            showToast('Failed to delete.', 'error');
            console.error("Error deleting:", err);
        }
    }

    async function saveCalculation(e) {
        if (el.btnSave.disabled) return;
        const orig = el.btnSave.innerHTML;
        el.btnSave.innerHTML = '<span style="opacity:0.7">Saving...</span>';
        el.btnSave.disabled = true;

        try {
            const insertData = {
                amount: state.amount,
                interest_rate: state.rate,
                tenure: state.tenure,
                emi: state.results.emi,
                total_interest: state.results.interest,
                total_payment: state.results.total
            };
            // Note: user_id column does not exist in this table; access is managed via RLS.

            const { error } = await supabase.from('calculations').insert([insertData]);
            if (error) throw error;
            
            el.btnSave.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>Saved!';
            if (e) fireConfetti(e.clientX, e.clientY);
            showToast('Saved successfully!', 'success');
            setTimeout(() => { el.btnSave.innerHTML = orig; el.btnSave.disabled = false; }, 2200);
            
            if (el.drawer.classList.contains('open')) fetchCalculations();
        } catch (err) {
            console.error("Error saving:", err);
            showToast('Error saving data', 'error');
            el.btnSave.innerHTML = orig;
            el.btnSave.disabled = false;
        }
    }

    const closeDrawer = () => { el.drawer.classList.remove('open'); el.backdrop.classList.remove('open'); };
    const openDrawer  = () => { el.drawer.classList.add('open'); el.backdrop.classList.add('open'); fetchCalculations(); };

    /* ══════════════════════════════════════════════════
       EVENT BINDING
    ══════════════════════════════════════════════════ */
    // Auth
    el.btnLogout.addEventListener('click', async () => { 
        if (currentUserId) {
            await supabase.auth.signOut();
            window.location.href='login.html'; 
        } else {
            window.location.href='login.html';
        }
    });

    // Drawer
    el.btnSaved.addEventListener('click', openDrawer);
    el.closeDrawer.addEventListener('click', closeDrawer);
    el.backdrop.addEventListener('click', closeDrawer);

    // Compare
    el.btnCompare.addEventListener('click', () => {
        const open = el.compareSection.classList.toggle('open');
        el.compareSection.setAttribute('aria-hidden', !open);
        if (open) { updateCompare(); el.compareSection.scrollIntoView({behavior:'smooth', block:'start'}); }
    });
    el.closeCompare.addEventListener('click', () => { el.compareSection.classList.remove('open'); el.compareSection.setAttribute('aria-hidden','true'); });
    [el.c2Amount, el.c2Rate, el.c2Tenure].forEach(inp => inp.addEventListener('input', updateCompare));

    // Save scenario
    el.btnSave.addEventListener('click', (e) => saveCalculation(e));

    // Export PDF
    el.btnExport.addEventListener('click', exportPDF);

    // Theme
    initTheme();

    // Sliders
    el.amtSlider.addEventListener('input', e => { state.amount=Math.max(10000,Math.min(20000000,+e.target.value)); syncDisplay(); calcEMI(); clearChips(); });
    el.amtNum.addEventListener('change', e => { state.amount=Math.max(10000,Math.min(20000000,+e.target.value)); syncDisplay(); calcEMI(); clearChips(); });
    el.rateSlider.addEventListener('input', e => { state.rate=Math.max(0,Math.min(30,+e.target.value)); syncDisplay(); calcEMI(); clearChips(); });
    el.rateNum.addEventListener('change', e => { state.rate=Math.max(0,Math.min(30,+e.target.value)); syncDisplay(); calcEMI(); clearChips(); });
    el.tenSlider.addEventListener('input', e => {
        state.tenure = state.isYr ? Math.round(+e.target.value*12) : Math.max(1,Math.min(360,+e.target.value));
        syncDisplay(); calcEMI(); clearChips();
    });
    el.tenNum.addEventListener('change', e => {
        state.tenure = state.isYr ? Math.round(+e.target.value*12) : Math.max(1,Math.min(360,+e.target.value));
        syncDisplay(); calcEMI(); clearChips();
    });
    el.toggleYr.addEventListener('change', () => { state.isYr=true;  syncDisplay(); });
    el.toggleMo.addEventListener('change', () => { state.isYr=false; syncDisplay(); });

    // Preset chips
    el.chips.forEach(btn => {
        btn.addEventListener('click', () => {
            clearChips(); btn.classList.add('active');
            const p = PRESETS[btn.dataset.preset];
            state.amount=p.amount; state.rate=p.rate; state.tenure=p.tenure;
            state.isYr=false; el.toggleMo.checked=true;
            syncDisplay(); calcEMI();
        });
    });

    // Schedule toggle
    el.btnSchedule.addEventListener('click', () => {
        const open = el.btnSchedule.getAttribute('aria-expanded') === 'true';
        el.btnSchedule.setAttribute('aria-expanded', !open);
        el.schedContainer.setAttribute('aria-hidden', open);
        if (!open) { el.schedContainer.classList.add('expanded'); buildSchedule(); }
        else el.schedContainer.classList.remove('expanded');
    });

    /* ══════════════════════════════════════════════════
       INIT
    ══════════════════════════════════════════════════ */
    syncDisplay();
    calcEMI(false);
    fetchCalculations(); // Pre-load saved calculations
});
