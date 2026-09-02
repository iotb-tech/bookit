"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resourceSchema } from "@/schemas/resourceSchema";

export async function createResource(values: unknown) {
  const parsed = resourceSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form values and try again.",
    };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "You must be logged in to create a resource." };
  }

  const payload = parsed.data;

  if (payload.type === "Mentor") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "mentor") {
      return {
        success: false,
        error: "Only an approved mentor account can create a mentor resource.",
      };
    }
  }

  const durationMinutes = payload.duration_minutes === undefined || payload.duration_minutes === "" ? null : Number(payload.duration_minutes);
  const canonicalType = payload.type === "Mentor" ? "mentor" : "study_group";

  const basePayload = {
    name: payload.name,
    description: payload.description,
    owner_id: user.id,
    status: payload.status,
    duration_minutes: durationMinutes,
    skills: [] as string[],
  };

  let insertion = await supabase.from("resources").insert({ ...basePayload, type: canonicalType });

  // Compatibility with an older text-column BookIt database that stored display labels.
  if (insertion.error && /type|enum|constraint/i.test(insertion.error.message)) {
    insertion = await supabase.from("resources").insert({ ...basePayload, type: payload.type });
  }

  if (insertion.error) {
    return { success: false, error: insertion.error.message };
  }

  revalidatePath("/resources");
  return { success: true, message: "Resource created successfully." };
}
