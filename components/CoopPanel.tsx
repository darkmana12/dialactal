import React, { useMemo, useState } from 'react';

interface CoopPanelProps {
  connected: boolean;
  isHost: boolean;
  roomId: string | null;
  players: string[];
  onCreate: (roomId: string) => void;
  onJoin: (roomId: string) => void;
  onLeave: () => void;
  onHostNewGame: () => void;
}

const randomRoomId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const CoopPanel: React.FC<CoopPanelProps> = ({ connected, isHost, roomId, players, onCreate, onJoin, onLeave, onHostNewGame }) => {
  const [input, setInput] = useState('');
  const [suggested, setSuggested] = useState(randomRoomId());

  const copyText = useMemo(() => {
    if (!roomId) return '';
    const url = new URL(window.location.href);
    url.hash = `#room=${roomId}`;
    return url.toString();
  }, [roomId]);

  return (
    <div className="bg-white/90 rounded-xl p-4 shadow border border-gray-200">
      <h3 className="font-semibold text-brand-primary mb-2">Mode Coop en ligne</h3>

      {!connected && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded bg-brand-primary text-white hover:brightness-95"
              onClick={() => onCreate(suggested)}
            >
              Créer la salle {suggested}
            </button>
            <button className="px-3 py-2 rounded border" onClick={() => setSuggested(randomRoomId())}>
              Autre code
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-2 py-1 flex-1"
              placeholder="Rejoindre avec un code"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
            />
            <button className="px-3 py-2 rounded bg-brand-secondary text-white hover:brightness-95" onClick={() => input && onJoin(input)}>
              Rejoindre
            </button>
          </div>
          <p className="text-xs text-gray-500">Note: Ce mode coop synchronise la partie via un relais WebSocket local. Partage le lien pour inviter un ami; assure-toi que le serveur est lancé.</p>
        </div>
      )}

      {connected && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm">Salle: <span className="font-mono">{roomId}</span></div>
            <div className="text-sm">Joueurs: {players.length}</div>
          </div>
          <div className="flex items-center gap-2">
            <input className="border rounded px-2 py-1 flex-1 text-xs" value={copyText} readOnly />
            <button className="px-2 py-1 rounded border" onClick={() => copyText && navigator.clipboard.writeText(copyText)}>Copier lien</button>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <button className="px-3 py-2 rounded bg-brand-primary text-white" onClick={onHostNewGame}>Nouvelle partie (hôte)</button>
            )}
            <button className="px-3 py-2 rounded border" onClick={onLeave}>Quitter</button>
          </div>
          <p className="text-xs text-gray-500">Les propositions, révélations et changements de partie sont synchronisés dans la salle.</p>
        </div>
      )}
    </div>
  );
};

export default CoopPanel;
