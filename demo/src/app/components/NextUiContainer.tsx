export default function NextUiContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className={`
      flex w-full items-center justify-between space-x-4 p-2
      border-2 border-default hover:border-gray-400 rounded-xl transition-colors
      duration-300`
    }>{children}</div>
  );
}