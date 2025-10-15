const LoadingSpinner = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-accent-red"></div>
      <p className="mt-4 text-lg text-white">{message}</p>
    </div>
  );
};
window.WikiCherche.LoadingSpinner = LoadingSpinner;