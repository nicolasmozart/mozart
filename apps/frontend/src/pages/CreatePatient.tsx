import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PatientForm from '../components/PatientForm';
import { useAlert } from '../contexts/AlertContext';
import { PatientService } from '../services/patientService';

const CreatePatient: React.FC = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const handleSave = async (data: any) => {
    try {
      console.log('Datos del paciente a crear:', data);
      
      // Llamada real a la API
      await PatientService.createPatient(data);
      
      showAlert({
        type: 'success',
        title: 'Paciente creado exitosamente',
        message: 'El paciente se ha creado exitosamente'
      });
      navigate('/tenant/patients');
    } catch (error) {
      console.error('Error creando paciente:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Error al crear el paciente'
      });
    }
  };

  const handleCancel = () => {
    navigate('/tenant/patients');
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Crear Paciente</h1>
            </div>
          </div>
        </div>
      </div>

      <PatientForm
        onSave={handleSave}
        onCancel={handleCancel}
        isEditing={false}
      />
    </div>
  );
};

export default CreatePatient;
