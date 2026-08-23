import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import {
  ArrowRight,
  CalendarCheck,
} from "lucide-react";

export default function Hero() {
  const currentDate = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }, []);

  return (
    <section className="overflow-hidden bg-white pt-35">

      <div className="mx-auto grid max-w-7xl items-center gap-8 px-2 pb-20 lg:grid-cols-2 lg:px-4">

        {/* LEFT */}
        <div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700">
            <span className="h-2 w-2 rounded-full bg-primary-600" />
            Mentorship made simple
          </div>

          <h1 className="max-w-xl text-5xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-6xl">
            Book Mentors.
            <br />
            Join Study Groups.
            <br />
            <span className="text-primary-600">
              Grow Together.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Book one-on-one sessions with mentors or join
            study groups with your peers. Find the right time,
            avoid double-booking, and stay focused.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-200 transition hover:bg-primary-700"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>

            <a
              href="#how-it-works"
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:border-primary-600 hover:text-primary-600"
            >
              Learn More
            </a>

          </div>

         

        </div>

        {/* RIGHT - CALENDAR */}
        <div className="relative flex justify-center">

          <div className="absolute h-80 w-80 rounded-full bg-primary-100 blur-3xl" />

          <div className="relative w-full max-w-lg">

            {/* Decorative card */}
            <div className="absolute -right-2 top-12 h-20 w-16 rounded-2xl bg-primary-100" />
            <div className="absolute -left-5 bottom-12 h-16 w-10 rounded-full bg-purple-100" />

            {/* Calendar */}
            <div className="relative rounded-3xl border border-primary-100 bg-white p-5 shadow-2xl shadow-primary-100">

              {/* Calendar header */}
              <div className="flex items-center justify-between rounded-t-2xl bg-primary-600 px-5 py-4 text-white">

                <div>
                  <p className="text-xs opacity-80">
                    BookIt Calendar
                  </p>

                  <p className="font-bold">
                    {currentDate || 'Loading date...'}
                  </p>
                </div>

                <CalendarCheck size={26} />

              </div>

              {/* Calendar */}
              <div>
                <Image
                src="/hero.jpg"
                    alt="BookIt Hero Image"
                    priority // Crucial for Largest Contentful Paint (LCP) performance
                    className="w-full h-auto max-w-md object-cover"
                    width={400} // Adjust based on your image's actual width
                    height={300} // Adjust based on your image's actual height
                />
              </div>

               {/* Stats */}
          <div className="mt-2 grid max-w-lg grid-cols-3 gap-3 border-t border-slate-100 pt-7 mx-auto place-items-center">

            <div>
              <p className="text-2xl font-bold text-slate-800">
                1-on-1
              </p>
              <p className="text-sm text-slate-500">
                Mentorship
              </p>
            </div>

            <div>
              <p className="text-2xl font-bold text-slate-800">
                Group
              </p>
              <p className="text-sm text-slate-500">
                Sessions
              </p>
            </div>

            <div>
              <p className="text-2xl font-bold text-slate-800">
                24/7
              </p>
              <p className="text-sm text-slate-500">
                Availability
              </p>
            </div>

          </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}