export interface Incident {
  Number: string;
  ShortDescription: string;
  Priority: string;
  State: string;
  Category: string;
  Subcategory?: string;
  Caller: string;
  AssignmentGroup: string;
  AssignedTo: string;
  Opened: string;
  Updated: string;
  Description?: string;
  UpdatedBy: string;
  BusinessImpact: string;
  ResponseTime: string;
  Location?: string;
  CommentsAndWorkNotes?: string;
  StringAssociado?: string;
  FuncaoAssociada?: string;
  Impact?: string;
  Urgency?: string;
  ResolutionNotes?: string;
  ResolutionCode?: string;
  ResolutionCategory?: string;
  ResolutionSubcategory?: string;
  ResolutionTime?: string;
  BusinessService?: string;
  ConfigurationItem?: string;
  Company?: string;
  Department?: string;
  CallerEmail?: string;
  CallerPhone?: string;
  CallerLocation?: string;
  CallerDepartment?: string;
  CallerCompany?: string;
  CallerManager?: string;
  CallerManagerEmail?: string;
  CallerManagerPhone?: string;
  CallerManagerLocation?: string;
  CallerManagerDepartment?: string;
  CallerManagerCompany?: string;
  CallerManagerTitle?: string;
  CallerTitle?: string;
  Closed?: string;
}

export interface IncidentStats {
  totalByCategory: Record<string, number>;
  totalBySubcategory: Record<string, number>;
  totalByAssignmentGroup: Record<string, number>;
  totalByPriority: Record<string, number>;
  topCallers: Array<{ caller: string; count: number }>;
  slaCompliance: {
    total: number;
    compliant: number;
    percentage: number;
  };
}