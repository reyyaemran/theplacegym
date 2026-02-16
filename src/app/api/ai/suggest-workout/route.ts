import { NextRequest, NextResponse } from "next/server";
import { generateText, getConfigError } from "@/lib/ai-provider";

interface WorkoutExerciseInput {
  exercise: string;
  resistance: string;
  setRepDuration: string;
  tempo: string;
  load: string;
  notes: string;
}

interface SuggestWorkoutRequest {
  level?: string;
  goals?: string;
  week?: string;
  bodyParts?: string[];
  clientName?: string;
  notes?: string;
}

function parseWorkoutResponse(text: string): {
  warmUp: WorkoutExerciseInput[];
  exercises: WorkoutExerciseInput[];
  cooldown: WorkoutExerciseInput[];
} {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      warmUp: Array.isArray(parsed.warmUp) ? parsed.warmUp : [],
      exercises: Array.isArray(parsed.exercises) ? parsed.exercises : [],
      cooldown: Array.isArray(parsed.cooldown) ? parsed.cooldown : [],
    };
  } catch {
    return { warmUp: [], exercises: [], cooldown: [] };
  }
}

function normalizeExercise(ex: WorkoutExerciseInput): WorkoutExerciseInput {
  return {
    exercise: String(ex?.exercise ?? "").trim(),
    resistance: String(ex?.resistance ?? "").trim(),
    setRepDuration: String(ex?.setRepDuration ?? "").trim(),
    tempo: String(ex?.tempo ?? "").trim(),
    load: String(ex?.load ?? "").trim(),
    notes: String(ex?.notes ?? "").trim(),
  };
}

export async function POST(request: NextRequest) {
  const configError = getConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    const body: SuggestWorkoutRequest = await request.json();
    const { level = "Beginner", goals = "General Fitness", week = "1", bodyParts = [], clientName, notes } = body;

    const bodyPartsStr = bodyParts.length > 0 ? bodyParts.join(", ") : "full body";
    const bodyPartInstruction =
      bodyParts.length > 0
        ? `PRIORITIZE exercises that primarily target: ${bodyPartsStr}. The main exercises MUST focus on these muscle groups (e.g. for GLUTES: hip thrusts, glute bridge, Bulgarian split squat, sumo squat, cable kickback; for CHEST: bench press, push-ups, chest fly; etc.).`
        : "Include a balanced mix of upper and lower body exercises.";

    const clientContext = clientName ? `Client: ${clientName}.` : "";
    const notesInstruction = notes?.trim()
      ? `TRAINER NOTES (MUST FOLLOW): ${notes}
If notes mention injuries (e.g. knee, shoulder, back) or limitations, AVOID exercises that stress those areas. Use low-impact alternatives and include modifications in each exercise's notes field. E.g. "Knee injuries" = avoid deep squats, lunges, jumping; use seated leg press, machines, swimming-style movements.`
      : "";

    const systemPrompt = `You are an expert personal trainer certified in ACE (American Council on Exercise), NASM (National Academy of Sports Medicine), and ACSM (American College of Sports Medicine) methodologies. Apply evidence-based exercise science: OPT model progressions (NASM), FITT principles (ACSM), and ACE integrated fitness training.

Return ONLY valid JSON with keys: warmUp, exercises, cooldown.
Each object: exercise, resistance, setRepDuration, tempo, load, notes.
- exercise: standard name (e.g. "Barbell Back Squat", "Romanian Deadlift")
- resistance: bodyweight, dumbbells, barbell, kettlebell, bands, machine, cable
- setRepDuration: e.g. "3x12", "4x10", "30 sec" - align with goals (hypertrophy 8-12, strength 4-6, endurance 15+)
- tempo: e.g. "3-1-2" (eccentric-pause-concentric), "2-0-2" - use for muscle focus
- load: sets as string
- notes: brief cue per ACE/NASM (e.g. "drive knees out", "brace core", "hinge at hips")

Use proven, research-backed exercises. Prioritize compound movements, proper progression for level.`;

    const userPrompt = `Create an ACE/NASM/ACSM-aligned workout:
${clientContext}Level: ${level}, Goals: ${goals}, Week ${week}/12
Body focus: ${bodyPartsStr}
${bodyPartInstruction}
${notesInstruction}

Apply OPT model for level (Beginner: stabilization; Intermediate: strength; Advanced: power). 2-3 warm-up, 4-6 main, 2-3 cooldown. Use standard exercise names. Return only JSON, no markdown.`;

    const content = await generateText(systemPrompt, userPrompt);

    const parsed = parseWorkoutResponse(content);

    const warmUp = parsed.warmUp.map(normalizeExercise).filter((e) => e.exercise);
    const exercises = parsed.exercises.map(normalizeExercise).filter((e) => e.exercise);
    const cooldown = parsed.cooldown.map(normalizeExercise).filter((e) => e.exercise);

    return NextResponse.json({
      warmUp: warmUp.length > 0 ? warmUp : [{ exercise: "", resistance: "", setRepDuration: "", tempo: "", load: "", notes: "" }],
      exercises: exercises.length > 0 ? exercises : [{ exercise: "", resistance: "", setRepDuration: "", tempo: "", load: "", notes: "" }],
      cooldown: cooldown.length > 0 ? cooldown : [{ exercise: "", resistance: "", setRepDuration: "", tempo: "", load: "", notes: "" }],
    });
  } catch (error) {
    console.error("suggest-workout error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate workout suggestion";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
