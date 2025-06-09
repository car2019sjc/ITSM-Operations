import React, { useState } from 'react';
import { Clock, Save, X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { SHIFTS, SHIFT_LEVELS } from '../types/analyst';

interface ShiftConfigurationProps {
  onClose: () => void;
  onSave: (shifts: typeof SHIFTS) => void;
}

interface ShiftTime {
  name: string;
  startTime: string;
  endTime: string;
}

export function ShiftConfiguration({ onClose, onSave }: ShiftConfigurationProps) {
  const [shifts, setShifts] = useState<Record<string, ShiftTime>>(() => {
    // Initialize with current shifts
    return Object.entries(SHIFTS).reduce((acc, [key, value]) => {
      acc[key] = { ...value };
      return acc;
    }, {} as Record<string, ShiftTime>);
  });

  const [error, setError] = useState<string | null>(null);

  const handleTimeChange = (shiftKey: string, field: 'startTime' | 'endTime', value: string) => {
    setShifts(prev => ({
      ...prev,
      [shiftKey]: {
        ...prev[shiftKey],
        [field]: value
      }
    }));
    setError(null);
  };

  const validateShifts = (): boolean => {
    // Check for 24-hour coverage
    const timeSlots = new Array(24 * 60).fill(false); // One slot per minute

    Object.values(shifts).forEach(shift => {
      const [startHour, startMinute] = shift.startTime.split(':').map(Number);
      const [endHour, endMinute] = shift.endTime.split(':').map(Number);

      const startSlot = startHour * 60 + startMinute;
      let endSlot = endHour * 60 + endMinute;

      if (endSlot <= startSlot) {
        endSlot += 24 * 60; // Add 24 hours if shift crosses midnight
      }

      for (let i = startSlot; i < endSlot; i++) {
        const slot = i % (24 * 60);
        if (timeSlots[slot]) {
          setError('Os turnos não podem se sobrepor');
          return false;
        }
        timeSlots[slot] = true;
      }
    });

    // Check if all minutes are covered
    if (!timeSlots.every(slot => slot)) {
      setError('Os turnos devem cobrir todas as 24 horas do dia');
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateShifts()) {
      return;
    }

    onSave(shifts as typeof SHIFTS);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-indigo-400" />
              <h2 className="text-xl font-semibold text-white">
                Configuração de Turnos
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="text-red-500 font-medium">Erro na Configuração</h4>
                <p className="text-red-400 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {Object.entries(shifts).map(([key, shift]) => (
              <div 
                key={key}
                className="bg-[#1C2333] p-4 rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">{shift.name}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Início do Turno
                    </label>
                    <input
                      type="time"
                      value={shift.startTime}
                      onChange={(e) => handleTimeChange(key, 'startTime', e.target.value)}
                      className="w-full px-3 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Fim do Turno
                    </label>
                    <input
                      type="time"
                      value={shift.endTime}
                      onChange={(e) => handleTimeChange(key, 'endTime', e.target.value)}
                      className="w-full px-3 py-2 bg-[#151B2B] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Save className="h-4 w-4" />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}