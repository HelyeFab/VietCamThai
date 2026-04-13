const colors: Record<string, string> = {
  Vietnam: "bg-vietnam text-white",
  Cambogia: "bg-cambodia text-white",
  Thailandia: "bg-thailand text-white",
};

export function CountryBadge({ country, onImage = false }: { country: string; onImage?: boolean }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        onImage
          ? `${colors[country] || "bg-primary text-white"} shadow-md`
          : `${colors[country] || "bg-primary text-white"}`
      }`}
    >
      {country}
    </span>
  );
}
