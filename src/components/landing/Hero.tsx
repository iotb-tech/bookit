import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarCheck } from "lucide-react";

export default function Hero() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="overflow-hidden bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-16 pt-8 sm:pt-10 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:pb-20 lg:pt-12">
        
        {/* LEFT */}
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 sm:text-base">
            <span className="h-2 w-2 rounded-full bg-primary-600" />
            Mentorship made simple
          </div>

          <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Book Mentors
            <br />
            Join Study Groups
            <br />
            <span className="text-primary-600">
              Grow Together
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
            Book one-on-one sessions with mentors or join study groups with
            your peers. Find the right time, avoid double-booking, and stay
            focused.
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

        {/* RIGHT */}
        <div className="relative flex justify-center">
          <div className="absolute h-80 w-80 rounded-full bg-primary-100 blur-3xl" />

          <div className="relative w-full max-w-lg">
            <div className="absolute -right-2 top-12 h-20 w-16 rounded-2xl bg-primary-100" />
            <div className="absolute -left-5 bottom-12 h-16 w-10 rounded-full bg-purple-100" />

            <div className="relative overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-2xl shadow-primary-100">
              
              {/* Calendar header */}
              <div className="flex items-center justify-between bg-primary-600 px-6 py-5 text-white">
                <div>
                  <p className="text-xs font-medium text-white/80">
                    BookIt Calendar
                  </p>

                  <p className="mt-1 font-bold">
                    {currentDate}
                  </p>
                </div>

                <CalendarCheck size={26} />
              </div>

              {/* Image */}
              <div className="p-5">
                <Image
                  src="/hero.jpg"
                  alt="BookIt mentorship and study booking"
                  priority
                  className="h-auto w-full rounded-2xl object-cover"
                  width={600}
                  height={420}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 border-t border-slate-100 px-5 py-6 text-center">
                <div>
                  <p className="text-xl font-bold text-slate-800">
                    1-on-1
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Mentorship
                  </p>
                </div>

                <div className="border-x border-slate-100">
                  <p className="text-xl font-bold text-slate-800">
                    Group
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sessions
                  </p>
                </div>

                <div>
                  <p className="text-xl font-bold text-slate-800">
                    24/7
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
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