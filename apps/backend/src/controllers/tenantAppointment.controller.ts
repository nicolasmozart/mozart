import { Request, Response } from 'express';
import { ClientDatabaseService } from '../services/clientDatabaseService';
import { Client } from '../models';
import mongoose from 'mongoose';

// Extender Request para incluir información del usuario autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantId?: string;
    tenantName?: string;
    features?: any;
  };
}

export class TenantAppointmentController {
  // Método estático para verificar disponibilidad del doctor en una fecha y hora específica
  private static async checkDoctorAvailability(
    doctor: any,
    fecha: Date,
    hora: string
  ): Promise<{ available: boolean; message?: string }> {
    try {
      // Parsear la fecha de manera explícita para evitar problemas de zona horaria
      // Si fecha es un Date object, convertirlo primero a string ISO
      const fechaStr = fecha instanceof Date ? fecha.toISOString().split('T')[0] : String(fecha);
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fechaConsulta = new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexed
      
      // Obtener el día de la semana
      const diaSemana = fechaConsulta.getDay();
      const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const nombreDia = nombresDias[diaSemana];

      console.log('🔍 Verificando disponibilidad:');
      console.log('Fecha original:', fecha);
      console.log('Fecha string:', fechaStr);
      console.log('Año:', year, 'Mes:', month, 'Día:', day);
      console.log('Fecha parseada:', fechaConsulta.toDateString());
      console.log('Día de la semana (0-6):', diaSemana);
      console.log('Nombre del día:', nombreDia);

      // Buscar si hay una excepción para esa fecha específica
      const excepcionFecha = doctor.excepcionesFechas?.find((ex: any) => {
        const exFecha = new Date(ex.fecha);
        return exFecha.toDateString() === fechaConsulta.toDateString();
      });

      let intervalosDisponibles: any[] = [];

      if (excepcionFecha) {
        // Si hay excepción, usar esa disponibilidad
        intervalosDisponibles = excepcionFecha.intervalos || [];
      } else {
        // Buscar disponibilidad para ese día de la semana
        const disponibilidadDia = doctor.disponibilidad?.find((d: any) => d.dia === nombreDia);
        
        if (!disponibilidadDia || !disponibilidadDia.activo) {
          return {
            available: false,
            message: `El doctor no trabaja los ${nombreDia}`
          };
        }

        intervalosDisponibles = disponibilidadDia.intervalos || [];
      }

      // Buscar el intervalo específico
      const intervaloEspecifico = intervalosDisponibles.find((intervalo: any) => 
        intervalo.inicio === hora
      );

      if (!intervaloEspecifico) {
        return {
          available: false,
          message: 'El horario solicitado no está en los horarios de trabajo del doctor'
        };
      }

      if (!intervaloEspecifico.disponible) {
        return {
          available: false,
          message: 'El doctor no está disponible en esa fecha y hora'
        };
      }

      return { available: true };

    } catch (error) {
      console.error('Error verificando disponibilidad del doctor:', error);
      return {
        available: false,
        message: 'Error verificando disponibilidad del doctor'
      };
    }
  }

