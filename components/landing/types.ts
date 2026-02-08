export interface LocationState {
  address: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  phone: string;
}

export interface LandingPageState {
  pickup: LocationState;
  dropoff: LocationState;
  packageDetails: string;
}
