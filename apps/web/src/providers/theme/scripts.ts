import {
  COOKIE_EXPIRY_DAYS,
  DARK_MODE_MEDIA_QUERY,
  MILLISECONDS_PER_DAY,
  THEME_CLASSES,
  THEME_COOKIE_NAME,
} from "./constants";

export const themeScript = `
	(function() {
		// Constants (must match ThemeProvider.tsx)
		const THEME_COOKIE_NAME = '${THEME_COOKIE_NAME}';
		const COOKIE_EXPIRY_DAYS = ${COOKIE_EXPIRY_DAYS};
		const MILLISECONDS_PER_DAY = ${MILLISECONDS_PER_DAY};
		const DARK_MODE_MEDIA_QUERY = '${DARK_MODE_MEDIA_QUERY}';
		const THEME_CLASSES = { LIGHT: '${THEME_CLASSES.LIGHT}', DARK: '${THEME_CLASSES.DARK}' };
		
		// Get theme from cookie
		let theme = document.cookie.match(new RegExp('(^| )' + THEME_COOKIE_NAME + '=([^;]+)'))?.[2];
		
		let resolvedTheme;
		let root = document.documentElement;
		
		// Clear any existing theme classes
		root.classList.remove(THEME_CLASSES.LIGHT, THEME_CLASSES.DARK);
		
		if (!theme) {
			// First visit - store as system theme
			resolvedTheme = window.matchMedia(DARK_MODE_MEDIA_QUERY).matches ? THEME_CLASSES.DARK : THEME_CLASSES.LIGHT;
			
			// Set cookie with system preference
			const expires = new Date(Date.now() + COOKIE_EXPIRY_DAYS * MILLISECONDS_PER_DAY).toUTCString();
			document.cookie = THEME_COOKIE_NAME + '=system; expires=' + expires + '; path=/; SameSite=Lax';
		} else if (theme === 'system') {
			resolvedTheme = window.matchMedia(DARK_MODE_MEDIA_QUERY).matches ? THEME_CLASSES.DARK : THEME_CLASSES.LIGHT;
		} else {
			resolvedTheme = theme;
		}
		
		root.classList.add(resolvedTheme);
	})();
`;
