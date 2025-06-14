import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { WorkoutDay } from '../types';

interface DaySelectionProps {
  days: WorkoutDay[];
  selectedDay?: string;
  onDaySelect: (dayId: string, exercises: any[]) => void;
}

export function DaySelection({ days, selectedDay, onDaySelect }: DaySelectionProps) {
  if (days.length === 0) return null;

  return (
    <div className="mb-8">
      <Card className="overflow-hidden">
        <div className="px-6 py-4 bg-muted/50 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
              <span className="text-primary-foreground text-sm font-medium">2</span>
            </div>
            <h2 className="text-lg font-medium">Seleziona Giorno di Allenamento</h2>
          </div>
        </div>
        
        <CardContent className="p-6">
          <div className="mb-4 text-sm text-muted-foreground">
            {days.length} tabelle di allenamento trovate nel PDF
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {days.map((day) => (
              <Button
                key={day.id}
                variant={selectedDay === day.id ? "default" : "outline"}
                className={`p-4 h-auto flex-col space-y-3 ${
                  selectedDay === day.id ? 'bg-primary text-primary-foreground' : ''
                }`}
                onClick={() => onDaySelect(day.id, day.exercises)}
              >
                <Calendar className="h-6 w-6" />
                <div className="text-center space-y-1">
                  <div className="text-sm font-medium">{day.name}</div>
                  {day.description && (
                    <div className="text-xs opacity-75 line-clamp-2">{day.description}</div>
                  )}
                  <div className="text-xs opacity-60">
                    {day.exercises.length} esercizi
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
