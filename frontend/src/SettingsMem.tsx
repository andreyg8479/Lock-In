
//for settings

export type Theme = "light" | "dark";

export function normalizeTheme(raw: string | null | undefined): Theme {
	return raw === "dark" ? "dark" : "light";
}

export function getTheme(): Theme {
	return normalizeTheme(localStorage.getItem("theme"));
}

export function setTheme(theme: Theme) {
	localStorage.setItem("theme", theme);
}

export function applyTheme(theme: 'light' | 'dark') {

	document.documentElement.setAttribute('data-theme', theme)
}

export function getPrefSize() {
	const prefSize = localStorage.getItem('prefSize');
	if (prefSize) {
		return parseInt(prefSize);	
	} else {
		return 16;
	}
}

export function setPrefSize(prefSize: number) {
	localStorage.setItem('prefSize', prefSize.toString());
}

export function getKey() {
	const key = localStorage.getItem('key');
	if (key) {
		return key;	
	} else {
		return "M";
	}
}

export function setKey(key: string) {
	localStorage.setItem('key', key);
}

export function getShift() {
	const shift = localStorage.getItem('shift');
	if (shift) {
		return shift.toLowerCase() === 'true';	
	} else {
		return false;
	}
}

export function setShift(shift: boolean) {
	localStorage.setItem('shift', shift.toString());
}

export function getAlt() {
	const alt = localStorage.getItem('alt');
	if (alt) {
		return alt.toLowerCase() === 'true';	
	} else {
		return true;
	}
}

export function setAlt(alt: boolean) {
	localStorage.setItem('alt', alt.toString());
}

export function getCtrl() {
	const ctrl = localStorage.getItem('ctrl');
	if (ctrl) {
		return ctrl.toLowerCase() === 'true';
	} else {
		return false;
	}
}

export function setCtrl(ctrl: boolean) {
	localStorage.setItem('ctrl', ctrl.toString());
}

//