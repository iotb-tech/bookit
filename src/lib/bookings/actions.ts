"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  bookingRequestSchema,
  type BookingRequest,
} from "@/schemas/bookingSchema";

export type BookingActionResult =
  | {
      success: true;
      bookingId?: string;
    }
  | {
      success: false;
      error: string;
    };

function friendlyBookingError(
  error: {
    code?: string;
    message?: string;
  }
) {
  const message =
    error.message ?? "";

  if (
    error.code === "23P01" ||
    /overlap|conflict|exclude/i.test(
      message
    )
  ) {
    return "That time slot was just taken. Please choose another available time.";
  }

  if (
    /SLOT_NOT_AVAILABLE/i.test(
      message
    )
  ) {
    return "That slot is no longer available. Please choose another time.";
  }

  if (
    /SLOT_NOT_FOUND/i.test(
      message
    )
  ) {
    return "That availability slot could not be found.";
  }

  if (
    /SLOT_IN_PAST/i.test(
      message
    )
  ) {
    return "That session time has already passed. Please choose a future slot.";
  }

  if (
    /RESOURCE_NOT_AVAILABLE/i.test(
      message
    )
  ) {
    return "This resource is currently unavailable for booking.";
  }

  if (
    /AUTH_REQUIRED/i.test(
      message
    )
  ) {
    return "Please log in before booking a session.";
  }

  return (
    message ||
    "Unable to create the booking. Please try again."
  );
}

export async function createBookingAction(
  input: BookingRequest
): Promise<BookingActionResult> {
  const parsed =
    bookingRequestSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      success: false,

      error:
        parsed.error.issues[0]
          ?.message ??
        "Please check the booking details.",
    };
  }

  const supabase =
    await createClient();

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !userData.user
  ) {
    return {
      success: false,

      error:
        "Please log in before booking a session.",
    };
  }

  const {
    resourceId,
    slotId,
  } = parsed.data;

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "create_booking_from_slot",
      {
        p_resource_id:
          resourceId,

        p_slot_id:
          slotId,
      }
    );

  if (error) {
    return {
      success: false,

      error:
        friendlyBookingError(
          error
        ),
    };
  }

  revalidatePath(
    "/my-bookings"
  );

  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/resources"
  );

  revalidatePath(
    `/resources/${resourceId}`
  );

  revalidatePath(
    "/mentor/dashboard"
  );

  revalidatePath(
    "/mentor/sessions"
  );

  revalidatePath(
    "/mentor/availability"
  );

  return {
    success: true,

    bookingId:
      typeof data ===
      "string"
        ? data
        : undefined,
  };
}

export async function cancelBookingAction(
  bookingId: string
): Promise<BookingActionResult> {
  if (!bookingId) {
    return {
      success: false,

      error:
        "Booking id is required.",
    };
  }

  const supabase =
    await createClient();

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !userData.user
  ) {
    return {
      success: false,

      error:
        "Please log in to manage bookings.",
    };
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "cancel_booking_and_release_slot",
      {
        p_booking_id:
          bookingId,
      }
    );

  if (error) {
    return {
      success: false,

      error:
        error.message ||
        "Unable to cancel this booking.",
    };
  }

  if (data !== true) {
    return {
      success: false,

      error:
        "This booking is no longer active or could not be cancelled.",
    };
  }

  revalidatePath(
    "/my-bookings"
  );

  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/resources"
  );

  revalidatePath(
    "/mentor/dashboard"
  );

  revalidatePath(
    "/mentor/sessions"
  );

  revalidatePath(
    "/mentor/availability"
  );

  return {
    success: true,
  };
}