  // Método estático para marcar un intervalo del doctor como ocupado
  private static async markDoctorIntervalAsOccupied(
    clientConnection: any,
    databaseName: string,
    doctorId: string,
    fecha: Date,
    hora: string
  ): Promise<void> {
    try {
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, databaseName);
      const doctor = await Doctor.findById(doctorId);
      
      if (!doctor) return;

      // Parsear la fecha de manera explícita para evitar problemas de zona horaria
      const fechaStr = fecha instanceof Date ? fecha.toISOString().split('T')[0] : String(fecha);
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fechaConsulta = new Date(year, month - 1, day);
      
      // Obtener el día de la semana
      const diaSemana = fechaConsulta.getDay();
      const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const nombreDia = nombresDias[diaSemana];

      // Buscar si hay una excepción para esa fecha específica
      const excepcionIndex = doctor.excepcionesFechas?.findIndex((ex: any) => {
        const exFecha = new Date(ex.fecha);
        return exFecha.toDateString() === fechaConsulta.toDateString();
      });

      if (excepcionIndex !== -1 && excepcionIndex >= 0) {
        // Si hay excepción, marcar intervalo en la excepción
        const intervaloIndex = doctor.excepcionesFechas[excepcionIndex].intervalos.findIndex(
          (intervalo: any) => intervalo.inicio === hora
        );
        
        if (intervaloIndex !== -1) {
          doctor.excepcionesFechas[excepcionIndex].intervalos[intervaloIndex].disponible = false;
        }
      } else {
        // Marcar intervalo en la disponibilidad semanal
        const diaIndex = doctor.disponibilidad?.findIndex((d: any) => d.dia === nombreDia);
        
        if (diaIndex !== -1 && diaIndex >= 0) {
          const intervaloIndex = doctor.disponibilidad[diaIndex].intervalos.findIndex(
            (intervalo: any) => intervalo.inicio === hora
          );
          
          if (intervaloIndex !== -1) {
            doctor.disponibilidad[diaIndex].intervalos[intervaloIndex].disponible = false;
          }
        }
      }

      await doctor.save();
      console.log(`✅ Intervalo ${hora} marcado como ocupado para doctor ${doctorId} el ${fechaConsulta.toDateString()}`);

    } catch (error) {
      console.error('Error marcando intervalo como ocupado:', error);
      // No lanzar error para no fallar la creación de la cita
    }
  }

  // Método estático para liberar un intervalo del doctor (cuando se cancela una cita)
  private static async markDoctorIntervalAsAvailable(
    clientConnection: any,
    databaseName: string,
    doctorId: string,
    fecha: Date,
    hora: string
  ): Promise<void> {
    try {
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, databaseName);
      const doctor = await Doctor.findById(doctorId);
      
      if (!doctor) return;

      // Parsear la fecha de manera explícita para evitar problemas de zona horaria
      const fechaStr = fecha instanceof Date ? fecha.toISOString().split('T')[0] : String(fecha);
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fechaConsulta = new Date(year, month - 1, day);
      
      // Obtener el día de la semana
      const diaSemana = fechaConsulta.getDay();
      const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const nombreDia = nombresDias[diaSemana];

      // Buscar si hay una excepción para esa fecha específica
      const excepcionIndex = doctor.excepcionesFechas?.findIndex((ex: any) => {
        const exFecha = new Date(ex.fecha);
        return exFecha.toDateString() === fechaConsulta.toDateString();
      });

      if (excepcionIndex !== -1 && excepcionIndex >= 0) {
        // Si hay excepción, liberar intervalo en la excepción
        const intervaloIndex = doctor.excepcionesFechas[excepcionIndex].intervalos.findIndex(
          (intervalo: any) => intervalo.inicio === hora
        );
        
        if (intervaloIndex !== -1) {
          doctor.excepcionesFechas[excepcionIndex].intervalos[intervaloIndex].disponible = true;
        }
      } else {
        // Liberar intervalo en la disponibilidad semanal
        const diaIndex = doctor.disponibilidad?.findIndex((d: any) => d.dia === nombreDia);
        
        if (diaIndex !== -1 && diaIndex >= 0) {
          const intervaloIndex = doctor.disponibilidad[diaIndex].intervalos.findIndex(
            (intervalo: any) => intervalo.inicio === hora
          );
          
          if (intervaloIndex !== -1) {
            doctor.disponibilidad[diaIndex].intervalos[intervaloIndex].disponible = true;
          }
        }
      }

      await doctor.save();
      console.log(`✅ Intervalo ${hora} liberado para doctor ${doctorId} el ${fechaConsulta.toDateString()}`);

    } catch (error) {
      console.error('Error liberando intervalo:', error);
      // No lanzar error para no fallar la operación
    }
  }

  // Método estático para crear logs en la base de datos del cliente
  private static async createClientLog(
    clientConnection: any,
    databaseName: string,
    logData: {
      userId: string;
      userName: string;
      userRole: string;
      action: string;
      entityType: string;
      entityId?: string;
      entityName?: string;
      details: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ) {
    try {
      // Obtener o crear el modelo Log para la base de datos del cliente
      const Log = ClientDatabaseService.getLogModel(clientConnection, databaseName);
      
      const log = new Log({
        ...logData,
        timestamp: new Date(),
        tenantId: databaseName
      });
      
      await log.save();
      console.log(`📝 Log creado en BD del cliente ${databaseName}: ${logData.action}`);
    } catch (error) {
      console.error(`❌ Error creando log en BD del cliente ${databaseName}:`, error);
      // No fallar la operación principal por un error en el logging
    }
  }

  // Crear una nueva cita
  static async createAppointment(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        pacienteId, 
        doctorId, 
        fecha, 
        hora, 
        tipo, 
        motivo, 
        notas,
        duracion,
        especialidad
      } = req.body;
      
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Validaciones básicas
      if (!pacienteId || !tipo) {
        return res.status(400).json({
          success: false,
          message: 'Paciente ID y tipo de cita son requeridos'
        });
      }

      // Validar que el tipo sea válido
      const tiposValidos = ['Presencial', 'Virtual', 'Telefónica'];
      if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de cita no válido'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      
      // Obtener modelos
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, client.databaseName);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      // Verificar que el paciente existe
      const patient = await Patient.findById(pacienteId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Paciente no encontrado'
        });
      }

      // Verificar que el doctor existe (si se proporciona)
      let doctor = null;
      if (doctorId) {
        doctor = await Doctor.findById(doctorId);
        if (!doctor) {
          return res.status(404).json({
            success: false,
            message: 'Doctor no encontrado'
          });
        }
      }

      // Verificar disponibilidad del doctor si se proporciona fecha, hora y doctor
      if (doctorId && fecha && hora) {
        const isAvailable = await TenantAppointmentController.checkDoctorAvailability(
          doctor, 
          new Date(fecha), 
          hora
        );

        if (!isAvailable.available) {
          return res.status(400).json({
            success: false,
            message: isAvailable.message || 'El doctor no está disponible en esa fecha y hora'
          });
        }

        // Marcar el intervalo como ocupado
        await TenantAppointmentController.markDoctorIntervalAsOccupied(
          clientConnection,
          client.databaseName,
          doctorId,
          new Date(fecha),
          hora
        );
      }

      // Crear la cita
      const appointmentData = {
        pacienteId,
        doctorId: doctorId || null,
        fecha: fecha ? new Date(fecha) : null,
        hora: hora || null,
        tipo,
        motivo: motivo || '',
        notas: notas || '',
        duracion: duracion || 30,
        especialidad: especialidad || '',
        estado: doctorId && fecha && hora ? 'Agendada' : 'PendienteAgendar'
      };

      const newAppointment = new Appointment(appointmentData);
      await newAppointment.save();

      // Crear fecha correcta para el log (parsear igual que en checkDoctorAvailability)
      let fechaFormateada = 'fecha pendiente';
      if (fecha) {
        const fechaStr = fecha;
        const [year, month, day] = fechaStr.split('-').map(Number);
        const fechaCorrecta = new Date(year, month - 1, day);
        fechaFormateada = fechaCorrecta.toLocaleDateString('es-ES');
      }

      // Crear log de la acción
      await TenantAppointmentController.createClientLog(
        clientConnection,
        client.databaseName,
        {
          userId: userId!,
          userName: userEmail!,
          userRole: userRole!,
          action: 'APPOINTMENT_CREATED',
          entityType: 'APPOINTMENT',
          entityId: newAppointment._id.toString(),
          entityName: `Cita ${tipo} - ${patient.firstName} ${patient.lastName}`,
          details: `Cita creada para el paciente ${patient.firstName} ${patient.lastName}${doctor ? ` con el doctor ${doctor.name} ${doctor.lastName}` : ''} para el ${fechaFormateada}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      // Poblar los datos de referencia para la respuesta
      const populatedAppointment = await Appointment.findById(newAppointment._id)
        .populate({
          path: 'pacienteId',
          select: 'firstName lastName email phone idNumber',
          model: Patient
        })
        .populate({
          path: 'doctorId',
          select: 'name lastName email especialidad',
          model: Doctor
        });

      res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente',
        appointment: populatedAppointment
      });

    } catch (error) {
      console.error('Error creando cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener todas las citas
  static async getAppointments(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const { page = 1, limit = 10, estado, doctorId, pacienteId, fecha } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);

      // Construir filtros
      const filters: any = {};
      if (estado) filters.estado = estado;
      if (doctorId) filters.doctorId = doctorId;
      if (pacienteId) filters.pacienteId = pacienteId;
      if (fecha) {
        const startDate = new Date(fecha as string);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        filters.fecha = { $gte: startDate, $lt: endDate };
      }

      // Calcular paginación
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Obtener modelos para populate
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, client.databaseName);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      // Obtener citas con paginación
      const appointments = await Appointment.find(filters)
        .populate({
          path: 'pacienteId',
          select: 'firstName lastName email phone idNumber',
          model: Patient
        })
        .populate({
          path: 'doctorId',
          select: 'name lastName email especialidad',
          model: Doctor
        })
        .sort({ fecha: -1, hora: -1 })
        .skip(skip)
        .limit(limitNum);

      // Contar total de documentos
      const total = await Appointment.countDocuments(filters);

      res.json({
        success: true,
        appointments,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalAppointments: total,
          hasNextPage: skip + limitNum < total,
          hasPrevPage: pageNum > 1
        }
      });

    } catch (error) {
      console.error('Error obteniendo citas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener citas por paciente
  static async getAppointmentsByPatient(req: AuthenticatedRequest, res: Response) {
    try {
      const { patientId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, client.databaseName);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      const appointments = await Appointment.find({ pacienteId: patientId })
        .populate({
          path: 'pacienteId',
          select: 'firstName lastName email phone idNumber',
          model: Patient
        })
        .populate({
          path: 'doctorId',
          select: 'name lastName email especialidad',
          model: Doctor
        })
        .sort({ fecha: -1, hora: -1 });

      res.json({
        success: true,
        appointments
      });

    } catch (error) {
      console.error('Error obteniendo citas del paciente:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener citas por doctor
  static async getAppointmentsByDoctor(req: AuthenticatedRequest, res: Response) {
    try {
      const { doctorId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, client.databaseName);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      const appointments = await Appointment.find({ doctorId })
        .populate({
          path: 'pacienteId',
          select: 'firstName lastName email phone idNumber',
          model: Patient
        })
        .populate({
          path: 'doctorId',
          select: 'name lastName email especialidad',
          model: Doctor
        })
        .sort({ fecha: -1, hora: -1 });

      res.json({
        success: true,
        appointments
      });

    } catch (error) {
      console.error('Error obteniendo citas del doctor:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener citas por fecha
  static async getAppointmentsByDate(req: AuthenticatedRequest, res: Response) {
    try {
      const { date } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, client.databaseName);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      const appointments = await Appointment.find({
        fecha: { $gte: startDate, $lt: endDate }
      })
        .populate({
          path: 'pacienteId',
          select: 'firstName lastName email phone idNumber',
          model: Patient
        })
        .populate({
          path: 'doctorId',
          select: 'name lastName email especialidad',
          model: Doctor
        })
        .sort({ hora: 1 });

      res.json({
        success: true,
        appointments
      });

    } catch (error) {
      console.error('Error obteniendo citas por fecha:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Actualizar una cita
  static async updateAppointment(req: AuthenticatedRequest, res: Response) {
    try {
      const { appointmentId } = req.params;
      const updateData = req.body;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Validar ID de cita
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita no válido'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);

      // Buscar la cita
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Buscar la cita actual para obtener datos anteriores
      const currentAppointment = await Appointment.findById(appointmentId);
      if (!currentAppointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Si se cambia doctor, fecha o hora, manejar la disponibilidad
      const doctorChanged = updateData.doctorId && updateData.doctorId !== currentAppointment.doctorId?.toString();
      const fechaChanged = updateData.fecha && new Date(updateData.fecha).getTime() !== currentAppointment.fecha?.getTime();
      const horaChanged = updateData.hora && updateData.hora !== currentAppointment.hora;

      if (doctorChanged || fechaChanged || horaChanged) {
        // Liberar el intervalo anterior si existía
        if (currentAppointment.doctorId && currentAppointment.fecha && currentAppointment.hora) {
          await TenantAppointmentController.markDoctorIntervalAsAvailable(
            clientConnection,
            client.databaseName,
            currentAppointment.doctorId.toString(),
            currentAppointment.fecha,
            currentAppointment.hora
          );
        }

        // Validar y ocupar el nuevo intervalo si se especifica doctor, fecha y hora
        if (updateData.doctorId && updateData.fecha && updateData.hora) {
          const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);
          const newDoctor = await Doctor.findById(updateData.doctorId);
          
          if (!newDoctor) {
            return res.status(404).json({
              success: false,
              message: 'Doctor no encontrado'
            });
          }

          const isAvailable = await TenantAppointmentController.checkDoctorAvailability(
            newDoctor,
            new Date(updateData.fecha),
            updateData.hora
          );

          if (!isAvailable.available) {
            // Restaurar el intervalo anterior si la validación falló
            if (currentAppointment.doctorId && currentAppointment.fecha && currentAppointment.hora) {
              await TenantAppointmentController.markDoctorIntervalAsOccupied(
                clientConnection,
                client.databaseName,
                currentAppointment.doctorId.toString(),
                currentAppointment.fecha,
                currentAppointment.hora
              );
            }

            return res.status(400).json({
              success: false,
              message: isAvailable.message || 'El doctor no está disponible en esa fecha y hora'
            });
          }

          // Marcar el nuevo intervalo como ocupado
          await TenantAppointmentController.markDoctorIntervalAsOccupied(
            clientConnection,
            client.databaseName,
            updateData.doctorId,
            new Date(updateData.fecha),
            updateData.hora
          );
        }
      }

      // Obtener modelos para populate
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, client.databaseName);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      // Actualizar la cita
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      ).populate({
        path: 'pacienteId',
        select: 'firstName lastName email phone idNumber',
        model: Patient
      }).populate({
        path: 'doctorId',
        select: 'name lastName email especialidad',
        model: Doctor
      });

      // Crear log de la acción
      await TenantAppointmentController.createClientLog(
        clientConnection,
        client.databaseName,
        {
          userId: userId!,
          userName: userEmail!,
          userRole: userRole!,
          action: 'APPOINTMENT_UPDATED',
          entityType: 'APPOINTMENT',
          entityId: appointmentId,
          entityName: `Cita ${updatedAppointment.tipo}`,
          details: `Cita actualizada - Estado: ${updatedAppointment.estado}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      res.json({
        success: true,
        message: 'Cita actualizada exitosamente',
        appointment: updatedAppointment
      });

    } catch (error) {
      console.error('Error actualizando cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Cancelar una cita
  static async cancelAppointment(req: AuthenticatedRequest, res: Response) {
    try {
      const { appointmentId } = req.params;
      const { motivo } = req.body;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Validar ID de cita
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita no válido'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, client.databaseName);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      // Buscar la cita primero para obtener datos antes de cancelar
      const appointmentToCancel = await Appointment.findById(appointmentId);
      if (!appointmentToCancel) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Liberar el intervalo del doctor si la cita tenía fecha, hora y doctor asignado
      if (appointmentToCancel.doctorId && appointmentToCancel.fecha && appointmentToCancel.hora) {
        await TenantAppointmentController.markDoctorIntervalAsAvailable(
          clientConnection,
          client.databaseName,
          appointmentToCancel.doctorId.toString(),
          appointmentToCancel.fecha,
          appointmentToCancel.hora
        );
      }

      // Actualizar el estado de la cita
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        { 
          estado: 'Cancelada',
          notas: motivo ? `${motivo}` : 'Cita cancelada',
          updatedAt: new Date()
        },
        { new: true }
      ).populate({
        path: 'pacienteId',
        select: 'firstName lastName email phone idNumber',
        model: Patient
      }).populate({
        path: 'doctorId',
        select: 'name lastName email especialidad',
        model: Doctor
      });

      if (!updatedAppointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Crear log de la acción
      await TenantAppointmentController.createClientLog(
        clientConnection,
        client.databaseName,
        {
          userId: userId!,
          userName: userEmail!,
          userRole: userRole!,
          action: 'APPOINTMENT_CANCELLED',
          entityType: 'APPOINTMENT',
          entityId: appointmentId,
          entityName: `Cita ${updatedAppointment.tipo}`,
          details: `Cita cancelada - Motivo: ${motivo || 'No especificado'}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      res.json({
        success: true,
        message: 'Cita cancelada exitosamente',
        appointment: updatedAppointment
      });

    } catch (error) {
      console.error('Error cancelando cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Confirmar una cita
  static async confirmAppointment(req: AuthenticatedRequest, res: Response) {
    try {
      const { appointmentId } = req.params;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Validar ID de cita
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita no válido'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, client.databaseName);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      // Actualizar el estado de la cita
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        { 
          estado: 'Confirmada',
          updatedAt: new Date()
        },
        { new: true }
      ).populate({
        path: 'pacienteId',
        select: 'firstName lastName email phone idNumber',
        model: Patient
      }).populate({
        path: 'doctorId',
        select: 'name lastName email especialidad',
        model: Doctor
      });

      if (!updatedAppointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Crear log de la acción
      await TenantAppointmentController.createClientLog(
        clientConnection,
        client.databaseName,
        {
          userId: userId!,
          userName: userEmail!,
          userRole: userRole!,
          action: 'APPOINTMENT_UPDATED',
          entityType: 'APPOINTMENT',
          entityId: appointmentId,
          entityName: `Cita ${updatedAppointment.tipo}`,
          details: 'Cita confirmada exitosamente',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      res.json({
        success: true,
        message: 'Cita confirmada exitosamente',
        appointment: updatedAppointment
      });

    } catch (error) {
      console.error('Error confirmando cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Marcar cita como completada
  static async completeAppointment(req: AuthenticatedRequest, res: Response) {
    try {
      const { appointmentId } = req.params;
      const { notas } = req.body;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Validar ID de cita
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita no válido'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);

      // Buscar la cita actual para obtener las notas existentes
      const currentAppointment = await Appointment.findById(appointmentId);
      if (!currentAppointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Obtener modelos para populate
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, client.databaseName);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      // Actualizar el estado de la cita
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        { 
          estado: 'Completada',
          notas: notas || currentAppointment.notas,
          updatedAt: new Date()
        },
        { new: true }
      ).populate({
        path: 'pacienteId',
        select: 'firstName lastName email phone idNumber',
        model: Patient
      }).populate({
        path: 'doctorId',
        select: 'name lastName email especialidad',
        model: Doctor
      });

      if (!updatedAppointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Crear log de la acción
      await TenantAppointmentController.createClientLog(
        clientConnection,
        client.databaseName,
        {
          userId: userId!,
          userName: userEmail!,
          userRole: userRole!,
          action: 'APPOINTMENT_UPDATED',
          entityType: 'APPOINTMENT',
          entityId: appointmentId,
          entityName: `Cita ${updatedAppointment.tipo}`,
          details: 'Cita marcada como completada',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      res.json({
        success: true,
        message: 'Cita marcada como completada',
        appointment: updatedAppointment
      });

    } catch (error) {
      console.error('Error completando cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Marcar cita como no asistió
  static async markNoShow(req: AuthenticatedRequest, res: Response) {
    try {
      const { appointmentId } = req.params;
      const { motivo } = req.body;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Validar ID de cita
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita no válido'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);
      const Patient = ClientDatabaseService.getPatientModel(clientConnection, client.databaseName);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      // Actualizar el estado de la cita
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        { 
          estado: 'No Asistió',
          notas: motivo ? `No asistió - ${motivo}` : 'No asistió a la cita',
          updatedAt: new Date()
        },
        { new: true }
      ).populate({
        path: 'pacienteId',
        select: 'firstName lastName email phone idNumber',
        model: Patient
      }).populate({
        path: 'doctorId',
        select: 'name lastName email especialidad',
        model: Doctor
      });

      if (!updatedAppointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Crear log de la acción
      await TenantAppointmentController.createClientLog(
        clientConnection,
        client.databaseName,
        {
          userId: userId!,
          userName: userEmail!,
          userRole: userRole!,
          action: 'APPOINTMENT_UPDATED',
          entityType: 'APPOINTMENT',
          entityId: appointmentId,
          entityName: `Cita ${updatedAppointment.tipo}`,
          details: `Cita marcada como no asistió - Motivo: ${motivo || 'No especificado'}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      res.json({
        success: true,
        message: 'Cita marcada como no asistió',
        appointment: updatedAppointment
      });

    } catch (error) {
      console.error('Error marcando cita como no asistió:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Verificar disponibilidad
  static async checkAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      const { doctorId, fecha, hora } = req.query;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      if (!doctorId || !fecha || !hora) {
        return res.status(400).json({
          available: false,
          message: 'Doctor ID, fecha y hora son requeridos'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          available: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Doctor = ClientDatabaseService.getDoctorModel(clientConnection, client.databaseName);

      // Buscar el doctor
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.json({
          available: false,
          message: 'Doctor no encontrado'
        });
      }

      // Verificar disponibilidad usando la nueva lógica
      const availabilityCheck = await TenantAppointmentController.checkDoctorAvailability(
        doctor,
        new Date(fecha as string),
        hora as string
      );

      res.json(availabilityCheck);

    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
      res.status(500).json({
        available: false,
        message: 'Error verificando disponibilidad'
      });
    }
  }

  // Obtener estadísticas de citas
  static async getAppointmentStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);

      // Obtener estadísticas
      const [
        total,
        agendadas,
        canceladas,
        completadas,
        noAsistio,
        pendienteAgendar
      ] = await Promise.all([
        Appointment.countDocuments({}),
        Appointment.countDocuments({ estado: 'Agendada' }),
        Appointment.countDocuments({ estado: 'Cancelada' }),
        Appointment.countDocuments({ estado: 'Completada' }),
        Appointment.countDocuments({ estado: 'No Asistió' }),
        Appointment.countDocuments({ estado: 'PendienteAgendar' })
      ]);

      res.json({
        total,
        agendadas,
        canceladas,
        completadas,
        noAsistio,
        pendienteAgendar
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de citas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Eliminar una cita (soft delete)
  static async deleteAppointment(req: AuthenticatedRequest, res: Response) {
    try {
      const { appointmentId } = req.params;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      const userEmail = req.user?.email;
      const userRole = req.user?.role;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID no encontrado'
        });
      }

      // Validar ID de cita
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de cita no válido'
        });
      }

      // Obtener información del cliente
      const client = await Client.findById(tenantId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Conectar a la base de datos del cliente
      const clientConnection = await ClientDatabaseService.connectToClientDatabase(client);
      const Appointment = ClientDatabaseService.getAppointmentModel(clientConnection, client.databaseName);

      // Buscar la cita primero para obtener datos antes de eliminar
      const appointmentToDelete = await Appointment.findById(appointmentId);
      if (!appointmentToDelete) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Liberar el intervalo del doctor si la cita tenía fecha, hora y doctor asignado
      if (appointmentToDelete.doctorId && appointmentToDelete.fecha && appointmentToDelete.hora) {
        await TenantAppointmentController.markDoctorIntervalAsAvailable(
          clientConnection,
          client.databaseName,
          appointmentToDelete.doctorId.toString(),
          appointmentToDelete.fecha,
          appointmentToDelete.hora
        );
      }

      // Eliminar la cita
      const appointment = await Appointment.findByIdAndDelete(appointmentId);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Cita no encontrada'
        });
      }

      // Crear log de la acción
      await TenantAppointmentController.createClientLog(
        clientConnection,
        client.databaseName,
        {
          userId: userId!,
          userName: userEmail!,
          userRole: userRole!,
          action: 'APPOINTMENT_DELETED',
          entityType: 'APPOINTMENT',
          entityId: appointmentId,
          entityName: `Cita ${appointment.tipo}`,
          details: 'Cita eliminada permanentemente',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      res.json({
        success: true,
        message: 'Cita eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando cita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}
