import { Country, State, City } from 'country-state-city';

export interface CountryOption {
  value: string;
  label: string;
  code: string;
}

export interface StateOption {
  value: string;
  label: string;
  code: string;
}

export interface CityOption {
  value: string;
  label: string;
  code: string;
}

export class LocationService {
  // Obtener todos los países
  static getCountries(): CountryOption[] {
    return Country.getAllCountries().map(country => ({
      value: country.isoCode,
      label: country.name,
      code: country.isoCode
    }));
  }

  // Obtener estados/provincias de un país
  static getStates(countryCode: string): StateOption[] {
    return State.getStatesOfCountry(countryCode).map(state => ({
      value: state.isoCode,
      label: state.name,
      code: state.isoCode
    }));
  }

  // Obtener ciudades de un estado
  static getCities(countryCode: string, stateCode: string): CityOption[] {
    return City.getCitiesOfState(countryCode, stateCode).map(city => ({
      value: city.name,
      label: city.name,
      code: city.name
    }));
  }

  // Obtener país por código
  static getCountryByCode(countryCode: string): CountryOption | null {
    const country = Country.getCountryByCode(countryCode);
    if (!country) return null;
    
    return {
      value: country.isoCode,
      label: country.name,
      code: country.isoCode
    };
  }

  // Obtener estado por código
  static getStateByCode(countryCode: string, stateCode: string): StateOption | null {
    const state = State.getStateByCodeAndCountry(stateCode, countryCode);
    if (!state) return null;
    
    return {
      value: state.isoCode,
      label: state.name,
      code: state.isoCode
    };
  }

  // Obtener código postal dinámicamente
  static async getPostalCode(placename: string, country: string): Promise<string | null> {
    try {
      // Usar la URL completa de la API
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/postalCode?placename=${encodeURIComponent(placename)}&country=${country}`);
      const data = await response.json();
      
      if (data.postalCodes && data.postalCodes.length > 0) {
        return data.postalCodes[0].postalCode;
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo código postal:', error);
      return null;
    }
  }

  // Obtener nombre del país por código
  static getCountryNameByCode(countryCode: string): string {
    const country = Country.getCountryByCode(countryCode);
    return country ? country.name : countryCode;
  }

  // Obtener nombre del estado por código
  static getStateNameByCode(countryCode: string, stateCode: string): string {
    const state = State.getStateByCodeAndCountry(stateCode, countryCode);
    return state ? state.name : stateCode;
  }

  // Obtener nombre de la ciudad por código
  static getCityNameByCode(countryCode: string, stateCode: string, cityCode: string): string {
    const city = City.getCitiesOfState(countryCode, stateCode).find(c => c.name === cityCode);
    return city ? city.name : cityCode;
  }



  // Función para obtener código del país por nombre
  static getCountryCodeByName(countryName: string): string {
    const countries = Country.getAllCountries();
    const country = countries.find(c => c.name === countryName);
    return country ? country.isoCode : countryName;
  }

  // Función para obtener código del estado por nombre
  static getStateCodeByName(countryCode: string, stateName: string): string {
    const states = State.getStatesOfCountry(countryCode);
    const state = states.find(s => s.name === stateName);
    return state ? state.isoCode : stateName;
  }

  // Función para obtener código de la ciudad por nombre
  static getCityCodeByName(countryCode: string, stateCode: string, cityName: string): string {
    const cities = City.getCitiesOfState(countryCode, stateCode);
    const city = cities.find(c => c.name === cityName);
    return city ? city.name : cityName; // Las ciudades ya usan nombres como códigos
  }
}
