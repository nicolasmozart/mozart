import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Calendar, Shield, Heart, FileText } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { LocationService } from '../services/locationService';
import type { CountryOption, StateOption, CityOption } from '../services/locationService';

interface PatientFormData {
  // Información Personal
  firstName: string;
  lastName: string;
  birthDate: string;
  birthCountry: string;
  residenceCountry: string;
  gender: 'masculino' | 'femenino' | 'otro' | '';
  
  // Identificación
  idType: string;
  idNumber: string;
  documento_identidad: File | null;
  
  // Contacto
  phone: string;
  email: string;
  
  // Ubicación
  state: string;
  municipality: string;
  address: string;
  postalCode: string;
  
  // Información Médica
  hospital: string;
  necesitaEmergencia: boolean;
  motivoEmergencia: string;
  documento_egreso: File | null;
  
  // Seguro
  hasInsurance: boolean;
  insuranceName: string;
  policyNumber: string;
  
  // Cuidador
  hasCaretaker: boolean;
  caretakerFirstName: string;
  caretakerLastName: string;
  caretakerRelationship: string;
  caretakerPhone: string;
  caretakerEmail: string;
}

interface PatientFormProps {
  patient?: Partial<PatientFormData>;
  onSave: (data: PatientFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const PatientForm: React.FC<PatientFormProps> = ({ 
  patient, 
  onSave, 
  onCancel, 
  isEditing = false 
}) => {
  const [formData, setFormData] = useState<PatientFormData & { [key: string]: any }>({
    firstName: '',
    lastName: '',
    birthDate: '',
    birthCountry: '',
    residenceCountry: '',
    gender: '',
    idType: '',
    idNumber: '',
    documento_identidad: null,
    phone: '',
    email: '',
    state: '',
    municipality: '',
    address: '',
    postalCode: '',
    hospital: '',
    necesitaEmergencia: false,
    motivoEmergencia: '',
    documento_egreso: null,
    hasInsurance: false,
    insuranceName: '',
    policyNumber: '',
    hasCaretaker: false,
    caretakerFirstName: '',
    caretakerLastName: '',
    caretakerRelationship: '',
    caretakerPhone: '',
    caretakerEmail: '',
    ...patient
  });

  const [errors, setErrors] = useState<Partial<PatientFormData>>({});
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [isLoadingPostalCode, setIsLoadingPostalCode] = useState(false);

  useEffect(() => {
    // Cargar países al montar el componente
    setCountries(LocationService.getCountries());
  }, []);

    useEffect(() => {
    if (patient) {
      console.log('🔄 Procesando paciente para edición:', patient);
      console.log('📅 Fecha de nacimiento original:', patient.birthDate);
      
      // Convertir nombres completos de vuelta a códigos ISO para edición
      const convertedPatient = {
        ...patient,
        // Convertir la fecha de nacimiento de ISO a formato YYYY-MM-DD para el input
        birthDate: patient.birthDate ? 
          (() => {
            try {
              const date = new Date(patient.birthDate);
              if (isNaN(date.getTime())) {
                console.warn('⚠️ Fecha de nacimiento inválida:', patient.birthDate);
                return '';
              }
              return date.toISOString().split('T')[0];
            } catch (error) {
              console.error('❌ Error procesando fecha de nacimiento:', error);
              return '';
            }
          })() : '',
        // Convertir países de nombres completos a códigos ISO
        birthCountry: patient.birthCountry ? 
          LocationService.getCountryCodeByName(patient.birthCountry) : '',
        residenceCountry: patient.residenceCountry ? 
          LocationService.getCountryCodeByName(patient.residenceCountry) : '',
        // Convertir estado inmediatamente si tenemos el país
        state: patient.state && patient.residenceCountry ? 
          LocationService.getStateCodeByName(
            LocationService.getCountryCodeByName(patient.residenceCountry), 
            patient.state
          ) : '',
        // La ciudad ya es el nombre completo, no necesita conversión
        municipality: patient.municipality || ''
      };
      
      console.log('📅 Fecha de nacimiento convertida:', convertedPatient.birthDate);
      console.log('🔄 Paciente convertido:', convertedPatient);
      
      setFormData(prev => {
        const newFormData = { ...prev, ...convertedPatient };
        console.log('📋 Nuevo formData:', newFormData);
        return newFormData;
      });
    }
  }, [patient]);

  // Cargar estados cuando cambie el país de residencia
  useEffect(() => {
    if (formData.residenceCountry) {
      const countryStates = LocationService.getStates(formData.residenceCountry);
      setStates(countryStates);
      
      // Solo resetear si no estamos editando o si cambió el país
      if (!patient || formData.residenceCountry !== LocationService.getCountryCodeByName(patient.residenceCountry || '')) {
        setFormData(prev => ({ ...prev, state: '', municipality: '', postalCode: '' }));
      }
      setCities([]);
    }
  }, [formData.residenceCountry, patient]);

  // Cargar ciudades cuando cambie el estado
  useEffect(() => {
    if (formData.residenceCountry && formData.state) {
      const stateCities = LocationService.getCities(formData.residenceCountry, formData.state);
      setCities(stateCities);
      
      // Solo resetear si no estamos editando o si cambió el estado
      if (!patient || formData.state !== LocationService.getStateCodeByName(
        formData.residenceCountry, 
        patient.state || ''
      )) {
        setFormData(prev => ({ ...prev, municipality: '', postalCode: '' }));
      }
    }
  }, [formData.residenceCountry, formData.state, patient]);

  // Obtener código postal automáticamente cuando cambie la ciudad
  useEffect(() => {
    const fetchPostalCode = async () => {
      if (formData.municipality && formData.residenceCountry) {
        setIsLoadingPostalCode(true);
        try {
          const postalCode = await LocationService.getPostalCode(formData.municipality, formData.residenceCountry);
          if (postalCode) {
            setFormData(prev => ({ ...prev, postalCode }));
          }
        } catch (error) {
          console.error('Error al obtener el código postal:', error);
        } finally {
          setIsLoadingPostalCode(false);
        }
      }
    };

    fetchPostalCode();
  }, [formData.municipality, formData.residenceCountry]);

  // Función para obtener el nombre completo del país
  const getCountryDisplayName = (countryCode: string) => {
    if (!countryCode) return '';
    const country = LocationService.getCountryByCode(countryCode);
    return country ? country.label : countryCode;
  };

  // Función para obtener el nombre completo del estado
  const getStateDisplayName = (stateCode: string) => {
    if (!stateCode || !formData.residenceCountry) return '';
    const state = LocationService.getStateByCode(formData.residenceCountry, stateCode);
    return state ? state.label : stateCode;
  };

  // Función para obtener el nombre completo de la ciudad
  const getCityDisplayName = (cityCode: string) => {
    if (!cityCode || !formData.residenceCountry || !formData.state) return '';
    const city = LocationService.getCities(formData.residenceCountry, formData.state)
      .find(c => c.value === cityCode);
    return city ? city.label : cityCode;
  };

  const handleInputChange = (field: keyof PatientFormData, value: any) => {
    console.log(`🔄 Cambio en campo ${field}:`, { valorAnterior: formData[field], nuevoValor: value });
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PatientFormData> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'El nombre es requerido';
    if (!formData.lastName.trim()) newErrors.lastName = 'El apellido es requerido';
    if (!formData.idType.trim()) newErrors.idType = 'El tipo de identificación es requerido';
    if (!formData.idNumber.trim()) newErrors.idNumber = 'El número de identificación es requerido';
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';

    // Validaciones condicionales
    if (formData.hasInsurance && !formData.insuranceName.trim()) {
      newErrors.insuranceName = 'El nombre del seguro es requerido';
    }

    if (formData.hasCaretaker) {
      if (!formData.caretakerFirstName.trim()) newErrors.caretakerFirstName = 'El nombre del cuidador es requerido';
      if (!formData.caretakerPhone.trim()) newErrors.caretakerPhone = 'El teléfono del cuidador es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Convertir códigos ISO a nombres completos antes de enviar
      const dataToSave = {
        ...formData,
        // Convertir códigos de localización a nombres completos
        residenceCountry: formData.residenceCountry ? LocationService.getCountryNameByCode(formData.residenceCountry) : '',
        state: formData.state ? LocationService.getStateNameByCode(formData.residenceCountry, formData.state) : '',
        municipality: formData.municipality ? formData.municipality : '', // La ciudad ya es el nombre completo
        birthCountry: formData.birthCountry ? LocationService.getCountryNameByCode(formData.birthCountry) : ''
      };
      

      
      onSave(dataToSave);
    }
  };

  const renderTextField = (
    field: keyof PatientFormData,
    label: string,
    type: string = 'text',
    placeholder?: string,
    required: boolean = false
  ) => {
    const fieldValue = formData[field];
    console.log(`🎯 Renderizando campo ${field}:`, { valor: fieldValue, tipo: typeof fieldValue });
    
    return (
      <div className="col-span-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          value={typeof fieldValue === 'string' ? fieldValue : ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors[field] ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors[field] && (
          <p className="text-red-500 text-xs mt-1">{errors[field] as string}</p>
        )}
      </div>
    );
  };

