export const setTheme = (theme) => {
  // Save selected theme to localStorage
  localStorage.setItem("selectedTheme", theme);

  // Apply theme to document
  document.documentElement.setAttribute("data-theme", theme);
};

export const getTheme = () => {
  return localStorage.getItem("selectedTheme") || "retro"; // default theme
};
