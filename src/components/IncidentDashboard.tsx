import { Incident } from '../types/incident';

interface IncidentDashboardProps {
  incidents: Incident[];
  onBack: () => void;
  startDate: string;
  endDate: string;
} 