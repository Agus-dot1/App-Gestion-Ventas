'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Database } from 'lucide-react';

interface AppLoadingProps {
  onLoadingComplete?: () => void;
}

const loadingSteps = [
  { label: 'Iniciando aplicación...', icon: Database },
  { label: 'Conectando a la base de datos...', icon: Database },
  { label: 'Cargando configuración...', icon: Database },
  { label: 'Preparando interfaz...', icon: Database },
  { label: 'Finalizando...', icon: Database }
];



export function AppLoading({ onLoadingComplete }: AppLoadingProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsVisible(true);
  }, []);

  useEffect(() => {
    let progressValue = 0;
    const timer = setInterval(() => {
      progressValue += Math.floor(Math.random() * 8) + 3;
      
      // Update current step based on progress
      const stepIndex = Math.floor((progressValue / 100) * loadingSteps.length);
      setCurrentStep(Math.min(stepIndex, loadingSteps.length - 1));
      setProgress(progressValue);
      
      if (progressValue >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => {
            onLoadingComplete?.();
          }, 300);
        }, 800);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [onLoadingComplete]);



  if (!mounted) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-background flex items-center justify-center z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex flex-col items-center space-y-8 max-w-sm w-full px-6">
        {/* Minimalist Logo */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Electro Gestión</h1>
            <p className="text-sm text-muted-foreground">Sistema de gestión de ventas</p>
          </div>
        </div>

        {/* Simple Loading Content */}
        <div className="w-full space-y-4">
          {/* Current Step */}
          <div className="text-center">
            <span className="text-sm text-muted-foreground">
              {loadingSteps[currentStep]?.label || "Preparando..."}
            </span>
          </div>

          {/* Clean Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="text-center">
              <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}