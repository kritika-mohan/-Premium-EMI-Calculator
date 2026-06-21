document.addEventListener('DOMContentLoaded', async () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm  = document.getElementById('login-form');
    const supabase   = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase client not initialized.");
        return;
    }

    // ── Redirect if already logged in ─────────────────────────────────────────
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        const page = window.location.pathname;
        if (session && (page.endsWith('login.html') || page.endsWith('signup.html'))) {
            window.location.href = 'index.html';
            return;
        }
    } catch (e) {
        console.error("Session check error:", e);
    }

    // ── Utility: show inline error beneath a form ──────────────────────────────
    function showError(form, message) {
        let errEl = form.querySelector('.auth-error');
        if (!errEl) {
            errEl = document.createElement('p');
            errEl.className = 'auth-error';
            form.appendChild(errEl);
        }
        errEl.textContent = message;
        errEl.classList.add('visible');
        // auto-clear after 4 s
        clearTimeout(errEl._timer);
        errEl._timer = setTimeout(() => errEl.classList.remove('visible'), 4000);
    }

    function clearError(form) {
        const errEl = form.querySelector('.auth-error');
        if (errEl) errEl.classList.remove('visible');
    }

    // ── Sign-up ────────────────────────────────────────────────────────────────
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError(signupForm);

            const name     = document.getElementById('name').value.trim();
            const email    = document.getElementById('email').value.trim().toLowerCase();
            const password = document.getElementById('password').value;

            if (!name)     { showError(signupForm, 'Please enter your full name.'); return; }
            if (!email)    { showError(signupForm, 'Please enter your email address.'); return; }
            if (password.length < 6) { showError(signupForm, 'Password must be at least 6 characters.'); return; }

            const submitBtn = signupForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name }
                }
            });

            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

            if (error) {
                showError(signupForm, error.message);
                return;
            }

            if (!data.session) {
                // Supabase requires email confirmation by default
                showError(signupForm, 'Success! Please check your email to confirm your account before logging in.');
                signupForm.reset();
                return;
            }

            // If auto-confirm is enabled, they are signed in immediately
            window.location.href = 'index.html';
        });
    }

    // ── Login ──────────────────────────────────────────────────────────────────
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError(loginForm);

            const email    = document.getElementById('email').value.trim().toLowerCase();
            const password = document.getElementById('password').value;

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging In...';
            submitBtn.disabled = true;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

            if (error) {
                showError(loginForm, error.message || 'Invalid login credentials.');
                return;
            }

            window.location.href = 'index.html';
        });
    }

    // ── Floating label logic (input + blur) ────────────────────────────────────
    document.querySelectorAll('.auth-input').forEach(input => {
        const sync = () => {
            if (input.value !== '') input.classList.add('has-val');
            else                    input.classList.remove('has-val');
        };
        sync(); // initial
        input.addEventListener('input', sync);
        input.addEventListener('blur',  sync);
    });

    // ── Ripple effect ──────────────────────────────────────────────────────────
    function createRipple(e, btn) {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const circle   = document.createElement('span');
        const diameter = Math.max(btn.clientWidth, btn.clientHeight);
        const radius   = diameter / 2;
        const rect     = btn.getBoundingClientRect();

        circle.style.width  = circle.style.height = `${diameter}px`;
        circle.style.left   = `${e.clientX - rect.left  - radius}px`;
        circle.style.top    = `${e.clientY - rect.top   - radius}px`;
        circle.classList.add('ripple');

        btn.querySelector('.ripple')?.remove();
        btn.appendChild(circle);
    }

    document.querySelectorAll('.ripple-btn').forEach(btn =>
        btn.addEventListener('click', (e) => createRipple(e, btn))
    );
});
