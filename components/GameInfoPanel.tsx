const GameInfoPanel = ({ 
  guessCount,
  onNewGame, 
  onReveal,
  disabled
}: { guessCount: number, onNewGame: () => void, onReveal: () => void, disabled: boolean }) => {
  return (
    <div className="bg-white text-brand-primary p-4 rounded-2xl border-2 border-brand-border h-full">
      <div className="text-left">
        <h3 className="text-lg font-bold mb-4">Partie en cours</h3>
      </div>
      <div className="space-y-2 text-base font-semibold">
        <div className="flex justify-between items-center bg-brand-secondary p-2 rounded-lg">
          <span>Essais:</span>
          <span className="font-bold text-lg">{guessCount}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={onNewGame}
          className="w-full flex items-center justify-center space-x-2 bg-brand-accent-red text-white font-bold py-2 px-4 rounded-xl transition-transform duration-100 ease-out text-base border-2 border-brand-primary hover:brightness-105 active:scale-95"
          title="Commencer une nouvelle partie"
        >
          <span>Nouvelle Partie</span>
        </button>
        <button
          onClick={onReveal}
          disabled={disabled}
          className="w-full bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl transition-colors duration-100 ease-out text-base border-2 border-brand-primary hover:bg-gray-300 active:scale-95 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          title="Révéler la réponse et terminer la partie"
        >
          <span>Abandonner</span>
        </button>
      </div>
    </div>
  );
};
window.WikiCherche.GameInfoPanel = GameInfoPanel;