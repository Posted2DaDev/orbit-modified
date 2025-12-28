import { useState, useEffect } from "react";
import { IconX, IconPin } from "@tabler/icons-react";
const ANNOUNCEMENT_KEY = "announcementDismissed_v2_1_6b1";

export default function StickyNoteAnnouncement() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(ANNOUNCEMENT_KEY);
    if (!dismissed) setIsVisible(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(ANNOUNCEMENT_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="z-0 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-4 flex items-start space-x-4 mb-6 relative">
      <img
        src="/image.png"
        alt="PostedDevOfficial avatar"
        className="w-10 h-10 rounded-full bg-primary flex-shrink-0"
      />
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-1">
          <IconPin className="w-4 h-4 text-zinc-500 dark:text-zinc-300" />
          Right off the press:
        </h3>

        <div className="text-zinc-800 dark:text-zinc-300 text-sm space-y-3">
          <h4 className="text-base font-semibold text-zinc-900 dark:text-white">
            Varyn version 1.0.5 has released!
          </h4>
          <p>
            I need to keep the lights on this week, so I'm shipping a small update for Varyn. If you don't know what Varyn is: It's a free alternative to Hyra, with its codebase highly based on Planetary Orbit.
          </p>
          <div>
            <p className="font-semibold mt-2">🖥️ Live Servers</p>
            <p>
              Looking to track your game(s) servers? Varyn now supports
			  live server tracking with player counts and more!
            </p>
          </div>
		  <div>
            <p className="font-semibold mt-2">🎉 Promotions</p>
            <p>
              I've added a feature to 
            </p>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            That's all from me, I need to finish up policies!
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Check out planetary @
            <a
              href="https://discord.gg/planetary"
              target="_blank"
              rel="noreferrer noopener"
              className="ml-1 text-primary underline"
            >
              .gg/planetary
            </a>
            .
          </p>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        aria-label="Close announcement"
      >
        <IconX className="w-5 h-5" />
      </button>
    </div>
  );
}
