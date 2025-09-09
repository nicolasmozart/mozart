import React, { useState } from 'react';
import { Building2, User, Shield, Plus, Stethoscope } from 'lucide-react';
import DoctorManagement from '../components/DoctorManagement';
import HospitalManagement from '../components/HospitalManagement';
import SpecialtyManagement from '../components/SpecialtyManagement';
import InsuranceManagement from '../components/InsuranceManagement';

const Personalization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hospitals' | 'doctors' | 'specialties' | 'insurance'>('hospitals');

  const tabs = [
    {
      id: 'hospitals',
      name: 'Hospitales',
      icon: Building2,
      description: 'Gestionar hospitales y clínicas'
    },
    {
      id: 'doctors',
      name: 'Doctores',
      icon: User,
      description: 'Gestionar médicos y especialistas'
    },
    {
      id: 'specialties',
      name: 'Especialidades',
      icon: Stethoscope,
      description: 'Gestionar especialidades médicas'
    },
    {
      id: 'insurance',
      name: 'Compañías de Seguro',
      icon: Shield,
      description: 'Gestionar aseguradoras'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'hospitals':
        return <HospitalManagement />;
      case 'doctors':
        return <DoctorManagement />;
      case 'specialties':
        return <SpecialtyManagement />;
      case 'insurance':
        return <InsuranceManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">
                  Personalización
                </h1>
                <p className="mt-2 text-neutral-600">
                  Configuración de hospitales, doctores y compañías de seguro
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {activeTab === 'hospitals' && (
                  <button 
                    onClick={() => {
                      // Trigger the new hospital form in HospitalManagement
                      const event = new CustomEvent('openNewHospitalForm');
                      document.dispatchEvent(event);
                    }}
                    className="btn-primary"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Nuevo Hospital
                  </button>
                )}
                {activeTab === 'doctors' && (
                  <button 
                    onClick={() => {
                      // Trigger the new doctor form in DoctorManagement
                      const event = new CustomEvent('openNewDoctorForm');
                      document.dispatchEvent(event);
                    }}
                    className="btn-primary"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Nuevo Doctor
                  </button>
                )}
                {activeTab === 'specialties' && (
                  <button 
                    onClick={() => {
                      // Trigger the new specialty form in SpecialtyManagement
                      const event = new CustomEvent('openNewSpecialtyForm');
                      document.dispatchEvent(event);
                    }}
                    className="btn-primary"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Nueva Especialidad
                  </button>
                )}
                {activeTab === 'insurance' && (
                  <button 
                    onClick={() => {
                      // Trigger the new insurance form in InsuranceManagement
                      const event = new CustomEvent('openNewInsuranceForm');
                      document.dispatchEvent(event);
                    }}
                    className="btn-primary"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Nueva Compañía de Seguro
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </div>
                  <p className="text-xs mt-1 text-left opacity-75">
                    {tab.description}
                  </p>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Personalization;
