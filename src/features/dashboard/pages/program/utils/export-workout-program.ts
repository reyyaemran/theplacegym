import { WorkoutProgram, WorkoutExercise, BodyPartSelection } from "../types/workout-program";
import { format } from "date-fns";

const renderExerciseRow = (exercise: WorkoutExercise) => `
  <tr>
    <td>${exercise.exercise || ""}</td>
    <td>${exercise.resistance || ""}</td>
    <td>${exercise.setRepDuration || ""}</td>
    <td>${exercise.tempo || ""}</td>
    <td>${exercise.load || ""}</td>
    <td>${exercise.notes || ""}</td>
  </tr>
`;

const BODY_PART_ORDER = ["FULL-BODY", "UPPER-BODY", "LOWER-BODY", "ARM", "SHOULDER", "BACK", "CHEST", "LEGS", "GLUTES", "CORE"] as const;

const formatBodyPartsForPDF = (bodyParts?: BodyPartSelection | null, legacyBodyPart?: string): string => {
  if (legacyBodyPart) return `☑ ${legacyBodyPart}`;
  return BODY_PART_ORDER
    .map((part) => (bodyParts?.[part] ? `☑ ${part}` : `☐ ${part}`))
    .join("  ");
};

const isEmptyExercise = (ex: WorkoutExercise) =>
  !ex.exercise && !ex.resistance && !ex.setRepDuration && !ex.tempo && !ex.load && !ex.notes;

const renderExerciseSection = (
  title: string,
  exercises: WorkoutExercise[]
) => {
  const nonEmpty = exercises.filter((ex) => !isEmptyExercise(ex));
  if (nonEmpty.length === 0) return "";
  const rows = nonEmpty.map(renderExerciseRow).join("");
  return `
    <div class="section">
      <div class="section-title">${title}</div>
      <table>
        <thead>
          <tr>
            <th>EXERCISE</th>
            <th>RESISTANCE</th>
            <th>REP/DURATION</th>
            <th>TEMPO</th>
            <th>SETS</th>
            <th>NOTES</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

export const exportWorkoutProgramToPDF = (program: WorkoutProgram) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Workout Planner - ${program.client}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4;
            margin: 1.5cm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            padding: 20px;
            color: #000;
          }
          .header-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 12px;
            border-bottom: 2px solid #000;
          }
          .header-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .header-label {
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header-value {
            font-size: 12px;
          }
          .logo-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 20px;
          }
          .logo-badge {
            background-color: #000;
            color: #fff;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            font-family: 'Montserrat', sans-serif;
          }
          .logo-badge span {
            font-size: 14px;
            font-weight: 900;
            font-style: italic;
            line-height: 1;
          }
          .logo-text {
            display: flex;
            flex-direction: column;
            text-align: left;
            font-family: 'Montserrat', sans-serif;
          }
          .logo-text .logo-line1 {
            font-size: 18px;
            font-weight: 900;
            font-style: italic;
            letter-spacing: 0.05em;
            line-height: 1;
          }
          .logo-text .logo-line2 {
            font-size: 18px;
            font-weight: 900;
            font-style: italic;
            letter-spacing: 0.05em;
            line-height: 1;
            margin-top: -2px;
            padding-left: 0.6em;
          }
          .main-title {
            text-align: center;
            font-family: 'Montserrat', sans-serif;
            font-weight: 900;
            font-style: italic;
            font-size: 24px;
            text-transform: uppercase;
            margin-bottom: 20px;
            letter-spacing: 0.05em;
          }
          .body-part-tickers {
            display: flex;
            flex-wrap: wrap;
            gap: 12px 20px;
            padding: 8px 0;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 16px;
          }
          .section {
            margin-bottom: 24px;
          }
          .section-title {
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #000;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
            font-size: 10px;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.3px;
          }
          .notes-feedback {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 2px solid #000;
          }
          .notes-feedback-title {
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .notes-feedback-content {
            min-height: 60px;
            padding: 8px;
            border: 1px solid #ddd;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 24px;
            font-size: 9px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="logo-header">
          <div class="logo-badge"><span>TP</span></div>
          <div class="logo-text">
            <span class="logo-line1">THE</span>
            <span class="logo-line2">PLACE</span>
          </div>
        </div>
        
        <div class="main-title">WORKOUT PLANNER</div>
        
        <div class="header-info">
          <div class="header-item">
            <span class="header-label">CLIENT</span>
            <span class="header-value">${program.client || ""}</span>
          </div>
          <div class="header-item">
            <span class="header-label">LEVEL</span>
            <span class="header-value">${program.level || ""}</span>
          </div>
          <div class="header-item">
            <span class="header-label">GOALS</span>
            <span class="header-value">${program.goals || ""}</span>
          </div>
          <div class="header-item">
            <span class="header-label">WEEK</span>
            <span class="header-value">${program.week || ""}</span>
          </div>
        </div>
        
        <div class="body-part-tickers">${formatBodyPartsForPDF(program.bodyParts, (program as { bodyPart?: string }).bodyPart)}</div>
        
        ${renderExerciseSection("WARM - UP", program.warmUp)}
        ${renderExerciseSection("EXERCISES", program.exercises)}
        ${renderExerciseSection("COOLDOWN", program.cooldown)}
        
        <div class="notes-feedback">
          <div class="notes-feedback-title">NOTES / FEEDBACK</div>
          <div class="notes-feedback-content">${program.notesFeedback || ""}</div>
        </div>
        
        <div class="footer">
          Generated by ${program.trainerName || "THE PLACE"} on ${format(new Date(), "MMM dd, yyyy")}
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
