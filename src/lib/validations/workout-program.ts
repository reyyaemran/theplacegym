import { z } from "zod";

const workExerciseSchema = z.object({
  id: z.string().optional(),
  exercise: z.string().optional(),
  resistance: z.string().optional(),
  setRepDuration: z.string().optional(),
  tempo: z.string().optional(),
  load: z.string().optional(),
  notes: z.string().optional(),
});

export const workoutProgramSchema = z.object({
  client: z.string().min(1, "Client name is required"),
  level: z.string().optional(),
  goals: z.string().optional(),
  week: z.string().optional(),
  bodyParts: z.record(z.boolean()).optional(),
  warmUp: z.array(workExerciseSchema).optional(),
  exercises: z.array(workExerciseSchema).optional(),
  cooldown: z.array(workExerciseSchema).optional(),
  notesFeedback: z.string().optional(),
  trainerName: z.string().optional(),
  trainerId: z.string().optional(),
  createdAt: z.string().optional(),
  id: z.string().optional(),
});
