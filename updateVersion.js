const fs = require('fs');
const path = require('path');

// Caminho do package.json
const packageJsonPath = path.resolve(__dirname, 'package.json');

// Função para atualizar a versão
function updateVersion() {
    // Carrega o package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Versão base (mantém major e minor)
    const [major, minor] = packageJson.version.split('.').slice(0, 2);

    // Gera o último dígito com base no timestamp (em segundos)
    const lastDigit = Math.floor(Date.now() / 1000);

    // Atualiza a versão
    packageJson.version = `${major}.${minor}.${lastDigit}`;

    // Salva as alterações no package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

    console.log(`Versão atualizada para: ${packageJson.version}`);
}

updateVersion();
