export type UserRole = 'builder' | 'sales' | 'surveyor';

export type OpeningStyle =
  // Finestre
  | 'window_single'
  | 'window_double'
  | 'window_sliding'
  | 'window_tilt_turn'
  // Porte
  | 'door_single'
  | 'door_double'
  | 'door_sliding'
  | 'door_french'
  | 'door_bifold'
  // Persiane
  | 'shutter_single'
  | 'shutter_double'
  // Monoblocchi con tapparella
  | 'roller_blind'
  // Controtelaio (unico tipo, a U)
  | 'subframe_window'
export type OpeningSide = 'left' | 'right' | 'center' | 'center-left' | 'center-right' | 'top' | 'bottom';

export interface AudioNote {
  uri: string;
  duration: number;
  createdAt: string;
}

export interface Photo {
  id: string;
  uri: string;
  createdAt: string;
}

export interface Opening {
  id: string;
  name: string;
  width: number | null;       // mm luce
  height: number | null;      // mm luce
  boxHeight: number | null;   // mm altezza cassonetto (solo roller_blind)
  leafCount: number | null;   // numero ante
  openingSide: OpeningSide | null; // lato apertura
  style: OpeningStyle | null;
  profileSeries: string | null;   // serie profilo (es. EKOS 100, EKU 66 TT)
  glassType: string | null;        // tipo vetro (es. Doppio 4/16/4 Ar)
  photos: Photo[];
  textNote: string;
  audioNote: AudioNote | null;
  createdAt: string;
  updatedAt: string;
}

export interface GpsCoords {
  latitude: number;
  longitude: number;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  address: string;
  gps: GpsCoords | null;
  openings: Opening[];
  createdAt: string;
  updatedAt: string;
}

export type RootStackParamList = {
  Home: undefined;
  SavedProjects: undefined;
  Catalog: undefined;
  Project: { projectId: string };
  Measurement: { projectId: string; openingId?: string };
  StylePicker: { projectId: string; openingId: string };
  Document: { projectId: string };
  Materials: { projectId: string };
  Settings: undefined;
};
