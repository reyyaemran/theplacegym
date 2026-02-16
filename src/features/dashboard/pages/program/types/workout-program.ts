export type BodyPart =
  | "FULL-BODY"
  | "UPPER-BODY"
  | "LOWER-BODY"
  | "ARM"
  | "SHOULDER"
  | "BACK"
  | "CHEST"
  | "LEGS"
  | "GLUTES"
  | "CORE";

/** Selected body parts (multiple checkboxes) */
export type BodyPartSelection = Partial<Record<BodyPart, boolean>>;

export interface WorkoutExercise {
  id: string;
  exercise: string;
  resistance: string;
  setRepDuration: string;
  tempo: string;
  load: string;
  notes: string;
}

export interface WorkoutProgram {
  id?: string;
  client: string;
  level: string;
  goals: string;
  week: string;
  bodyParts: BodyPartSelection;
  warmUp: WorkoutExercise[];
  exercises: WorkoutExercise[];
  cooldown: WorkoutExercise[];
  notesFeedback: string;
  trainerName?: string;
  trainerId?: string; // Staff ID - for scoping: trainers see only their own, admin sees all
  createdAt?: string;
}
