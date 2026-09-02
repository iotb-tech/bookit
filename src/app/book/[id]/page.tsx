import { redirect } from "next/navigation";
import BookingForm from "@/components/booking/BookingForm";
import { createClient } from "@/lib/supabase/server";
import { getResourceById } from "@/lib/resources";

function isStudyGroup(type?: string | null) {
  return String(type ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_") === "study_group";
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slot?: string | string[] }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const resource = await getResourceById(supabase, id);

  if (resource && isStudyGroup(resource.type)) {
    redirect(`/resources/${id}`);
  }

  const query = await searchParams;
  const slotId = Array.isArray(query.slot) ? query.slot[0] : query.slot;

  return (
    <main className="min-h-screen bg-[#fbfbfd] px-4 py-8 sm:px-6 lg:px-8">
      <BookingForm resourceId={id} slotId={slotId} />
    </main>
  );
}
