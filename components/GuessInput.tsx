import React, { useState } from 'react';

interface GuessInputProps {
  onGuess: (guess: string) => void;
  disabled: boolean;
}

const GuessInput: React.FC<GuessInputProps> = ({ onGuess, disabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onGuess(inputValue.trim());
      setInputValue('');
    }
  };

  const getPlaceholderText = () => {
    if (disabled) return "Partie terminée !";
    return "Entrez votre mot";
  }
  
  return (
    <form onSubmit={handleSubmit} className="w-full lg:w-1/2 flex items-center gap-4">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={disabled}
        placeholder={getPlaceholderText()}
        className="flex-grow w-full p-3 text-lg bg-white border-2 border-brand-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow disabled:opacity-70 placeholder:text-brand-text-placeholder"
        aria-label="Devinez un mot"
      />
      <button
        type="submit"
        disabled={disabled || !inputValue.trim()}
        className="flex-shrink-0 w-14 h-14 bg-brand-primary text-white font-bold rounded-full border-2 border-brand-border hover:bg-black active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-100 ease-out"
      >
        Valider
      </button>
    </form>
  );
};

export default GuessInput;