import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import { CountryBadge } from "@/components/ui/CountryBadge";

interface StageCardProps {
  id: string;
  name: string;
  country: string;
  days: number[];
  dates: string;
  heroImage: string | null;
  excerpt: string;
}

export function StageCard({
  id,
  name,
  country,
  days,
  dates,
  heroImage,
  excerpt,
}: StageCardProps) {
  const countryGradient: Record<string, string> = {
    Vietnam: "from-vietnam/80 to-vietnam/40",
    Cambogia: "from-cambodia/80 to-cambodia/40",
    Thailandia: "from-thailand/80 to-thailand/40",
  };

  return (
    <Link
      href={`/destinazione/${id}/`}
      className="group block rounded-xl overflow-hidden bg-surface shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* Image / gradient hero */}
      <div className="relative h-44 overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${
              countryGradient[country] || "from-primary/80 to-primary/40"
            } flex items-center justify-center`}
          >
            <MapPin className="w-12 h-12 text-white/60" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <CountryBadge country={country} onImage />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-text group-hover:text-primary transition-colors">
          {name}
        </h3>
        <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {dates}
          </span>
          <span>
            {days.length} {days.length === 1 ? "giorno" : "giorni"}
          </span>
        </div>
        {excerpt && (
          <p className="mt-2 text-sm text-text-secondary line-clamp-2">
            {excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}
