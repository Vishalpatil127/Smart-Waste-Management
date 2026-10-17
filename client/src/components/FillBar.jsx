export default function FillBar({ percentage }) {
  const pct = Math.min(Math.max(percentage ?? 0, 0), 100);

  const color =
    pct <= 50 ? 'bg-green-500' :
    pct <= 80 ? 'bg-yellow-400' :
                'bg-red-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Fill level</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`${color} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
