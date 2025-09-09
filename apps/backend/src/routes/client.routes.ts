import { Router } from 'express';
import { ClientController } from '../controllers/client.controller';
import { detectClient, optionalClientDetection } from '../middlewares/clientDetection';

const router = Router();

// Rutas para superusuarios (gestión de clientes)
router.post('/clients', ClientController.createClient);
router.get('/clients', ClientController.getAllClients);
router.get('/clients/:id', ClientController.getClientById);
router.put('/clients/:id', ClientController.updateClient);
router.patch('/clients/:id/toggle-status', ClientController.toggleClientStatus);

// Nuevas rutas para funcionalidades específicas
router.patch('/clients/:id/logo', ClientController.updateClientLogo);
router.patch('/clients/:id/agendamiento', ClientController.updateAgendamientoUrls);
router.patch('/clients/:id/features', ClientController.updateClientFeatures);

// Ruta para obtener clientes por feature específico
router.get('/clients/feature/:feature', ClientController.getClientsByFeature);

// Rutas para gestión de usuarios de clientes
router.get('/clients/:id/users', ClientController.getClientUsers);
router.post('/clients/:id/users', ClientController.createClientUser);
router.put('/clients/:id/users/:userId', ClientController.updateClientUser);

// Rutas para obtener información del cliente actual
router.get('/client/current', optionalClientDetection, ClientController.getCurrentClient);

// Ruta de prueba para verificar detección de cliente
router.get('/client/detect', detectClient, (req, res) => {
  res.json({
    message: 'Cliente detectado correctamente',
    client: {
      name: req.client.name,
      domain: req.client.domain,
      fullDomain: req.client.fullDomain,
      databaseName: req.client.databaseName
    }
  });
});

export default router;
