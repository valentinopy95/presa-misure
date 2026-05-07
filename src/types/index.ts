export type UserRole = 'builder' | 'sales' | 'surveyor';

export type OpeningStyle =
  // Finestre
  | 'window_fixed'
  | 'window_single'
  | 'window_double'
  | 'window_sliding'
  | 'window_tilt_turn'
  // Porte
  | 'door_single'
  | 'door_sliding'
  | 'door_entrance'
  // Persiane
  | 'shutter_single'
  | 'shutter_double'
  // Monoblocchi con tapparella
  | 'roller_blind'
  // Controtelaio (unico tipo, a U)
  | 'subframe_window'
  // Zanzariere
  | 'mosquito_fixed'
  | 'mosquito_rollup'
  | 'mosquito_lateral'
  // Personalizzata (disegno libero)
  | 'custom'
export type OpeningSide = 'left' | 'right' | 'center' | 'center-left' | 'center-right' | 'top' | 'bottom' | 'both';

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
  hasFascia: boolean | null;       // fascia centrale (solo porte)
  hasSoglia: boolean | null;       // soglia ribassata (solo porte)
  hasBattente: boolean | null;     // traverso inferiore telaio (solo porte)
  hasFermavetro: boolean | null;   // fermavetro anta (finestre/porte con vetro a fermavetro)
  sopraluce: boolean;              // pannello fisso sopra l'infisso
  sopraluceHeight: number | null;  // altezza luce sopraluce (mm)
  blindType: 'cintino' | 'motore' | null; // tipo azionamento (solo monoblocco)
  outOfSquare: boolean;                   // vano fuori squadra
  heightLeft: number | null;              // altezza lato sinistro (mm)
  heightRight: number | null;             // altezza lato destro (mm)
  style: OpeningStyle | null;
  profileSeries: string | null;    // serie profilo (es. EKOS 100, EKU 66 TT)
  catalogSeriesId: string | null;  // id serie catalogo per calcolo taglio
  glassType: string | null;        // tipo vetro (es. Doppio 4/16/4 Ar)
  photos: Photo[];
  textNote: string;
  audioNote: AudioNote | null;
  sketchData: string | null;   // SVG path data per disegno libero (custom)
  viewSide: 'interno' | 'esterno' | null; // lato da cui si misura
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
  clientPhone: string;
  address: string;
  gps: GpsCoords | null;
  openings: Opening[];
  parentId: string | null;
  catalogSeriesId: string | null;  // serie profilo per distinta di taglio
  createdAt: string;
  updatedAt: string;
}

export type RootStackParamList = {
  Home: undefined;
  SavedProjects: undefined;
  Project: { projectId: string };
  Measurement: { projectId: string; openingId?: string };
  StylePicker: { projectId: string; openingId: string };
  Document: { projectId: string };
  Materials: { projectId: string };
  MaterialsProjects: undefined;
  CuttingProjects: undefined;
  CuttingList: { projectId: string };
  Settings: undefined;
  Account:  undefined;
  DuplicateProject: { projectId: string };
  Help:        undefined;
  Stats:       undefined;
  CompanySetup: undefined;
  Paywall: undefined;
  SeriesEditor:  { seriesId?: string };
  VariantEditor: { seriesId: string; variantId?: string; leafCount?: number };
};
