// auth.js - Simple password protection using SweetAlert2
const AUTH_CONFIG = {
    password: '11223344', // Change this to your password
    sessionKey: 'gcode_auth_session',
    sessionDuration: 2 * 60 * 60 * 1000 // 2 hours
};

function isAuthenticated() {
    const session = sessionStorage.getItem(AUTH_CONFIG.sessionKey);
    if (!session) return false;
    const data = JSON.parse(session);
    return Date.now() < data.expires;
}

function setSession() {
    sessionStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify({
        expires: Date.now() + AUTH_CONFIG.sessionDuration
    }));
}

function disableProtectedFeatures() {
    document.querySelectorAll('#generateGCode, #downloadAll, #generateButton, #generateBtn, #copyButton, #copyBtn, #downloadBtn').forEach(btn => {
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    });
    document.querySelectorAll('#gcodeOutput, textarea[readonly]').forEach(ta => {
        if (ta) ta.disabled = true;
    });
}

function enableProtectedFeatures() {
    document.querySelectorAll('#generateGCode, #downloadAll, #generateButton, #generateBtn, #copyButton, #copyBtn, #downloadBtn').forEach(btn => {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
    document.querySelectorAll('#gcodeOutput, textarea[readonly]').forEach(ta => {
        if (ta) ta.disabled = false;
    });
}

async function showLogin() {
    const { value: password } = await Swal.fire({
        title: '🔒 Authentication Required',
        html: '<p>Please enter the password to access G-code generation features.</p>',
        input: 'password',
        inputPlaceholder: 'Enter password',
        inputAttributes: {
            required: true,
            autofocus: true
        },
        showCancelButton: false,
        confirmButtonText: 'Login',
        confirmButtonColor: '#FF6B35',
        allowOutsideClick: false,
        allowEscapeKey: false,
        inputValidator: (value) => {
            if (!value) {
                return 'Please enter a password';
            }
        }
    });

    if (password && password === AUTH_CONFIG.password) {
        setSession();
        enableProtectedFeatures();
        Swal.fire({
            icon: 'success',
            title: 'Authenticated!',
            text: 'You can now use G-code generation features.',
            timer: 2000,
            showConfirmButton: false
        });
        return true;
    } else if (password) {
        Swal.fire({
            icon: 'error',
            title: 'Incorrect Password',
            text: 'Please try again.',
            confirmButtonColor: '#FF6B35'
        });
        return showLogin(); // Retry
    }
    return false;
}

function requireAuth(callback) {
    if (isAuthenticated()) {
        callback();
    } else {
        showLogin().then(authenticated => {
            if (authenticated) callback();
        });
    }
}

// Make functions globally available
window.requireAuth = requireAuth;
window.isAuthenticated = isAuthenticated;

// Check if this page has G-code generation features
function hasGCodeFeatures() {
    return document.querySelector('#generateGCode, #downloadAll, #generateButton, #generateBtn, #copyButton, #copyBtn, #downloadBtn') !== null;
}

// Initialize - only on pages with G-code features, and don't auto-show login
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if this page has G-code generation features
    if (!hasGCodeFeatures()) {
        return; // Exit early if no G-code features on this page
    }
    
    if (isAuthenticated()) {
        enableProtectedFeatures();
    } else {
        disableProtectedFeatures();
        // Don't show login automatically - only when user tries to use a feature
    }
});

