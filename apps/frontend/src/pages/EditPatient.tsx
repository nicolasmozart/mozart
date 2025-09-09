import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PatientForm from '../components/PatientForm';
import type { Patient } from '../services/patientService';
import { useAlert } from '../contexts/AlertContext';
import { PatientService } from '../services/patientService';

const EditPatient: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showAlert } = useAlert();
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPatient(id);
    }
  }, [id]);

  const loadPatient = async (patientId: string) => {
    try {
      console.log('Cargando paciente:', patientId);
      
      // Llamada real a la API
      const patientData = await PatientService.getPatient(patientId);
      setPatient(patientData);
    } catch (error) {
      console.error('Error cargando paciente:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Error al cargar el paciente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (!id) return;
      
      console.log('Datos del paciente a actualizar:', data);
      
      // Llamada real a la API
      await PatientService.updatePatient(id, data);
      
      showAlert({
        type: 'success',
        title: 'Paciente actualizado',
        message: 'El paciente se ha actualizado exitosamente'
      });
      navigate('/tenant/patients');
    } catch (error) {
      console.error('Error actualizando paciente:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Error al actualizar el paciente'
      });
    }
  };

  const handleCancel = () => {
    navigate('/tenant/patients');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando paciente...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Paciente no encontrado
          </h1>
          <button
            onClick={() => navigate('/tenant/patients')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/tenant/patients')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Editar Paciente</h1>
            </div>
          </div>
        </div>
      </div>

      <PatientForm
        patient={patient}
        onSave={handleSave}
        onCancel={handleCancel}
        isEditing={true}
      />
    </div>
  );
};

export default EditPatient;
