import { MealPlan, MealEntry } from "../types/meal-plan";
import {
  caloriesFromMacros,
  getEffectiveMacros,
  getEffectiveDailyTarget,
  getEffectiveTDEE,
} from "./calorie-calculator";
import { format } from "date-fns";

const renderMealRow = (meal: MealEntry) => {
  const ef = getEffectiveMacros(meal);
  const cal = caloriesFromMacros(ef.protein, ef.carbs, ef.fat);
  return `
  <tr>
    <td>${meal.foodName || ""}</td>
    <td>${meal.quantity ? meal.quantity + " g" : ""}</td>
    <td>${ef.protein > 0 ? ef.protein.toFixed(1) : ""}</td>
    <td>${ef.carbs > 0 ? ef.carbs.toFixed(1) : ""}</td>
    <td>${ef.fat > 0 ? ef.fat.toFixed(1) : ""}</td>
    <td>${cal > 0 ? Math.round(cal) : ""}</td>
  </tr>
`;
};

const renderMealSection = (
  title: string,
  meals: MealEntry[]
) => {
  const nonEmpty = meals.filter((m) => {
    const ef = getEffectiveMacros(m);
    return m.foodName || ef.protein || ef.carbs || ef.fat;
  });
  const rows = nonEmpty.length > 0
    ? nonEmpty.map(renderMealRow).join("")
    : '<tr><td colspan="6" class="empty-placeholder">—</td></tr>';
  const totals = (nonEmpty.length > 0 ? nonEmpty : []).reduce(
    (acc, m) => {
      const ef = getEffectiveMacros(m);
      return {
        protein: acc.protein + ef.protein,
        carbs: acc.carbs + ef.carbs,
        fat: acc.fat + ef.fat,
      };
    },
    { protein: 0, carbs: 0, fat: 0 }
  );
  const totalCal = caloriesFromMacros(
    totals.protein,
    totals.carbs,
    totals.fat
  );
  return `
    <div class="section">
      <div class="section-title">${title}</div>
      <table>
        <thead>
          <tr>
            <th>FOOD / MEAL</th>
            <th>Qty (g)</th>
            <th>Protein (g)</th>
            <th>Carbs (g)</th>
            <th>Fat (g)</th>
            <th>Calories</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="totals-row">
            <td>Total</td>
            <td></td>
            <td>${totals.protein.toFixed(1)}</td>
            <td>${totals.carbs.toFixed(1)}</td>
            <td>${totals.fat.toFixed(1)}</td>
            <td>${Math.round(totalCal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
};

export const exportMealPlanToPDF = (plan: MealPlan) => {
  const dailyTotal = [
    ...(plan.breakfast || []),
    ...(plan.lunch || []),
    ...(plan.dinner || []),
    ...(plan.snacks || []),
  ].reduce((sum, m) => {
    const ef = getEffectiveMacros(m);
    return sum + caloriesFromMacros(ef.protein, ef.carbs, ef.fat);
  }, 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Meal Planner - ${plan.client}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 1.5cm; }
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #000; }
          .header-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 12px;
            border-bottom: 2px solid #000;
          }
          .header-item { display: flex; flex-direction: column; gap: 4px; }
          .header-label { font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header-value { font-size: 12px; }
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
          .logo-badge span { font-size: 14px; font-weight: 900; font-style: italic; line-height: 1; }
          .logo-text { display: flex; flex-direction: column; text-align: left; font-family: 'Montserrat', sans-serif; }
          .logo-text .logo-line1 { font-size: 18px; font-weight: 900; font-style: italic; letter-spacing: 0.05em; line-height: 1; }
          .logo-text .logo-line2 { font-size: 18px; font-weight: 900; font-style: italic; letter-spacing: 0.05em; line-height: 1; margin-top: -2px; padding-left: 0.6em; }
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
          .daily-total {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 16px;
            padding: 8px 12px;
            background: #f2f2f2;
            border-radius: 6px;
          }
          .section { margin-bottom: 24px; }
          .section-title {
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #000;
          }
          .empty-placeholder { color: #999; font-style: italic; padding: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 10px; }
          th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; font-size: 9px; letter-spacing: 0.3px; }
          .totals-row { font-weight: bold; background-color: #eee; }
          .notes-feedback { margin-top: 24px; padding-top: 12px; border-top: 2px solid #000; }
          .notes-feedback-title { font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
          .notes-feedback-content { min-height: 60px; padding: 8px; border: 1px solid #ddd; white-space: pre-wrap; }
          .footer { margin-top: 24px; font-size: 9px; color: #666; text-align: center; }
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
        
        <div class="main-title">MEAL PLANNER</div>
        
        <div class="header-info">
          <div class="header-item">
            <span class="header-label">CLIENT</span>
            <span class="header-value">${plan.client || ""}</span>
          </div>
          <div class="header-item">
            <span class="header-label">GOALS</span>
            <span class="header-value">${plan.goals || ""}</span>
          </div>
          <div class="header-item">
            <span class="header-label">TDEE</span>
            <span class="header-value">${(() => { const t = getEffectiveTDEE(plan); return t != null ? t + " cal" : "—"; })()}</span>
          </div>
          <div class="header-item">
            <span class="header-label">DAILY TARGET</span>
            <span class="header-value">${(() => { const t = getEffectiveDailyTarget(plan); return t != null ? t + " cal" : "—"; })()}</span>
          </div>
        </div>
        
        <div class="daily-total">Total daily calories: ${dailyTotal} cal</div>
        
        ${renderMealSection("MEAL 1", plan.breakfast || [])}
        ${renderMealSection("MEAL 2", plan.lunch || [])}
        ${renderMealSection("MEAL 3", plan.dinner || [])}
        ${renderMealSection("MEAL 4", plan.snacks || [])}
        
        <div class="notes-feedback">
          <div class="notes-feedback-title">NOTES / FEEDBACK</div>
          <div class="notes-feedback-content">${plan.notesFeedback || ""}</div>
        </div>
        
        <div class="footer">
          Generated by ${plan.trainerName || "THE PLACE"} on ${format(new Date(), "MMM dd, yyyy")}
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
