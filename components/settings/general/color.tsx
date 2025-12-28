"use client";

import axios from "axios";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import type { FC } from "@/types/settingsComponent";
import { IconCheck, IconPalette } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useState } from "react";

type SessionColors = {
  recurring: string;
  shift: string;
  training: string;
  event: string;
  other: string;
};

type props = {
  triggerToast: typeof toast;
  isSidebarExpanded: boolean;
};

const Color: FC<props> = ({ triggerToast, isSidebarExpanded }) => {
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [selectedColor, setSelectedColor] = useState<string>(
    workspace?.groupTheme || ""
  );
  const [sessionColors, setSessionColors] = useState<SessionColors>({
    recurring: "bg-blue-500",
    shift: "bg-green-500",
    training: "bg-yellow-500",
    event: "bg-purple-500",
    other: "bg-zinc-500",
  });
  const [isLoadingSessionColors, setIsLoadingSessionColors] = useState(false);

  useEffect(() => {
    if (workspace?.groupTheme) {
      setSelectedColor(workspace.groupTheme);
    }
    loadSessionColors();
  }, [workspace?.groupTheme]);

  const loadSessionColors = async () => {
    if (!workspace?.groupId) return;

    try {
      setIsLoadingSessionColors(true);
      const response = await axios.get(
        `/api/workspace/${workspace.groupId}/settings/general/session-colors`
      );
      if (response.data.success && response.data.colors) {
        setSessionColors(response.data.colors);
      }
    } catch (error) {
      console.error("Failed to load session colors:", error);
    } finally {
      setIsLoadingSessionColors(false);
    }
  };

  const updateColor = async (color: string) => {
    const previousColor = selectedColor;
    try {
      setSelectedColor(color);
      setWorkspace((prev) => ({
        ...prev,
        groupTheme: color,
      }));

      const rgbValue = getRGBFromTailwindColor(color);
      document.documentElement.style.setProperty("--group-theme", rgbValue);

      const res = await axios.patch(
        `/api/workspace/${workspace.groupId}/settings/general/color`,
        { color }
      );

      if (res.status === 200) {
        triggerToast.success("Workspace color updated successfully!");
      } else {
        triggerToast.error("Failed to update color.");
        setSelectedColor(previousColor);
        setWorkspace((prev) => ({
          ...prev,
          groupTheme: previousColor,
        }));
        const prevRgb = getRGBFromTailwindColor(previousColor);
        document.documentElement.style.setProperty("--group-theme", prevRgb);
      }
    } catch (error) {
      triggerToast.error("Something went wrong.");
      setSelectedColor(previousColor);
      setWorkspace((prev) => ({
        ...prev,
        groupTheme: previousColor,
      }));
      const prevRgb = getRGBFromTailwindColor(previousColor);
      document.documentElement.style.setProperty("--group-theme", prevRgb);
    }
  };

  const updateSessionColor = async (
    colorType: keyof SessionColors,
    color: string
  ) => {
    try {
      const newColors = { ...sessionColors, [colorType]: color };
      setSessionColors(newColors);

      const res = await axios.patch(
        `/api/workspace/${workspace.groupId}/settings/general/session-colors`,
        { colors: newColors }
      );

      if (res.status === 200) {
        triggerToast.success("Session colors updated successfully!");
      } else {
        triggerToast.error("Failed to update session colors.");
        setSessionColors(sessionColors);
      }
    } catch (error) {
      triggerToast.error("Something went wrong.");
      setSessionColors(sessionColors);
    }
  };

  const handleRevert = () => {
    const previousColor = workspace?.groupTheme || "bg-pink-500";
    setSelectedColor(previousColor);
    setWorkspace((prev) => ({
      ...prev,
      groupTheme: previousColor,
    }));
    const rgbValue = getRGBFromTailwindColor(previousColor);
    document.documentElement.style.setProperty("--group-theme", rgbValue);
  };

  const colors = [
    "bg-pink-200", "bg-red-200", "bg-orange-200", "bg-yellow-200", "bg-lime-200", "bg-emerald-200", "bg-cyan-200", "bg-blue-200", "bg-indigo-200", "bg-violet-200",
    "bg-pink-400", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-lime-400", "bg-emerald-400", "bg-cyan-400", "bg-blue-400", "bg-indigo-400", "bg-violet-400",
    "bg-pink-700", "bg-red-700", "bg-orange-700", "bg-yellow-700", "bg-lime-700", "bg-emerald-700", "bg-cyan-700", "bg-blue-700", "bg-indigo-700", "bg-violet-700",
  ];

  const sessionColorTypes = [
    {
      key: "recurring" as keyof SessionColors,
      label: "Recurring Sessions",
      description: 'Color for "Recurring" tag',
    },
    {
      key: "shift" as keyof SessionColors,
      label: "Shift Sessions",
      description: 'Color for "Shift" sessions',
    },
    {
      key: "training" as keyof SessionColors,
      label: "Training Sessions",
      description: 'Color for "Training" sessions',
    },
    {
      key: "event" as keyof SessionColors,
      label: "Event Sessions",
      description: 'Color for "Event" sessions',
    },
    {
      key: "other" as keyof SessionColors,
      label: "Other Sessions",
      description: 'Color for "Other" sessions',
    },
  ];

  return (
    <div className="ml-0 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <IconPalette size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Workspace Theme
          </h3>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 text-left">
          Choose a color theme for your workspace        </p>
        <div className="inline-grid md:grid-cols-10 grid-cols-5 md:gap-2 gap-1">
          {colors.map((color, i) => (
            <button
              key={i}
              onClick={() => updateColor(color)}
              className={clsx(
                "aspect-square h-11 rounded-lg cursor-pointer grid place-content-center transition-all border-2",
                color,
                selectedColor === color ? "border-gray-900 dark:border-white" : getBorderColor(color)
              )}
            >
              {selectedColor === color && (
                <span className="block aspect-square rounded-full h-4 bg-white dark:bg-gray-900"></span>
              )}
            </button>
          ))}        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <IconPalette size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Session Colors
          </h3>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 text-left">
          Customize colors for different session types and tags
        </p>

        {isLoadingSessionColors ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Loading session colors...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sessionColorTypes.map((colorType) => (
              <div
                key={colorType.key}
                className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-zinc-900 dark:text-white text-sm">
                      {colorType.label}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {colorType.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "px-2 py-1 rounded text-xs text-white font-medium",
                        sessionColors[colorType.key]
                      )}
                    >
                      {colorType.key === "recurring"
                        ? "Recurring"
                        : colorType.label.split(" ")[0]}
                    </span>
                  </div>
                </div>
                <select
                  value={sessionColors[colorType.key]}
                  onChange={(e) =>
                    updateSessionColor(colorType.key, e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {colors.map((color) => (
                    <option key={color} value={color}>
                      {getColorDisplayName(color)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function getColorDisplayName(color: string): string {
  const colorDisplayMap: Record<string, string> = {
    "bg-pink-200": "Pink Light",
    "bg-red-200": "Red Light",
    "bg-orange-200": "Orange Light",
    "bg-yellow-200": "Yellow Light",
    "bg-lime-200": "Lime Light",
    "bg-emerald-200": "Emerald Light",
    "bg-cyan-200": "Cyan Light",
    "bg-blue-200": "Blue Light",
    "bg-indigo-200": "Indigo Light",
    "bg-violet-200": "Violet Light",
    "bg-pink-400": "Pink Medium",
    "bg-red-400": "Red Medium",
    "bg-orange-400": "Orange Medium",
    "bg-yellow-400": "Yellow Medium",
    "bg-lime-400": "Lime Medium",
    "bg-emerald-400": "Emerald Medium",
    "bg-cyan-400": "Cyan Medium",
    "bg-blue-400": "Blue Medium",
    "bg-indigo-400": "Indigo Medium",
    "bg-violet-400": "Violet Medium",
    "bg-pink-700": "Pink Dark",
    "bg-red-700": "Red Dark",
    "bg-orange-700": "Orange Dark",
    "bg-yellow-700": "Yellow Dark",
    "bg-lime-700": "Lime Dark",
    "bg-emerald-700": "Emerald Dark",
    "bg-cyan-700": "Cyan Dark",
    "bg-blue-700": "Blue Dark",
    "bg-indigo-700": "Indigo Dark",
    "bg-violet-700": "Violet Dark",
  };

  return colorDisplayMap[color] || color.replace("bg-", "").replace("-", " ");
}

function getRGBFromTailwindColor(tw: any): string {
  const fallback = "236, 72, 153";
  if (!tw || typeof tw !== "string") {
    if (tw !== null && tw !== undefined) {
      console.warn("Invalid color value:", tw);
    }
    return fallback;
  }
  const colorName = tw.replace("bg-", "");

  const colorMap: Record<string, string> = {
    "pink-200": "251, 207, 232",
    "red-200": "254, 202, 202",
    "orange-200": "254, 215, 170",
    "yellow-200": "254, 240, 138",
    "lime-200": "217, 249, 157",
    "emerald-200": "167, 243, 208",
    "cyan-200": "164, 230, 241",
    "blue-200": "191, 219, 254",
    "indigo-200": "199, 210, 254",
    "violet-200": "221, 214, 254",
    "pink-400": "244, 114, 182",
    "red-400": "248, 113, 113",
    "orange-400": "251, 146, 60",
    "yellow-400": "250, 204, 21",
    "lime-400": "163, 230, 53",
    "emerald-400": "52, 211, 153",
    "cyan-400": "34, 211, 238",
    "blue-400": "96, 165, 250",
    "indigo-400": "129, 140, 248",
    "violet-400": "196, 181, 253",
    "pink-700": "190, 24, 93",
    "red-700": "185, 28, 28",
    "orange-700": "194, 65, 12",
    "yellow-700": "161, 98, 7",
    "lime-700": "101, 163, 13",
    "emerald-700": "5, 150, 105",
    "cyan-700": "6, 182, 212",
    "blue-700": "29, 78, 216",
    "indigo-700": "67, 56, 202",
    "violet-700": "109, 40, 217",
  };

  return colorMap[colorName] || fallback;
}

function getBorderColor(color: string): string {
  const borderMap: Record<string, string> = {
    "bg-pink-200": "border-pink-300",
    "bg-red-200": "border-red-300",
    "bg-orange-200": "border-orange-300",
    "bg-yellow-200": "border-yellow-300",
    "bg-lime-200": "border-lime-300",
    "bg-emerald-200": "border-emerald-300",
    "bg-cyan-200": "border-cyan-300",
    "bg-blue-200": "border-blue-300",
    "bg-indigo-200": "border-indigo-300",
    "bg-violet-200": "border-violet-300",
    "bg-pink-400": "border-pink-600",
    "bg-red-400": "border-red-600",
    "bg-orange-400": "border-orange-600",
    "bg-yellow-400": "border-yellow-600",
    "bg-lime-400": "border-lime-600",
    "bg-emerald-400": "border-emerald-600",
    "bg-cyan-400": "border-cyan-600",
    "bg-blue-400": "border-blue-600",
    "bg-indigo-400": "border-indigo-600",
    "bg-violet-400": "border-violet-600",
    "bg-pink-700": "border-pink-800",
    "bg-red-700": "border-red-800",
    "bg-orange-700": "border-orange-800",
    "bg-yellow-700": "border-yellow-800",
    "bg-lime-700": "border-lime-800",
    "bg-emerald-700": "border-emerald-800",
    "bg-cyan-700": "border-cyan-800",
    "bg-blue-700": "border-blue-800",
    "bg-indigo-700": "border-indigo-800",
    "bg-violet-700": "border-violet-800",
  };

  return borderMap[color] || "border-gray-300";
}

Color.title = "Customize";

export default Color;
