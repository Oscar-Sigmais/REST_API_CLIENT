require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/dbConfig');
const validateApiKey = require('./middlewares/validateApiKey');
const apiKeyRoutes = require('./routes/apiKeyRoutes'); // Importa as rotas de API Key
const { getCompanies } = require('./controllers/getCompaniesController');
const { getGroups } = require('./controllers/getDevicesGroupsController');
const { getDeviceEvents } = require('./controllers/getDeviceEventsController');
const { getDeviceAlerts } = require('./controllers/getDeviceAlertsController');
const { getDeviceResume } = require('./controllers/getDeviceResumeController');
const path = require('path');
const packageJson = require(path.join(__dirname, 'package.json'));

const app = express();

app.use(cors());
app.use(bodyParser.json());

connectDB(process.env.MONGO_URI, process.env.MONGO_DB);

// Registrar rotas de API Key
app.use('/api-key', apiKeyRoutes);

// Rotas principais
app.get('/companies/data', validateApiKey, getCompanies);
app.get('/groups/data', validateApiKey, getGroups);
app.get('/:collection/device/resume', validateApiKey, getDeviceResume);
app.get('/:collection/device/events', validateApiKey, getDeviceEvents);
app.get('/:collection/device/alerts', validateApiKey, getDeviceAlerts);
app.get('/version', (req, res) => {
    res.json({ version: packageJson.version });
});
app.get('/', (req, res) => {
    res.status(200).json({ message: 'API is running!' });
});

// Inicializar servidor
const PORT = process.env.PORT || 8005;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