  const renderSelect = (
    field: keyof PatientFormData,
    label: string,
    options: { value: string; label: string }[],
    required: boolean = false
  ) => {
    const value = typeof formData[field] === 'string' ? formData[field] as string : '';
    return (
      <div className="col-span-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors[field] ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Seleccionar...</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Mostrar nombre completo del valor seleccionado */}
        {value && (
          <p className="text-blue-600 text-xs mt-1">
            Seleccionado: {
              field === 'residenceCountry' ? getCountryDisplayName(value) :
              field === 'state' ? getStateDisplayName(value) :
              field === 'municipality' ? getCityDisplayName(value) :
              value
            }
          </p>
        )}
        {errors[field] && (
          <p className="text-red-500 text-xs mt-1">{errors[field] as string}</p>
        )}
      </div>
    );
  };

  const renderPhoneInput = (
    field: keyof PatientFormData,
    label: string,
    required: boolean = false
  ) => {
    const value = typeof formData[field] === 'string' ? formData[field] as string : '';
    return (
      <div className="col-span-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <PhoneInput
          international
          defaultCountry="CO"
          value={value}
          onChange={(value) => handleInputChange(field, value || '')}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors[field] ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors[field] && (
          <p className="text-red-500 text-xs mt-1">{errors[field] as string}</p>
        )}
      </div>
    );
  };

  const renderFileField = (
    field: keyof PatientFormData,
    label: string,
    accept: string
  ) => (
    <div className="col-span-1">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="file"
        accept={accept}
        onChange={(e) => handleInputChange(field, e.target.files?.[0] || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {(() => {
        const file = formData[field] as File;
        return file ? (
          <p className="text-green-600 text-xs mt-1">Archivo seleccionado: {file.name}</p>
        ) : null;
      })()}
    </div>
  );

  const renderCheckbox = (
    field: keyof PatientFormData,
    label: string,
    description?: string
  ) => {
    const checked = typeof formData[field] === 'boolean' ? formData[field] as boolean : false;
    return (
      <div className="col-span-1">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => handleInputChange(field, e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm font-medium text-gray-700">
            {label}
          </label>
        </div>
        {description && (
          <p className="text-gray-500 text-xs mt-1 ml-6">{description}</p>
        )}
      </div>
    );
  };

  // Debug: mostrar el estado actual del formData
  console.log('🎭 Renderizando formulario con formData:', formData);
  
  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Paciente' : 'Crear Nuevo Paciente'}
        </h2>
        <p className="text-gray-600 mt-2">
          {isEditing ? 'Modifica la información del paciente' : 'Completa la información del nuevo paciente'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Personal */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Información Personal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderTextField('firstName', 'Nombre', 'text', 'Primer nombre', true)}
            {renderTextField('lastName', 'Apellido', 'text', 'Primer apellido', true)}
            {renderTextField('birthDate', 'Fecha de Nacimiento', 'date')}
            {renderSelect('birthCountry', 'País de Nacimiento', countries)}
            {renderSelect('residenceCountry', 'País de Residencia', countries)}
            {renderSelect('gender', 'Género', [
              { value: 'masculino', label: 'Masculino' },
              { value: 'femenino', label: 'Femenino' },
              { value: 'otro', label: 'Otro' }
            ])}
          </div>
        </div>

        {/* Identificación */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Identificación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderSelect('idType', 'Tipo de Identificación', [
              { value: 'CC', label: 'Cédula de Ciudadanía' },
              { value: 'CE', label: 'Cédula de Extranjería' },
              { value: 'TI', label: 'Tarjeta de Identidad' },
              { value: 'PP', label: 'Pasaporte' },
              { value: 'NIT', label: 'NIT' }
            ], true)}
            {renderTextField('idNumber', 'Número de Identificación', 'text', 'Número', true)}
            {renderFileField('documento_identidad', 'Documento de Identidad', 'PDF, JPG, PNG')}
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Información de Contacto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderPhoneInput('phone', 'Teléfono', true)}
            {renderTextField('email', 'Email', 'email', 'paciente@email.com')}
          </div>
        </div>

        {/* Ubicación */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Ubicación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderSelect('residenceCountry', 'País', countries)}
            {renderSelect('state', 'Departamento/Estado', states)}
            {renderSelect('municipality', 'Municipio/Ciudad', cities)}
            {renderTextField('address', 'Dirección', 'text', 'Dirección completa')}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código Postal
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  placeholder="Se obtiene automáticamente"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.postalCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                  readOnly={Boolean(formData.municipality && formData.residenceCountry)}
                />
                {isLoadingPostalCode && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {formData.postalCode && (
                <p className="text-green-600 text-xs mt-1">
                  ✅ Código postal obtenido automáticamente
                </p>
              )}
              {errors.postalCode && (
                <p className="text-red-500 text-xs mt-1">{errors.postalCode}</p>
              )}
            </div>
          </div>
        </div>

        {/* Información Médica */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Heart className="h-5 w-5 mr-2" />
            Información Médica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderTextField('hospital', 'Hospital', 'text', 'Nombre del hospital')}
                {renderFileField('documento_egreso', 'Documento de Egreso', 'PDF, JPG, PNG')}
                {renderCheckbox('necesitaEmergencia', 'Necesita atención de emergencia')}
                {formData.necesitaEmergencia && (
                  <div className="col-span-2">
                    {renderTextField('motivoEmergencia', 'Motivo de Emergencia', 'textarea', 'Describa el motivo')}
                  </div>
                )}
          </div>
        </div>

        {/* Seguro */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Información de Seguro
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderCheckbox('hasInsurance', 'Tiene seguro médico')}
            {formData.hasInsurance && (
              <>
                                   {renderTextField('insuranceName', 'Nombre del Seguro', 'text', 'Nombre de la aseguradora')}
                   {renderTextField('policyNumber', 'Número de Póliza', 'text', 'Número de póliza')}
              </>
            )}
          </div>
        </div>

        {/* Cuidador */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Información del Cuidador
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderCheckbox('hasCaretaker', 'Tiene cuidador')}
            {formData.hasCaretaker && (
              <>
                                   {renderTextField('caretakerFirstName', 'Nombre del Cuidador', 'text', 'Primer nombre')}
                   {renderTextField('caretakerLastName', 'Apellido del Cuidador', 'text', 'Primer apellido')}
                   {renderTextField('caretakerRelationship', 'Relación', 'text', 'Padre, madre, hijo, etc.')}
                   {renderPhoneInput('caretakerPhone', 'Teléfono del Cuidador')}
                   {renderTextField('caretakerEmail', 'Email del Cuidador', 'email', 'cuidador@email.com')}
              </>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="h-4 w-4 inline mr-2" />
            {isEditing ? 'Actualizar' : 'Crear'} Paciente
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;
