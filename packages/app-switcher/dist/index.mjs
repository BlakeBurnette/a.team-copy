// src/useAppSwitcher.ts
import { useState, useEffect, useCallback } from "react";
import { fetchApps, filterAppsByPermission } from "@payhive/sso-client";
var DEFAULT_IDENTITY_URL = "https://id.thepayhive.com";
function useAppSwitcher(options) {
  const {
    currentApp,
    allowedApps,
    isAdmin,
    onSwitchApp,
    identityUrl = DEFAULT_IDENTITY_URL
  } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [apps, setApps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [switchingTo, setSwitchingTo] = useState(null);
  useEffect(() => {
    if (isOpen && apps.length === 0 && !isLoading) {
      loadApps();
    }
  }, [isOpen]);
  const loadApps = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedApps = await fetchApps(identityUrl, currentApp);
      setApps(fetchedApps);
    } catch (err) {
      console.error("Failed to fetch apps:", err);
      setError("Failed to load apps");
    } finally {
      setIsLoading(false);
    }
  };
  const visibleApps = filterAppsByPermission(apps, allowedApps, isAdmin);
  const handleAppClick = useCallback(
    async (app) => {
      if (app.current) {
        setIsOpen(false);
        return;
      }
      if (switchingTo) {
        return;
      }
      setSwitchingTo(app.id);
      try {
        const result = await onSwitchApp(app);
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          setSwitchingTo(null);
        }
      } catch (err) {
        console.error("Failed to switch app:", err);
        setSwitchingTo(null);
      }
    },
    [onSwitchApp, switchingTo]
  );
  return {
    isOpen,
    setIsOpen,
    visibleApps,
    isLoading,
    error,
    switchingTo,
    handleAppClick
  };
}

// src/AppSwitcher.tsx
import { useRef, useEffect as useEffect2 } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var ACCENT_COLORS = {
  blue: "text-blue-600",
  emerald: "text-emerald-600",
  orange: "text-orange-600",
  violet: "text-violet-600",
  purple: "text-purple-600",
  amber: "text-amber-600"
};
function GridIcon({ className }) {
  return /* @__PURE__ */ jsx(
    "svg",
    {
      className,
      fill: "none",
      viewBox: "0 0 24 24",
      stroke: "currentColor",
      strokeWidth: 2,
      children: /* @__PURE__ */ jsx(
        "path",
        {
          strokeLinecap: "round",
          strokeLinejoin: "round",
          d: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        }
      )
    }
  );
}
function ExternalLinkIcon({ className }) {
  return /* @__PURE__ */ jsx("svg", { className, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx(
    "path",
    {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: 2,
      d: "M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    }
  ) });
}
function Spinner({ className }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `border-2 border-current border-t-transparent rounded-full animate-spin ${className || "w-5 h-5"}`
    }
  );
}
function AlertIcon({ className }) {
  return /* @__PURE__ */ jsx("svg", { className, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx(
    "path",
    {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: 2,
      d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    }
  ) });
}
function AppItem({ app, isLoading, accentColorClass, onClick }) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick,
      disabled: isLoading,
      className: `w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${app.current ? "bg-neutral-100 cursor-default" : isLoading ? "bg-neutral-50 cursor-wait" : "hover:bg-neutral-50"}`,
      role: "menuitem",
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: `${app.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`,
            children: isLoading ? /* @__PURE__ */ jsx(Spinner, { className: "w-5 h-5 text-white border-white border-t-transparent" }) : /* @__PURE__ */ jsx("span", { className: "text-white font-bold text-sm", children: app.letter })
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-900 text-sm", children: app.name }),
            !app.current && !isLoading && /* @__PURE__ */ jsx(ExternalLinkIcon, { className: "h-3 w-3 text-gray-400" }),
            app.current && /* @__PURE__ */ jsx("span", { className: `text-xs font-medium ${accentColorClass}`, children: "(current)" })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 truncate", children: isLoading ? "Redirecting..." : app.description })
        ] })
      ]
    }
  );
}
function AppSwitcher({
  currentApp,
  allowedApps,
  isAdmin,
  onSwitchApp,
  identityUrl,
  accentColor = "blue",
  className
}) {
  const menuRef = useRef(null);
  const {
    isOpen,
    setIsOpen,
    visibleApps,
    isLoading,
    error,
    switchingTo,
    handleAppClick
  } = useAppSwitcher({
    currentApp,
    allowedApps,
    isAdmin,
    onSwitchApp,
    identityUrl
  });
  useEffect2(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);
  const accentColorClass = ACCENT_COLORS[accentColor] || ACCENT_COLORS.blue;
  if (!isLoading && visibleApps.length === 0 && !error) {
    return null;
  }
  return /* @__PURE__ */ jsxs("div", { className: `relative ${className || ""}`, ref: menuRef, children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setIsOpen(!isOpen),
        className: "p-2 rounded-full hover:bg-neutral-100 active:bg-neutral-200 focus:outline-none",
        "aria-label": "Switch apps",
        "aria-haspopup": "menu",
        "aria-expanded": isOpen,
        children: /* @__PURE__ */ jsx(GridIcon, { className: "h-5 w-5 text-gray-600" })
      }
    ),
    isOpen && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-40", onClick: () => setIsOpen(false) }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          role: "menu",
          className: "absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-neutral-200 shadow-lg rounded-lg overflow-hidden",
          children: [
            /* @__PURE__ */ jsx("div", { className: "px-4 py-3 border-b border-neutral-100", children: /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-gray-700", children: "Hive Apps" }) }),
            /* @__PURE__ */ jsxs("div", { className: "p-2", children: [
              isLoading && /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center py-8", children: /* @__PURE__ */ jsx(Spinner, { className: "w-6 h-6 text-gray-400 border-gray-300 border-t-blue-500" }) }),
              error && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 p-3 text-sm text-red-600", children: [
                /* @__PURE__ */ jsx(AlertIcon, { className: "h-4 w-4" }),
                /* @__PURE__ */ jsx("span", { children: error })
              ] }),
              !isLoading && !error && visibleApps.map((app) => /* @__PURE__ */ jsx(
                AppItem,
                {
                  app,
                  isLoading: switchingTo === app.id,
                  accentColorClass,
                  onClick: () => handleAppClick(app)
                },
                app.id
              ))
            ] })
          ]
        }
      )
    ] })
  ] });
}
export {
  AppSwitcher,
  AppSwitcher as default,
  useAppSwitcher
};
