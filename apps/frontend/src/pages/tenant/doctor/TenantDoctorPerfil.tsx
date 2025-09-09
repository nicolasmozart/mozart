import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  Briefcase, 
  Award,
  Edit,
  Save,
  X,
  Camera,
  Shield,
  Calendar
} from 'lucide-react';
import { useTenantAuth } from '../../../contexts/TenantAuthContext';
import { useTenant } from '../../../contexts/TenantContext';

interface PerfilDoctor {
  _id: string;
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    fechaNacimiento: string;
    genero: 'masculino' | 'femenino' | 'otro';
    direccion: string;
    ciudad: string;
    codigoPostal: string;
    pais: string;
  };
  profesional: {
    especialidad: string;
    numeroLicencia: string;
    universidad: string;
    anoGraduacion: number;
    experienciaAnos: number;
    biografia: string;
    idiomas: string[];
    certificaciones: string[];
  };
  laboral: {
    hospital: string;
    departamento: string;
    cargo: string;
    fechaInicio: string;
    horarioTrabajo: string;
    tipoContrato: 'tiempo_completo' | 'tiempo_parcial' | 'consultor';
  };
  contacto: {
    emailSecundario: string;
    telefonoSecundario: string;
    redesSociales: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
    };
  };
}

const TenantDoctorPerfil: React.FC = () => {
  const { user } = useTenantAuth();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [perfil, setPerfil] = useState<PerfilDoctor>({
    _id: '1',
    personal: {
      firstName: 'Felipe',
      lastName: 'Álvarez',
      email: 'felipealvarez@gmail.com',
      phone: '+57 300 123 4567',
      fechaNacimiento: '1985-03-15',
      genero: 'masculino',
      direccion: 'Calle 123 #45-67',
      ciudad: 'Bogotá',
      codigoPostal: '110111',
      pais: 'Colombia'
    },
    profesional: {
      especialidad: 'Cardiología',
      numeroLicencia: 'MED-12345-COL',
      universidad: 'Universidad Nacional de Colombia',
      anoGraduacion: 2010,
      experienciaAnos: 15,
      biografia: 'Médico cardiólogo con más de 15 años de experiencia en el diagnóstico y tratamiento de enfermedades cardiovasculares. Especializado en cardiología intervencionista y ecocardiografía.',
      idiomas: ['Español', 'Inglés', 'Portugués'],
      certificaciones: ['Cardiología Intervencionista', 'Ecocardiografía Avanzada', 'Reanimación Cardiopulmonar Avanzada']
    },
    laboral: {
      hospital: 'Hospital Universitario San Ignacio',
      departamento: 'Cardiología',
      cargo: 'Cardiólogo Intervencionista',
      fechaInicio: '2012-01-15',
      horarioTrabajo: 'Lunes a Viernes 8:00 AM - 6:00 PM',
      tipoContrato: 'tiempo_completo'
    },
    contacto: {
      emailSecundario: 'dr.alvarez@hospital.edu.co',
      telefonoSecundario: '+57 1 234 5678',
      redesSociales: {
        linkedin: 'linkedin.com/in/felipealvarez',
        twitter: '@drfelipealvarez'
      }
    }
  });

  const [perfilEditado, setPerfilEditado] = useState<PerfilDoctor>(perfil);

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const iniciarEdicion = () => {
    setPerfilEditado(perfil);
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setPerfilEditado(perfil);
    setEditando(false);
  };

  const actualizarCampo = (seccion: keyof PerfilDoctor, campo: string, valor: any) => {
    setPerfilEditado(prev => ({
      ...prev,
      [seccion]: {
        ...prev[seccion],
        [campo]: valor
      }
    }));
  };

  const actualizarCampoAnidado = (seccion: keyof PerfilDoctor, subseccion: string, campo: string, valor: any) => {
    setPerfilEditado(prev => ({
      ...prev,
      [seccion]: {
        ...prev[seccion],
        [subseccion]: {
          ...(prev[seccion] as any)[subseccion],
          [campo]: valor
        }
      }
    }));
  };

  const agregarIdioma = () => {
    const nuevoIdioma = prompt('Ingrese el nuevo idioma:');
    if (nuevoIdioma && nuevoIdioma.trim()) {
      setPerfilEditado(prev => ({
        ...prev,
        profesional: {
          ...prev.profesional,
          idiomas: [...prev.profesional.idiomas, nuevoIdioma.trim()]
        }
      }));
    }
  };

  const eliminarIdioma = (index: number) => {
    setPerfilEditado(prev => ({
      ...prev,
      profesional: {
        ...prev.profesional,
        idiomas: prev.profesional.idiomas.filter((_, i) => i !== index)
      }
    }));
  };

  const agregarCertificacion = () => {
    const nuevaCertificacion = prompt('Ingrese la nueva certificación:');
    if (nuevaCertificacion && nuevaCertificacion.trim()) {
      setPerfilEditado(prev => ({
        ...prev,
        profesional: {
          ...prev.profesional,
          certificaciones: [...prev.profesional.certificaciones, nuevaCertificacion.trim()]
        }
      }));
    }
  };

  const eliminarCertificacion = (index: number) => {
    setPerfilEditado(prev => ({
      ...prev,
      profesional: {
        ...prev.profesional,
        certificaciones: prev.profesional.certificaciones.filter((_, i) => i !== index)
      }
    }));
  };

  const guardarPerfil = async () => {
    setSaving(true);
    try {
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1500));
      setPerfil(perfilEditado);
      setEditando(false);
      console.log('Perfil guardado:', perfilEditado);
      // Aquí se enviarían los datos al backend
    } catch (error) {
      console.error('Error guardando perfil:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  const datosActuales = editando ? perfilEditado : perfil;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            <User className="inline-block mr-2 h-6 w-6 text-primary-600" />
            Mi Perfil Profesional
          </h1>
          <p className="text-neutral-600">
            Gestiona tu información personal y profesional
          </p>
        </div>
        
        <div className="flex space-x-3 mt-4 md:mt-0">
          {!editando ? (
            <button
              onClick={iniciarEdicion}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Editar Perfil</span>
            </button>
          ) : (
            <>
              <button
                onClick={cancelarEdicion}
                className="bg-neutral-600 text-white px-4 py-2 rounded-lg hover:bg-neutral-700 flex items-center space-x-2 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Cancelar</span>
              </button>
              <button
                onClick={guardarPerfil}
                disabled={saving}
                className="bg-success-600 text-white px-4 py-2 rounded-lg hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Información Personal */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-primary-100 rounded-full">
            <User className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">Información Personal</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={datosActuales.personal.firstName}
              onChange={(e) => actualizarCampo('personal', 'firstName', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Apellido
            </label>
            <input
              type="text"
              value={datosActuales.personal.lastName}
              onChange={(e) => actualizarCampo('personal', 'lastName', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={datosActuales.personal.email}
              onChange={(e) => actualizarCampo('personal', 'email', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={datosActuales.personal.phone}
              onChange={(e) => actualizarCampo('personal', 'phone', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              value={datosActuales.personal.fechaNacimiento}
              onChange={(e) => actualizarCampo('personal', 'fechaNacimiento', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Género
            </label>
            <select
              value={datosActuales.personal.genero}
              onChange={(e) => actualizarCampo('personal', 'genero', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            >
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={datosActuales.personal.direccion}
              onChange={(e) => actualizarCampo('personal', 'direccion', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                value={datosActuales.personal.ciudad}
                onChange={(e) => actualizarCampo('personal', 'ciudad', e.target.value)}
                disabled={!editando}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Código Postal
              </label>
              <input
                type="text"
                value={datosActuales.personal.codigoPostal}
                onChange={(e) => actualizarCampo('personal', 'codigoPostal', e.target.value)}
                disabled={!editando}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                País
              </label>
              <input
                type="text"
                value={datosActuales.personal.pais}
                onChange={(e) => actualizarCampo('personal', 'pais', e.target.value)}
                disabled={!editando}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Información Profesional */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-success-100 rounded-full">
            <GraduationCap className="h-6 w-6 text-success-600" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">Información Profesional</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Especialidad
            </label>
            <input
              type="text"
              value={datosActuales.profesional.especialidad}
              onChange={(e) => actualizarCampo('profesional', 'especialidad', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Número de Licencia
            </label>
            <input
              type="text"
              value={datosActuales.profesional.numeroLicencia}
              onChange={(e) => actualizarCampo('profesional', 'numeroLicencia', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Universidad
            </label>
            <input
              type="text"
              value={datosActuales.profesional.universidad}
              onChange={(e) => actualizarCampo('profesional', 'universidad', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Año de Graduación
            </label>
            <input
              type="number"
              value={datosActuales.profesional.anoGraduacion}
              onChange={(e) => actualizarCampo('profesional', 'anoGraduacion', parseInt(e.target.value))}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Años de Experiencia
            </label>
            <input
              type="number"
              value={datosActuales.profesional.experienciaAnos}
              onChange={(e) => actualizarCampo('profesional', 'experienciaAnos', parseInt(e.target.value))}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Biografía
          </label>
          <textarea
            value={datosActuales.profesional.biografia}
            onChange={(e) => actualizarCampo('profesional', 'biografia', e.target.value)}
            disabled={!editando}
            rows={4}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
          />
        </div>
        
        {/* Idiomas */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-neutral-700">
              Idiomas
            </label>
            {editando && (
              <button
                onClick={agregarIdioma}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                + Agregar Idioma
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {datosActuales.profesional.idiomas.map((idioma, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-primary-100 text-primary-800 px-3 py-1 rounded-full"
              >
                <span className="text-sm">{idioma}</span>
                {editando && (
                  <button
                    onClick={() => eliminarIdioma(index)}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Certificaciones */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-neutral-700">
              Certificaciones
            </label>
            {editando && (
              <button
                onClick={agregarCertificacion}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                + Agregar Certificación
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {datosActuales.profesional.certificaciones.map((certificacion, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-success-100 text-success-800 px-3 py-1 rounded-full"
              >
                <span className="text-sm">{certificacion}</span>
                {editando && (
                  <button
                    onClick={() => eliminarCertificacion(index)}
                    className="text-success-600 hover:text-success-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Información Laboral */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-warning-100 rounded-full">
            <Briefcase className="h-6 w-6 text-warning-600" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">Información Laboral</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Hospital/Institución
            </label>
            <input
              type="text"
              value={datosActuales.laboral.hospital}
              onChange={(e) => actualizarCampo('laboral', 'hospital', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Departamento
            </label>
            <input
              type="text"
              value={datosActuales.laboral.departamento}
              onChange={(e) => actualizarCampo('laboral', 'departamento', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Cargo
            </label>
            <input
              type="text"
              value={datosActuales.laboral.cargo}
              onChange={(e) => actualizarCampo('laboral', 'cargo', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={datosActuales.laboral.fechaInicio}
              onChange={(e) => actualizarCampo('laboral', 'fechaInicio', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Horario de Trabajo
            </label>
            <input
              type="text"
              value={datosActuales.laboral.horarioTrabajo}
              onChange={(e) => actualizarCampo('laboral', 'horarioTrabajo', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Tipo de Contrato
            </label>
            <select
              value={datosActuales.laboral.tipoContrato}
              onChange={(e) => actualizarCampo('laboral', 'tipoContrato', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            >
              <option value="tiempo_completo">Tiempo Completo</option>
              <option value="tiempo_parcial">Tiempo Parcial</option>
              <option value="consultor">Consultor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Información de Contacto Adicional */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-medical-100 rounded-full">
            <Phone className="h-6 w-6 text-medical-600" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">Información de Contacto Adicional</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Email Secundario
            </label>
            <input
              type="email"
              value={datosActuales.contacto.emailSecundario}
              onChange={(e) => actualizarCampoAnidado('contacto', 'emailSecundario', 'emailSecundario', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Teléfono Secundario
            </label>
            <input
              type="tel"
              value={datosActuales.contacto.telefonoSecundario}
              onChange={(e) => actualizarCampoAnidado('contacto', 'telefonoSecundario', 'telefonoSecundario', e.target.value)}
              disabled={!editando}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-md font-medium text-neutral-700 mb-3">Redes Sociales</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                LinkedIn
              </label>
              <input
                type="url"
                value={datosActuales.contacto.redesSociales.linkedin || ''}
                onChange={(e) => actualizarCampoAnidado('contacto', 'redesSociales', 'linkedin', e.target.value)}
                disabled={!editando}
                placeholder="linkedin.com/in/usuario"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Twitter
              </label>
              <input
                type="text"
                value={datosActuales.contacto.redesSociales.twitter || ''}
                onChange={(e) => actualizarCampoAnidado('contacto', 'redesSociales', 'twitter', e.target.value)}
                disabled={!editando}
                placeholder="@usuario"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Facebook
              </label>
              <input
                type="url"
                value={datosActuales.contacto.redesSociales.facebook || ''}
                onChange={(e) => actualizarCampoAnidado('contacto', 'redesSociales', 'facebook', e.target.value)}
                disabled={!editando}
                placeholder="facebook.com/usuario"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDoctorPerfil;
