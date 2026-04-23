interface PB {
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
  achievedAt: string;
}

export function PBBoard({ pbs }: { pbs: PB[] }) {
  if (pbs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>还没有记录</p>
        <p className="text-sm mt-2">完成训练后，个人记录将自动更新</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">个人记录</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-3 pr-4">动作</th>
            <th className="py-3 pr-4">最佳记录</th>
            <th className="py-3 pr-4">估计1RM</th>
            <th className="py-3">日期</th>
          </tr>
        </thead>
        <tbody>
          {pbs.map((pb) => (
            <tr key={pb.exerciseName} className="border-b">
              <td className="py-3 pr-4 font-medium">{pb.exerciseName}</td>
              <td className="py-3 pr-4">{pb.bestWeight} kg × {pb.bestReps}</td>
              <td className="py-3 pr-4 font-semibold">{pb.estimatedOneRM.toFixed(1)}</td>
              <td className="py-3 text-muted-foreground">
                {new Date(pb.achievedAt).toLocaleDateString('zh-CN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
