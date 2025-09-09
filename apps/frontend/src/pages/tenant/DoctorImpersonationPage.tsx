import React from 'react';
import DoctorImpersonation from '../../components/DoctorImpersonation';

const DoctorImpersonationPage: React.FC = () => {
  console.log('🎭 DoctorImpersonationPage: Componente renderizado');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Suplantación de Doctores
        </h1>
        <p className="text-gray-600">
          Como administrador, puedes suplantar la identidad de cualquier doctor para ver el sistema desde su perspectiva.
        </p>
      </div>
      
      <DoctorImpersonation />
    </div>
  );
};

export default DoctorImpersonationPage;
