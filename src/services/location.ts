import { StorageService } from '@utils/storage';
import { ApiService } from '@utils/api';
import { CONFIG } from '@constants/config';
import { retry } from '@utils/helpers';
import type { 
  Coordinates, 
  LocationState, 
  LocationError, 
  StorageKeys 
} from '@app-types';

// ============================================================
// LOCATION SERVICE - Geolocation with Fallback
// ============================================================

export class LocationService {
  private state: LocationState;
  private subscribers: Array<(state: LocationState) => void> = [];

  constructor() {
    this.state = {
      coords: StorageService.get<Coordinates>(CONFIG.STORAGE_KEYS.COORDS),
      locationName: StorageService.get<string>(
        CONFIG.STORAGE_KEYS.LOC_NAME, 
        CONFIG.DEFAULTS.LOC_NAME
      ) || CONFIG.DEFAULTS.LOC_NAME,
      loading: false,
      error: null
    };
  }

  /**
   * Get current state
   */
  getState(): LocationState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: LocationState) => void): () => void {
    this.subscribers.push(callback);
    callback(this.getState());
    
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Update state and notify subscribers
   */
  private setState(updates: Partial<LocationState>): void {
    this.state = { ...this.state, ...updates };
    this.subscribers.forEach(cb => cb(this.getState()));
  }

  /**
   * Get user location via browser geolocation API
   */
  async detectLocation(): Promise<void> {
    if (!navigator.geolocation) {
      this.setState({
        error: {
          type: 'GEO_UNAVAILABLE',
          message: 'Geolocation not supported'
        }
      });
      return;
    }

    this.setState({ loading: true, error: null });

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (err) => {
            // Map geolocation errors
            const errorMap: Record<number, LocationError['type']> = {
              1: 'GEO_PERMISSION_DENIED',
              2: 'GEO_UNAVAILABLE',
              3: 'GEO_TIMEOUT'
            };
            
            reject({
              type: errorMap[err.code] || 'GEO_UNAVAILABLE',
              message: err.message
            });
          },
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000 // Accept positions up to 1 minute old
          }
        );
      });

      const coords: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Save coordinates
      StorageService.set(CONFIG.STORAGE_KEYS.COORDS, coords);
      
      // Get location name via reverse geocoding
      let locationName: string;
      try {
        locationName = await retry(
          () => ApiService.reverseGeocode(coords.lat, coords.lng),
          2,
          500
        );
        StorageService.set(CONFIG.STORAGE_KEYS.LOC_NAME, locationName);
      } catch (e) {
        // Fallback to coordinates
        locationName = `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`;
      }

      this.setState({
        coords,
        locationName,
        loading: false,
        error: null
      });

    } catch (error) {
      const errorInfo = error as LocationError;
      
      this.setState({
        loading: false,
        error: errorInfo
      });

      // If no coords saved, use default
      if (!this.state.coords) {
        this.setState({
          coords: CONFIG.DEFAULTS.COORDS,
          locationName: CONFIG.DEFAULTS.LOC_NAME
        });
      }
    }
  }

  /**
   * Search for location by name
   */
  async searchLocation(query: string): Promise<Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>> {
    if (!query.trim()) {
      return [];
    }

    try {
      const results = await ApiService.searchLocation(query, 5);
      return results;
    } catch (e) {
      console.error('Location search failed:', e);
      return [];
    }
  }

  /**
   * Set location manually
   */
  setManualLocation(coords: Coordinates, name: string): void {
    StorageService.set(CONFIG.STORAGE_KEYS.COORDS, coords);
    StorageService.set(CONFIG.STORAGE_KEYS.LOC_NAME, name);
    
    this.setState({
      coords,
      locationName: name,
      error: null
    });
  }

  /**
   * Check permission status (if supported)
   */
  async checkPermission(): Promise<PermissionState | null> {
    if (!navigator.permissions) {
      return null;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get location for prayer times calculation
   * Returns default if no location set
   */
  getLocationForPrayerTimes(): { coords: Coordinates; locationName: string } {
    return {
      coords: this.state.coords || CONFIG.DEFAULTS.COORDS,
      locationName: this.state.locationName || CONFIG.DEFAULTS.LOC_NAME
    };
  }
}

// Export singleton instance
export const locationService = new LocationService();
