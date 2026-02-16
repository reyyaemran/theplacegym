import { redirect } from "next/navigation";

export default function MealPlannerRoute() {
  redirect("/dashboard/program?tab=meal");
}
