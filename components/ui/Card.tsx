interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: CardProps) {
  return <h2 className={`text-xl font-bold text-gray-100 ${className}`}>{children}</h2>;
}

export function CardDescription({ children, className = "" }: CardProps) {
  return <p className={`text-sm text-gray-400 mt-1 ${className}`}>{children}</p>;
}
