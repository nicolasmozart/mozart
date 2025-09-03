const express = require('express');
const cors = require('cors');
const router = require('./routes/calculadora.routes.js');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// healthcheck para ECS/ALB
app.get('/health', (_req, res) => res.status(200).send('ok'));

// tus rutas
app.use('/v1/calculadora', router);

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening at http://0.0.0.0:${PORT}`);
});
