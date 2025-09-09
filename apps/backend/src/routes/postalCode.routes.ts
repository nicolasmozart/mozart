import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.get('/', async (req, res) => {
  const { placename, country } = req.query;

  try {
    const response = await axios.get('http://api.geonames.org/postalCodeSearchJSON', {
      params: {
        placename,
        country,
        maxRows: 1,
        username: 'mozartcuidador', // Tu usuario de GeoNames
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error obteniendo código postal:', error);
    res.status(500).json({ error: 'Error al obtener el código postal' });
  }
});

export default router;
