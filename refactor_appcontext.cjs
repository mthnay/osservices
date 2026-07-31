const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'context', 'AppContext.jsx');
let content = fs.readFileSync(file, 'utf8');

// Define apiFetch
const apiFetchCode = `
    const apiFetch = async (url, options = {}) => {
        const token = sessionStorage.getItem('token');
        const headers = {
            ...options.headers,
            ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
        };
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401 && !url.includes('/login') && !url.includes('/forgot-password')) {
            sessionStorage.clear();
            setCurrentUser(null);
            window.location.href = '/';
            throw new Error('Oturum süresi doldu, lütfen tekrar giriş yapın.');
        }
        return res;
    };
`;

// Insert apiFetch after `const [isOnline, setIsOnline] = useState(navigator.onLine);`
content = content.replace(
    /const \[isOnline, setIsOnline\] = useState\(navigator\.onLine\);/,
    `const [isOnline, setIsOnline] = useState(navigator.onLine);\n${apiFetchCode}`
);

// Replace fetch( with apiFetch( EXCEPT for the fetch inside apiFetch itself
content = content.replace(/\bawait fetch\(/g, 'await apiFetch(');
content = content.replace(/const res = await apiFetch\(url/g, 'const res = await fetch(url');

// Update login function
content = content.replace(
    /const user = await res\.json\(\);\s+setCurrentUser\(user\);\s+return true;/g,
    `const data = await res.json();
                setCurrentUser(data.user);
                sessionStorage.setItem('token', data.token);
                return true;`
);

// Remove the hardcoded fetch in check-updates just in case (no wait, it's fine)

fs.writeFileSync(file, content);
console.log('Refactored AppContext.jsx');
