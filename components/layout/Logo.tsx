interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl",
};

export function Logo({ size = "md" }: LogoProps) {
  return (
    <h1 className={`${sizes[size]} font-bold tracking-tight`}>
      <span className="text-red-500">War</span>{" "}
      <span className="text-gray-100">Room</span>
    </h1>
  );
}
