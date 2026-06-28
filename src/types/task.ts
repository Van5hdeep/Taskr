export type UrgencyLevel = "Immediate" | "High" | "Medium" | "Low";

export interface SubTask {
  id: string;
  label: string;
  completed: boolean;
}

export interface ApiSubTask {
  label: string;
  completed: boolean;
}

export interface ApiTask {
  id: string;
  title: string;
  rawInput: string;
  deadline: string;
  urgencyScore: number;
  subTasks: ApiSubTask[];
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  deadline: Date;
  urgency: UrgencyLevel;
  subTasks: SubTask[];
  actionLabel: string;
  isCompleted: boolean;
  rawInput: string;
  urgencyScore: number;
}
