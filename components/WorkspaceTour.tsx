import { useEffect, useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconSparkles, IconX } from "@tabler/icons-react";
import clsx from "clsx";

export type TourStep = {
  id: string;
  title: string;
  description: string;
  hint?: string;
};

interface WorkspaceTourProps {
  open: boolean;
  steps: TourStep[];
  stepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
  onComplete: () => void;
}

type Spotlight = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const PADDING = 12;

const WorkspaceTour = ({ open, steps, stepIndex, onStepChange, onClose, onComplete }: WorkspaceTourProps) => {
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const step = steps[stepIndex];
      if (!step) return;
      const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.id}"]`);
      if (!el) {
        setSpotlight(null);
        return;
      }

      const rect = el.getBoundingClientRect();
      setSpotlight({
        top: rect.top + window.scrollY - PADDING,
        left: rect.left + window.scrollX - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, stepIndex, steps]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const totalSteps = useMemo(() => steps.length, [steps.length]);
  const progress = useMemo(() => ((stepIndex + 1) / Math.max(totalSteps, 1)) * 100, [stepIndex, totalSteps]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100000] pointer-events-none">
      <div className="absolute inset-0 bg-black/50" />

      {spotlight && (
        <div
          className="absolute rounded-xl ring-2 ring-[color:rgb(var(--group-theme))] shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all duration-200"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      <div className="absolute bottom-10 left-1/2 w-[min(640px,calc(100%-2rem))] -translate-x-1/2 pointer-events-auto">
        <div className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[color:rgb(var(--group-theme)/0.15)] text-[color:rgb(var(--group-theme))] grid place-content-center">
                <IconSparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[color:rgb(var(--group-theme))]">Step {stepIndex + 1} of {totalSteps}</p>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{steps[stepIndex]?.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">{steps[stepIndex]?.description}</p>
                {steps[stepIndex]?.hint && (
                  <p className="text-xs text-zinc-500 mt-2">{steps[stepIndex]?.hint}</p>
                )}
              </div>
            </div>
            <button
              aria-label="Close tour"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4">
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-[color:rgb(var(--group-theme))] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Guided onboarding</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onComplete()}
                className="px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Skip
              </button>
              <button
                onClick={() => onStepChange(Math.max(stepIndex - 1, 0))}
                disabled={stepIndex === 0}
                className={clsx(
                  "px-3 py-2 rounded-lg text-sm flex items-center gap-1",
                  stepIndex === 0
                    ? "text-zinc-400 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed"
                    : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <IconChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => {
                  if (stepIndex + 1 >= totalSteps) onComplete();
                  else onStepChange(stepIndex + 1);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[color:rgb(var(--group-theme))] hover:opacity-90 flex items-center gap-1"
              >
                {stepIndex + 1 >= totalSteps ? "Finish" : "Next"}
                <IconChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceTour;
