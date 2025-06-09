export interface BacklogItem {
  Number: string;
  Created: string;
  Description: string;
  RequestedBy: string;
  Priority: string;
  Status: string;
  Category: string;
  Team: string;
  AssignedTo: string;
  LastUpdate: string;
  UpdatedBy: string;
  BusinessValue: string;
  StoryPoints: number;
  Sprint: string;
  Release: string;
  DueDate: string;
}

export interface BacklogStats {
  totalByCategory: Record<string, number>;
  totalByTeam: Record<string, number>;
  totalByPriority: Record<string, number>;
  totalByStatus: Record<string, number>;
  totalStoryPoints: number;
  averageStoryPoints: number;
  topRequesters: Array<{ requester: string; count: number }>;
  upcomingDueDates: Array<{ item: BacklogItem; daysUntilDue: number }>;
}