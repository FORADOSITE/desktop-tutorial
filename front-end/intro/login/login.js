document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const loginAlert = document.getElementById('loginAlert');

    // 1. Mostrar/Ocultar Senha
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.textContent = isPassword ? '🙈' : '👁️';
    });

    // 2. Validação simples de e-mail por Regex
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // 3. Submissão do Formulário
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let valid = true;
        loginAlert.className = 'alert-message';
        loginAlert.style.display = 'none';

        // Validar E-mail
        if (!isValidEmail(emailInput.value.trim())) {
            emailInput.classList.add('input-error');
            emailError.style.display = 'block';
            valid = false;
        } else {
            emailInput.classList.remove('input-error');
            emailError.style.display = 'none';
        }

        // Validar Senha
        if (passwordInput.value.trim().length < 6) {
            passwordInput.classList.add('input-error');
            passwordError.style.display = 'block';
            valid = false;
        } else {
            passwordInput.classList.remove('input-error');
            passwordError.style.display = 'none';
        }

        // Se passar nas validações
        if (valid) {
            loginAlert.textContent = 'Autenticando... Aguarde.';
            loginAlert.classList.add('success');

            // Simulação de Login (Ex: Envio para API Backend)
            setTimeout(() => {
                loginAlert.textContent = 'Login realizado com sucesso! Redirecionando...';
                // Exemplo de redirecionamento para o perfil
                // window.location.href = 'perfil.html';
            }, 1500);
        }
    });

    // Remove erros ao digitar nos campos
    emailInput.addEventListener('input', () => {
        emailInput.classList.remove('input-error');
        emailError.style.display = 'none';
    });

    passwordInput.addEventListener('input', () => {
        passwordInput.classList.remove('input-error');
        passwordError.style.display = 'none';
    });
});